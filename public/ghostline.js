import {wheelControl} from './ghostline-wheel.js';
import {gtEngine} from './ghostline-engine.js';
import {LENGTH,STEP,grid,drive,rivalAt,wakeStrength,paceRun} from './ghostline-core.js?v=6';
import {paint} from './ghostline-view.js?v=7';
import {loadRaceArt} from './ghostline-scenery.js?v=5';
export function mountGhostline({players,onExit,onComplete,beforeRematch,soundEnabled=true}){
 const host=document.createElement('dialog');host.className='ghostline';host.setAttribute('aria-label','Ghostline GT');
 host.innerHTML='<canvas aria-label="Driver’s view of the circuit. Grab and turn the wheel to steer."></canvas><div class="gt-hud"><b></b><output></output><span></span><button class="gt-exit" aria-label="Exit race">×</button></div><div class="gt-steer"><button aria-label="Steer left">◀</button><button aria-label="Steer right">▶</button></div><section class="gt-panel"><h2></h2><p></p><button></button></section>';
 document.body.append(host);host.showModal();
 const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),panel=host.querySelector('section'),[heading,detail,primary]=panel.children;
 const [driver,clock,gap,exit]=host.querySelector('.gt-hud').children,arrows=host.querySelector('.gt-steer');
 const signal=document.createElement('div');
 signal.className='gt-start';signal.hidden=true;
 signal.innerHTML='<div class="gt-lights" aria-hidden="true"><i></i><i></i><i></i></div><strong role="status" aria-atomic="true"></strong>';
 host.append(signal);
 const call=signal.querySelector('strong');
 let phase='ready',leg=0,car=grid(),trace=[],times=[],frame=0,last=0,debt=0,action=null,width=1,height=1,dirty=true;
 const wheel=wheelControl(canvas,()=>phase==='race',()=>car.steer);
 let round=1,tunnel=false,pace=paceRun();
 let audio,engine,voiceGain,voiceBuffer=null,voice=null,muted=!soundEnabled,rival=null;
 let loadingVoice=true,signalAt=null,waitUntil=0;
 // Preload the track while the driver reads the grid panel. Each call starts one second apart.
 try{
  audio=new (window.AudioContext||window.webkitAudioContext)();
  voiceGain=audio.createGain();voiceGain.connect(audio.destination);
  fetch('/assets/ghostline/start-announcer.mp3').then(response=>{
   if(!response.ok)throw Error('Announcer unavailable');
   return response.arrayBuffer();
  }).then(bytes=>audio.decodeAudioData(bytes)).then(buffer=>{voiceBuffer=buffer;})
    .catch(()=>{}).finally(()=>{loadingVoice=false;});
 }catch{loadingVoice=false;}
 const mute=document.createElement('button');exit.before(mute);
 function updateSound(){
  mute.textContent=muted?'♫ off':'♫';mute.setAttribute('aria-label',muted?'Enable race sound':'Mute race sound');
  if(voiceGain)voiceGain.gain.value=muted?0:1;
  engine?.volume(!muted&&phase==='race');
 }
 function unlockSound(){
  if(!audio)return;
  audio.resume().catch(()=>{});
  if(!engine){try{engine=gtEngine(audio);}catch{}}
 }
 updateSound();
 function quiet(){engine?.volume(false);}
 mute.onclick=()=>{muted=!muted;if(!muted)unlockSound();updateSound();};
 const held=new Map(),format=n=>n.toFixed(2)+' s';
 function size(){wheel.reset();const r=canvas.getBoundingClientRect(),dpr=Math.min(1.75,window.devicePixelRatio||1);width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);dirty=true;}
 const stopLoading=loadRaceArt(()=>{dirty=true;});
 const observer=new ResizeObserver(size);observer.observe(canvas);
 function show(title,copy,label,fn){heading.textContent=title;detail.textContent=copy;primary.textContent=label;action=fn;panel.hidden=false;primary.focus();}
 function resume(){held.clear();wheel.reset();phase='race';unlockSound();updateSound();last=0;debt=0;panel.hidden=true;arrows.hidden=false;host.focus();}
 function clearSignal(){
  if(voice){voice.stop();voice.disconnect();voice=null;}
  signalAt=null;signal.hidden=true;call.textContent='';
 }
 function countdown(){
  clearSignal();unlockSound();phase='countdown';panel.hidden=true;arrows.hidden=true;host.focus();
  last=0;waitUntil=performance.now()+800;dirty=true;
 }
 function updateSignal(now){
  if(signalAt===null){
   if(!muted&&loadingVoice&&now<waitUntil)return;
   signalAt=now;signal.hidden=false;
  }
  const elapsed=(now-signalAt)/1000;
  if(elapsed>=3.7){clearSignal();return;}
  if(!voice&&voiceBuffer&&audio.state==='running'&&elapsed<voiceBuffer.duration){
   voice=audio.createBufferSource();voice.buffer=voiceBuffer;voice.connect(voiceGain);
   voice.start(0,elapsed);
  }
  const beat=Math.min(3,Math.floor(elapsed)),label=['3','2','1','GO!'][beat];
  if(call.textContent!==label){
   signal.dataset.light=['red','red','yellow','green'][beat];call.textContent=label;
  }
  if(beat===3&&phase==='countdown')resume();
 }
 function start(){
  car=grid();engine?.reset();rival=rivalAt(leg?trace:pace,0);if(!leg)trace=[{s:0,x:0}];driver.textContent=players[leg];clock.textContent='0.00 s';gap.textContent=leg?'Ghost on track':'Chase the pace car';countdown();
 }
 function ready(){phase='ready';leg=0;rival=null;car=grid();dirty=true;times=[];trace=[];driver.textContent=players[0];clock.textContent='0.00 s';gap.textContent=tunnel?'Tunnel Circuit':'Sunset Circuit';arrows.hidden=true;
  show('Round '+round+' · '+(tunnel?'Tunnel Circuit':'Sunset Circuit')+' · '+players[0]+' drives first','The car accelerates for you. Grab the wheel and turn it, or hold ◀ or ▶. A/D and arrow keys also steer. Chase the pace car. Turn in before the apex. Leaving the racing surface costs speed.','Start my run',start);
 }
 function finish(){
  quiet();times.push(car.time);phase='handoff';held.clear();wheel.reset();arrows.hidden=true;
  if(!leg){leg=1;show('Pass to '+players[1],players[0]+' finished in '+format(times[0])+'. Chase their blue ghost on the very same track.','Race the ghost',start);return;}
  const diff=Math.round(times[0]*100)-Math.round(times[1]*100),winner=diff===0?null:diff<0?0:1;
  phase='final';show(winner===null?'Photo finish · tie!':players[winner]+' wins!',players[0]+'  '+format(times[0])+'   •   '+players[1]+'  '+format(times[1]),'Rematch · Start Round '+(round+1),()=>{if(beforeRematch()){round++;tunnel=!tunnel;pace=paceRun(tunnel?-1:1);ready();}});
  onComplete({winner,times:times.slice()});
 }
 function pause(){
  if(phase!=='race'&&phase!=='countdown')return;
  const next=phase==='countdown'?countdown:resume;
  phase='paused';clearSignal();quiet();held.clear();wheel.reset();arrows.hidden=true;
  show('Race paused',players[leg]+' is at the wheel.','Resume race',next);
 }
 function tick(now){
  if(phase==='countdown'){
   if(last&&now-last>600)pause();
   else{last=now;updateSignal(now);}
  }else if(phase==='race'&&signalAt!==null)updateSignal(now);
  if(phase==='race'){
   const delta=last?(now-last)/1000:0;last=now;
   if(delta>.6)pause();else{
    debt+=delta;const dir=held.size?Math.sign([...held.values()].reduce((a,b)=>a+b,0)):wheel.read();
    while(debt>=STEP&&car.s<LENGTH){drive(car,dir,tunnel?-1:1);if(!leg)trace.push({s:car.s,x:car.x});debt-=STEP;}
    rival=rivalAt(leg?trace:pace,car.time);rival.wake=wakeStrength(car,rival);engine?.update(car,rival.wake);
    clock.textContent=format(car.time);dirty=true;
    const d=Math.round(car.s-rival.s);gap.textContent=(rival.wake>.25?'In the wake':leg?'Ghost':'Pace car')+' · '+(d===0?'level':Math.abs(d)+' m '+(d>0?'ahead':'behind'));
    if(car.s>=LENGTH)finish();
   }
  }
  if(dirty&&width>0&&height>0){paint(ctx,width,height,car.time===0?{...car,speed:0}:car,rival,tunnel);dirty=false;}
  frame=requestAnimationFrame(tick);
 }
 const keys={ArrowLeft:-1,a:-1,ArrowRight:1,d:1};
 function key(e){const k=e.key.length===1?e.key.toLowerCase():e.key;if(!(k in keys)||phase!=='race')return;e.preventDefault();if(e.type==='keydown')held.set(k,keys[k]);else held.delete(k);}
 function visibility(){if(document.hidden)pause();}
 function close(){clearSignal();stopLoading();cancelAnimationFrame(frame);if(audio)audio.close().catch(()=>{});observer.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',pause);host.close();host.remove();onExit();}
 for(const [i,b] of [...arrows.children].entries()){
  b.onpointerdown=e=>{if(phase!=='race')return;e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,i?1:-1);};
  b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>held.delete(e.pointerId);
 }
 primary.onclick=()=>{if(!panel.hidden)action?.();};exit.onclick=close;host.oncancel=e=>{e.preventDefault();if(phase==='race'||phase==='countdown')pause();else close();};
 host.onkeydown=host.onkeyup=key;document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',pause);
 ready();size();frame=requestAnimationFrame(tick);
}
