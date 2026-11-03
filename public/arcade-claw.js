export function clawPrizes(seed){
 const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
 return Array.from({length:6},(_,i)=>({x:55+i*65,large:i%2===1,phase:random()*Math.PI*2,color:['#f8a8cd','#b7a6f4','#82d9d6','#ffd86c','#91d5a0','#f4a580'][i]}));
}
export function clawCatch(prizes,x,grip,elapsed){
 const candidates=prizes.filter(p=>!p.taken).map(p=>({...p,center:p.x+Math.sin(elapsed/850+p.phase)*9}));
 const prize=candidates.sort((a,b)=>Math.abs(a.center-x)-Math.abs(b.center-x))[0];
 if(!prize||Math.abs(prize.center-x)>(prize.large?18:24)||Math.abs(grip-.5)>(prize.large?.14:.28))return null;
 return {index:prizes.indexOf(prizes.find(p=>p.x===prize.x)),points:prize.large?3:1};
}
export function mountClaw({canvas,left,right,grab,team,prizes:layout,later,onScore,onEnd,onStatus,sound,effects=true}){
 const ctx=canvas.getContext('2d');if(!ctx){onStatus('Please try an updated browser to display this game.');return;}
 const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=440*ratio;canvas.height=430*ratio;ctx.scale(ratio,ratio);
 const prizes=layout.map(p=>({...p}));let score=0,attempt=0,x=220,direction=0,phase='aim',aimAt=performance.now(),phaseAt=aimAt,last=aimAt,ended=false,caught=null,drag=null;
 function text(t,x,y,size,color='#fff'){ctx.fillStyle=color;ctx.font=`900 ${size}px Arial,sans-serif`;ctx.textAlign='center';ctx.fillText(t,x,y);}
 function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
 function gripAt(now){return .5+Math.sin((now-aimAt)/420)*.5;}
 function drop(){
  if(ended||phase!=='aim')return;const now=performance.now();caught=clawCatch(prizes,x,gripAt(now),now-aimAt);phase='drop';phaseAt=now;direction=0;drag=null;
  grab.disabled=true;left.disabled=true;right.disabled=true;sound('tap');
  onStatus('Claw dropping…');
 }
 function finish(){if(ended)return;ended=true;onEnd({score,label:`${score} points from 3 grabs`});}
 function next(){
  attempt++;if(attempt===3){finish();return;}
  phase='aim';aimAt=performance.now();phaseAt=aimAt;grab.disabled=false;left.disabled=false;right.disabled=false;caught=null;
  onStatus(`${team}, grab ${attempt+1} of 3. Line up a prize, then drop when the grip marker is in green. Gold center is needed for large prizes.`);
 }
 function bear(p,px,py){
  const r=p.large?25:17;ellipse(px-r*.7,py-r*.9,r*.36,r*.36,p.color);ellipse(px+r*.7,py-r*.9,r*.36,r*.36,p.color);ellipse(px,py+r*.5,r*.85,r,p.color);ellipse(px,py-r*.35,r,r*.85,p.color);
  ellipse(px-r*.33,py-r*.5,2.5,3,'#22203a');ellipse(px+r*.33,py-r*.5,2.5,3,'#22203a');ellipse(px,py-r*.12,r*.35,r*.25,'#fff1d8');ellipse(px,py-r*.2,3,2,'#44313a');
 }
 function frame(){
  if(ended)return;const now=performance.now(),dt=Math.min(50,now-last);last=now;
  if(phase==='aim'){x=Math.max(35,Math.min(405,x+direction*dt*.22));if(now-aimAt>=12000)drop();}
  const age=now-phaseAt;
  if(phase==='drop'&&age>=650){phase='lift';phaseAt=now;if(caught){prizes[caught.index].taken=true;sound('match');}else sound('buzzer');}
  if(phase==='lift'&&age>=750){phase='award';phaseAt=now;if(caught){score+=caught.points;onScore(score);}onStatus(caught?`Prize grabbed! Plus ${caught.points} points!`:'It slipped! Reposition and watch the grip meter.');}
  if(phase==='award'&&age>=900){next();if(ended)return;}
  ctx.fillStyle='#261a46';ctx.fillRect(0,0,440,430);ctx.fillStyle='#df4e86';ctx.fillRect(7,7,426,68);text('HARPER’S',220,29,16,'#ffe18c');text('CLAW MACHINE SHOWDOWN',220,55,22,'#fff8d9');
  for(let i=0;i<12;i++)ellipse(22+i*36,69,3,3,'#ffe686');
  ctx.fillStyle='#90dce5';ctx.fillRect(22,83,396,260);const glass=ctx.createLinearGradient(22,83,418,343);glass.addColorStop(0,'#233764');glass.addColorStop(1,'#53788c');ctx.fillStyle=glass;ctx.fillRect(31,90,378,242);
  ctx.fillStyle='#fff2';ctx.beginPath();ctx.moveTo(45,94);ctx.lineTo(103,94);ctx.lineTo(45,255);ctx.fill();
  text(`${team.toUpperCase().slice(0,22)} · ${score} PTS`,220,105,12,'#e5f7ff');
  ctx.fillStyle='#1a203d';ctx.fillRect(40,115,360,7);
  prizes.forEach(p=>{if(p.taken)return;const px=p.x+Math.sin((now-aimAt)/850+p.phase)*9;bear(p,px,286);text(p.large?'3 PTS':'1 PT',px,324,10,p.large?'#ffe073':'#fff');});
  let clawY=150;
  if(phase==='drop')clawY=150+Math.min(1,(now-phaseAt)/650)*115;
  if(phase==='lift')clawY=265-Math.min(1,(now-phaseAt)/750)*115;
  ctx.strokeStyle='#b7c6dc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,120);ctx.lineTo(x,clawY-16);ctx.stroke();
  if(caught&&phase==='lift')bear(prizes[caught.index],x,clawY+27);
  ctx.strokeStyle='#eff5fc';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,clawY-17);ctx.lineTo(x-23,clawY+6);ctx.lineTo(x-12,clawY+21);ctx.moveTo(x,clawY-17);ctx.lineTo(x+23,clawY+6);ctx.lineTo(x+12,clawY+21);ctx.stroke();ellipse(x,clawY-17,9,6,'#ffe59a');
  ctx.fillStyle='#482759';ctx.fillRect(22,345,396,74);text(`GRAB ${Math.min(3,attempt+1)} / 3`,83,366,13,'#ffe29a');text(phase==='aim'?`${Math.max(0,Math.ceil((12000-now+aimAt)/1000))}s TO DROP`:phase==='award'?(caught?`+${caught.points} POINTS!`:'MISSED!'):'GRABBING…',316,366,13,'#fff');
  ctx.fillStyle='#db6987';ctx.fillRect(65,380,310,17);ctx.fillStyle='#6bdaaa';ctx.fillRect(65+310*.22,380,310*.56,17);ctx.fillStyle='#ffe273';ctx.fillRect(65+310*.36,380,310*.28,17);
  if(phase==='aim'){ctx.fillStyle='#fff';ctx.fillRect(65+gripAt(now)*310-3,376,6,25);}
  text('GREEN: SMALL PRIZES · GOLD: LARGE PRIZES',220,411,10,'#fff1ba');
  later(frame,16);
 }
 function hold(button,dir){
  button.addEventListener('pointerdown',e=>{if(phase!=='aim'||e.isPrimary===false)return;e.preventDefault();direction=dir;button.setPointerCapture?.(e.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{direction=0;});
  button.addEventListener('click',e=>{if(phase==='aim'&&e.detail===0)x=Math.max(35,Math.min(405,x+dir*20));});
 }
 hold(left,-1);hold(right,1);grab.addEventListener('click',drop);
 canvas.addEventListener('pointerdown',e=>{if(phase!=='aim'||e.isPrimary===false)return;e.preventDefault();drag=e.pointerId;canvas.setPointerCapture?.(e.pointerId);aim(e);});
 function aim(e){const r=canvas.getBoundingClientRect();x=Math.max(35,Math.min(405,(e.clientX-r.left)*440/r.width));}
 canvas.addEventListener('pointermove',e=>{if(e.pointerId===drag&&phase==='aim')aim(e);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;});
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)||phase!=='aim')return;e.preventDefault();if(e.key==='ArrowLeft')x=Math.max(35,x-12);else if(e.key==='ArrowRight')x=Math.min(405,x+12);else if(!e.repeat)drop();});
 onStatus(`${team}, line up a prize and press DROP CLAW when the grip marker reaches green. Aim for gold to grab a large prize!`);frame();
 return ()=>{ended=true;direction=0;drag=null;};
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
