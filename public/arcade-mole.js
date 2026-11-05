// Two collision-free lanes. Reuse the complete plan for equal opportunities.
export function molePlan(seed){
 const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
 const events=[];
 for(let type=0;type<2;type++){
  let at=350+type*470;
  while(at<29000){
   const life=Math.min(30000-at,1050+Math.floor(random()*450));
   const occupied=events.filter(e=>e.at<at+life&&e.at+e.life>at).map(e=>e.hole);
   const holes=Array.from({length:8},(_,i)=>i).filter(i=>!occupied.includes(i));
   events.push({at,life,hole:holes[Math.floor(random()*holes.length)],type});
   at+=life+280+Math.floor(random()*600);
  }
 }
 const sorted=events.sort((a,b)=>a.at-b.at);
 // Exactly three gold opportunities, separated across the full turn.
 return sorted.map((e,i)=>({...e,personality:Math.floor(random()*4),gold:[5,14,23].includes(i)}));
}
export function mountMole({canvas,team,plan,later,onScore,onEnd,sound,onStatus,effects=true,onCue=()=>{}}){
 const ctx=canvas.getContext('2d');if(!ctx){onStatus('This browser cannot display the game. Please try an updated browser.');return;}
 const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=440*ratio;canvas.height=410*ratio;ctx.scale(ratio,ratio);
 const started=performance.now(),deadline=started+30000;
 const holes=Array.from({length:8},(_,i)=>({x:61+(i%4)*106,y:226+Math.floor(i/4)*111}));
 const hit=new Set();let points=0,ended=false,lastStrike=-Infinity,pointer=null,mallet={x:365,y:340},flash=null,combo=0,best=0,lastSecond=31,seen=new Set(),missed=new Set(),banner=null,animationFrame=null;
 function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
 function text(s,x,y,size,color='#fff'){ctx.fillStyle=color;ctx.font=`900 ${size}px Arial, sans-serif`;ctx.textAlign='center';ctx.fillText(s,x,y);}
 function active(now){return plan.map((e,i)=>({...e,i})).filter(e=>!hit.has(e.i)&&now-started>=e.at&&now-started<e.at+e.life);}
 function finish(){if(ended)return;ended=true;pointer=null;onEnd({score:points,label:`${points} points · best combo ${best}`});}
 function strike(hole){
  const now=performance.now();if(ended)return;if(now>=deadline){finish();return;}if(now-lastStrike<180)return;
  lastStrike=now;const p=holes[hole];if(!p)return;mallet={x:p.x+14,y:p.y-39};
  const mole=active(now).find(e=>e.hole===hole);
  if(mole){hit.add(mole.i);const value=mole.gold?3:1;points+=value;combo++;best=Math.max(best,combo);flash={hole,at:now,value};onScore(points);sound(mole.gold?'gold':'bonk');onStatus(`${team}: ${points} points${mole.gold?'! Golden mole +3!':''}`);
   if([3,5,10].includes(combo)){banner={text:combo===3?'NICE!':combo===5?'ON FIRE!':'MOLE MASTER!',at:now};sound('combo');onCue(banner.text);}
   else if(mole.gold)onCue('GOLDEN BONK! THREE POINTS!');else if(hit.size%4===0)onCue(['OH WOW! WHAT A HIT!',`${team.toUpperCase()} ARE ON FIRE!`,'THOSE MOLES NEVER SAW IT COMING!'][mole.personality%3]);}else {combo=0;sound('miss');}
 }
 function frame(){
  if(ended)return;const now=performance.now();if(now>=deadline)return finish();
  ctx.save();if((typeof effects==='function'?effects():effects)&&flash&&now-flash.at<100)ctx.translate(Math.sin((now-flash.at)*.1)*1.5,0);
  const wood=ctx.createLinearGradient(0,95,0,410);wood.addColorStop(0,'#d99a42');wood.addColorStop(1,'#794019');ctx.fillStyle='#182342';ctx.fillRect(0,0,440,410);
  ctx.fillStyle='#f6be35';ctx.fillRect(8,8,424,83);ctx.fillStyle='#452a78';ctx.fillRect(15,15,410,69);
  text('WHACK-A-MOLE 2.0',220,45,26,'#fff3b7');text(`COMBO ${combo}  •  BEST ${best}  •  ONE MALLET. BIG BRAGGING RIGHTS.`,220,68,10,'#ffdb62');
  for(let i=0;i<12;i++)ellipse(25+i*35,83,4,4,i%2?'#fff4b0':'#ffdc45');
  ctx.fillStyle=wood;ctx.fillRect(15,97,410,296);for(let i=0;i<4;i++){text('✦',25+i*130,101,16,['#80e2da','#ff99b3','#c6a2ff','#fff09a'][i]);}
  for(let y=185;y<390;y+=27){ctx.fillStyle='#6f381222';ctx.fillRect(18,y,404,2);}ctx.strokeStyle='#f8c16c';ctx.lineWidth=3;ctx.strokeRect(15,97,410,296);
  ctx.fillStyle='#231b1a';ctx.fillRect(30,105,380,44);text(`${team.toUpperCase().slice(0,20)}`,122,122,11,'#ffe19a');text(`${points} POINTS`,122,141,19,'#fff');
  const seconds=Math.max(0,Math.ceil((deadline-now)/1000));text(`${seconds.toString().padStart(2,'0')} SEC`,326,136,24,seconds<=5?'#ff8e82':'#ffe365');
  const live=active(now);
  for(let i=0;i<plan.length;i++){
   const e=plan[i];
   if(now-started>=e.at&&now-started<e.at+e.life&&!seen.has(i)){seen.add(i);sound(e.gold?'sparkle':'pop');}
   if(now-started>=e.at+e.life&&!hit.has(i)&&!missed.has(i)){missed.add(i);combo=0;}
  }
  if(seconds!==lastSecond){lastSecond=seconds;if(seconds<=5){sound('tick');if(seconds===5){onCue('FIVE SECONDS REMAINING!');onStatus(`${team}: five seconds remaining!`);}}}
  ctx.fillStyle='#17192c';ctx.fillRect(28,151,384,12);ctx.fillStyle=combo>=5?'#ff879f':'#67efce';ctx.fillRect(28,151,384*Math.min(combo/10,1),12);

  holes.forEach((p,i)=>{
   ellipse(p.x,p.y+7,48,21,'#f1bc63');ellipse(p.x,p.y+3,44,20,'#492311');ellipse(p.x,p.y,40,17,'#170e0b');
   const mole=live.find(e=>e.hole===i);
   if(mole){
    const age=now-started-mole.at,remain=mole.life-age;
    const rise=(typeof effects==='function'?effects():effects)?Math.min(1,age/130,remain/130):1;
    ctx.save();ctx.beginPath();ctx.rect(p.x-44,p.y-80,88,82);ctx.clip();
    const y=p.y+43-rise*75+((typeof effects==='function'?effects():effects)?Math.sin(age/90)*1.7:0),body=mole.gold?'#e8aa1e':mole.type?'#9e88c4':'#b77751',light=mole.gold?'#fff09b':mole.type?'#e1cafa':'#ffcf9d';
    ellipse(p.x-25,y-12,10,12,body);ellipse(p.x+25,y-12,10,12,body);const fur=ctx.createLinearGradient(p.x-30,y-32,p.x+27,y+30);fur.addColorStop(0,light);fur.addColorStop(.4,body);fur.addColorStop(1,mole.gold?'#a96a0a':mole.type?'#63527e':'#744128');ellipse(p.x,y,31,36,fur);
    ellipse(p.x,y+13,23,17,light);ellipse(p.x-11,y-7,8,10,'#fff');ellipse(p.x+11,y-7,8,10,'#fff');ellipse(p.x-10,y-6,3,5,'#191623');ellipse(p.x+10,y-6,3,5,'#191623');
    ellipse(p.x-21,y+8,6,4,'#fa9dac');ellipse(p.x+21,y+8,6,4,'#fa9dac');ellipse(p.x,y+8,10,7,'#ee929c');ellipse(p.x-3,y+6,3,2,'#ffd6da');ctx.fillStyle='#fff';ctx.fillRect(p.x-5,y+19,4,6);ctx.fillRect(p.x+1,y+19,4,6);
    // Expressions share a silhouette but each has a distinct personality.
    const face=mole.personality;
    if(face===0){ctx.strokeStyle='#43dae8';ctx.lineWidth=4;for(const dx of [-11,11]){ctx.beginPath();ctx.ellipse(p.x+dx,y-7,11,12,0,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#43dae8';ctx.fillRect(p.x-3,y-8,6,3);}
    if(face===1){ellipse(p.x,y+24,7,9,'#ff6895');}
    if(face===2){ctx.fillStyle='#172236';ctx.fillRect(p.x-23,y-15,21,15);ctx.fillRect(p.x+2,y-15,21,15);ctx.fillRect(p.x-4,y-12,8,4);ctx.fillStyle='#8bf3ff';ctx.fillRect(p.x-19,y-12,11,3);ctx.fillRect(p.x+6,y-12,11,3);}
    if(face===3)ellipse(p.x,y+24,8,9,'#492432');
    if(effects&&Math.sin(age/140)>0.98){ctx.fillStyle=body;ctx.fillRect(p.x-20,y-18,40,19);}
    if(mole.gold){text('✦',p.x-32,y-27,18,'#fff7bb');text('✦',p.x+30,y-32,15,'#fff7bb');text('+3',p.x,y-42,13,'#fff5a7');}
    ctx.restore();ellipse(p.x-28,p.y+1,10,5,light);ellipse(p.x+28,p.y+1,10,5,light);
   }
   if(flash?.hole===i&&now-flash.at<480){const age=(now-flash.at)/480;text(`+${flash.value} ★`,p.x,p.y-58-((typeof effects==='function'?effects():effects)?age*18:0),25,'#fff37a');for(let n=0;n<3;n++)text('★',p.x+Math.cos(n*2.1+age*3)*32,p.y-35+Math.sin(n*2.1+age*3)*18,15,'#fff0a1');}
   text(String(i+1),p.x,p.y+35,11,'#ffe3a4');
  });
  text('REGULAR +1  •  GOLDEN +3  •  LET’S BONK!',220,382,12,'#ffe9b0');
  if(banner&&now-banner.at<900){ctx.fillStyle='#452a78ee';ctx.fillRect(65,217,310,42);text(banner.text,220,246,25,'#fff18c');}
  // Exactly one mallet is drawn, with a brief swing after each strike.
  ctx.save();ctx.translate(mallet.x,mallet.y);ctx.rotate(now-lastStrike<140?-.65:.22);ctx.fillStyle='#edbc7c';ctx.fillRect(-5,-3,10,61);ctx.strokeStyle='#532d16';ctx.lineWidth=2;ctx.strokeRect(-5,-3,10,61);ctx.fillStyle='#e65551';ctx.fillRect(-29,-19,58,32);ctx.fillStyle='#ff9890';ctx.fillRect(-27,-17,54,7);ctx.strokeStyle='#672124';ctx.lineWidth=3;ctx.strokeRect(-29,-19,58,32);ctx.restore();
  ctx.restore();
  if(typeof window.requestAnimationFrame==='function')animationFrame=window.requestAnimationFrame(frame);else later(frame,16);
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
 later(finish,30000);frame();return ()=>{ended=true;pointer=null;if(animationFrame!==null)window.cancelAnimationFrame?.(animationFrame);};
}

// Original lightweight synthesizer: no downloads, tracking, or premium host.
export function createMoleAudio({enabled,volume,speak,later,getContext}){
 let context=null,closed=false,beatIndex=0,lastVoice=-Infinity;
 const nodes=new Set();
 function tone(hz,duration=.12,type='sine',level=.06,slide=0){
  if(closed||!enabled()||document.hidden||volume()<=0)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   context??=getContext?.()||new Audio();if(context.state==='suspended')context.resume().catch(()=>{});
   const at=context.currentTime,o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.setValueAtTime(hz,at);if(slide)o.frequency.exponentialRampToValueAtTime(slide,at+duration);
   g.gain.setValueAtTime(Math.max(.001,level*volume()),at);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g);g.connect(context.destination);nodes.add(o);o.onended=()=>{nodes.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration+.02);
  }catch{}
 }
 function cue(kind){
  if(kind==='bonk')tone(300,.12,'triangle',.14,70);
  else if(kind==='pop')tone(320,.08,'sine',.035,640);
  else if(kind==='miss')tone(130,.08,'triangle',.03);
  else if(kind==='tick')tone(720,.12,'square',.035);
  else if(kind==='buzzer'){tone(150,.35,'triangle',.12,80);}
  else {const notes=kind==='gold'||kind==='sparkle'?[880,1320,1760]:kind==='victory'?[523,659,784,1046,784,1046]:[523,659,880];notes.forEach((n,i)=>later(()=>tone(n,.16,'triangle',kind==='sparkle'?.025:.07),i*85));}
 }
 function announce(line,force=false){const now=performance.now();if(closed||!enabled()||volume()<=0||document.hidden||(!force&&now-lastVoice<3500))return;lastVoice=now;speak(line,volume());}
 function music(){if(closed)return;const melody=[523,659,784,659,587,698,880,698];tone(melody[beatIndex%8],.1,'triangle',.018);if(beatIndex%2===0)tone([131,175,147,196][Math.floor(beatIndex/4)%4],.18,'sine',.03);beatIndex++;later(music,250);}
 function silence(){for(const n of nodes){try{n.stop();n.disconnect();}catch{}}nodes.clear();}
 return {cue,announce,music,silence,stop(){closed=true;silence();if(context&&!getContext)try{context.close?.();}catch{}}};
}
