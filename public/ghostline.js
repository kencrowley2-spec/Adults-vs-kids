import {LENGTH,STEP,grid,drive,replay} from './ghostline-core.js';
import {paint} from './ghostline-view.js';
export function mountGhostline({players,onExit,onComplete,beforeRematch}){
 const host=document.createElement('dialog');host.className='ghostline';host.setAttribute('aria-label','Ghostline GT');
 host.innerHTML='<canvas aria-label="Driver’s view of the circuit"></canvas><div class="gt-hud"><b></b><output></output><span></span><button class="gt-exit" aria-label="Exit race">×</button></div><div class="gt-steer"><button aria-label="Steer left">◀</button><button aria-label="Steer right">▶</button></div><section class="gt-panel"><h2></h2><p></p><button></button></section>';
 document.body.append(host);host.showModal();
 const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),panel=host.querySelector('section'),[heading,detail,primary]=panel.children;
 const [driver,clock,gap,exit]=host.querySelector('.gt-hud').children,arrows=host.querySelector('.gt-steer');
 let phase='ready',leg=0,car=grid(),trace=[],times=[],frame=0,last=0,debt=0,action=null,width=1,height=1,dirty=true;
 let audio,engine,gain,muted=false;
 const mute=document.createElement('button');mute.textContent='♫';mute.setAttribute('aria-label','Mute engine');exit.before(mute);
 function engineOn(){
  try{
   if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();engine=audio.createOscillator();gain=audio.createGain();
    const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=260;engine.type='sawtooth';
    gain.gain.value=0;engine.connect(filter);filter.connect(gain);gain.connect(audio.destination);engine.start();}
   audio.resume().catch(()=>{});gain.gain.setTargetAtTime(muted?0:.028,audio.currentTime,.05);
  }catch{}
 }
 function quiet(){if(gain)gain.gain.setTargetAtTime(0,audio.currentTime,.03);}
 mute.onclick=()=>{muted=!muted;mute.textContent=muted?'♫ off':'♫';mute.setAttribute('aria-label',muted?'Enable engine sound':'Mute engine');if(phase==='race')engineOn();};
 const held=new Map(),format=n=>n.toFixed(2)+' s';
 function size(){const r=canvas.getBoundingClientRect(),dpr=Math.min(1.75,window.devicePixelRatio||1);width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);dirty=true;}
 const observer=new ResizeObserver(size);observer.observe(canvas);
 function show(title,copy,label,fn){heading.textContent=title;detail.textContent=copy;primary.textContent=label;action=fn;panel.hidden=false;primary.focus();}
 function resume(){held.clear();phase='race';engineOn();last=0;debt=0;panel.hidden=true;arrows.hidden=false;host.focus();}
 function start(){
  car=grid();if(!leg)trace=[{s:0,x:0}];driver.textContent=players[leg];gap.textContent=leg?'Ghost on track':'Setting the ghost';resume();
 }
 function ready(){phase='ready';leg=0;car=grid();dirty=true;times=[];trace=[];driver.textContent=players[0];clock.textContent='0.00 s';gap.textContent='Sunset Circuit';arrows.hidden=true;
  show(players[0]+' drives first','The car accelerates for you. Hold ◀ or ▶ to steer, or use A/D or the arrow keys. The grass costs speed.','Start my run',start);
 }
 function finish(){
  quiet();times.push(car.time);phase='handoff';held.clear();arrows.hidden=true;
  if(!leg){leg=1;show('Pass to '+players[1],players[0]+' finished in '+format(times[0])+'. Chase their blue ghost on the very same track.','Race the ghost',start);return;}
  const diff=Math.round(times[0]*100)-Math.round(times[1]*100),winner=diff===0?null:diff<0?0:1;
  phase='final';show(winner===null?'Photo finish · tie!':players[winner]+' wins!',players[0]+'  '+format(times[0])+'   •   '+players[1]+'  '+format(times[1]),'Race again',()=>{if(beforeRematch())ready();});
  onComplete({winner,times:times.slice()});
 }
 function pause(){if(phase!=='race')return;phase='paused';quiet();held.clear();arrows.hidden=true;show('Race paused',players[leg]+' is at the wheel.','Resume race',resume);}
 function tick(now){
  if(phase==='race'){
   const delta=last?(now-last)/1000:0;last=now;
   if(delta>.6)pause();else{
    debt+=delta;const dir=Math.sign([...held.values()].reduce((a,b)=>a+b,0));
    while(debt>=STEP&&car.s<LENGTH){drive(car,dir);if(!leg)trace.push({s:car.s,x:car.x});debt-=STEP;}
    if(engine)engine.frequency.setTargetAtTime(42+car.speed*1.3,audio.currentTime,.09);
    clock.textContent=format(car.time);dirty=true;
    if(leg){const d=Math.round(car.s-replay(trace,car.time).s);gap.textContent=d===0?'Side by side':Math.abs(d)+' m '+(d>0?'ahead':'behind');}
    if(car.s>=LENGTH)finish();
   }
  }
  if(dirty&&width>0&&height>0){paint(ctx,width,height,car,leg&&phase!=='handoff'?replay(trace,car.time):null);dirty=false;}
  frame=requestAnimationFrame(tick);
 }
 const keys={ArrowLeft:-1,a:-1,ArrowRight:1,d:1};
 function key(e){const k=e.key.length===1?e.key.toLowerCase():e.key;if(!(k in keys)||phase!=='race')return;e.preventDefault();if(e.type==='keydown')held.set(k,keys[k]);else held.delete(k);}
 function visibility(){if(document.hidden)pause();}
 function close(){cancelAnimationFrame(frame);if(audio)audio.close().catch(()=>{});observer.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',pause);host.close();host.remove();onExit();}
 for(const [i,b] of [...arrows.children].entries()){
  b.onpointerdown=e=>{if(phase!=='race')return;e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,i?1:-1);};
  b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>held.delete(e.pointerId);
 }
 primary.onclick=()=>action?.();exit.onclick=close;host.oncancel=e=>{e.preventDefault();if(phase==='race')pause();else close();};
 host.onkeydown=host.onkeyup=key;document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',pause);
 ready();size();frame=requestAnimationFrame(tick);
}
