import {createClawScene} from './arcade-claw-3d.js?v=1';
// Identical seeded toy piles for both competitors. All toys are worth one point.
export function clawPrizes(seed){
 const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
 return Array.from({length:24},(_,i)=>({x:67+i%6*61+(random()-.5)*10,y:310+Math.floor(i/6)*32,kind:(i+Math.floor(i/6)*3)%6,color:['#ffbb48','#76e7ff','#ef70ce','#96eb75','#b999ff','#ff6666'][i%6],phase:random()*6}));
}
export function clawCatch(prizes,x){
 const candidates=prizes.map((p,index)=>({...p,index})).filter(p=>!p.taken&&Math.abs(p.x-x)<=36);
 candidates.sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x)||b.y-a.y);
 return candidates.length?{index:candidates[0].index,points:1}:null;
}
export function mountClaw({canvas,left,right,grab,team,prizes:layout,later,onScore,onEnd,onStatus,sound,effects=true,timer,counter,phaseLabel}){
 const prizes=layout.map(p=>({...p}));let visual;
 try{visual=createClawScene(canvas,prizes,effects);}catch(error){console.error('THE CLAW renderer:',error);onStatus('3D graphics could not start. Please enable hardware acceleration or try an updated browser.');return ()=>{};}
 const started=performance.now(),deadline=started+30000;
 let score=0,x=220,origin=220,direction=0,phase='aim',phaseAt=started,last=started,ended=false,caught=null,drag=null;
 const clamp=v=>Math.max(48,Math.min(392,v));
 function controls(disabled){grab.disabled=disabled;left.disabled=disabled;right.disabled=disabled;}
 function finish(){if(ended)return;ended=true;controls(true);visual.dispose();onEnd({score,elapsed:30,label:`${score} toys retrieved in 30 seconds`});}
 function drop(){
  if(ended||phase!=='aim'||performance.now()>=deadline)return;
  caught=clawCatch(prizes,x);origin=x;phase='drop';phaseAt=performance.now();direction=0;drag=null;controls(true);sound('tap');onStatus('Claw dropping…');
 }
 function frame(){
  if(ended)return;const now=performance.now(),dt=Math.min(50,now-last);last=now;
  if(phase==='aim'&&now>=deadline){finish();return;}
  if(phase==='aim')x=clamp(x+direction*dt*.3);
  let age=now-phaseAt;
  if(phase==='drop'&&age>=400){phase='lift';phaseAt=now;if(caught){prizes[caught.index].taken=true;sound('match');}age=0;}
  if(phase==='lift'&&age>=420){phase='carry';phaseAt=now;age=0;}
  if(phase==='carry'&&age>=400){phase='release';phaseAt=now;age=0;}
  if(phase==='release'&&age>=300){
   if(caught){score++;onScore(score);sound('win');onStatus(`Toy retrieved! ${score} ${score===1?'point':'points'}.`);}else onStatus('Empty spot! Aim at a toy and grab again.');
   if(now>=deadline){finish();return;}
   phase='aim';phaseAt=now;caught=null;x=origin;controls(false);age=0;
  }
  const remaining=Math.max(0,Math.ceil((deadline-now)/1000));
  if(timer){timer.textContent=remaining+'s';timer.className=remaining<=5?'claw-time urgent':'claw-time';}
  if(counter)counter.textContent=score+(score===1?' TOY':' TOYS');
  if(phaseLabel)phaseLabel.textContent=remaining===0?'FINISHING YOUR GRAB':phase==='aim'?'AIM • GRAB • COLLECT':'GRABBING…';
  visual.render({x,caught,phase,age,now,score,remaining});
  later(frame,16);
 }
 function hold(button,dir){
  button.addEventListener('pointerdown',e=>{if(ended||phase!=='aim'||e.isPrimary===false)return;e.preventDefault();direction=dir;button.setPointerCapture?.(e.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{direction=0;});
  button.addEventListener('click',e=>{if(!ended&&phase==='aim'&&e.detail===0)x=clamp(x+dir*22);});
 }
 hold(left,-1);hold(right,1);grab.addEventListener('click',drop);
 function aim(e){const r=canvas.getBoundingClientRect();x=clamp((e.clientX-r.left)*440/r.width);}
 canvas.addEventListener('pointerdown',e=>{if(ended||phase!=='aim'||e.isPrimary===false)return;e.preventDefault();drag=e.pointerId;canvas.setPointerCapture?.(e.pointerId);aim(e);});
 canvas.addEventListener('pointermove',e=>{if(!ended&&e.pointerId===drag&&phase==='aim')aim(e);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;});
 canvas.addEventListener('keydown',e=>{if(ended||!['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)||phase!=='aim')return;e.preventDefault();if(e.key==='ArrowLeft')x=clamp(x-14);else if(e.key==='ArrowRight')x=clamp(x+14);else if(!e.repeat)drop();});
 onStatus(`${team}, you have 30 seconds! Drag or use arrows to aim, then press GRAB. Each toy delivered earns 1 point.`);frame();
 return ()=>{if(!ended)visual.dispose();ended=true;direction=0;drag=null;};
}
export function clawFireworks(canvas,later,effects=true){
 const ctx=canvas.getContext('2d');if(!ctx)return;canvas.width=440;canvas.height=150;const started=performance.now();
 function frame(){
  const elapsed=performance.now()-started;ctx.clearRect(0,0,440,150);
  for(let burst=0;burst<4;burst++){
   const t=effects?((elapsed+burst*470)%1900)/1900:.4;
   const x=65+burst*102,y=42+burst%2*25,r=8+t*55;
   ctx.fillStyle=['#ffd522','#fc79b6','#79e9ef','#b4a1ff'][burst];
   for(let i=0;i<18;i++){const a=i/18*Math.PI*2;ctx.globalAlpha=effects?1-t:1;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r+t*t*28,3,0,Math.PI*2);ctx.fill();}
  }
  ctx.globalAlpha=1;if(effects&&elapsed<6500)later(frame,32);
 }
 frame();
}
