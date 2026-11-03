import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as core from '../public/arcade-core.js';
import * as data from '../public/arcade-data.js';
import * as newCore from '../public/arcade-new-core.js';
import * as library from '../public/arcade-library.js';

// Small DOM/clock fixture executes the actual game controller without a browser
// or real-time waits. Browser QA covers layout and native form behavior.
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.handlers={};this.hidden=false;this.disabled=false;this.value='';this._text='';this.className='';this.classList={add:(s)=>{this.className+=' '+s;}};}
  getContext(){return new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(target,key)=>target[key]??(()=>{})});}
  appendChild(el){this.children.push(el);return el;}
  replaceChildren(...els){this.children=els;this._text='';}
  setAttribute(k,v){this.attrs[k]=v;if(k==='id')this.id=v;if(k==='class')this.className=v;}
  getAttribute(k){return this.attrs[k]??null;}
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
  click(){if(!this.disabled)this.dispatch('click');}
  dispatch(type,event={}){for(const fn of this.handlers[type]??[])fn({preventDefault(){},...event});}
  focus(){}
  set textContent(s){this._text=String(s);this.children=[];}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set innerHTML(s){
    this.replaceChildren();let stack=[this];
    for(const part of s.match(/<[^>]+>|[^<]+/g)??[]){
      if(part.startsWith('</')){stack.pop();continue;}
      if(part.startsWith('<')){const tag=part.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
        const el=new Element(tag);for(const m of part.matchAll(/([\w-]+)="([^"]*)"/g))el.setAttribute(m[1],m[2]);
        stack.at(-1).appendChild(el);if(!['input','br','meta','link'].includes(tag))stack.push(el);
      }else {const t=new Element('#text');t.textContent=part;stack.at(-1).appendChild(t);}
    }
  }
  querySelectorAll(selector){const selectors=selector.split(',');const out=[];
    function walk(el){for(const c of el.children){if(selectors.some(s=>s.startsWith('#')?c.id===s.slice(1):c.tagName===s))out.push(c);walk(c);}}
    walk(this);return out;
  }
  querySelector(s){return this.querySelectorAll(s)[0]??null;}
}
function fixture(firstTeam=0,withSpeech=false,withAudio=false,players=null){
  let selectedFirst=firstTeam;const testMath=Object.create(Math);testMath.random=()=>selectedFirst===0?.25:.75;
  let now=0,seq=0,scheduled=new Map();const saved=[],telemetry=[];const root=new Element();
  root.innerHTML=readFileSync(new URL('../app/family/arcade/route.ts',import.meta.url),'utf8').split('const html=`')[1].split('`;')[0];
  if(players){const lineup=new Element();lineup.id='arcade-roster-lineup';lineup.setAttribute('data-adults',JSON.stringify(players[0]));lineup.setAttribute('data-kids',JSON.stringify(players[1]));root.appendChild(lineup);}
  const doc={hidden:false,getElementById:id=>root.querySelector('#'+id),createElement:tag=>new Element(tag),handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}};
  const speech={spoken:[],cancels:0,getVoices:()=>[{lang:'en-US',localService:true}],cancel(){this.cancels++;},speak(utterance){this.spoken.push(utterance);utterance.onstart?.();}};
  const voiceWindow=withSpeech?{speechSynthesis:speech,SpeechSynthesisUtterance:class {constructor(text){this.text=text;}}}:{};
  const audio={nodes:[],gains:[]};
  class AudioContextMock {
    constructor(){this.state='running';this.destination={};}
    get currentTime(){return now/1000;}
    createGain(){const gain={gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){this.disconnected=true;}};audio.gains.push(gain);return gain;}
    createOscillator(){const node={frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},stops:[],connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(at){this.stops.push(at);}};audio.nodes.push(node);return node;}
  }
  const context=vm.createContext({...core,...data,...newCore,...library,Math:testMath,document:doc,crypto,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},window:{dispatchEvent:e=>telemetry.push(e),addEventListener(){},...voiceWindow,...(withAudio?{AudioContext:AudioContextMock}:{})},createResultRecorder:()=>({drain:async()=>{},capture:result=>{saved.push(result);}}),performance:{now:()=>now},console,setTimeout:(fn,delay)=>{scheduled.set(++seq,{at:now+delay,fn});return seq;},clearTimeout:id=>scheduled.delete(id)});
  const basketballSource=readFileSync(new URL('../public/arcade-basketball.js',import.meta.url),'utf8').replace(/export /g,'');
  vm.runInContext(basketballSource,context);
  const source=readFileSync(new URL('../public/arcade.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(source+'\nthis.state=()=>({wins:[...wins],round,champion,turn,starter,attempt,plans:game?{maze:game.maze,codes:game.codes,safePoints:game.safePoints,course:game.course}:null,series:series?{games:series.games.map(g=>g.id),index:series.index,winners:[...series.winners]}:null});this.resolveGame=finishRound;this.seriesWith=id=>{startSeries();clearTimers();series.games=[GAMES.find(g=>g.id===id),...GAMES.filter(g=>g.id!==id).slice(0,2)];startSeriesGame();};',context);
  const get=id=>doc.getElementById(id);
  const buttons=()=>get('game-stage').querySelectorAll('button');
  const click=text=>{const b=buttons().find(b=>b.textContent===text);assert.ok(b,`Missing button: ${text}`);b.click();};
  function advance(ms){const end=now+ms;let guard=0;while(true){const task=[...scheduled.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!task)break;assert.ok(++guard<10000);scheduled.delete(task[0]);now=task[1].at;task[1].fn();}now=end;}
  function start(id,first=0,wait=true){selectedFirst=first;const i=data.GAMES.findIndex(g=>g.id===id);get('arcade-grid').children[i].click();if(wait&&id!=='memory')advance(4000);}

  return {root,doc,get,buttons,click,advance,start,saved,telemetry,speech,audio,state:context.state,resolveGame:context.resolveGame,seriesWith:context.seriesWith};
}
// Registered roster names appear under their own teams inside a game.
{
 const f=fixture(0,false,false,[['Mom'],['Emma','Noah']]);f.start('trivia');
 assert.match(f.get('arcade-team-0').textContent,/Mom/);
 assert.match(f.get('arcade-team-1').textContent,/Emma · Noah/);
}
// Core scoring remains first to three, with no points for a tie.
assert.equal(data.GAMES.length,14);
for(const outcomes of [[0,1,0,1,0],[1,0,1,0,1],[0,0,0]]){
 let wins=[0,0],champion=-1;for(const winner of outcomes)({wins,champion}=core.awardRound(wins,winner));
 assert.equal(champion,outcomes.at(-1));assert.equal(wins[champion],3);
}
assert.deepEqual(core.awardRound([2,2],null),{wins:[2,2],champion:-1});
assert.equal(core.roundWinner({score:2,elapsed:4},{score:2,elapsed:5},false,true),0);
assert.equal(core.roundWinner({score:230},{score:250},true),0);
assert.equal(core.lineWinner([0,0,0,null,1,null,1,null,null]),0);
const readyButton=/ready|first →|next round|replay round|next hole|next test|finish turn/i;
function noNavigation(f){assert.ok(!f.buttons().some(b=>readyButton.test(b.textContent)));}

// Every real game opens without a first-team choice. Both teams can be picked;
// the four-second countdown protects handoffs before starting a timed turn.
for(const game of data.GAMES)for(const first of [0,1]){
 const f=fixture();f.start(game.id,first,false);assert.equal(f.telemetry[0].type,'avk:game-start');assert.equal(f.telemetry[0].detail.game,game.id);assert.equal(f.state().turn,first);noNavigation(f);
 if(game.id==='memory'){
  assert.ok(f.get('memory-cards'));assert.match(f.get('turn-strip').textContent,new RegExp(core.teamName(first)+' go first'));
  f.advance(4999);assert.ok(f.get('memory-cards').children.every(c=>c.disabled));f.advance(1);assert.ok(f.get('memory-cards').children.some(c=>!c.disabled));
 }else{
  assert.equal(f.get('handoff-countdown').textContent,'4');f.advance(3999);assert.ok(f.get('handoff-countdown'));f.advance(1);assert.equal(f.get('handoff-countdown'),null);noNavigation(f);
 }
}

// Memory: stable card elements, no duplicate taps, automatic passing, all seven
// pairs, extra turns after matches, alternating starters and best-of-five scoring.
{
 const f=fixture();f.start('memory');const layouts=[];
 for(let r=0;r<3;r++){
  const cards=[...f.get('memory-cards').children],symbols=cards.map(c=>c.textContent);layouts.push(symbols.join(''));
  const pairs=[...new Set(symbols)].map(s=>symbols.flatMap((v,i)=>v===s?[i]:[]));
  f.advance(5000);const expected=[0,0];
  assert.equal(f.get('memory-adult-points').textContent,'0');assert.equal(f.get('memory-kid-points').textContent,'0');
  for(let i=0;i<pairs.length;i++){
   const [a,b]=pairs[i],team=f.state().turn;cards[a].click();cards[a].click();
   assert.equal(Number(f.get(team===0?'memory-adult-points':'memory-kid-points').textContent),expected[team]);
   cards[b].click();expected[team]++;cards[b].click();
   assert.equal(Number(f.get('memory-adult-points').textContent),expected[0]);assert.equal(Number(f.get('memory-kid-points').textContent),expected[1]);
   assert.ok(cards.every((card,index)=>card===f.get('memory-cards').children[index]));
   if(i<6){const old=f.state().turn;f.advance(599);assert.equal(f.state().turn,old);f.advance(1);assert.equal(f.state().turn,old);assert.equal(f.get('memory-team-'+old).getAttribute('data-current'),'true');assert.match(f.get('arcade-team-'+old).className,/current/);}
  }
  f.advance(800);assert.match(f.get('game-stage').textContent,new RegExp(`Round points — Adults ${expected[0]} · Kids ${expected[1]}`));noNavigation(f);if(r<2)f.advance(2200);
 }
 assert.deepEqual([...f.state().wins],[2,1]);assert.equal(f.state().round,3);assert.ok(new Set(layouts).size>1);
}
{
 const f=fixture();f.start('memory');const symbols=f.get('memory-cards').children.map(c=>c.textContent),different=symbols.findIndex(s=>s!==symbols[0]);f.advance(5000);
 f.get('memory-cards').children[0].click();f.get('memory-cards').children[different].click();assert.equal(f.get('memory-adult-points').textContent,'0');assert.equal(f.get('memory-kid-points').textContent,'0');f.advance(899);assert.equal(f.state().turn,0);f.advance(1);assert.equal(f.state().turn,1);assert.equal(f.get('memory-team-1').getAttribute('data-current'),'true');assert.equal(f.get('memory-team-0').getAttribute('data-current'),'false');assert.match(f.get('arcade-team-1').className,/current/);
 f.get('arcade-return').click();f.start('tic');f.advance(10000);assert.ok(f.get('tic-board'));
}
// The short rules are visible and spoken during the shared preview.
{
 const f=fixture(0,true);f.start('memory');
 assert.match(f.get('memory-rules').textContent,/go again/);
 assert.match(f.get('memory-rules').textContent,/Miss = switch teams/);
 assert.match(f.speech.spoken.at(-1).text,/Match a pair: one point, go again/);
 assert.equal(f.get('memory-team-0-turn').textContent,'YOUR TURN');
 assert.equal(f.get('memory-team-1-turn').textContent,'WAITING');
}
// Memory awards the round to the highest points total, not the starter or
// the team finding the last pair. Misses and repeat taps never award points.
for(const first of [0,1]){
 const f=fixture();f.start('memory',first);
 const cards=f.get('memory-cards').children,symbols=cards.map(c=>c.textContent);
 const pairs=[...new Set(symbols)].map(s=>symbols.flatMap((v,i)=>v===s?[i]:[]));
 f.advance(5000);
 const [missA]=pairs[0],[missB]=pairs[1];cards[missA].click();cards[missB].click();f.advance(900);
 for(let i=0;i<pairs.length;i++){
  if(i===5){cards[pairs[5][0]].click();cards[pairs[6][0]].click();f.advance(900);}
  for(const at of pairs[i])cards[at].click();
  if(i<6)f.advance(600);
 }
 assert.equal(f.state().turn,first,'The final pair is found by the team with fewer points');
 assert.equal(f.get(first===0?'memory-kid-points':'memory-adult-points').textContent,'5');
 f.advance(800);assert.equal(f.state().wins[1-first],1);assert.equal(f.state().wins[first],0);
 assert.match(f.get('game-stage').textContent,new RegExp(core.teamName(1-first)+' win this round'));
}
// Tic-Tac-Toe has automatic turns and scoring.
{
 const f=fixture();f.start('tic');for(const [i,move] of [0,3,1,4,2].entries()){f.get('tic-board').children[move].click();if(i<4)f.advance(300);}
 f.advance(500);assert.deepEqual([...f.state().wins],[1,0]);f.advance(2200);assert.equal(f.state().starter,1);assert.ok(f.get('handoff-countdown'));f.advance(4000);assert.ok(f.get('tic-board'));
}

// Tic-Tac-Toe speaks the actual automatically selected starter once during
// the countdown, then offers replay without interrupting the first move.
for(const first of [0,1]){
 const f=fixture(0,true);f.start('tic',first,false);
 assert.equal(f.speech.spoken.at(-1).text,`${core.teamName(first)} are up first!`);
 assert.equal(f.speech.spoken.at(-1).volume,1);
 assert.equal(f.speech.spoken.length,1);
 f.advance(4000);assert.ok(f.get('tic-board'));assert.equal(f.speech.spoken.length,1);
 f.click('Hear starting team 🔊');assert.equal(f.speech.spoken.at(-1).text,`${core.teamName(first)} are up first!`);
 f.resolveGame(first,'Connected three');f.advance(2200);
 assert.equal(f.speech.spoken.at(-1).text,`${core.teamName(1-first)} are up first!`);
 f.get('arcade-sound').click();const count=f.speech.spoken.length;
 f.click('Hear starting team 🔊');assert.equal(f.speech.spoken.length,count);
 f.get('arcade-sound').click();f.click('Hear starting team 🔊');assert.equal(f.speech.spoken.length,count+1);
 const cancels=f.speech.cancels;f.get('arcade-return').click();assert.equal(f.speech.cancels,cancels+1);
}
{
 const f=fixture();f.start('tic');assert.ok(f.get('tic-board'));
 assert.equal(f.buttons().find(b=>b.textContent==='Hear starting team 🔊').disabled,true);
}
// Timed games finish a team, pass automatically, and award a result. No Ready
// buttons or extra result acknowledgements, even on timeout or ties.
for(const id of ['spot','trivia','word','picture','number','challenge','maze']){
 const f=fixture();f.start(id);const seconds={spot:30,trivia:45,word:45,picture:30,number:30,challenge:20,maze:45,code:60}[id];
 function finishTimed(value){f.advance(seconds*1000);if(id==='challenge'){f.get('challenge-score').value=value;f.get('challenge-form').dispatch('submit');}}
 finishTimed('12');assert.ok(f.get('handoff-countdown'));assert.equal(f.state().turn,1);noNavigation(f);
 f.advance(3999);assert.ok(f.get('handoff-countdown'));f.advance(1);finishTimed('10');
 assert.deepEqual([...f.state().wins],id==='challenge'?[1,0]:[0,0]);assert.match(f.get('game-stage').textContent,id==='challenge'?/win this round/:/tie/);
 f.advance(2200);assert.equal(f.state().starter,1);assert.ok(f.get('handoff-countdown'));noNavigation(f);
}
// Every content mode accepts real answers, including duplicate-tap protection.
for(const id of ['number','trivia','word','picture','spot']){
 const f=fixture();f.start(id);
 const count=id==='spot'||id==='word'||id==='picture'?3:5;
 for(let n=0;n<count;n++){
  if(id==='number'){
   const [a,op,b]=f.get('quiz-body').querySelector('h3').textContent.split(' ');const answer=op==='+'?Number(a)+Number(b):Number(a)-Number(b);const btn=f.get('quiz-body').querySelectorAll('button').find(b=>b.textContent===String(answer));btn.click();btn.click();f.advance(650);
  }else if(id==='trivia'){
   const prompt=f.get('quiz-body').querySelector('h3').textContent;f.click(data.TRIVIA.find(q=>q[0]===prompt)[1]);f.advance(650);
  }else if(id==='word'){
   const clue=f.get('quiz-body').querySelector('p').textContent;f.get('word-answer').value=data.WORDS.find(q=>q[1]===clue)[0];f.get('word-form').dispatch('submit');f.advance(650);
  }else if(id==='picture'){
   const symbol=f.get('quiz-body').querySelector('span').textContent;f.click(data.PICTURES.find(q=>q[0]===symbol)[1]);f.advance(650);
  }else{
   const grids=f.get('spot-body').children.filter(c=>c.tagName==='div');const reference=grids[0].children,target=grids[1].children;target.find((b,i)=>b.textContent!==reference[i].textContent).click();
  }
 }
 assert.match(f.get('game-stage').textContent,new RegExp(count+'/'+count));assert.equal(f.state().turn,1);assert.ok(f.get('handoff-countdown'));
}
// Trivia narration follows the current question, supports volume/replay/mute,
// and never lets late native speech events overwrite a new screen.
{
 const f=fixture(0,true);f.start('trivia',0,false);
 assert.match(f.get('trivia-audio').textContent,/Turn your volume up for this one/);
 assert.match(f.speech.spoken.at(-1).text,/Turn your volume up/);
 f.advance(4000);
 const prompt=()=>f.get('quiz-body').querySelector('h3').textContent;
 const narration=()=>`${prompt()} ${f.get('quiz-body').querySelectorAll('button').filter(b=>b.className==='answer').map((b,i)=>`Option ${i+1}: ${b.textContent}.`).join(' ')}`;
 assert.equal(f.speech.spoken.at(-1).text,narration());
 assert.equal(f.get('trivia-audio').getAttribute('data-speaking'),'true');
 const first=f.speech.spoken.at(-1);
 f.get('trivia-volume').value='40';f.get('trivia-volume').dispatch('input');
 assert.equal(f.speech.spoken.at(-1).volume,.4);
 assert.equal(f.get('trivia-volume-value').textContent,'40%');
 assert.equal(f.get('trivia-level').getAttribute('aria-valuenow'),'40');
 assert.equal(f.get('trivia-level').querySelectorAll('i').filter(i=>i.className==='filled').length,2);
 f.click('Hear question & answers 🔊');assert.equal(f.speech.spoken.at(-1).text,narration());
 f.click(data.TRIVIA.find(q=>q[0]===prompt())[1]);
 assert.equal(f.get('trivia-audio').getAttribute('data-speaking'),'false');
 f.advance(650);assert.equal(f.speech.spoken.at(-1).text,narration());
 first.onend();assert.equal(f.get('trivia-audio').getAttribute('data-speaking'),'true');
 const spoken=f.speech.spoken.length;
 f.get('arcade-sound').click();assert.match(f.get('trivia-voice-status').textContent,/muted/);
 f.click('Hear question & answers 🔊');assert.equal(f.speech.spoken.length,spoken);
 f.get('arcade-sound').click();f.click('Hear question & answers 🔊');assert.equal(f.speech.spoken.length,spoken+1);
 f.speech.spoken.at(-1).onerror();assert.match(f.get('trivia-voice-status').textContent,/Tap Hear question & answers/);
 f.click('Hear question & answers 🔊');f.get('arcade-reset').click();assert.equal(f.get('trivia-audio'),null);
 f.advance(10000);assert.match(f.get('game-stage').textContent,/Start over/);
 f.get('arcade-return').click();f.start('trivia');f.doc.hidden=true;f.doc.handlers.visibilitychange();
 assert.match(f.get('game-stage').textContent,/interrupted/);
 assert.ok(f.speech.cancels>=7);
}
{
 const f=fixture();f.start('trivia');
 assert.match(f.get('trivia-voice-status').textContent,/unavailable/);
 assert.equal(f.buttons().find(b=>b.textContent==='Hear question & answers 🔊').disabled,true);
 assert.equal(f.get('quiz-body').querySelectorAll('button').filter(b=>b.className==='answer').length,4);
}
// Quick Tap immediately starts each trial and progresses from results itself.
{
 const f=fixture();f.start('tap');
 for(const team of [0,1]){
  for(let i=0;i<3;i++){f.click('WAIT…');assert.match(f.get('tap-zone').textContent,/Too soon/);noNavigation(f);f.advance(1000);}
  if(team===0){assert.ok(f.get('handoff-countdown'));f.advance(4000);}
 }
 assert.deepEqual([...f.state().wins],[0,0]);assert.match(f.get('game-stage').textContent,/tie/);
}
{
 const f=fixture();f.start('tap');
 for(let i=0;i<3;i++){for(let step=0;step<50&&f.get('tap-zone').querySelector('button')?.textContent==='WAIT…';step++)f.advance(100);f.click('GO! TAP!');f.advance(1000);}
 assert.ok(f.get('handoff-countdown'));assert.match(f.get('game-stage').textContent,/ms average/);
}
// Actual five-round match stops at 3–2 and records once; each round starts
// automatically with the other team first, including score entry rounds.
{
 const f=fixture();f.start('challenge');
 for(let r=0;r<5;r++){
  const first=f.state().turn,winner=r%2===0?0:1;
  for(const team of [first,1-first]){
   f.advance(20000);f.get('challenge-score').value=team===winner?'10':'5';f.get('challenge-form').dispatch('submit');
   if(team===first)f.advance(4000);
  }
  if(r<4){f.advance(2200);assert.equal(f.state().starter,1-first);f.advance(4000);}
 }
 assert.equal(f.state().champion,0);assert.deepEqual([...f.state().wins],[3,2]);assert.equal(f.saved.length,1);f.advance(60000);assert.equal(f.saved.length,1);
 assert.deepEqual([...f.saved[0].roundWinners],[0,1,0,1,0]);f.click('Rematch →');assert.deepEqual([...f.state().wins],[0,0]);noNavigation(f);
}

// RPS keeps the first move hidden for four seconds and both hands visible for
// the battle; every move combination works for either automatic starter.
const rpsMoves=['Rock ✊','Paper ✋','Scissors ✌️'];
for(const first of [0,1])for(let a=0;a<3;a++)for(let b=0;b<3;b++){
 const f=fixture();f.start('rps',first);f.click(rpsMoves[first===0?a:b]);assert.equal(f.get('rps-options'),null);noNavigation(f);
 f.advance(3999);assert.equal(f.get('rps-options'),null);f.advance(1);f.click(rpsMoves[first===0?b:a]);
 assert.match(f.get('game-stage').textContent,/SHOW YOUR HANDS/);f.advance(2599);assert.deepEqual([...f.state().wins],[0,0]);f.advance(1);
 const winner=newCore.rpsWinner([a,b]);assert.deepEqual([...f.state().wins],winner===null?[0,0]:winner===0?[1,0]:[0,1]);
}
function route(maze){const {size,cells}=maze,queue=[[0,[]]],seen=new Set([0]);while(queue.length){const [at,path]=queue.shift();if(at===cells.length-1)return path;cells[at].forEach((wall,d)=>{if(wall)return;const next=at+[-size,1,size,-1][d];assert.equal(cells[next][(d+2)%4],false);if(!seen.has(next)){seen.add(next);queue.push([next,[...path,d]]);}});}assert.fail('Maze needs an exit');}
for(let i=0;i<30;i++)assert.ok(route(newCore.makeMaze()).length);
{
 const f=fixture();f.start('maze',1);for(const d of route(f.state().plans.maze))f.click(['↑ Up','→ Right','↓ Down','← Left'][d]);assert.match(f.get('game-stage').textContent,/WAY TO GO, KIDS/);noNavigation(f);f.advance(2000);assert.ok(f.get('handoff-countdown'));f.advance(4000);f.advance(45000);assert.deepEqual([...f.state().wins],[0,1]);
}
function enterCode(f,code){code.forEach((v,i)=>{const digit=()=>f.get('code-digits').children[i];while(Number(digit().textContent)!==v)digit().click();});f.click('Unlock Safe 🔓');}
assert.deepEqual(newCore.codeClues([1,1,2],[1,2,1]),{exact:1,misplaced:2});
// Every unlock earns exactly one point, independently of guesses used.
// Teams alternate, treasure appears before handoff, and 3–2 wins a round.
for(const first of [0,1]){
 const f=fixture();f.start('code',first);
 for(let safe=0;safe<5;safe++){
  const team=f.state().turn,pointsBefore=[...f.state().plans.safePoints];
  enterCode(f,f.state().plans.codes[team]);
  assert.equal(f.get('code-safe').getAttribute('data-open'),'true');
  assert.equal(f.state().plans.safePoints[team],pointsBefore[team]+1);
  f.buttons().find(b=>b.textContent==='Safe Unlocked! ✓').click();
  assert.equal(f.state().plans.safePoints[team],pointsBefore[team]+1,'Cannot award twice');
  f.advance(900);assert.match(f.get('game-stage').textContent,/CONGRATULATIONS/);
  assert.match(f.get('game-stage').textContent,/SURPRISE TREASURE/);
  assert.match(f.get('game-stage').textContent,/Virtual treasure/);
  assert.match(f.get('game-stage').textContent,/\+1 POINT/);
  f.advance(4500);
  if(safe<4){assert.ok(f.get('handoff-countdown'));assert.equal(f.state().turn,1-team);f.advance(4000);}
 }
 assert.equal(f.state().wins[first],1);assert.equal(f.state().wins[1-first],0);
 assert.deepEqual([...f.state().plans.safePoints],first===0?[3,2]:[2,3]);
 assert.equal(f.saved.length,0,'Only a completed match is saved');
 f.advance(2200);assert.deepEqual([...f.state().plans.safePoints],[0,0]);
}
// The safe prominently explains number buttons and speaks the same instruction.
{
 const f=fixture(0,true);f.start('code');
 assert.equal(f.get('safe-screen-label').textContent,'PRESS NUMBER BOX TO CHANGE THE NUMBERS');
 assert.match(f.speech.spoken.at(-1).text,/^Press number box to change the numbers/);
 const spoken=f.speech.spoken.length;f.click('Hear instructions 🔊');assert.equal(f.speech.spoken.length,spoken+1);
 f.get('arcade-sound').click();f.click('Hear instructions 🔊');assert.equal(f.speech.spoken.length,spoken+1);
}
// Safe checks each position only on Unlock, preserves green digits, and
// lets players fix the remaining boxes without changing a correct number.
{
 const f=fixture();f.start('code');const secret=f.state().plans.codes[0];
 const wrong=secret.map(v=>v%4+1);wrong[0]=secret[0];
 enterCode(f,wrong);
 const boxes=f.get('code-digits').children;
 assert.equal(boxes[0].getAttribute('data-check'),'correct');assert.equal(boxes[0].disabled,true);
 assert.equal(boxes[1].getAttribute('data-check'),'wrong');assert.equal(boxes[1].disabled,false);
 const locked=boxes[0].textContent;boxes[0].click();assert.equal(boxes[0].textContent,locked);
 boxes[1].click();assert.equal(boxes[1].getAttribute('data-check'),'unchecked');
 assert.match(f.get('safe-feedback').textContent,/Press Unlock Safe/);
 enterCode(f,secret);assert.equal(f.get('code-safe').getAttribute('data-open'),'true');
 const unlock=f.buttons().find(b=>b.textContent==='Safe Unlocked! ✓');assert.equal(unlock.disabled,true);
 f.advance(5400);assert.ok(f.get('handoff-countdown'));f.advance(4000);
 assert.equal(f.get('code-safe').getAttribute('data-open'),'false');
 assert.ok(f.get('code-digits').children.every(b=>!b.disabled));
}
{
 const f=fixture();f.start('code');const wrong=f.state().plans.codes[0].map(v=>v%4+1);
 for(let i=0;i<6;i++)enterCode(f,wrong);
 assert.ok(f.get('handoff-countdown'),'Six wrong tries end the turn');assert.deepEqual([...f.state().plans.safePoints],[0,0]);
}
// A timeout awards no safe point; leaving during a prize cancels progression.
{
 const f=fixture();f.start('code');f.advance(60000);
 assert.ok(f.get('handoff-countdown'));assert.deepEqual([...f.state().plans.safePoints],[0,0]);
 f.advance(4000);enterCode(f,f.state().plans.codes[f.state().turn]);f.advance(900);
 f.get('arcade-return').click();f.advance(60000);assert.equal(f.get('arcade-game').hidden,true);
 assert.equal(f.saved.length,0);
}
// Complete three rounds without recording intermediate safe points as rounds.
{
 const f=fixture();f.start('code');
 for(let round=0;round<3;round++){
  while(f.state().turn!==0){f.advance(60000);f.advance(4000);}
  for(let point=0;point<3;point++){
   enterCode(f,f.state().plans.codes[0]);f.advance(5400);
   if(point<2){f.advance(4000);f.advance(60000);f.advance(4000);}
  }
  if(round<2){assert.equal(f.saved.length,0);f.advance(2200);f.advance(4000);}
 }
 assert.equal(f.state().champion,0);assert.equal(f.saved.length,1);
 assert.deepEqual([...f.saved[0].roundWinners],[0,0,0]);
 f.advance(60000);assert.equal(f.saved.length,1);
}
// Maze's soundtrack has independent music controls; movement effects follow
// global Sound. Every transition stops the looping music and live notes.
{
 const f=fixture(0,false,true);f.start('maze');
 assert.equal(f.get('maze-soundbar').getAttribute('data-playing'),'true');
 assert.match(f.get('maze-music-status').textContent,/Now playing/);
 assert.ok(f.audio.nodes.length>=3);
 f.get('maze-music-volume').value='65';f.get('maze-music-volume').dispatch('input');
 assert.equal(f.get('maze-music-volume-value').textContent,'65%');assert.equal(f.audio.gains[0].gain.value,.65);
 const before=f.audio.nodes.length;
 f.click(['↑ Up','→ Right','↓ Down','← Left'][route(f.state().plans.maze)[0]]);
 assert.equal(f.audio.nodes.length,before+1,'One movement press plays one effect');
 f.click('Pause music');assert.equal(f.get('maze-soundbar').getAttribute('data-playing'),'false');
 const paused=f.audio.nodes.length;f.advance(500);assert.equal(f.audio.nodes.length,paused);
 f.click('Play music');assert.equal(f.get('maze-soundbar').getAttribute('data-playing'),'true');
 f.get('arcade-sound').click();assert.equal(f.get('maze-soundbar').getAttribute('data-playing'),'false');
 assert.match(f.get('maze-music-status').textContent,/muted/);
 const muted=f.audio.nodes.length;f.get('maze-controls').querySelectorAll('button').find(b=>!b.disabled).click();assert.equal(f.audio.nodes.length,muted);
 f.get('arcade-sound').click();assert.equal(f.get('maze-soundbar').getAttribute('data-playing'),'true');
 f.get('arcade-reset').click();assert.equal(f.get('maze-soundbar'),null);
 const reset=f.audio.nodes.length;f.advance(1000);assert.equal(f.audio.nodes.length,reset);
 f.click('Restart match');f.advance(4000);assert.equal(f.get('maze-soundbar').getAttribute('data-playing'),'true');
 f.doc.hidden=true;f.doc.handlers.visibilitychange();
 const hidden=f.audio.nodes.length;f.advance(1000);assert.equal(f.audio.nodes.length,hidden);
 assert.match(f.get('game-stage').textContent,/interrupted/);
}
{
 const f=fixture(0,false,true);f.start('maze');const notes=[...f.audio.nodes];
 f.get('arcade-return').click();assert.ok(notes.every(n=>n.disconnected));
 const total=f.audio.nodes.length;f.advance(1000);assert.equal(f.audio.nodes.length,total);
}
// Golf has three holes per team and auto advances each hole and completed turn.
function missGolfTurn(f){
 for(let hole=0;hole<3;hole++){
  f.get('golf-angle').value='180';f.get('golf-power').value='10';
  for(let shot=0;shot<4;shot++){f.click('Putt →');for(let frame=0;frame<250&&f.get('golf-action').querySelector('button').disabled&&!f.get('golf-controls').hidden;frame++)f.advance(16);}
  noNavigation(f);f.advance(1200);
 }
}
{
 const f=fixture();f.start('golf');missGolfTurn(f);assert.ok(f.get('handoff-countdown'));f.advance(4000);missGolfTurn(f);assert.match(f.get('game-stage').textContent,/tie/);
}
// Three-game series still play three distinct games, resolve ties automatically,
// alternate starters and save the final result only once.
for(const first of [0,1])for(const outcomes of [[0,1,0],[1,0,1],[0,0,0],[1,1,1]]){
 const f=fixture(first);f.get('arcade-random').click();assert.equal(new Set(f.state().series.games).size,3);assert.equal(f.state().starter,first);noNavigation(f);
 f.resolveGame(null,'Tied game');f.advance(2200);assert.equal(f.state().series.index,0);assert.equal(f.state().starter,1-first);
 for(let i=0;i<3;i++){f.resolveGame(outcomes[i],'Played game');if(i<2){f.advance(2000);assert.equal(f.state().series.index,i+1);assert.equal(f.state().starter,(first+i+1)%2);noNavigation(f);}}
 assert.equal(f.state().champion,outcomes.filter(w=>w===0).length>=2?0:1);assert.equal(f.saved.length,1);assert.deepEqual([...f.saved[0].roundWinners],outcomes);f.advance(10000);assert.equal(f.saved.length,1);
}
// Reset/exit during handoff, reveal, results or celebration cancel outstanding
// callbacks and cannot start an old game or award a stale point.
for(const id of ['maze','rps','code','golf','memory','tap']){
 const f=fixture();f.start(id,1,false);f.get('arcade-reset').click();f.advance(10000);assert.match(f.get('game-stage').textContent,/Start over/);assert.equal(f.saved.length,0);
 f.get('arcade-return').click();f.start('tic');f.advance(6000);assert.ok(f.get('tic-board'));assert.deepEqual([...f.state().wins],[0,0]);
}
{
 const f=fixture();f.start('rps');f.click('Rock ✊');f.advance(4000);f.click('Scissors ✌️');f.get('arcade-return').click();f.start('memory');f.advance(3000);assert.ok(f.get('memory-cards'));assert.deepEqual([...f.state().wins],[0,0]);
 const g=fixture();g.start('number');g.doc.hidden=true;g.doc.handlers.visibilitychange();assert.match(g.get('game-stage').textContent,/interrupted/);g.advance(60000);assert.deepEqual([...g.state().wins],[0,0]);
}
// A hidden tab cannot start the next team's timed turn during a handoff.
{
 const f=fixture();f.start('number',0,false);f.doc.hidden=true;f.advance(12000);assert.equal(f.get('handoff-countdown').textContent,'4');f.doc.hidden=false;f.advance(4000);assert.ok(f.get('quiz-body'));
}
// Cover library and rotating featured-game behavior remain intact.
for(const g of data.GAMES)assert.ok(library.coverMarkup(g).includes(g.name));
assert.deepEqual(library.recentGames({getItem:()=>'{bad'},'family',data.GAMES),[]);
assert.deepEqual(library.recentGames({getItem:()=>JSON.stringify(['memory','unknown','memory','maze'])},'family',data.GAMES),['memory','maze']);
{
 const f=fixture();f.start('memory');f.get('arcade-return').click();f.advance(6500);assert.equal(f.get('arcade-feature-title').textContent,data.GAMES[1].name);f.get('feature-pause').click();f.advance(20000);assert.equal(f.get('arcade-feature-title').textContent,data.GAMES[1].name);f.get('feature-next').click();f.get('arcade-featured-play').click();assert.ok(f.get('game-title').textContent.includes(data.GAMES[2].name));noNavigation(f);
}
console.log('All 14 Arcade games passed: automatic starters, countdown handoffs, automatic rounds/replays, reactions, golf holes, secret moves, scoring, celebrations, 3–2 matches, random series, cancellation, hidden-tab protection and rotating features.');

// Basketball: each team has exactly 30 seconds; baskets are two points;
// the shot already released at the buzzer resolves, then the device passes.
{
 const f=fixture();f.start('basketball',1);
 const court=f.get('basketball-court');court.dispatch('keydown',{key:' '});f.advance(720);
 assert.equal(f.get('basketball-points').textContent,'Kids: 2 points');
 f.advance(29280);assert.ok(f.get('handoff-countdown'));assert.equal(f.state().turn,0);
 f.advance(4000);assert.ok(f.get('basketball-court'));f.advance(30000);
 assert.equal(f.state().champion,1);assert.equal(f.saved.length,1);assert.deepEqual([...f.saved[0].roundWinners],[1]);
 f.advance(30000);assert.equal(f.saved.length,1);
}
{
 const f=fixture();f.start('basketball');f.advance(29880);f.get('basketball-court').dispatch('keydown',{key:' '});
 f.advance(150);assert.ok(f.get('basketball-court'));f.advance(850);assert.ok(f.get('handoff-countdown'));
 f.advance(4000);f.get('basketball-court').dispatch('keydown',{key:' '});f.advance(30000);
 assert.match(f.get('game-stage').textContent,/It’s a tie/);assert.equal(f.saved.length,0);
}
{
 const f=fixture();f.start('basketball');f.doc.hidden=true;f.doc.handlers.visibilitychange();
 f.advance(60000);assert.equal(f.saved.length,0);assert.match(f.get('game-stage').textContent,/interrupted/);
}
console.log('Basketball passed: 30 seconds per team, 2 points per basket, handoff, buzzer shot, ties, one-time completion saving and interruption.');

// Touch/mouse coordinates normalize to the same court at any display size.
{
 const f=fixture();f.start('basketball');const c=f.get('basketball-court');
 c.getBoundingClientRect=()=>({left:10,top:20,width:200,height:380});c.setPointerCapture=()=>{};
 const event=(x,y)=>({pointerId:1,clientX:10+x/2,clientY:20+y/2});
 c.dispatch('pointerdown',event(200,650));c.dispatch('pointerup',event(200,498));f.advance(980);
 assert.match(f.get('basketball-points').textContent,/2 points/);
 c.dispatch('pointerdown',event(200,650));c.dispatch('pointerup',event(260,498));f.advance(980);
 assert.match(f.get('basketball-points').textContent,/2 points/);
 c.dispatch('pointerdown',event(200,650));c.dispatch('pointerup',event(200,620));f.advance(980);
 assert.match(f.get('basketball-points').textContent,/2 points/);
 c.dispatch('pointerdown',event(200,650));c.dispatch('pointercancel');c.dispatch('pointerup',event(200,498));f.advance(980);
 assert.match(f.get('basketball-points').textContent,/2 points/);
}
console.log('Basketball gestures passed: scaled touch coordinates, made shot, wide shot, short shot, canceled gesture.');
