// Five fresh patterns per player; both sides use the same speed progression.
export function treasurePlan(random=Math.random){
 return Array.from({length:5},(_,trial)=>({coin:Math.floor(random()*3),duration:1000-trial*140,swaps:Array.from({length:3+trial},()=>[[0,1],[1,2],[0,2]][Math.floor(random()*3)])}));
}
export function mountTreasure({parent,plan,team,later,sound,onStatus,onScore,onEnd}){
 let trial=0,points=0,phase='preview',positions=[0,1,2],coin=0,cups=[];
 parent.innerHTML='<div class="treasure-game"><div class="treasure-top"><span id="treasure-progress"></span><strong id="treasure-points">0 / 5 points</strong></div><p id="treasure-instruction" role="status"></p><div class="treasure-table" id="treasure-table" role="group" aria-label="Three treasure cups on a table"></div><div class="treasure-slots" aria-hidden="true"><span>1</span><span>2</span><span>3</span></div><div id="treasure-attempts" class="treasure-attempts" aria-label="Five guesses"></div></div>';
 const $=id=>parent.querySelector('#'+id),marks=[];
 function message(text){$('treasure-instruction').textContent=text;onStatus(text);}
 function draw(duration=0,arcs={}){
  cups.forEach((cup,id)=>{
   cup.setAttribute('style',`transform:translate(${positions[id]*100}%,${arcs[id]||0}px);--treasure-duration:${duration}ms;transition-duration:${duration}ms;z-index:${arcs[id]<0?3:2}`);
   cup.disabled=phase!=='pick';
   const slot=positions[id]+1;
   cup.setAttribute('aria-label',phase==='pick'?`Pick cup ${slot}`:phase==='reveal'||phase==='preview'?`Cup ${slot}${id===coin?', gold coin underneath':''}`:`Cup ${slot}, shuffling`);
   cup.setAttribute('data-reveal',String((phase==='preview'||phase==='reveal')&&id===coin));
   // Pick by current position, regardless of the cup's original identity.
   cup.setAttribute('data-slot',String(slot));
  });
 }
 function choose(id){
  if(phase!=='pick')return;phase='reveal';const correct=id===coin;
  if(correct){points++;onScore(points);}marks.push(correct);sound(correct?'match':'buzzer');draw();
  $('treasure-points').textContent=`${points} / 5 points`;
  $('treasure-attempts').textContent=marks.map(hit=>hit?'●':'○').join(' ')+' '+Array(5-marks.length).fill('·').join(' ');
  message(correct?'TREASURE FOUND! +1 POINT':`The coin was under cup ${positions[coin]+1}. Keep your eyes on the next one!`);
  later(()=>{trial++;if(trial===5){phase='complete';onEnd({score:points,elapsed:0,label:`${points} of 5 treasures found`});}else start();},1600);
 }
 function start(){
  const attempt=plan[trial];positions=[0,1,2];coin=attempt.coin;phase='preview';
  $('treasure-progress').textContent=`${team} · GUESS ${trial+1} / 5 · SPEED ${trial+1}`;
  $('treasure-table').replaceChildren();cups=[];
  for(let id=0;id<3;id++){
   const cup=document.createElement('button');cup.type='button';cup.className='treasure-cup';
   cup.innerHTML='<span class="treasure-coin" aria-hidden="true">★</span><svg class="treasure-cup-art" viewBox="0 0 100 110" aria-hidden="true"><ellipse cx="50" cy="100" rx="40" ry="7" fill="#0004"/><path d="M29 15Q50 5 71 15L87 92Q50 109 13 92Z" fill="#ffd522" stroke="#171717" stroke-width="4"/><path d="M34 21 25 87M67 22 75 88" stroke="#fff3a0" stroke-width="5"/><ellipse cx="50" cy="15" rx="21" ry="7" fill="#fff0a0" stroke="#171717" stroke-width="4"/><path d="m50 40 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" fill="#171717"/></svg>';
   cup.addEventListener('click',()=>choose(id));cups.push(cup);$('treasure-table').appendChild(cup);
  }
  draw();message('Watch the gold coin. Remember its cup!');
  later(()=>{phase='cover';draw(250);later(()=>swap(0),450);},1300);
 }
 function swap(index){
  const attempt=plan[trial];
  if(index===attempt.swaps.length){phase='pick';draw();message('Where is the coin? Tap cup 1, 2, or 3!');cups.find(c=>c.getAttribute('data-slot')==='1')?.focus({preventScroll:true});return;}
  phase='shuffle';const [left,right]=attempt.swaps[index],a=positions.indexOf(left),b=positions.indexOf(right),half=attempt.duration/2;
  // Halfway crossing, then settling: the coin stays with its physical cup.
  positions[a]=(left+right)/2;positions[b]=(left+right)/2;draw(half,{[a]:-26,[b]:22});
  later(()=>{positions[a]=right;positions[b]=left;draw(half);later(()=>swap(index+1),half+100);},half);
 }
 start();return {getState:()=>({trial,points,phase,coin,positions:[...positions]})};
}
