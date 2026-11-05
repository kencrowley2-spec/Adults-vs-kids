const MOLE_TURN_MS=20000;
// Adapted from the supplied nine-hole game. Seed the original 700ms spawn
// cadence so both teams face the same holes and 600–1300ms appearance times.
export function molePlan(seed){
 const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
 const events=[];
 for(let at=700;at<MOLE_TURN_MS;at+=700){
  const occupied=events.filter(e=>e.at+e.life>at).map(e=>e.hole);
  const down=Array.from({length:9},(_,i)=>i).filter(i=>!occupied.includes(i));
  events.push({at,life:Math.min(MOLE_TURN_MS-at,600+Math.floor(random()*700)),hole:down[Math.floor(random()*down.length)]});
 }
 return events;
}
export function mountMole({root,team,plan,later,onScore,onEnd,sound,onStatus,onCue=()=>{},accountId}){
 const scoreEl=document.getElementById('mole-score'),timeEl=document.getElementById('mole-time'),bestEl=document.getElementById('mole-best');
 const started=performance.now(),deadline=started+MOLE_TURN_MS,active=Array(9).fill(null),buttons=[];
 const bestKey=`avk:mole:best:${accountId}`;
 let score=0,best=0,ended=false,lastSecond=20;
 try{const stored=Number(localStorage.getItem(bestKey));if(Number.isInteger(stored)&&stored>=0&&stored<=plan.length)best=stored;}catch{}
 bestEl.textContent=String(best);scoreEl.textContent='0';timeEl.textContent='20';
 function draw(hole,state=''){
  const button=buttons[hole];button.className=`source-mole-hole ${state}`;
  button.setAttribute('aria-label',`Hole ${hole+1}: ${state==='up'?'mole! Tap to whack':state==='bonk'?'hit':'empty'}`);
 }
 function whack(hole){
  if(ended)return;
  const now=performance.now();if(now>=deadline){finish();return;}
  const event=active[hole];if(!event||now-started<event.at||now-started>=event.at+event.life)return;
  active[hole]=null;draw(hole,'bonk');score++;scoreEl.textContent=String(score);onScore(score);sound('bonk');onStatus(`${team}: ${score} mole hits!`);
  // Never let a previous hit animation hide a later mole in the same hole.
  later(()=>{if(!ended&&!active[hole])draw(hole);},150);
 }
 for(let i=0;i<9;i++){
  const hole=document.createElement('button');hole.type='button';hole.innerHTML='<span class="source-mole-character" aria-hidden="true"></span>';
  hole.addEventListener('click',event=>{if(event.button>0)return;whack(i);});
  root.appendChild(hole);buttons.push(hole);draw(i);
 }
 root.addEventListener('keydown',event=>{if(!/^[1-9]$/.test(event.key)||event.repeat)return;event.preventDefault();whack(Number(event.key)-1);});
 function finish(){
  if(ended)return;ended=true;active.fill(null);buttons.forEach((_,i)=>draw(i));
  if(score>best){best=score;bestEl.textContent=String(best);try{localStorage.setItem(bestKey,String(best));}catch{}sound('win');}
  onEnd({score,label:`${score} mole hits`});
 }
 for(const event of plan){
  later(()=>{if(ended||performance.now()>=deadline)return;active[event.hole]=event;draw(event.hole,'up');},event.at);
  later(()=>{if(!ended&&active[event.hole]===event){active[event.hole]=null;draw(event.hole);}},event.at+event.life);
 }
 function tick(){
  if(ended)return;const seconds=Math.max(0,Math.ceil((deadline-performance.now())/1000));timeEl.textContent=String(seconds);
  if(seconds!==lastSecond){lastSecond=seconds;if(seconds>0&&seconds<=5){sound('tick');if(seconds===5){onCue('FIVE SECONDS REMAINING!');onStatus(`${team}: five seconds remaining!`);}}}
  if(seconds===0)finish();else later(tick,100);
 }
 later(finish,MOLE_TURN_MS);tick();
 return ()=>{ended=true;active.fill(null);buttons.forEach((_,i)=>draw(i));};
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
