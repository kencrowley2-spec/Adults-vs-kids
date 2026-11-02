import {coverMarkup,recentGames} from './arcade-library.js?v=1';
import {GAMES, ANIMALS, TRIVIA, WORDS, PICTURES, CHALLENGES} from './arcade-data.js?v=5';
import {teamName, shuffle, roundWinner, awardRound, lineWinner} from './arcade-core.js';

import {makeMaze, codeClues, rpsWinner, GOLF_COURSES, golfStep} from './arcade-new-core.js?v=5';

import {createResultRecorder} from './arcade-results.js?v=1';

const $ = id => document.getElementById(id);
const lobby=$('arcade-lobby'), arena=$('arcade-game'), stage=$('game-stage');
let game, wins=[0,0], round=1, attempt=0, starter=0, turn=0, results=[], champion=-1;
let series=null,recording=null;
const arcadeAccountId=$('arcade-game').getAttribute('data-account-id');
const recorder=createResultRecorder({
 accountId:arcadeAccountId,
 storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},
 send:result=>fetch('/api/arcade/results',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...result,accountId:arcadeAccountId})}),
 changed:({pending,storageFailed})=>{const el=$('arcade-save-status');if(el)el.textContent=pending?`A completed result is waiting to save. ${storageFailed?'Keep this page open and retry.':'It will retry when you’re connected.'}`:'Completed matches update your family’s lifetime score.';}
});
recorder.drain();
window.addEventListener('online',()=>recorder.drain());
$('arcade-save-retry').addEventListener('click',()=>recorder.drain());
function startRecording(mode,gameIds){recording={id:crypto.randomUUID(),mode,gameIds,roundWinners:[],complete:false};}
function saveCompleted(){
 if(!recording||recording.complete)return;
 recording.complete=true;
 const {id,mode,gameIds,roundWinners}=recording;
 recorder.capture({id,mode,gameIds:[...gameIds],roundWinners:[...roundWinners]});
}
let timers=[], generation=0, timed=false, used={};
const names=['Adults','Kids'];
let soundOn=true, effectsOn=!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, audioContext, feedbackSequence=0;
function unlockAudio(){
  if(!soundOn)return;
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioContext??=new Audio();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{}
}
document.addEventListener('pointerdown',unlockAudio);
document.addEventListener('keydown',unlockAudio);
function chime(kind){
  if(!soundOn)return;unlockAudio();if(!audioContext||audioContext.state!=='running')return;
  try{
    const notes=kind==='win'?[523,659,784]:kind==='match'?[660,880]:kind==='tap'?[440]:[330,440];
    notes.forEach((frequency,i)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),at=audioContext.currentTime+i*.075;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.045,at+.008);gain.gain.exponentialRampToValueAtTime(.001,at+.12);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(at);oscillator.stop(at+.14);});
  }catch{}
}
function react(kind,label){
  chime(kind);const sequence=++feedbackSequence;
  $('feedback-caption').textContent=label;
  $('arcade-feedback').setAttribute('data-kind',effectsOn?kind:'quiet');
  later(()=>{if(sequence!==feedbackSequence)return;$('arcade-feedback').setAttribute('data-kind','');$('feedback-caption').textContent='';},650);
}
$('arcade-sound').addEventListener('click',()=>{soundOn=!soundOn;$('arcade-sound').textContent=`Sound: ${soundOn?'on':'off'}`;$('arcade-sound').setAttribute('aria-pressed',String(soundOn));if(soundOn)chime('match');});
$('arcade-effects').setAttribute('aria-pressed',String(effectsOn));
$('arcade-effects').textContent=`Lights: ${effectsOn?'on':'off'}`;
$('arcade-effects').addEventListener('click',()=>{effectsOn=!effectsOn;$('arcade-effects').textContent=`Lights: ${effectsOn?'on':'off'}`;$('arcade-effects').setAttribute('aria-pressed',String(effectsOn));$('arcade-feedback').setAttribute('data-kind','');});
function clearTimers(){ generation++; timers.forEach(clearTimeout); timers=[]; timed=false; }
function later(fn,delay){ const token=generation; const timer=setTimeout(()=>{if(token===generation)fn();},delay); timers.push(timer); }
function screen(html){ clearTimers(); $('arcade-feedback').setAttribute('data-kind','');$('feedback-caption').textContent='';stage.innerHTML=html; scheduleGameFit(); }
function button(label,action,parent=stage,className='primary'){
  const b=document.createElement('button'); b.type='button'; b.className=className; b.textContent=label; b.addEventListener('click',action); parent.appendChild(b); return b;
}

function fitGameViewport(){
  const viewport=$('game-viewport');
  if(arena.hidden||!stage.style||!viewport?.clientHeight)return;
  // Measure the natural compact layout, then fit every control inside the arena.
  // A transform preserves the same hit targets and game state across resizes.
  const height=viewport.clientHeight,width=viewport.clientWidth;
  stage.style.setProperty('--play-height',height+'px');
  const scale=Math.min(1,height/Math.max(stage.scrollHeight,1),width/Math.max(stage.scrollWidth,1));
  stage.style.setProperty('--game-scale',String(Math.max(.1,scale)));
}
let fitPending=false;
function scheduleGameFit(){
  if(fitPending||typeof requestAnimationFrame!=='function')return;
  fitPending=true;requestAnimationFrame(()=>{fitPending=false;fitGameViewport();});
}
if(typeof ResizeObserver!=='undefined'){
 const observer=new ResizeObserver(scheduleGameFit);observer.observe($('game-viewport'));observer.observe(stage);
}
if(typeof MutationObserver!=='undefined')new MutationObserver(scheduleGameFit).observe(stage,{childList:true,subtree:true,characterData:true});
function updateArenaHeight(){
 if(arena.style)arena.style.setProperty('--arena-height',(window.visualViewport?.height||window.innerHeight)+'px');
 scheduleGameFit();
}
window.addEventListener('resize',updateArenaHeight);
window.visualViewport?.addEventListener('resize',updateArenaHeight);
updateArenaHeight();

function focusFirst(){ stage.querySelector('button,input')?.focus({preventScroll:true}); }
function status(text){$('arcade-message').textContent=text;}
function scoreboard(){
  $('match-format').textContent=series?'3-GAME SERIES':'BEST OF FIVE';
  $('arcade-reset').textContent=series?'Restart series ↻':'Restart match ↻';
  $('series-lineup').hidden=!series;
  if(series) $('series-lineup').innerHTML=series.games.map((g,i)=>`<div class="series-pick ${i===series.index?'active':''}"><small>GAME ${i+1}${series.winners[i]!==undefined?` · ${teamName(series.winners[i])} win`:''}</small><b>${g.icon} ${g.name}</b></div>`).join('');
  $('arcade-score').innerHTML=names.map((name,i)=>`<div class="team-score ${turn===i&&champion<0?'current':''}"><span>${i===0?'★':'✦'} TEAM ${name.toUpperCase()}</span><strong>${wins[i]}</strong><div class="win-dots" aria-label="${wins[i]} ${series?'game':'round'} wins">${[0,1,2].map(n=>`<i class="${n<wins[i]?'won':''}"></i>`).join('')}</div></div>`).join('');
  $('round-label').textContent=series?`${champion>=0?'SERIES COMPLETE':`GAME ${series.index+1} OF 3${attempt?' · TIE REPLAY':''}`} · SERIES SCORE` : champion>=0?'MATCH COMPLETE':`ROUND ${round} OF 5${attempt?' · TIE REPLAY':''} · FIRST TO 3 WINS`;
}
function pick(key,source,n){
  if(!used[key] || used[key].length<n) used[key]=shuffle(source);
  return used[key].splice(0,n);
}
function openGame(id){
  clearTimeout(featuredTimer);
  startRecording('single',[id]);
  series=null;
  game=GAMES.find(g=>g.id===id); rememberGame(id); lobby.hidden=true; arena.hidden=false;
  $('game-title').textContent=`${game.icon} ${game.name}`; used={}; wins=[0,0]; round=1; attempt=0; starter=0; turn=0; champion=-1; results=[];
  starter=Math.random()<.5?0:1;turn=starter;beginRound();
}
function startSeries(){
  clearTimeout(featuredTimer);
  clearTimers();
  series={games:shuffle(GAMES).slice(0,3),index:0,winners:[],first:0};
  startRecording('series',series.games.map(g=>g.id));
  wins=[0,0]; round=1; attempt=0; starter=0; turn=0; champion=-1; results=[]; used={};
  game=series.games[0]; lobby.hidden=true; arena.hidden=false;
  series.first=Math.random()<.5?0:1;startSeriesGame();
}
function startSeriesGame(){
  clearTimers(); game=series.games[series.index]; round=series.index+1; attempt=0;
  starter=(series.first+series.index)%2; turn=starter;
  $('game-title').textContent=`${game.icon} ${game.name}`; beginRound();
}
function finishSeriesGame(winner,detail){
  if(winner!==null){wins[winner]++;series.winners.push(winner);}
  const complete=series.winners.length===3;
  champion=complete?(wins[0]>wins[1]?0:1):-1; scoreboard();
  if(complete)saveCompleted();
  screen(`<div class="result"><span class="giant-icon">${winner===null?'🤝':complete?'🏆':'🎉'}</span><p class="eyebrow">${complete?'SERIES COMPLETE':winner===null?'TIE · SAME GAME':'GAME COMPLETE'}</p><h3>${complete?`${teamName(champion)} win the series!`:winner===null?'It’s a tie!':`${teamName(winner)} win game ${series.index+1}!`}</h3><p>${detail}</p><div class="final-score">${wins[0]} <span>–</span> ${wins[1]}</div><p>${complete?'Three games. One great time together. High fives all around.':winner===null?'No point awarded. Replay this game to settle it.':`Up next: ${series.games[series.index+1].icon} ${series.games[series.index+1].name}. Starting in <strong id="next-game-countdown">2</strong> seconds…`}</p></div>`);
  if(complete){button('New random challenge →',startSeries);button('Return to Arcade',()=>{$('arcade-return').click();},stage,'text-button');}
  else if(winner===null){later(()=>{attempt++;starter=1-starter;beginRound();},2200);}
  else {
    // Both countdown and button use one guarded transition; screen changes cancel timers.
    let moved=false,remaining=2;
    const next=()=>{if(moved)return;moved=true;series.index++;startSeriesGame();};
    const tick=()=>{remaining--;if(remaining===0)return next();$('next-game-countdown').textContent=remaining;later(tick,1000);};
    later(tick,1000);
  }
  react(winner===null?'turn':'win',winner===null?'Tie — rematch!':`${teamName(winner)} win!`);
  status(complete?`${teamName(champion)} win the series ${wins[champion]}–${wins[1-champion]}.`:winner===null?'Tie! Replay this game.':`${teamName(winner)} earn one series point.`);focusFirst();
}
function handoff(team,detail,action){
  turn=team;scoreboard();
  screen(`<div class="handoff"><span class="giant-icon" aria-hidden="true">${team===0?'🙌':'✌️'}</span><p class="eyebrow">PASS THE DEVICE · STARTING AUTOMATICALLY</p><h3>${teamName(team)}, you’re up!</h3><p>${detail}</p><p id="handoff-countdown" class="handoff-countdown" style="font-size:42px;font-weight:900;color:#111">4</p><small>Get ready. No button needed.</small></div>`);
  status(`${teamName(team)} start in four seconds. Pass the device.`);
  let remaining=4;
  function tick(){
    if(document.hidden){later(tick,250);return;}
    remaining--;if(remaining===0){action();focusFirst();return;}
    $('handoff-countdown').textContent=remaining;later(tick,1000);
  }
  later(tick,1000);
}
function beginRound(){
  results=[]; turn=starter; scoreboard(); status('');
  if(game.id==='memory') return memory();
  if(game.id==='tic') return handoff(turn,`${teamName(turn)} makes the first move. Adults use X; kids use O.`,tic);
  if(game.id==='rps')return handoff(turn,'Keep your move secret. The other team should look away until you pass the device.',rockPaperScissors);
  if(game.id==='maze')game.maze=makeMaze();
  if(game.id==='code')game.codes=[0,1].map(()=>Array.from({length:3},()=>1+Math.floor(Math.random()*4)));
  if(game.id==='golf')game.course=shuffle(GOLF_COURSES).slice(0,3);
  if(game.id==='challenge') game.challenge=pick('challenge',CHALLENGES,1)[0];
  if(game.id==='trivia') game.questions=pick('trivia',TRIVIA,10);
  if(game.id==='word') game.words=pick('word',WORDS,6);
  if(game.id==='picture') game.pictures=pick('picture',PICTURES,6);
  teamReady(starter);
}
function teamReady(team,previous=''){
  let detail=`Your turn starts after the countdown. ${game.description}`;
  if(game.id==='challenge') detail=`Pick ONE player per team. Same challenge, same 20 seconds. ${game.challenge[0]}: ${game.challenge[1]} The other team counts. You can play seated.`;
  handoff(team,(previous?previous+' ':'')+detail,()=>({spot, trivia:quiz,word:quiz,tap:quickTap,picture:quiz,number:quiz,challenge,maze:mazeDash,code:codeBreaker,golf:miniGolf}[game.id])());
}
function finishRound(winner,detail){
  if(recording&&winner!==null&&!recording.complete)recording.roundWinners.push(winner);
  if(series)return finishSeriesGame(winner,detail);
  const awarded=awardRound(wins,winner); wins=awarded.wins; champion=awarded.champion; scoreboard();
  if(champion>=0)saveCompleted();
  screen(`<div class="result"><span class="giant-icon">${winner===null?'🤝':champion>=0?'🏆':'🎉'}</span><p class="eyebrow">${champion>=0?'BRAGGING RIGHTS EARNED':winner===null?'EVEN STEVEN':'ROUND COMPLETE'}</p><h3>${winner===null?'It’s a tie!':`${teamName(winner)} ${champion>=0?'win the match!':'win this round!'}`}</h3><p>${detail}</p><div class="final-score">${wins[0]} <span>–</span> ${wins[1]}</div><p>${champion>=0?'High fives all around. The best win is playing together.':winner===null?'No round awarded. Let’s replay with a fresh challenge.':'Pass it back. The next round is waiting.'}</p></div>`);
  let moved=false;
  const nextRound=()=>{
    if(moved)return;
    if(document.hidden){later(nextRound,250);return;}
    moved=true;
    if(champion>=0) return openGame(game.id);
    if(winner!==null){round++; attempt=0;}else attempt++;
    starter=1-starter; beginRound();
  };
  if(champion>=0)button('Rematch →',nextRound);
  if(champion<0){
    const note=document.createElement('p');note.className='auto-note';note.textContent='Next round starts automatically in 2 seconds…';stage.appendChild(note);later(nextRound,2200);
  }
  react(winner===null?'turn':'win',winner===null?'Tie — rematch!':`${teamName(winner)} win!`);
  status(champion>=0?`${teamName(winner)} win ${wins[winner]}–${wins[1-winner]}.`:winner===null?'Tie! Replay this round.':`${teamName(winner)} earn one round win.`); focusFirst();
}
function finishTurn(result){
  results[turn]=result;
  if(!results[1-turn]){
    const previous=`${teamName(turn)}: ${result.label}.`;
    teamReady(1-turn,previous);
  }else{
    const lower=['tap','golf'].includes(game.id); const timeBreak=['spot','word','picture','number','maze'].includes(game.id);
    const winner=roundWinner(results[0],results[1],lower,timeBreak);
    const detail=names.map((n,i)=>`${n}: ${results[i].label}`).join(' · ');
    finishRound(winner,detail);
  }
}
function startClock(seconds,onEnd){
  const deadline=performance.now()+seconds*1000; timed=true;
  const tick=()=>{const left=Math.max(0,deadline-performance.now()); const el=$('game-clock'); if(el)el.textContent=`${Math.ceil(left/1000)}s`; if(left<=0){onEnd();}else later(tick,100);}; tick(); return deadline;
}
function memory(){
  const deck=shuffle([...ANIMALS,...ANIMALS]); let revealed=[],matched=new Set(),points=[0,0],locked=true,preview=true;
  screen('<div class="turn-strip" id="turn-strip"></div><div id="memory-cards" class="memory-grid"></div><div id="memory-action"></div>');
  function draw(){
    $('turn-strip').textContent=preview?`${teamName(turn)} go first! Look closely — cards hide in five seconds.`:`${teamName(turn)}’ turn · Pairs: Adults ${points[0]} / Kids ${points[1]}`;
    const holder=$('memory-cards');
    if(!holder.children.length)deck.forEach((symbol,i)=>button('?',()=>flip(i),holder,'memory-card'));
    deck.forEach((symbol,i)=>{
      const visible=preview||revealed.includes(i)||matched.has(i),b=holder.children[i];
      b.textContent=visible?symbol:'?';b.className=`memory-card${visible?' face-up':''}${matched.has(i)?' matched':''}`;
      b.disabled=locked||visible;b.setAttribute('aria-label',visible?`Card ${i+1}: ${symbol}${matched.has(i)?', matched':''}`:`Hidden card ${i+1}`);
    });
  }
  function flip(i){
    if(locked||revealed.includes(i)||matched.has(i))return;
    revealed.push(i);chime('tap');
    if(revealed.length===2){
      locked=true; const match=deck[revealed[0]]===deck[revealed[1]];
      if(match){revealed.forEach(id=>matched.add(id));points[turn]++;}
      if(matched.size===deck.length){draw();react('win','All pairs found!'); later(()=>finishRound(points[0]>points[1]?0:1,`Pairs found — Adults ${points[0]} · Kids ${points[1]}`),800);return;}
      status(match?'A pair! Ding! Next team coming up…':'No match. Remember those cards — next team coming up…');
      draw();
      react(match?'match':'turn',match?'MATCH! +1 pair':'Next team…');
      later(()=>{
        revealed=[];turn=1-turn;locked=false;scoreboard();draw();
        status(`${teamName(turn)}: find a pair.`);
      },match?600:900);return;
    }
    draw();
  }
  draw(); status('Five-second preview — both teams can look!');
  function hidePreview(){if(!preview)return;if(document.hidden){later(hidePreview,250);return;}preview=false;locked=false;draw();$('memory-action').replaceChildren();status(`${teamName(turn)}: find a pair.`);}
  later(hidePreview,5000);
}
function tic(){
  let board=Array(9).fill(null),locked=false;
  screen('<p class="turn-strip" id="turn-strip"></p><div class="tic-grid" id="tic-board"></div><div id="tic-action"></div>');
  function draw(){
    $('turn-strip').textContent=`${teamName(turn)} play ${turn===0?'X':'O'}`;
    const holder=$('tic-board');holder.replaceChildren();
    board.forEach((v,i)=>{const b=button(v===null?'':v===0?'X':'O',()=>move(i),holder,`tic-cell ${v===1?'kids-mark':''}`);b.disabled=locked||v!==null;b.setAttribute('aria-label',`Square ${i+1}, ${v===null?'empty':v===0?'Adults X':'Kids O'}`);});
  }
  function move(i){
    if(locked||board[i]!==null)return; board[i]=turn; const winner=lineWinner(board);
    if(winner!==null||board.every(v=>v!==null)){locked=true;draw();later(()=>finishRound(winner,winner===null?'Full board. Nobody connected three.':`${teamName(winner)} connected three!`),500);return;}
    locked=true;draw();react('tap','Nice move!');later(()=>{turn=1-turn;locked=false;scoreboard();draw();status(`${teamName(turn)}: choose a square.`);},300);status('Next team…');
  }
  draw();status(`${teamName(turn)}: choose a square.`);
}
function quiz(){
  const count=game.id==='trivia'||game.id==='number'?5:3;
  const seconds=game.id==='word'||game.id==='trivia'?45:30;
  let index=0,points=0,settled=false,locked=false;
  const started=performance.now();
  screen('<div class="turn-strip"><span id="question-progress"></span><strong id="game-clock"></strong></div><div id="quiz-body"></div>');
  function finish(){if(settled)return;settled=true;finishTurn({score:points,elapsed:(performance.now()-started)/1000,label:`${points}/${count} correct in ${((performance.now()-started)/1000).toFixed(1)}s`});}
  const deadline=startClock(seconds,finish);
  function nextQuestion(){
    if(settled)return; locked=false;
    $('question-progress').textContent=`${teamName(turn)} · ${index+1} / ${count} · ${points} correct`;
    const body=$('quiz-body');body.replaceChildren(); const offset=turn===starter?0:count;
    let answer,choices,prompt;
    if(game.id==='trivia') {const q=game.questions[offset+index];[prompt,answer]=q;choices=shuffle(q.slice(1));}
    if(game.id==='number'){
      const a=2+Math.floor(Math.random()*18),b=1+Math.floor(Math.random()*10),add=Math.random()<0.5;
      answer=String(add?a+b:Math.max(a,b)-Math.min(a,b)); prompt=add?`${a} + ${b} = ?`:`${Math.max(a,b)} − ${Math.min(a,b)} = ?`;
      const value=Number(answer);choices=shuffle([answer,String(value+1),String(value+3),String(value===0?2:value-1)]);
    }
    if(game.id==='word'){
      const [word,clue]=game.words[offset+index];answer=word;
      let letters=shuffle([...word]).join('');if(letters===word)letters=word.slice(1)+word[0];
      body.innerHTML=`<p class="clue">${clue}</p><h3 class="scramble">${letters}</h3><form id="word-form"><label for="word-answer">Your answer</label><input id="word-answer" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" required><button class="primary" type="submit">Check word →</button></form>`;
      $('word-form').addEventListener('submit',e=>{e.preventDefault();choose($('word-answer').value.trim().toUpperCase()===answer,answer);});
      button('Skip this word',()=>choose(false,answer),body,'text-button');$('word-answer').focus({preventScroll:true});return;
    }
    if(game.id==='picture'){
      const [symbol,label]=game.pictures[offset+index];answer=label;prompt='What’s behind the tiles?';
      choices=shuffle([label,...shuffle(PICTURES.filter(p=>p[1]!==label)).slice(0,3).map(p=>p[1])]);
      const h=document.createElement('h3');h.textContent=prompt;body.appendChild(h);
      const mystery=document.createElement('div');mystery.className='mystery';
      const art=document.createElement('span');art.textContent=symbol;art.setAttribute('aria-hidden','true');mystery.appendChild(art);
      const cover=document.createElement('div');cover.className='picture-cover';cover.setAttribute('aria-hidden','true');
      for(let i=0;i<9;i++){const tile=document.createElement('i');cover.appendChild(tile);}
      mystery.appendChild(cover);mystery.setAttribute('role','img');mystery.setAttribute('aria-label','A covered mystery picture is revealing. A text clue appears after four seconds.');body.appendChild(mystery);
      const order=shuffle([...cover.children]);order[0].classList.add('uncovered');const qi=index;
      order.slice(1).forEach((tile,i)=>later(()=>{if(!settled&&!locked&&index===qi)tile.classList.add('uncovered');},(i+1)*750));
      const hint=document.createElement('p');hint.className='clue';hint.textContent='Watch the picture reveal…';body.appendChild(hint);
      later(()=>{if(!settled&&!locked&&index===qi)hint.textContent=`Clue: starts with ${label[0]}, ${label.replace(/ /g,'').length} letters.`;},4000);
    }else {const h=document.createElement('h3');h.className=game.id==='number'?'math-question':'';h.textContent=prompt;body.appendChild(h);}
    const options=document.createElement('div');options.className='answer-grid';body.appendChild(options);
    choices.forEach(value=>button(value,()=>choose(value===answer,answer),options,'answer'));
  }
  function choose(correct,answer){
    if(settled||locked||performance.now()>=deadline)return;locked=true;
    if(correct)points++;stage.querySelectorAll('button,input').forEach(el=>el.disabled=true);
    const feedback=document.createElement('p');feedback.className=`answer-feedback ${correct?'correct':''}`;feedback.textContent=correct?'Correct! ✦':`Good try! Answer: ${answer}`;$('quiz-body').appendChild(feedback);
    react(correct?'match':'turn',correct?'Correct!':'Keep going!');status(correct?'Correct!':'Keep going!');
    later(()=>{index++;if(index===count)finish();else nextQuestion();},650);
  }
  nextQuestion();status(`${teamName(turn)}’ turn. The clock is running!`);
}
function spot(){
  let index=0,points=0,mistakes=0,settled=false; const started=performance.now();
  screen('<div class="turn-strip"><span id="spot-progress"></span><strong id="game-clock"></strong></div><p>Compare both grids. Tap the changed tile in the lower grid.</p><div id="spot-body"></div>');
  function finish(){if(settled)return;settled=true;const elapsed=(performance.now()-started)/1000+mistakes;finishTurn({score:points,elapsed,label:`${points}/3 found · ${elapsed.toFixed(1)}s including ${mistakes}s penalties`});}
  const deadline=startClock(30,finish);
  function puzzle(){
    const icons=shuffle(['🌻','🌵','🍄','🌴','🌷','🍀','🌼','🌹','🌲','🌺','🪻','🌿']);
    const original=shuffle([...icons.slice(0,4),...icons.slice(0,4)]).slice(0,6);const changed=Math.floor(Math.random()*6);
    const body=$('spot-body');body.replaceChildren();$('spot-progress').textContent=`${teamName(turn)} · Grid ${index+1} / 3`;
    const reference=document.createElement('div');reference.className='spot-grid reference';reference.setAttribute('aria-label','Original grid');
    original.forEach((icon,i)=>{const s=document.createElement('span');s.textContent=icon;s.setAttribute('role','img');s.setAttribute('aria-label',`Original tile ${i+1}: ${icon}`);reference.appendChild(s);});body.appendChild(reference);
    const label=document.createElement('p');label.className='eyebrow';label.textContent='TAP THE DIFFERENCE BELOW';body.appendChild(label);
    const target=document.createElement('div');target.className='spot-grid';body.appendChild(target);
    original.forEach((icon,i)=>{const value=i===changed?icons[5]:icon; const b=button(value,()=>{
      if(settled||performance.now()>=deadline)return;
      if(i!==changed){mistakes++;b.disabled=true;b.classList.add('wrong');status('Try another tile. One second added to your time.');return;}
      points++;index++;if(index===3)finish();else {puzzle();react('match','Found it!');}
    },target,'spot-tile');b.setAttribute('aria-label',`Changed grid tile ${i+1}: ${value}`);});
  }
  puzzle();status('Find three differences. Wrong taps add one second to your result.');
}
function quickTap(){
  let trial=0,values=[],phase='ready',signalAt=0;
  screen('<div class="turn-strip"><span id="tap-progress"></span></div><div id="tap-zone"></div>');
  function prepare(){
    phase='ready';$('tap-progress').textContent=`${teamName(turn)} · Test ${trial+1} / 3`;
    $('tap-zone').replaceChildren();wait();
    status('Rest a finger near the pad. Wait for the yellow GO! signal, then tap.');
  }
  function wait(){
    if(phase!=='ready')return;phase='waiting';$('tap-zone').replaceChildren();
    button('WAIT…',()=>{if(phase==='waiting')record(1500,true);else if(phase==='green')record(Math.round(performance.now()-signalAt),false);},$('tap-zone'),'tap-pad waiting');
    timed=true;later(()=>{if(phase!=='waiting')return;phase='green';signalAt=performance.now();const pad=$('tap-zone').querySelector('button');pad.className='tap-pad green';pad.textContent='GO! TAP!';later(()=>{if(phase==='green')record(1500,false);},1500);},1200+Math.random()*2200);
  }
  function record(ms,early){
    if(phase!=='waiting'&&phase!=='green')return;phase='result';clearTimers();values.push(ms);trial++;
    $('tap-zone').replaceChildren();const p=document.createElement('p');p.className='reaction-result';p.textContent=early?'Too soon! +1,500 ms':ms>=1500?'Time’s up! 1,500 ms':`${ms} ms`;$('tap-zone').appendChild(p);
    later(()=>{if(trial===3){const avg=Math.round(values.reduce((a,b)=>a+b,0)/3);finishTurn({score:avg,elapsed:avg,label:`${avg} ms average`});}else prepare();},1000);
    status('Lower is faster. Same three tests for each team.');
  }
  prepare();
}
function challenge(){
  let finished=false; screen(`<p class="eyebrow">${teamName(turn).toUpperCase()} · REAL-WORLD ROUND</p><h3>${game.challenge[0]}</h3><p>${game.challenge[1]}</p><div id="game-clock" class="challenge-clock">20s</div><p>Other team: count complete repetitions out loud.</p>`);
  startClock(20,()=>{
    if(finished)return;finished=true;screen(`<div class="result"><span class="giant-icon">⏱</span><h3>Stop! How many?</h3><p>Other team: enter the repetitions you counted for ${teamName(turn)}.</p><form id="challenge-form"><label for="challenge-score">Repetitions completed</label><input id="challenge-score" type="number" min="0" max="999" step="1" inputmode="numeric" required><button class="primary" type="submit">Confirm score →</button></form><p class="clue">Scores are counted by your family. Be fair. Have fun.</p></div>`);
    $('challenge-form').addEventListener('submit',e=>{e.preventDefault();const value=Number($('challenge-score').value);if(Number.isInteger(value)&&value>=0&&value<=999)finishTurn({score:value,elapsed:20,label:`${value} repetitions`});});status('Time! Enter the score together.');focusFirst();
  });status('Go! Twenty seconds. Count each complete repetition.');
}

function rockPaperScissors(){
  const choices=[null,null],labels=['Rock','Paper','Scissors'],hands=['✊','✋','✌️'],moves=labels.map((label,i)=>`${label} ${hands[i]}`);
  const first=starter;
  function reveal(){
    const winner=rpsWinner(choices);
    const rule=winner===null?'Same move — it’s a tie!':choices[winner]===0?'Rock beats scissors!':choices[winner]===1?'Paper covers rock!':'Scissors cut paper!';
    screen(`<div class="rps-battle"><p class="eyebrow">BOTH MOVES ARE LOCKED IN</p><h3>SHOW YOUR HANDS!</h3><div class="rps-battle-board"><div class="rps-battle-team"><b>★ ADULTS</b><span class="rps-battle-hand" role="img" aria-label="${labels[choices[0]]}">${hands[choices[0]]}</span><strong>${labels[choices[0]]}</strong></div><span class="rps-battle-vs">VS.</span><div class="rps-battle-team kids"><b>✦ KIDS</b><span class="rps-battle-hand" role="img" aria-label="${labels[choices[1]]}">${hands[choices[1]]}</span><strong>${labels[choices[1]]}</strong></div></div><p id="rps-battle-call" role="status">Rock… Paper… Scissors… SHOWDOWN!</p></div>`);
    react('tap','SHOWDOWN!');status('Both teams: watch the showdown!');
    later(()=>{$('rps-battle-call').textContent=rule;react(winner===null?'turn':'match',winner===null?'TIE!':`${teamName(winner)} take the round!`);},1100);
    later(()=>finishRound(winner,`Adults: ${moves[choices[0]]} · Kids: ${moves[choices[1]]}. ${rule}`),2600);
  }
  function choose(){
    screen(`<p class="eyebrow">${teamName(turn).toUpperCase()} · SECRET MOVE</p><h3>What’s your move?</h3><p>Other team: look away. Your choice stays hidden until both teams have picked.</p><div id="rps-options" class="rps-options"></div>`);
    moves.forEach((move,i)=>{
      const pick=button(move,()=>{
        if(choices[turn]!==null)return;choices[turn]=i;
        if(choices[1-turn]===null){
          turn=1-first;scoreboard();
          screen(`<div class="handoff"><span class="giant-icon" aria-hidden="true">🙌</span><p class="eyebrow">PASS THE DEVICE</p><h3>${teamName(turn)}, you’re next!</h3><p>The first move is hidden. Pass the device without looking back.</p><p class="rps-pass-count" style="font-size:48px;font-weight:900;color:#111" id="rps-pass-count">4</p><small>Your choices appear automatically.</small></div>`);
          status(`Pass to ${teamName(turn)}. Their choices open in four seconds.`);
          let remaining=4;
          const tick=()=>{remaining--;if(remaining===0){choose();focusFirst();return;}$('rps-pass-count').textContent=remaining;later(tick,1000);};
          later(tick,1000);
        }else reveal();
      },$('rps-options'),'answer rps-choice');
      pick.innerHTML=`<span class="rps-choice-label">${labels[i]}</span> <span class="rps-choice-hand" aria-hidden="true">${hands[i]}</span>`;
      pick.setAttribute('aria-label',labels[i]);
    });
    status(`${teamName(turn)}: pick a secret move.`);focusFirst();
  }
  choose();
}
function mazeDash(){
  const {size,cells}=game.maze;let position=0,settled=false,steps=0;
  const started=performance.now(),delta=[-size,1,size,-1];
  screen('<div class="turn-strip"><span id="maze-progress"></span><strong id="game-clock"></strong></div><p>Use the arrows to reach the flag. Solid black lines are walls.</p><div id="maze-board" class="maze-board" role="img" aria-label="Maze"></div><div id="maze-controls" class="maze-controls"></div>');
  function finish(escaped){
    if(settled)return;settled=true;
    const elapsed=escaped?(performance.now()-started)/1000:45;
    const result={score:escaped?1:0,elapsed,label:escaped?`Escaped in ${elapsed.toFixed(1)}s · ${steps} moves`:'No escape in 45 seconds'};
    if(escaped&&turn===1){
      screen('<div class="result maze-celebration"><div class="maze-confetti" aria-hidden="true"><i>★</i><i>✦</i><i>★</i><i>✦</i><i>★</i><i>✦</i></div><span class="giant-icon" role="img" aria-label="Celebration">🎉</span><p class="eyebrow">MAZE COMPLETE!</p><h3>WAY TO GO, KIDS!</h3><p>You found the way out!</p><p>'+result.label+'</p></div>');
      react('win','MAZE COMPLETE!');status('Way to go, Kids! You completed the maze!');
      later(()=>finishTurn(result),2000);
    }else finishTurn(result);
  }
  function draw(){
    $('maze-progress').textContent=`${teamName(turn)} · ${steps} moves`;
    $('maze-board').innerHTML=cells.map((walls,i)=>`<span class="maze-cell ${i===position?'player':''}" style="border-top:${walls[0]?3:0}px solid #111;border-right:${walls[1]?3:0}px solid #111;border-bottom:${walls[2]?3:0}px solid #111;border-left:${walls[3]?3:0}px solid #111">${i===position?'●':i===cells.length-1?'⚑':''}</span>`).join('');
    $('maze-board').setAttribute('aria-label',`Player row ${Math.floor(position/size)+1}, column ${position%size+1}. Goal row ${size}, column ${size}.`);
    $('maze-controls').replaceChildren();
    ['↑ Up','→ Right','↓ Down','← Left'].forEach((label,d)=>{
      const b=button(label,()=>{
        if(settled||cells[position][d])return;
        position+=delta[d];steps++;if(position===cells.length-1)return finish(true);draw();
      },$('maze-controls'),'answer');b.innerHTML=`<span class="maze-direction-arrow" aria-hidden="true">${label[0]}</span> <span class="maze-direction-label">${label.slice(2)}</span>`;b.setAttribute('aria-label',label.slice(2));b.disabled=cells[position][d];
    });
  }
  draw();startClock(45,()=>finish(false));status('Find the flag. You can only move through open paths.');
}
function codeBreaker(){
  let guesses=0,settled=false,guess=[1,1,1];const secret=game.codes[turn];
  screen('<div class="turn-strip"><span id="code-progress"></span><strong id="game-clock"></strong></div><h3>Crack the three-digit code.</h3><p>Tap a digit to cycle 1 → 2 → 3 → 4. Repeats are allowed. Exact = correct digit and place. Misplaced = correct digit, different place.</p><div id="code-digits" class="code-digits"></div><div id="code-action"></div><ol id="code-history" class="code-history" aria-label="Your guesses"></ol>');
  function finish(solved){if(settled)return;settled=true;finishTurn({score:solved?7-guesses:0,elapsed:0,label:solved?`Code cracked in ${guesses} ${guesses===1?'guess':'guesses'}`:`Code not cracked · ${guesses} guesses`});}
  function draw(){
    $('code-progress').textContent=`${teamName(turn)} · Guess ${guesses+1} of 6`;
    $('code-digits').replaceChildren();
    guess.forEach((v,i)=>{const b=button(String(v),()=>{if(settled)return;guess[i]=guess[i]%4+1;draw();},$('code-digits'),'code-digit');b.setAttribute('aria-label',`Digit ${i+1}: ${v}. Tap to change.`);});
  }
  button('Test code →',()=>{
    if(settled)return;guesses++;const clues=codeClues(secret,guess);
    if(clues.exact===3)return finish(true);
    const row=document.createElement('li');row.textContent=`${guess.join(' ')} — ${clues.exact} exact · ${clues.misplaced} misplaced`;$('code-history').appendChild(row);
    if(guesses===6)return finish(false);
    draw();status(`${clues.exact} exact, ${clues.misplaced} misplaced. Use the clues for your next guess.`);
  },$('code-action'));
  draw();startClock(60,()=>finish(false));status('Your secret code is ready. Six guesses. Think it through.');
}
function miniGolf(){
  let hole=0,shots=0,total=0,moving=false,finished=false,ball;
  screen('<div class="turn-strip"><span id="golf-progress"></span><strong id="golf-strokes"></strong></div><div id="golf-course" class="golf-course"></div><div id="golf-controls"><label for="golf-angle">Aim: <span id="golf-angle-value"></span>° (0° right · 90° down · 180° left · 270° up)</label><input id="golf-angle" type="range" min="0" max="355" step="5" value="340"><label for="golf-power">Power: <span id="golf-power-value"></span>%</label><input id="golf-power" type="range" min="10" max="100" step="5" value="55"><div id="golf-action"></div></div><div id="golf-hole-result"></div>');
  const angle=$('golf-angle'),power=$('golf-power');angle.value='340';power.value='55';
  function draw(){
    const c=game.course[hole],[wx,wy,ww,wh]=c.wall;
    const rad=Number(angle.value)*Math.PI/180;
    $('golf-progress').textContent=`${teamName(turn)} · Hole ${hole+1} of 3`;
    $('golf-strokes').textContent=`Shot ${Math.min(shots+1,4)} / 4 · Total ${total}`;
    $('golf-angle-value').textContent=angle.value;$('golf-power-value').textContent=power.value;
    $('golf-course').innerHTML=`<svg viewBox="0 0 360 200" role="img" aria-label="Mini golf hole ${hole+1}. Ball at ${Math.round(ball.x)}, ${Math.round(ball.y)}. Cup at ${c.hole[0]}, ${c.hole[1]}. Wall in the middle."><rect width="360" height="200" rx="8" fill="#ffd522" stroke="#111" stroke-width="6"></rect><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#111"></rect><circle cx="${c.hole[0]}" cy="${c.hole[1]}" r="10" fill="#111"></circle><text x="${c.hole[0]+12}" y="${c.hole[1]+4}" font-size="16">⚑</text>${moving?'':`<line x1="${ball.x}" y1="${ball.y}" x2="${ball.x+Math.cos(rad)*40}" y2="${ball.y+Math.sin(rad)*40}" stroke="#111" stroke-width="2" stroke-dasharray="4 3"></line>`}<circle cx="${ball.x}" cy="${ball.y}" r="4" fill="#fff" stroke="#111" stroke-width="1.5"></circle></svg>`;
  }
  function startHole(){
    shots=0;moving=false;ball={x:game.course[hole].ball[0],y:game.course[hole].ball[1],vx:0,vy:0};
    $('golf-hole-result').replaceChildren();$('golf-controls').hidden=false;
    angle.disabled=false;power.disabled=false;shoot.disabled=false;draw();status('Line up the dashed aim guide. Bank around the black wall. A gentle ball can drop into the cup.');
  }
  function endHole(sunk){
    total+=sunk?shots:5;$('golf-controls').hidden=true;
    const note=document.createElement('p');note.textContent=sunk?`In the cup! ${shots} ${shots===1?'stroke':'strokes'}.`:'Four shots used. This hole counts as five strokes.';$('golf-hole-result').appendChild(note);
    draw();later(()=>{
      if(finished)return;
      if(hole===2){finished=true;finishTurn({score:total,elapsed:0,label:`${total} strokes across 3 holes`});}
      else {hole++;startHole();}
    },1200);
    status(sunk?'Nice putt!':'Keep going! A new hole is waiting.');focusFirst();
  }
  const shoot=button('Putt →',()=>{
    if(moving||finished||$('golf-controls').hidden)return;
    moving=true;timed=true;shots++;angle.disabled=true;power.disabled=true;shoot.disabled=true;
    const rad=Number(angle.value)*Math.PI/180,speed=Number(power.value)*0.09;
    ball.vx=Math.cos(rad)*speed;ball.vy=Math.sin(rad)*speed;
    let frames=0;
    function frame(){
      ball=golfStep(ball,game.course[hole]);frames++;draw();
      if(ball.sunk||Math.hypot(ball.vx,ball.vy)<0.12||frames>=240){
        moving=false;timed=false;
        if(ball.sunk||shots===4)return endHole(ball.sunk);
        angle.disabled=false;power.disabled=false;shoot.disabled=false;draw();status('Ball stopped. Adjust your aim and power for the next putt.');
      }else later(frame,16);
    }
    frame();
  },$('golf-action'));
  angle.addEventListener('input',()=>{if(!moving)draw();});power.addEventListener('input',()=>{if(!moving)draw();});
  startHole();
}

const recentKey=`avk-arcade-recent:${arcadeAccountId}`;
function gameTile(g,parent){
 const tile=button('',()=>openGame(g.id),parent,'game-tile cover-tile');
 tile.setAttribute('data-game',g.id);tile.setAttribute('aria-label',`Play ${g.name}`);tile.innerHTML=coverMarkup(g);return tile;
}
function renderRecent(){
 let ids=[];try{ids=recentGames(localStorage,recentKey,GAMES);}catch{}
 $('arcade-recent-section').hidden=!ids.length;$('arcade-recent').replaceChildren();
 ids.forEach(id=>gameTile(GAMES.find(g=>g.id===id),$('arcade-recent')));
}
function rememberGame(id){
 try{const ids=recentGames(localStorage,recentKey,GAMES);localStorage.setItem(recentKey,JSON.stringify([id,...ids.filter(x=>x!==id)].slice(0,8)));}catch{}
 renderRecent();
}
GAMES.forEach(g=>gameTile(g,$('arcade-grid')));
['memory','maze','golf','tap','tic','trivia','rps'].forEach(id=>gameTile(GAMES.find(g=>g.id===id),$('arcade-favorites')));
renderRecent();
for(const shelf of ['favorites','recent','all']){
 const track=$(shelf==='all'?'arcade-grid':`arcade-${shelf}`);
 for(const [direction,sign] of [['prev',-1],['next',1]])$(`shelf-${shelf}-${direction}`).addEventListener('click',()=>track.scrollBy({left:sign*track.clientWidth*.8,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
}
let featuredIndex=0,featuredPaused=false,featuredTimer=null;
function renderFeatured(){
 const g=GAMES[featuredIndex];
 $('arcade-feature-title').textContent=g.name;
 $('feature-description').textContent=g.tag;
 $('feature-play-label').textContent='▶ PLAY '+g.name.toUpperCase();
 $('arcade-featured-play').setAttribute('aria-label','Play '+g.name);
 $('feature-art').innerHTML=`<div class="feature-poster" data-game="${g.id}">${coverMarkup(g)}</div><span class="feature-stamp">LESS SUPERVISING.<br><b>MORE PLAYING.</b></span>`;
 $('feature-position').textContent=(featuredIndex+1)+' / '+GAMES.length;
}
function scheduleFeatured(){
 clearTimeout(featuredTimer);
 if(featuredPaused||!arena.hidden||document.hidden)return;
 featuredTimer=setTimeout(()=>{featuredIndex=(featuredIndex+1)%GAMES.length;renderFeatured();scheduleFeatured();},6500);
}
$('arcade-featured-play').addEventListener('click',()=>openGame(GAMES[featuredIndex].id));
$('feature-prev').addEventListener('click',()=>{featuredIndex=(featuredIndex+GAMES.length-1)%GAMES.length;renderFeatured();scheduleFeatured();});
$('feature-next').addEventListener('click',()=>{featuredIndex=(featuredIndex+1)%GAMES.length;renderFeatured();scheduleFeatured();});
$('feature-pause').addEventListener('click',()=>{featuredPaused=!featuredPaused;$('feature-pause').textContent=featuredPaused?'Resume slides':'Pause slides';$('feature-pause').setAttribute('aria-pressed',String(featuredPaused));scheduleFeatured();});
renderFeatured();scheduleFeatured();

$('arcade-random').addEventListener('click',startSeries);
$('arcade-return').addEventListener('click',()=>{clearTimers();series=null;arena.hidden=true;lobby.hidden=false;game=null;scheduleFeatured();$('arcade-grid').querySelector('button')?.focus();});
$('arcade-reset').addEventListener('click',()=>{
  if(!game)return;const saved=game.id;const wasSeries=!!series;screen('<div class="result"><h3>Start over?</h3><p>The current game and all points in this match or series will reset.</p></div>');
  button(wasSeries?'Restart series':'Restart match',()=>wasSeries?startSeries():openGame(saved));button('Return to Arcade',()=>{$('arcade-return').click();},stage,'text-button');status('Match paused. Choose restart or return to the Arcade.');
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)clearTimeout(featuredTimer);else scheduleFeatured();
  if(document.hidden&&timed&&game){clearTimers();screen('<div class="result"><h3>Let’s give both teams a fair turn.</h3><p>The timed game was interrupted. Replay this round with no round win awarded.</p></div>');button('Replay this round →',beginRound);status('Round interrupted. Match score is unchanged.');}
});
