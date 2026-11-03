// Two independent mole lanes, identical seeded appearances for both teams.
export function molePlan(seed){
 const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
 const events=[];
 for(let type=0;type<2;type++){
  let at=350+type*470;
  while(at<29000){
   const life=1050+Math.floor(random()*450);
   const occupied=events.filter(e=>e.at<at+life&&e.at+e.life>at).map(e=>e.hole);
   const holes=Array.from({length:8},(_,i)=>i).filter(i=>!occupied.includes(i));
   events.push({at,life,hole:holes[Math.floor(random()*holes.length)],type});
   at+=life+280+Math.floor(random()*600);
  }
 }
 return events.sort((a,b)=>a.at-b.at);
}
export function mountMole({canvas,team,plan,later,onScore,onEnd,sound,onStatus,effects=true}){
 const ctx=canvas.getContext('2d');if(!ctx){onStatus('This browser cannot display the game. Please try an updated browser.');return;}
 const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=440*ratio;canvas.height=410*ratio;ctx.scale(ratio,ratio);
 const started=performance.now(),deadline=started+30000;
 const holes=Array.from({length:8},(_,i)=>({x:61+(i%4)*106,y:196+Math.floor(i/4)*111}));
 const hit=new Set();let points=0,ended=false,lastStrike=-Infinity,pointer=null,mallet={x:365,y:340},flash=null;
 function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
 function text(s,x,y,size,color='#fff'){ctx.fillStyle=color;ctx.font=`900 ${size}px Arial, sans-serif`;ctx.textAlign='center';ctx.fillText(s,x,y);}
 function active(now){return plan.map((e,i)=>({...e,i})).filter(e=>!hit.has(e.i)&&now-started>=e.at&&now-started<e.at+e.life);}
 function finish(){if(ended)return;ended=true;pointer=null;onEnd({score:points,label:`${points} mole hits`});}
 function strike(hole){
  const now=performance.now();if(ended)return;if(now>=deadline){finish();return;}if(now-lastStrike<180)return;
  lastStrike=now;const p=holes[hole];if(!p)return;mallet={x:p.x+14,y:p.y-39};
  const mole=active(now).find(e=>e.hole===hole);
  if(mole){hit.add(mole.i);points++;flash={hole,at:now};onScore(points);sound('tap');onStatus(`${team}: ${points} mole hits!`);}else sound('turn');
 }
 function frame(){
  if(ended)return;const now=performance.now();if(now>=deadline)return finish();
  const wood=ctx.createLinearGradient(0,95,0,410);wood.addColorStop(0,'#d99a42');wood.addColorStop(1,'#794019');ctx.fillStyle='#591d24';ctx.fillRect(0,0,440,410);
  ctx.fillStyle='#f6be35';ctx.fillRect(8,8,424,83);ctx.fillStyle='#a12934';ctx.fillRect(15,15,410,69);
  text('WHACK-A-MOLE',220,45,29,'#fff3b7');text('ONE MALLET • ONE ROUND • BIG BRAGGING RIGHTS',220,68,10,'#ffdb62');
  for(let i=0;i<12;i++)ellipse(25+i*35,83,4,4,i%2?'#fff4b0':'#ffdc45');
  ctx.fillStyle=wood;ctx.fillRect(15,97,410,296);
  ctx.strokeStyle='#f8c16c';ctx.lineWidth=3;ctx.strokeRect(15,97,410,296);
  ctx.fillStyle='#231b1a';ctx.fillRect(30,105,380,44);text(`${team.toUpperCase().slice(0,20)}`,122,122,11,'#ffe19a');text(`${points} HITS`,122,141,19,'#fff');
  const seconds=Math.max(0,Math.ceil((deadline-now)/1000));text(`${seconds.toString().padStart(2,'0')} SEC`,326,136,24,seconds<=5?'#ff8e82':'#ffe365');
  const live=active(now);
  holes.forEach((p,i)=>{
   ellipse(p.x,p.y+7,48,21,'#f1bc63');ellipse(p.x,p.y+3,44,20,'#492311');ellipse(p.x,p.y,40,17,'#170e0b');
   const mole=live.find(e=>e.hole===i);
   if(mole){
    const age=now-started-mole.at,remain=mole.life-age;
    const rise=effects?Math.min(1,age/130,remain/130):1;
    ctx.save();ctx.beginPath();ctx.rect(p.x-44,p.y-80,88,82);ctx.clip();
    const y=p.y+43-rise*75,body=mole.type?'#8b91b0':'#ad6943',light=mole.type?'#c9cede':'#f0bf86';
    ellipse(p.x-25,y-12,10,12,body);ellipse(p.x+25,y-12,10,12,body);ellipse(p.x,y,31,36,body);
    ellipse(p.x,y+13,23,17,light);ellipse(p.x-11,y-7,8,10,'#fff');ellipse(p.x+11,y-7,8,10,'#fff');ellipse(p.x-10,y-6,3,5,'#191623');ellipse(p.x+10,y-6,3,5,'#191623');
    ellipse(p.x,y+8,10,7,'#ee929c');ctx.fillStyle='#fff';ctx.fillRect(p.x-5,y+19,4,6);ctx.fillRect(p.x+1,y+19,4,6);
    ctx.restore();ellipse(p.x-28,p.y+1,10,5,light);ellipse(p.x+28,p.y+1,10,5,light);
   }
   if(flash?.hole===i&&now-flash.at<350)text('+1 ★',p.x,p.y-58,23,'#fff37a');
   text(String(i+1),p.x,p.y+35,11,'#ffe3a4');
  });
  text('TAP A MOLE!  •  1 HIT = 1 POINT',220,382,13,'#ffe9b0');
  // Exactly one mallet is drawn, with a brief swing after each strike.
  ctx.save();ctx.translate(mallet.x,mallet.y);ctx.rotate(now-lastStrike<140?-.65:.22);ctx.fillStyle='#edbc7c';ctx.fillRect(-5,-3,10,61);ctx.strokeStyle='#532d16';ctx.lineWidth=2;ctx.strokeRect(-5,-3,10,61);ctx.fillStyle='#e65551';ctx.fillRect(-29,-19,58,32);ctx.fillStyle='#ff9890';ctx.fillRect(-27,-17,54,7);ctx.strokeStyle='#672124';ctx.lineWidth=3;ctx.strokeRect(-29,-19,58,32);ctx.restore();
  later(frame,16);
 }
 function position(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*440/r.width,y:(e.clientY-r.top)*410/r.height};}
 canvas.addEventListener('pointerdown',e=>{
  if(ended||pointer!==null||e.isPrimary===false||e.button>0)return;e.preventDefault();pointer=e.pointerId;
  canvas.setPointerCapture?.(e.pointerId);const p=position(e);
  const i=holes.findIndex(h=>Math.abs(p.x-h.x)<=46&&p.y>=h.y-74&&p.y<=h.y+21);if(i>=0)strike(i);
 });
 canvas.addEventListener('pointermove',e=>{if(e.isPrimary===false||ended)return;if(pointer!==null&&e.pointerId!==pointer)return;mallet=position(e);});
 const release=e=>{if(e.pointerId===pointer)pointer=null;};
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 canvas.addEventListener('keydown',e=>{if(!/^[1-8]$/.test(e.key)||e.repeat||pointer!==null)return;e.preventDefault();strike(Number(e.key)-1);});
 later(finish,30000);frame();return ()=>{ended=true;pointer=null;};
}
