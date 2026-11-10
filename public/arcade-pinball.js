import {PINBALL,createPinball,launchPinball,stepPinball} from './arcade-pinball-core.js?v=1';
export function mountPinball({document:doc=globalThis.document,getAudioContext,soundEnabled=()=>true,accountId='family',beforeStart=()=>true}){
 const win=doc.defaultView,$=id=>doc.getElementById(id),dialog=$('pinball-dialog'),canvas=$('pinball-canvas'),ctx=canvas.getContext('2d');
 if(!ctx)return;
 const key=`avk:pinball-best:${accountId}`;let best=0;try{best=Math.max(0,Number(win.localStorage.getItem(key))||0);}catch{}
 let state=createPinball(),frame=null,last=0,active=false,notice='',paused=false;
 const inputs={left:false,right:false},keys=new Set(),touches={left:new Set(),right:new Set()};
 canvas.width=720;canvas.height=1200;ctx.setTransform(2,0,0,2,0,0);
 function fx(kind){
  if(!soundEnabled())return;
  try{if(win.localStorage.getItem('avk:case-fx')==='off')return;const audio=getAudioContext();if(!audio||audio.state!=='running')return;
   const freqs=kind==='bumper'?[660,990]:kind==='launch'?[220,440,660]:kind==='over'?[330,220]:[180];
   freqs.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+i*.035;o.type='sine';o.frequency.setValueAtTime(f,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.035,at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+.12);o.connect(g);g.connect(audio.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(at);o.stop(at+.14);});
  }catch{}
 }
 function release(){keys.clear();touches.left.clear();touches.right.clear();inputs.left=inputs.right=false;$('pinball-left').setAttribute('aria-pressed','false');$('pinball-right').setAttribute('aria-pressed','false');}
 function setInput(){inputs.left=keys.has('ArrowLeft')||keys.has('a')||touches.left.size>0;inputs.right=keys.has('ArrowRight')||keys.has('d')||touches.right.size>0;$('pinball-left').setAttribute('aria-pressed',String(inputs.left));$('pinball-right').setAttribute('aria-pressed',String(inputs.right));}
 function message(text){if(notice===text)return;notice=text;$('pinball-message').textContent=text;}
 function update(){
  $('pinball-score').textContent=String(state.score).padStart(5,'0');$('pinball-balls').textContent=String(state.balls);$('pinball-best').textContent=String(best).padStart(5,'0');
  $('pinball-launch').disabled=state.phase==='live';$('pinball-launch').textContent=state.phase==='over'?'PLAY AGAIN':'LAUNCH';
 }
 function launch(){
  if(paused){paused=false;message('Back in play!');return;}
  if(state.phase==='over'){if(!beforeStart())return;state=createPinball();}
  if(launchPinball(state)){fx('launch');state.events=[];message('Keep it alive! Bumpers +100 · Star +250');update();}
 }
 function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
 function rail(ax,ay,bx,by){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineWidth=9;ctx.strokeStyle='#050811';ctx.stroke();ctx.lineWidth=5;ctx.strokeStyle='#9eafc9';ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle='#fff';ctx.stroke();}
 function draw(){
  ctx.clearRect(0,0,360,600);ctx.save();
  rounded(9,12,342,576,24);ctx.fillStyle='#041020d9';ctx.fill();ctx.strokeStyle='#718ba488';ctx.lineWidth=2;ctx.stroke();
  // A glass playfield with geometric pinball artwork below the live objects.
  ctx.save();ctx.globalAlpha=.25;for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(164,560);ctx.lineTo(25+i*34,35);ctx.strokeStyle=i%2?'#eab332':'#2187b9';ctx.lineWidth=i%2?4:9;ctx.stroke();}ctx.restore();
  ctx.textAlign='center';ctx.fillStyle='#fff1ad';ctx.font='900 13px Arial';ctx.fillText('ADULTS vs. KIDS',164,116);ctx.font='800 9px Arial';ctx.fillStyle='#77dfff';ctx.fillText('FAMILY PINBALL',164,132);
  rail(19,94,19,411);rail(309,94,309,411);rail(19,94,56,36);rail(56,36,267,36);rail(267,36,309,94);rail(319,112,319,568);
  rail(22,415,82,505);rail(306,415,238,505);
  [...PINBALL.bumpers,...PINBALL.targets].forEach((p,i)=>{
   const glow=Math.max(0,1-(state.time-state.hits[i])*5),color=i<3?['#ffcb4a','#52e0ff','#ff6bcc'][i]:i===5?'#ffdf5c':'#6cf3df';
   ctx.save();ctx.shadowColor=color;ctx.shadowBlur=glow>0?24:8;
   const grad=ctx.createRadialGradient(p.x-5,p.y-8,2,p.x,p.y,p.r);grad.addColorStop(0,'#fff9d8');grad.addColorStop(.35,color);grad.addColorStop(.7,'#263143');grad.addColorStop(.86,color);grad.addColorStop(1,'#050c18');
   ctx.beginPath();ctx.arc(p.x,p.y,p.r+glow*3,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();ctx.restore();
   ctx.fillStyle='#fff';ctx.font=`900 ${i<3?11:10}px Arial`;ctx.fillText(i<3?'100':i===5?'★':'50',p.x,p.y+4);
  });
  ctx.fillStyle='#95c7e8';ctx.font='800 10px Arial';ctx.fillText('KEEP THE RIVALRY ALIVE',162,368);
  ctx.fillStyle='#b7d5e9';ctx.font='8px Arial';ctx.fillText('◀  LEFT + RIGHT FLIPPERS  ▶',162,385);
  state.flippers.forEach((f,i)=>{ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.shadowBlur=12;ctx.shadowColor=(i===0?inputs.left:inputs.right)?'#ffdd4a':'#000';rounded(-8,-9,80,18,9);const metal=ctx.createLinearGradient(0,-9,0,9);metal.addColorStop(0,'#fff');metal.addColorStop(.3,'#e2e8f2');metal.addColorStop(.5,'#e8b942');metal.addColorStop(.8,'#71674e');metal.addColorStop(1,'#161a26');ctx.fillStyle=metal;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#171b29';ctx.stroke();ctx.restore();ctx.beginPath();ctx.arc(f.x,f.y,6,0,Math.PI*2);ctx.fillStyle='#a9b2c0';ctx.fill();});
  const b=state.ball;ctx.save();ctx.shadowColor='#b6e8ff';ctx.shadowBlur=12;const ball=ctx.createRadialGradient(b.x-3,b.y-3,1,b.x,b.y,8);ball.addColorStop(0,'white');ball.addColorStop(.2,'#e6efff');ball.addColorStop(.45,'#536279');ball.addColorStop(.7,'#0b172b');ball.addColorStop(1,'#afcced');ctx.beginPath();ctx.arc(b.x,b.y,7,0,Math.PI*2);ctx.fillStyle=ball;ctx.fill();ctx.restore();
  ctx.fillStyle='#ffd45c';ctx.font='800 9px Arial';ctx.fillText(state.phase==='over'?'FINAL SCORE':state.phase==='ready'?'TAP BALL OR LAUNCH':'DRAIN',164,576);
  if(state.phase==='ready'){ctx.save();ctx.strokeStyle='#ffd45c';ctx.globalAlpha=.5+.3*Math.sin(state.time*4);ctx.beginPath();ctx.arc(b.x,b.y,13,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(paused){ctx.fillStyle='#03060cba';ctx.fillRect(9,12,342,576);ctx.fillStyle='#ffe69b';ctx.font='900 25px Arial';ctx.fillText('PAUSED',180,280);ctx.font='12px Arial';ctx.fillText('Tap the table to resume',180,305);}
  ctx.restore();
 }
 function tick(now){
  if(!active)return;const dt=last?Math.min((now-last)/1000,.035):0;last=now;
  if(!paused&&!doc.hidden){stepPinball(state,inputs,dt);for(const event of state.events){fx(event.kind);if(event.kind==='drain')message(`Ball lost! ${state.balls} ${state.balls===1?'ball':'balls'} left. Launch again.`);if(event.kind==='over')message(`Final score ${state.score}! Press Play Again for a rematch.`);}
   if(state.events.length){if(state.score>best){best=state.score;try{win.localStorage.setItem(key,String(best));}catch{}}update();state.events=[];}}
  draw();frame=win.requestAnimationFrame(tick);
 }
 function open(){
  if(dialog.open||!beforeStart())return;state=createPinball();active=true;paused=false;last=0;release();dialog.showModal();doc.body.classList.add('pinball-active');message('Tap the silver ball or Launch. Hold the flipper buttons to hit it.');update();draw();frame=win.requestAnimationFrame(tick);
 }
 function close(){dialog.close();}
 $('cabinet-pinball').addEventListener('click',open);$('pinball-ball-launch').addEventListener('click',open);$('pinball-close').addEventListener('click',close);$('pinball-launch').addEventListener('click',launch);
 for(const side of ['left','right']){
  const button=$('pinball-'+side);button.addEventListener('pointerdown',event=>{event.preventDefault();touches[side].add(event.pointerId);button.setPointerCapture?.(event.pointerId);setInput();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{touches[side].delete(event.pointerId);setInput();});
  // Keyboard/screen-reader activation can tap a flipper without pointer events.
  button.addEventListener('click',event=>{if(event.detail!==0)return;keys.add(side==='left'?'a':'d');setInput();win.setTimeout(()=>{keys.delete(side==='left'?'a':'d');setInput();},130);});
 }
 canvas.addEventListener('pointerdown',event=>{event.preventDefault();if(paused){paused=false;last=0;message('Back in play!');}else if(state.phase!=='live')launch();});
 dialog.addEventListener('keydown',event=>{const k=event.key.length===1?event.key.toLowerCase():event.key;if(['ArrowLeft','ArrowRight','a','d'].includes(k)){event.preventDefault();keys.add(k);setInput();}if((k===' '||k==='Enter')&&event.target===canvas){event.preventDefault();if(!event.repeat)launch();}});
 dialog.addEventListener('keyup',event=>{keys.delete(event.key.length===1?event.key.toLowerCase():event.key);setInput();});
 function pause(){if(active&&state.phase==='live'){paused=true;release();message('Paused. Tap the table to resume.');}last=0;}
 win.addEventListener('blur',pause);doc.addEventListener('visibilitychange',()=>{if(doc.hidden)pause();});
 dialog.addEventListener('close',()=>{active=false;win.cancelAnimationFrame(frame);release();doc.body.classList.remove('pinball-active');});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 return {open};
}
