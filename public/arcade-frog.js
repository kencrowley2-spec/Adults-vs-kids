// Fresh, equally difficult courses shared by both sides within a round.
export function frogCourses(random=Math.random){
 return Array.from({length:3},()=>{
  let x=45;const pads=Array.from({length:5},(_,i)=>{x+=95+random()*45;return {x,r:27,amplitude:i>0?8+random()*8:0,phase:random()*Math.PI*2,fly:random()<.6};});
  return {pads,finish:x+115};
 });
}
export function frogPadX(pad,seconds){return pad.x+Math.sin(seconds*1.4+pad.phase)*pad.amplitude;}
export function frogJumpDistance(power){return 24+Math.max(0,Math.min(1,power))*180;}
export function frogRoundWinner(a,b){
 for(const key of ['score','distance','flies'])if(a[key]!==b[key])return a[key]>b[key]?0:1;
 return null;
}
export function mountFrog({canvas,chargeButton,musicButton,volumeInput,progress,later,team,courses,onStatus,onScore,onEnd,opponent=null,onProgress=()=>{},getAudioContext,isSoundOn}){
 const ctx=canvas.getContext('2d');if(!ctx){onStatus('Pond graphics are unavailable. Please try another browser.');return ()=>{};}
 const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=480*ratio;canvas.height=280*ratio;ctx.scale(ratio,ratio);
 let attempt=0,points=0,farthest=0,flies=0,phase='ready',standing=-1,x=45,chargeAt=null,heldPointer=null,jump=null,started=performance.now(),stopped=false,music=true,volume=.3,nextRibbit=0,ribbit=0,splash=null;
 const collected=new Set(),nodes=new Set();
 function tone(hz,length,gain,type='triangle',fall=false){
  if(!isSoundOn()||stopped)return;const audio=getAudioContext();if(!audio||audio.state!=='running')return;
  try{const osc=audio.createOscillator(),amp=audio.createGain(),now=audio.currentTime;osc.type=type;osc.frequency.setValueAtTime(hz,now);if(fall)osc.frequency.exponentialRampToValueAtTime(hz*.45,now+length);amp.gain.setValueAtTime(gain,now);amp.gain.exponentialRampToValueAtTime(.001,now+length);osc.connect(amp);amp.connect(audio.destination);nodes.add(osc);osc.onended=()=>{nodes.delete(osc);osc.disconnect();amp.disconnect();};osc.start(now);osc.stop(now+length+.02);}catch{}
 }
 function croak(gain=.13){tone(230,.16,gain,'sawtooth',true);later(()=>tone(170,.14,gain*.77,'sawtooth',true),140);}
 function resetAttempt(){
  splash=null;phase='ready';standing=-1;x=45;chargeAt=null;heldPointer=null;jump=null;started=performance.now();collected.clear();chargeButton.disabled=false;chargeButton.textContent='HOLD TO CHARGE · RELEASE TO HOP';
  onStatus(`${team}: try ${attempt+1} of 3. Hold to charge, release to hop. Reach the far bank for 1 point!`);hud();
 }
 function hud(){onProgress({score:points,distance:farthest,flies});progress.textContent=`${team} · TRY ${attempt+1} / 3 · ${points} CROSSINGS · BEST ${Math.round(farthest)}% · ${flies} FLIES`;}
 function endAttempt(crossed,water=true){
  if(phase==='result'||stopped)return;phase='result';chargeAt=null;heldPointer=null;chargeButton.disabled=true;
  if(crossed){points++;farthest=100;onScore(points);tone(784,.25,.12);onStatus('POND CROSSED! +1 POINT!');chargeButton.textContent='POND CROSSED! +1 POINT';}
  else {if(water)splash={at:performance.now(),x};tone(95,.3,.12,'sine',true);onStatus(water?'Splash! Your next try starts automatically.':'Time’s up! Your next try starts automatically.');chargeButton.textContent=water?'SPLASH! GET READY…':'TIME’S UP! GET READY…';}
  hud();later(()=>{attempt++;if(attempt===3){stopped=true;stopNodes();onEnd({score:points,distance:farthest,flies,elapsed:0,label:`${points} crossings · best ${Math.round(farthest)}% across · ${flies} bonus flies`});}else resetAttempt();},1400);
 }
 function power(now=performance.now()){return chargeAt===null?0:Math.min(1,(now-chargeAt)/1400);}
 function hold(e){
  if(stopped||phase!=='ready'||chargeAt!==null||e?.isPrimary===false||e?.button>0)return;
  e?.preventDefault();chargeAt=performance.now();chargeButton.textContent='CHARGING… RELEASE TO HOP';heldPointer=e?.pointerId??null;
  if(heldPointer!==null)try{(e?.currentTarget||chargeButton).setPointerCapture(heldPointer);}catch{}
 }
 function release(e){
  if(chargeAt===null||stopped||phase!=='ready'||(heldPointer!==null&&e?.pointerId!==undefined&&heldPointer!==e.pointerId))return;
  e?.preventDefault();const now=performance.now();const from=standing<0?45:frogPadX(courses[attempt].pads[standing],(now-started)/1000);
  jump={from,to:from+frogJumpDistance(power(now)),at:now};x=from;chargeAt=null;heldPointer=null;phase='jump';chargeButton.disabled=true;chargeButton.textContent='RIBBIT!';croak();
 }
 function cancel(){chargeAt=null;heldPointer=null;if(phase==='ready')chargeButton.textContent='HOLD TO CHARGE · RELEASE TO HOP';}
 for(const control of [chargeButton,canvas]){
  control.addEventListener('pointerdown',hold);control.addEventListener('pointerup',release);control.addEventListener('pointercancel',cancel);control.addEventListener('lostpointercapture',cancel);
  control.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)&&!e.repeat)hold(e);});control.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key))release(e);});control.addEventListener('blur',cancel);
 }
 musicButton.addEventListener('click',()=>{music=!music;musicButton.setAttribute('aria-pressed',String(music));musicButton.textContent=music?'🐸 Background ribbits: on':'🐸 Background ribbits: off';if(!music)stopNodes();});
 volumeInput.addEventListener('input',()=>{volume=Number(volumeInput.value)/100;});
 function stopNodes(){for(const node of nodes){try{node.stop();node.disconnect();}catch{}}nodes.clear();}
 function text(value,x,y,size,color='#fff'){ctx.fillStyle=color;ctx.font=`900 ${size}px Arial,sans-serif`;ctx.textAlign='center';ctx.fillText(value,x,y);}
 function frame(){
  if(stopped)return;const now=performance.now(),seconds=(now-started)/1000,course=courses[attempt];
  if(phase==='ready'&&standing>=0)x=frogPadX(course.pads[standing],seconds);
  let lift=0;
  if(phase==='jump'){
   const t=Math.min(1,(now-jump.at)/650);x=jump.from+(jump.to-jump.from)*t;lift=Math.sin(t*Math.PI)*90;
   if(t===1){
    if(x>=course.finish-25){endAttempt(true);}
    else {const hit=course.pads.findIndex(p=>Math.abs(x-frogPadX(p,seconds))<=p.r-5);
     if(hit<0)endAttempt(false);
     else {standing=hit;x=frogPadX(course.pads[hit],seconds);farthest=Math.max(farthest,Math.min(99,(x-45)/(course.finish-45)*100));if(course.pads[hit].fly&&!collected.has(hit)){collected.add(hit);flies++;tone(1100,.12,.08);onStatus('BONUS FLY! Keep hopping toward the far bank.');}else onStatus('Nice landing! Hold and release for the next lily pad.');phase='ready';chargeButton.disabled=false;chargeButton.textContent='HOLD TO CHARGE · RELEASE TO HOP';hud();}
    }
   }
  }
  if(seconds>=45&&phase!=='result')endAttempt(false,false);
  if(music&&now>=nextRibbit){croak(volume*.25);ribbit++;nextRibbit=now+1700+(ribbit%3)*250;}
  const camera=Math.max(0,x-95),view=world=>world-camera;
  ctx.fillStyle='#102d3c';ctx.fillRect(0,0,480,280);ctx.fillStyle='#1b6370';ctx.fillRect(0,65,480,215);
  for(let i=0;i<10;i++){ctx.strokeStyle='#71d7d433';ctx.beginPath();ctx.ellipse((i*73-now/80)%560,90+(i%4)*42,28,4,0,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#6b973d';ctx.fillRect(view(-100),115,165,165);ctx.fillRect(view(course.finish-25),115,150,165);
  text('START',view(32),260,12);text('FINISH',view(course.finish+30),250,13,'#ffd522');
  if(opponent){
   const marker=view(45+(course.finish-45)*opponent.distance/100),labelX=Math.max(85,Math.min(395,marker));
   ctx.save();ctx.strokeStyle='#ffd522';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(marker,85);ctx.lineTo(marker,245);ctx.stroke();ctx.setLineDash([]);
   text(`${opponent.name}: ${Math.round(opponent.distance)}% BEST`,labelX,96,11,'#ffd522');ctx.restore();
  }
  course.pads.forEach((pad,i)=>{const px=view(frogPadX(pad,seconds));ctx.fillStyle='#1b4422';ctx.beginPath();ctx.ellipse(px,198,pad.r,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#83cb4b';ctx.beginPath();ctx.ellipse(px,191,pad.r,12,0,.2,Math.PI*1.95);ctx.lineTo(px,191);ctx.fill();if(pad.fly&&!collected.has(i))text('🪰',px,155+Math.sin(seconds*4)*4,20);});
  if(splash){
   const t=(now-splash.at)/1000,px=view(splash.x),fade=Math.max(0,1-t/1.4);
   ctx.save();ctx.globalAlpha=fade;ctx.strokeStyle='#bff8ff';ctx.lineWidth=3;
   for(let ring=0;ring<3;ring++){ctx.beginPath();ctx.ellipse(px,199,12+t*48+ring*10,4+t*12+ring*3,0,0,Math.PI*2);ctx.stroke();}
   for(let drop=0;drop<12;drop++){const angle=drop*Math.PI*2/12,dx=Math.cos(angle)*(22+t*68),dy=-Math.abs(Math.sin(angle))*95*t+80*t*t;ctx.fillStyle=drop%2?'#a8efff':'#e9ffff';ctx.beginPath();ctx.arc(px+dx,192+dy,Math.max(1,5-t*2),0,Math.PI*2);ctx.fill();}
   text('SPLASH!',px,137,25,'#c9f8ff');ctx.restore();
  }else text('🐸',view(x),182-lift,43);
  text(phase==='jump'?'RIBBIT!':phase==='result'?chargeButton.textContent:'HOLD • CHARGE • RELEASE',240,33,15,'#ffd522');
  text(`TRY ${attempt+1}/3`,420,58,12);text(`${Math.max(0,45-Math.floor(seconds))}s`,45,58,12);
  later(frame,32);
 }
 resetAttempt();frame();return ()=>{stopped=true;cancel();stopNodes();};
}
