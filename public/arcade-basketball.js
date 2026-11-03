// Original arcade cabinet artwork and perspective flick-to-shoot simulation.
export function projectShot(dx,dy){
 const power=Math.max(.15,Math.min(1.8,dy/152));
 return {x:200+dx*2,y:278+(1-power)*230,power,made:Math.abs(dx*2)<30&&Math.abs(1-power)*230<34};
}
export function shotPosition(shot,elapsed){
 const t=Math.max(0,Math.min(1,elapsed/700));
 return {x:200+(shot.x-200)*t,y:650+(shot.y-650)*t-290*Math.sin(Math.PI*t),r:40-23*t,t};
}
export function mountBasketball({canvas,team,later,onScore,onEnd,sound,onStatus}){
 const ctx=canvas.getContext('2d');
 if(!ctx){onStatus('This browser cannot display the basketball court. Try an updated browser.');return;}
 const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=400*ratio;canvas.height=760*ratio;ctx.scale(ratio,ratio);
 const deadline=performance.now()+30000;
 let points=0,shot=null,drag=null,ended=false,expired=false,notice='',noticeUntil=0;
 const texture=document.createElement('canvas');texture.width=400;texture.height=760;
 const tx=texture.getContext('2d');
 // Seeded texture keeps the court and shooting conditions identical for both teams.
 let seed=7103;for(let i=0;i<9000;i++){seed=(seed*16807)%2147483647;const x=seed%400;seed=(seed*16807)%2147483647;const y=seed%760;tx.fillStyle=i%2?'#ffffff08':'#00000013';tx.fillRect(x,y,2,2);}
 function path(points,stroke,width=1,fill){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 function ellipse(x,y,rx,ry,fill,stroke,width=1){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 function text(label,x,y,size,color='#fff',font='Arial Black, sans-serif'){ctx.textAlign='center';ctx.fillStyle=color;ctx.font=`900 ${size}px ${font}`;ctx.fillText(label,x,y);}
 function ball(x,y,r,rotation=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
  const g=ctx.createRadialGradient(-r*.35,-r*.4,r*.05,0,0,r);g.addColorStop(0,'#ffb24a');g.addColorStop(.45,'#e9751d');g.addColorStop(1,'#75300e');ellipse(0,0,r,r,g,'#241308',1.7);
  ctx.save();ctx.beginPath();ctx.arc(0,0,r-1,0,Math.PI*2);ctx.clip();ctx.fillStyle='#61250055';
  for(let a=-r;a<r;a+=4)for(let b=-r;b<r;b+=4){ctx.beginPath();ctx.arc(a+(b%8?2:0),b,.65,0,7);ctx.fill();}
  ctx.strokeStyle='#29160f';ctx.lineWidth=Math.max(1,r*.045);ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.moveTo(0,-r);ctx.lineTo(0,r);ctx.moveTo(-r*.7,-r);ctx.bezierCurveTo(r*.5,-r*.4,r*.5,r*.4,-r*.7,r);ctx.moveTo(r*.7,-r);ctx.bezierCurveTo(-r*.5,-r*.4,-r*.5,r*.4,r*.7,r);ctx.stroke();ctx.restore();ctx.restore();
 }
 function cabinet(){
  const wall=ctx.createLinearGradient(0,80,0,760);wall.addColorStop(0,'#333b33');wall.addColorStop(.6,'#182021');wall.addColorStop(1,'#615344');ctx.fillStyle=wall;ctx.fillRect(0,0,400,760);
  path([[0,90],[42,137],[42,600],[0,730]],'#080a09',5,'#131a18');path([[400,90],[358,137],[358,600],[400,730]],'#080a09',5,'#131a18');
  ctx.save();ctx.beginPath();ctx.rect(0,90,400,650);ctx.clip();
  for(let i=-700;i<800;i+=24){path([[0,i],[43,i+70]],'#bc67294a');path([[400,i],[357,i+70]],'#bc67294a');path([[0,i+80],[43,i]],'#bc67294a');path([[400,i+80],[357,i]],'#bc67294a');}
  ctx.restore();path([[42,600],[358,600],[400,748],[0,748]],'#0b1010',4,'#524c3c');
  for(let i=0;i<7;i++){const y=600+(i*i)*4.1;path([[0,y],[400,y]],'#171b19',1);}
  for(let x=-400;x<850;x+=130)path([[200+(x-200)*.22,600],[x,760]],'#171b19',1);
  // Backboard mounting pole and aged enamel board.
  ctx.fillStyle='#364844';ctx.fillRect(194,220,12,400);ctx.fillStyle='#101918';ctx.fillRect(198,220,3,400);
  ctx.shadowColor='#000';ctx.shadowBlur=18;ctx.fillStyle='#bfc5b4';ctx.beginPath();ctx.roundRect(65,125,270,240,24);ctx.fill();ctx.shadowBlur=0;
  const board=ctx.createLinearGradient(65,125,335,365);board.addColorStop(0,'#e4e4d0');board.addColorStop(.5,'#bbc6c4');board.addColorStop(1,'#e1e0ce');ctx.fillStyle=board;ctx.fill();ctx.strokeStyle='#5e7771';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#dd7847';ctx.lineWidth=6;ctx.strokeRect(76,140,248,213);ctx.strokeRect(155,227,90,69);
  text('ADULTS vs. KIDS™',200,177,12,'#3e514c');text('FAMILY HOOPS',200,195,9,'#58635b');
  ctx.fillStyle='#2c3935';ctx.fillRect(136,301,128,5);
  // Cabinet LED display.
  ctx.fillStyle='#111515';ctx.fillRect(20,10,360,91);ctx.strokeStyle='#b39233';ctx.lineWidth=3;ctx.strokeRect(20,10,360,91);
  ctx.fillStyle='#293531';ctx.fillRect(142,19,116,73);ctx.fillStyle='#040a07';ctx.fillRect(29,39,103,52);ctx.fillRect(268,39,103,52);
  text('SCORE',80,32,13,'#e9e6d6');text('TIME',320,32,13,'#e9e6d6');text(String(points).padStart(3,'0'),80,80,38,'#27fb8a','monospace');text(String(Math.max(0,Math.ceil((deadline-performance.now())/1000))).padStart(2,'0'),320,80,38,'#ff4438','monospace');text(team.toUpperCase(),200,47,17,'#ffe16d');text('30 SEC · 2 PTS',200,73,10,'#c7d1c9');
  ctx.drawImage(texture,0,0);
  // Spare basketballs in the return tray.
  ellipse(200,697,142,16,'#0006');ball(104,699,31,-.4);ball(296,699,31,.4);
  ctx.fillStyle='#151a18';ctx.fillRect(0,731,400,29);text('ADULTS vs. KIDS™  •  ARCADE',200,750,11,'#ffe16d');
 }
 function hoop(front=false,sway=0){
  if(!front){ellipse(200,278,54,12,'#1c2824','#535b44',6);return;}
  ctx.save();ctx.translate(sway,0);
  for(let i=0;i<9;i++){
   const x=151+i*12.25,end=177+i*5.75;
   path([[x,280],[end+10,323],[end,355]],'#e5e5d6',1.7);
   path([[x,280],[end-10,323],[end,355]],'#aebbb4',1.3);
  }
  for(let j=0;j<4;j++){const y=292+j*18,w=46-j*7;ellipse(200,y,w,5,null,'#e2e5d699',1);}
  ctx.beginPath();ctx.ellipse(200,278,54,12,0,0,Math.PI);ctx.strokeStyle='#e89532';ctx.lineWidth=6;ctx.stroke();ctx.restore();
 }
 function finish(){if(ended)return;ended=true;onEnd({score:points,label:`${points} points (${points/2} baskets)`});}
 function frame(){
  if(ended)return;
  const now=performance.now();expired=now>=deadline;
  cabinet();hoop();
  if(shot){
   const elapsed=now-shot.at,p=shotPosition(shot,elapsed);
   if(elapsed<700){ball(p.x,p.y,p.r,elapsed/220);hoop(true);}
   else {
    if(!shot.resolved){shot.resolved=true;if(shot.made){points+=2;onScore(points);sound('match');notice='SWISH! +2';}else{sound('tap');notice=Math.abs(shot.x-200)>=30?'AIM FOR THE CENTER':shot.power<1?'FLICK A LITTLE HIGHER':'A LITTLE LESS POWER';}noticeUntil=now+700;}
    hoop(true,shot.made?Math.sin(elapsed/32)*2:0);
    const q=Math.min(1,(elapsed-700)/260);
    ball(shot.x+(shot.made?0:(shot.x<200?-45:45)*q),shot.y+q*(shot.made?100:260),17+q*6,elapsed/180);
    if(elapsed>=960)shot=null;
   }
  }else {hoop(true);ellipse(200,699,46,10,'#0007');ball(200,650,40);}
  if(drag&&!expired){const target=projectShot(drag.x-drag.startX,drag.startY-drag.y);ctx.setLineDash([5,7]);path([[200,607],[200+(target.x-200)*.45,490]],'#ffe16dcc',3);ctx.setLineDash([]);}
  if(now<noticeUntil)text(notice,200,410,notice.length>18?14:25,notice==='SWISH! +2'?'#ffe16d':'#fff');
  text(expired?'BUZZER!':drag?'RELEASE TO SHOOT':'FLICK THE BALL UP TO SHOOT',200,548,12,'#ffe16d');
  text('Aim straight • Flick about ⅕ of the court height',200,568,9,'#e0e7df');
  if(expired&&!shot)return finish();
  later(frame,16);
 }
 function position(e){const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)*400/rect.width,y:(e.clientY-rect.top)*760/rect.height};}
 canvas.addEventListener('pointerdown',e=>{
  if(ended||shot||performance.now()>=deadline||e.isPrimary===false)return;
  const p=position(e);if(Math.hypot(p.x-200,p.y-650)>65)return;
  e.preventDefault();canvas.setPointerCapture(e.pointerId);drag={...p,startX:p.x,startY:p.y,id:e.pointerId};
 });
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();Object.assign(drag,position(e));});
 canvas.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const p=position(e),dy=drag.startY-p.y,dx=p.x-drag.startX;drag=null;
  if(ended||shot||performance.now()>=deadline||dy<25)return;
  shot={...projectShot(dx,dy),at:performance.now(),resolved:false};sound('tap');
 });
 canvas.addEventListener('pointercancel',()=>{drag=null;});canvas.addEventListener('lostpointercapture',()=>{drag=null;});
 // Keyboard equivalent: choose aim and power, then release with Space/Enter.
 let aim=0,power=152;
 canvas.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key))return;e.preventDefault();
  if(ended||shot||performance.now()>=deadline)return;
  if(e.key==='ArrowLeft')aim-=8;if(e.key==='ArrowRight')aim+=8;if(e.key==='ArrowUp')power+=12;if(e.key==='ArrowDown')power-=12;
  aim=Math.max(-80,Math.min(80,aim));power=Math.max(40,Math.min(270,power));
  if(e.key===' '||e.key==='Enter')shot={...projectShot(aim,power),at:performance.now(),resolved:false};
  else onStatus(`Aim ${aim===0?'center':aim<0?'left':'right'}, power ${Math.round(power/152*100)}%. Space to shoot.`);
 });
 onStatus(`${team}: 30 seconds! Flick up from the ball. Each basket is 2 points.`);frame();
}
