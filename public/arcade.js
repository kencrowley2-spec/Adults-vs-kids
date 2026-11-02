import {GAMES, ANIMALS, TRIVIA, WORDS, PICTURES, CHALLENGES} from './arcade-data.js?v=5';
import {teamName, shuffle, roundWinner, awardRound, lineWinner} from './arcade-core.js';

import {makeMaze, codeClues, rpsWinner, GOLF_COURSES, golfStep} from './arcade-new-core.js?v=5';

const $ = id => document.getElementById(id);
const lobby=$('arcade-lobby'), arena=$('arcade-game'), stage=$('game-stage');
let game, wins=[0,0], round=1, attempt=0, starter=0, turn=0, results=[], champion=-1;
let series=null;
let timers=[], generation=0, timed=false, used={};
const names=['Adults','Kids'];
function clearTimers(){ generation++; timers.forEach(clearTimeout); timers=[]; timed=false; }
function later(fn,delay){ const token=generation; const timer=setTimeout(()=>{if(token===generation)fn();},delay); timers.push(timer); }
function screen(html){ clearTimers(); stage.innerHTML=html; }
function button(label,action,parent=stage,className='primary'){
  const b=document.createElement('button'); b.type='button'; b.className=className; b.textContent=label; b.addEventListener('click',action); parent.appendChild(b); return b;
}
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
  series=null;
  game=GAMES.find(g=>g.id===id); lobby.hidden=true; arena.hidden=false;
  $('game-title').textContent=`${game.icon} ${game.name}`; used={}; wins=[0,0]; round=1; attempt=0; starter=0; turn=0; champion=-1; results=[];
  scoreboard(); screen(`<div class="intro"><span class="giant-icon">${game.icon}</span><p class="eyebrow">${game.tag}</p><h3>Parents vs. kids.<br>Bring your game face.</h3><p>${game.description}</p><div class="rule-chips"><span>2 teams · 1 device</span><span>First to 3 round wins</span></div></div>`);
  button('Parents first →',()=>{starter=0;beginRound();});
  button('Kids first →',()=>{starter=1;beginRound();});
  status('Who goes first? Choose parents or kids to start the match.'); focusFirst();
}
function startSeries(){
  clearTimers();
  series={games:shuffle(GAMES).slice(0,3),index:0,winners:[],first:0};
  wins=[0,0]; round=1; attempt=0; starter=0; turn=0; champion=-1; results=[]; used={};
  game=series.games[0]; lobby.hidden=true; arena.hidden=false;
  $('game-title').textContent='Random 3 Game Pick Challenge'; scoreboard();
  screen('<div class="intro"><span class="giant-icon">🏆</span><p class="eyebrow">BEST OF THREE DIFFERENT GAMES</p><h3>Three games.<br>One family showdown.</h3><p>Your random lineup is ready! Play one round of each game. Each win earns one series point. We play all three, even if a team wins the first two. Ties replay the same game.</p><div class="rule-chips"><span>No repeat games</span><span>Automatic next game</span><span>Most game wins takes it</span></div></div>');
  button('Parents first →',()=>{series.first=0;startSeriesGame();});
  button('Kids first →',()=>{series.first=1;startSeriesGame();});
  status('Choose who starts game one. Starting teams alternate each game.'); focusFirst();
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
  screen(`<div class="result"><span class="giant-icon">${winner===null?'🤝':complete?'🏆':'🎉'}</span><p class="eyebrow">${complete?'SERIES COMPLETE':winner===null?'TIE · SAME GAME':'GAME COMPLETE'}</p><h3>${complete?`${teamName(champion)} win the series!`:winner===null?'It’s a tie!':`${teamName(winner)} win game ${series.index+1}!`}</h3><p>${detail}</p><div class="final-score">${wins[0]} <span>–</span> ${wins[1]}</div><p>${complete?'Three games. One great time together. High fives all around.':winner===null?'No point awarded. Replay this game to settle it.':`Up next: ${series.games[series.index+1].icon} ${series.games[series.index+1].name}. Starting in <strong id="next-game-countdown">5</strong> seconds…`}</p></div>`);
  if(complete){button('New random challenge →',startSeries);button('Return to Arcade',()=>{$('arcade-return').click();},stage,'text-button');}
  else if(winner===null) button('Replay game →',()=>{attempt++;starter=1-starter;beginRound();});
  else {
    // Both countdown and button use one guarded transition; screen changes cancel timers.
    let moved=false,remaining=5;
    const next=()=>{if(moved)return;moved=true;series.index++;startSeriesGame();};
    button('Next game now →',next);
    const tick=()=>{remaining--;if(remaining===0)return next();$('next-game-countdown').textContent=remaining;later(tick,1000);};
    later(tick,1000);
  }
  status(complete?`${teamName(champion)} win the series ${wins[champion]}–${wins[1-champion]}.`:winner===null?'Tie! Replay this game.':`${teamName(winner)} earn one series point.`);focusFirst();
}
function handoff(team,detail,action){
  turn=team; scoreboard(); screen(`<div class="handoff"><span class="giant-icon" aria-hidden="true">${team===0?'🙌':'✌️'}</span><p class="eyebrow">PASS THE DEVICE</p><h3>${teamName(team)}, you’re up!</h3><p>${detail}</p><small>Other team: cheer them on. Keep answers to yourself!</small></div>`);
  button(`${teamName(team)} ready →`,action); status('The game waits while you pass the device.'); focusFirst();
}
function beginRound(){
  results=[]; turn=starter; scoreboard(); status('');
  if(game.id==='memory') return handoff(turn,'Both teams: watch the five-second card preview together. Then the starting team gets the first pick.',memory);
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
function teamReady(team){
  let detail=`Your own turn starts only when you’re ready. ${game.description}`;
  if(game.id==='challenge') detail=`Pick ONE player per team. Same challenge, same 20 seconds. ${game.challenge[0]}: ${game.challenge[1]} The other team counts. You can play seated.`;
  handoff(team,detail,()=>({spot, trivia:quiz,word:quiz,tap:quickTap,picture:quiz,number:quiz,challenge,maze:mazeDash,code:codeBreaker,golf:miniGolf}[game.id])());
}
function finishRound(winner,detail){
  if(series)return finishSeriesGame(winner,detail);
  const awarded=awardRound(wins,winner); wins=awarded.wins; champion=awarded.champion; scoreboard();
  screen(`<div class="result"><span class="giant-icon">${winner===null?'🤝':champion>=0?'🏆':'🎉'}</span><p class="eyebrow">${champion>=0?'BRAGGING RIGHTS EARNED':winner===null?'EVEN STEVEN':'ROUND COMPLETE'}</p><h3>${winner===null?'It’s a tie!':`${teamName(winner)} ${champion>=0?'win the match!':'win this round!'}`}</h3><p>${detail}</p><div class="final-score">${wins[0]} <span>–</span> ${wins[1]}</div><p>${champion>=0?'High fives all around. The best win is playing together.':winner===null?'No round awarded. Let’s replay with a fresh challenge.':'Pass it back. The next round is waiting.'}</p></div>`);
  button(champion>=0?'Rematch →':winner===null?'Replay round →':'Next round →',()=>{
    if(champion>=0) return openGame(game.id);
    if(winner!==null){round++; attempt=0;}else attempt++;
    starter=1-starter; beginRound();
  });
  status(champion>=0?`${teamName(winner)} win ${wins[winner]}–${wins[1-winner]}.`:winner===null?'Tie! Replay this round.':`${teamName(winner)} earn one round win.`); focusFirst();
}
function finishTurn(result){
  results[turn]=result;
  if(!results[1-turn]){
    screen(`<div class="result"><span class="giant-icon">👏</span><h3>${teamName(turn)}’ turn is complete!</h3><p>${result.label}</p><p>Pass the device for the other team’s challenge.</p></div>`);
    button(`Pass to ${teamName(1-turn)} →`,()=>teamReady(1-turn)); status('Nice effort! Both teams get a full turn.'); focusFirst();
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
    $('turn-strip').textContent=preview?'Look closely! Cards hide in five seconds.':`${teamName(turn)}’ turn · Pairs: Adults ${points[0]} / Kids ${points[1]}`;
    const holder=$('memory-cards'); holder.replaceChildren();
    deck.forEach((symbol,i)=>{const visible=preview||revealed.includes(i)||matched.has(i); const b=button(visible?symbol:'?',()=>flip(i),holder,`memory-card${visible?' face-up':''}${matched.has(i)?' matched':''}`);b.disabled=locked||visible;b.setAttribute('aria-label',visible?`Card ${i+1}: ${symbol}${matched.has(i)?', matched':''}`:`Hidden card ${i+1}`);});
  }
  function flip(i){
    if(locked||revealed.includes(i)||matched.has(i))return;
    revealed.push(i);
    if(revealed.length===2){
      locked=true; const match=deck[revealed[0]]===deck[revealed[1]];
      if(match){revealed.forEach(id=>matched.add(id));points[turn]++;}
      if(matched.size===deck.length){draw(); later(()=>finishRound(points[0]>points[1]?0:1,`Pairs found — Adults ${points[0]} · Kids ${points[1]}`),800);return;}
      status(match?'A pair! One point. Now pass the device.':'No match. Remember those cards, then pass the device.');
      draw();
      button('Hide cards & pass →',()=>{
        revealed=[];turn=1-turn;scoreboard();draw();$('memory-action').replaceChildren();
        button(`${teamName(turn)} ready →`,()=>{locked=false;draw();$('memory-action').replaceChildren();status(`${teamName(turn)}: find a pair.`);},$('memory-action'));
        status(`Pass the device to ${teamName(turn)}.`);
      },$('memory-action'));return;
    }
    draw();
  }
  draw(); status('Five-second preview — both teams can look!');
  later(()=>{preview=false;locked=false;draw();status(`${teamName(turn)}: find a pair.`);},5000);
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
    locked=true;draw();button(`Pass to ${teamName(1-turn)} →`,()=>{turn=1-turn;locked=false;scoreboard();$('tic-action').replaceChildren();draw();status(`${teamName(turn)}: choose a square.`);},$('tic-action'));status('Pass the device before the next move.');
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
    status(correct?'Correct!':'Keep going!');
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
      points++;index++;if(index===3)finish();else puzzle();
    },target,'spot-tile');b.setAttribute('aria-label',`Changed grid tile ${i+1}: ${value}`);});
  }
  puzzle();status('Find three differences. Wrong taps add one second to your result.');
}
function quickTap(){
  let trial=0,values=[],phase='ready',signalAt=0;
  screen('<div class="turn-strip"><span id="tap-progress"></span></div><div id="tap-zone"></div>');
  function prepare(){
    phase='ready';$('tap-progress').textContent=`${teamName(turn)} · Test ${trial+1} / 3`;
    $('tap-zone').replaceChildren();button('Start reaction test →',wait,$('tap-zone'),'tap-pad ready');
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
    if(trial===3){const avg=Math.round(values.reduce((a,b)=>a+b,0)/3);button('Finish turn →',()=>finishTurn({score:avg,elapsed:avg,label:`${avg} ms average`}),$('tap-zone'));}
    else button('Next test →',prepare,$('tap-zone'));
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
  const choices=[null,null],moves=['Rock ✊','Paper ✋','Scissors ✌️'];
  const first=starter;
  function choose(){
    screen(`<p class="eyebrow">${teamName(turn).toUpperCase()} · SECRET MOVE</p><h3>What’s your move?</h3><p>Other team: look away. Your choice stays hidden until both teams have picked.</p><div id="rps-options" class="rps-options"></div>`);
    moves.forEach((move,i)=>button(move,()=>{
      if(choices[turn]!==null)return;choices[turn]=i;
      if(choices[1-turn]===null){
        handoff(1-first,'The first move is hidden. Choose yours without looking back.',choose);
      }else finishRound(rpsWinner(choices),`Adults: ${moves[choices[0]]} · Kids: ${moves[choices[1]]}`);
    },$('rps-options'),'answer'));
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
    finishTurn({score:escaped?1:0,elapsed,label:escaped?`Escaped in ${elapsed.toFixed(1)}s · ${steps} moves`:'No escape in 45 seconds'});
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
      },$('maze-controls'),'answer');b.disabled=cells[position][d];
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
    draw();button(hole===2?'Finish turn →':'Next hole →',()=>{
      if(finished)return;
      if(hole===2){finished=true;finishTurn({score:total,elapsed:0,label:`${total} strokes across 3 holes`});}
      else {hole++;startHole();}
    },$('golf-hole-result'));
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

GAMES.forEach(g=>{
  const tile=button('',()=>openGame(g.id),$('arcade-grid'),`game-tile ${g.color}`);
  tile.innerHTML=`<span class="tile-top"><span class="emoji" aria-hidden="true">${g.icon}</span><span class="tile-arrow" aria-hidden="true">↗</span></span><small>${g.tag}</small><b>${g.name}</b><span class="tile-footer">PLAY NOW <span>BEST OF 5</span></span>`;
});
$('arcade-random').addEventListener('click',startSeries);
$('arcade-return').addEventListener('click',()=>{clearTimers();series=null;arena.hidden=true;lobby.hidden=false;game=null;$('arcade-grid').querySelector('button')?.focus();});
$('arcade-reset').addEventListener('click',()=>{
  if(!game)return;const saved=game.id;const wasSeries=!!series;screen('<div class="result"><h3>Start over?</h3><p>The current game and all points in this match or series will reset.</p></div>');
  button(wasSeries?'Restart series':'Restart match',()=>wasSeries?startSeries():openGame(saved));button('Return to Arcade',()=>{$('arcade-return').click();},stage,'text-button');status('Match paused. Choose restart or return to the Arcade.');
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&timed&&game){clearTimers();screen('<div class="result"><h3>Let’s give both teams a fair turn.</h3><p>The timed game was interrupted. Replay this round with no round win awarded.</p></div>');button('Replay this round →',beginRound);status('Round interrupted. Match score is unchanged.');}
});
