import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as core from '../public/arcade-core.js';
import * as data from '../public/arcade-data.js';
import * as newCore from '../public/arcade-new-core.js';
import * as library from '../public/arcade-library.js';
import {clawPrizes,clawCatch} from '../public/arcade-claw.js';
import {molePlan} from '../public/arcade-mole.js';
import {treasurePlan} from '../public/arcade-treasure.js';

// Small DOM/clock fixture executes the actual game controller without a browser
// or real-time waits. Browser QA covers layout and native form behavior.
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.handlers={};this.hidden=false;this.disabled=false;this.value='';this._text='';this.className='';this.classList={add:(s)=>{this.className+=' '+s;}};}
  getContext(){const calls=this.drawCalls??=[];const record=this.id==='frog-pond';return new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(target,key)=>target[key]??((...args)=>{if(record)calls.push({name:key,args});})});}
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
  let now=0,seq=0,scheduled=new Map();const saved=[],timedSaved=[],telemetry=[];const root=new Element();
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
    createOscillator(){const node={frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},stops:[],connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(at){this.stops.push(at);if(Number.isFinite(at))scheduled.set(++seq,{at:at*1000,fn:()=>this.onended?.()});else this.onended?.();}};audio.nodes.push(node);return node;}
  }
  const context=vm.createContext({URLSearchParams,location:{search:''},clawPrizes,clawCatch,molePlan,treasurePlan,...core,...data,...newCore,...library,Math:testMath,document:doc,crypto,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},window:{dispatchEvent:e=>telemetry.push(e),addEventListener(){},...voiceWindow,...(withAudio?{AudioContext:AudioContextMock}:{})},createResultRecorder:({namespace})=>({drain:async()=>{},capture:result=>{(namespace==='times'?timedSaved:saved).push(result);}}),performance:{now:()=>now},console,setTimeout:(fn,delay)=>{scheduled.set(++seq,{at:now+delay,fn});return seq;},clearTimeout:id=>scheduled.delete(id)});
  vm.runInContext(readFileSync(new URL('../public/arcade-claw.js',import.meta.url),'utf8').replace(/export /g,''),context);
  vm.runInContext(readFileSync(new URL('../public/arcade-mole.js',import.meta.url),'utf8').replace(/export /g,''),context);
  vm.runInContext(readFileSync(new URL('../public/arcade-frog.js',import.meta.url),'utf8').replace(/export /g,''),context);
  vm.runInContext(readFileSync(new URL('../public/arcade-treasure.js',import.meta.url),'utf8').replace(/export /g,''),context);
  vm.runInContext(readFileSync(new URL('../public/arcade-blocks.js',import.meta.url),'utf8').replace(/export /g,''),context);
  const basketballSource=readFileSync(new URL('../public/arcade-basketball.js',import.meta.url),'utf8').replace(/export /g,'');
  vm.runInContext(basketballSource,context);
  const source=readFileSync(new URL('../public/arcade.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(source+'\nthis.state=()=>({wins:[...wins],round,champion,turn,starter,attempt,plans:game?{maze:game.maze,codes:game.codes,safePoints:game.safePoints,course:game.course,frog:game.frogCourses}:null,series:series?{games:series.games.map(g=>g.id),index:series.index,winners:[...series.winners]}:null});this.resolveGame=finishRound;this.seriesWith=id=>{startSeries();clearTimers();series.games=[GAMES.find(g=>g.id===id),...GAMES.filter(g=>g.id!==id).slice(0,2)];startSeriesGame();};',context);
  const get=id=>doc.getElementById(id);
  const buttons=()=>get('game-stage').querySelectorAll('button');
  const click=text=>{const b=buttons().find(b=>b.textContent===text||b.getAttribute('data-answer')===text);assert.ok(b,`Missing button: ${text}`);b.click();};
  function advance(ms){const end=now+ms;let guard=0;while(true){const task=[...scheduled.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!task)break;assert.ok(++guard<10000);scheduled.delete(task[0]);now=task[1].at;task[1].fn();}now=end;}
  function start(id,first=0,wait=true){selectedFirst=first;const i=data.GAMES.findIndex(g=>g.id===id);if(data.GAMES[i].comingSoon){data.GAMES[i].comingSoon=false;try{vm.runInContext('openGame('+JSON.stringify(id)+')',context);}finally{data.GAMES[i].comingSoon=true;}}else get('arcade-grid').children[i].click();if(wait&&id!=='memory')advance(4000);}

  return {run:source=>vm.runInContext(source,context),clock:()=>now,root,doc,get,buttons,click,advance,start,saved,timedSaved,telemetry,speech,audio,state:context.state,resolveGame:context.resolveGame,seriesWith:context.seriesWith};
}
// Registered roster names appear under their own teams inside a game.
{
 const f=fixture(0,false,false,[['Mom'],['Emma','Noah']]);f.start('trivia');
 assert.match(f.get('arcade-team-0').textContent,/Mom/);
 assert.match(f.get('arcade-team-1').textContent,/Emma · Noah/);
}
// Dashboard selections with no adults create named kid opponents in every game.
for(const id of data.GAMES.filter(g=>!g.comingSoon).map(g=>g.id)){
 const f=fixture(0,true,false,[[],['Harper','Chloe']]);f.start(id,0,false);
 assert.match(f.get('arcade-team-0').textContent,/HARPER/);
 assert.match(f.get('arcade-team-1').textContent,/CHLOE/);
 assert.doesNotMatch(f.get('arcade-score').textContent,/TEAM ADULTS|TEAM KIDS/);
 if(id==='tic')assert.match(f.speech.spoken.at(-1).text,/Harper are up first/);
}
{
 const f=fixture(0,false,false,[[],['Harper','Chloe']]);f.start('trivia');
 for(let i=0;i<3;i++){f.resolveGame(0,'Harper won');if(i<2)f.advance(2200);}
 assert.equal(f.state().champion,0);assert.equal(f.saved.length,0);
 assert.match(f.get('game-stage').textContent,/Harper win the match/);
 f.seriesWith('trivia');for(let i=0;i<3;i++){f.resolveGame(1,'Chloe won');if(i<2)f.advance(2000);}
 assert.match(f.get('game-stage').textContent,/Chloe win the series/);assert.equal(f.saved.length,0);
}
{
 const f=fixture(0,false,false,[[],['Harper','Chloe','Emma']]);f.start('trivia');
 assert.match(f.get('arcade-team-0').getAttribute('aria-label'),/Harper &amp; Emma/);
 assert.match(f.get('arcade-team-1').textContent,/CHLOE/);
 const safe=fixture(0,false,false,[[],['<img src=x>','Chloe']]);safe.start('tic',0,false);
 assert.equal(safe.get('game-stage').querySelector('img'),null);
 assert.equal(safe.get('arcade-score').querySelector('img'),null);
}
console.log('PASS: Kids vs. Kids across playable games, named turns and winners, series, balanced kid teams, escaped names, and no adult/kid lifetime-score writes.');
// Core scoring remains first to three, with no points for a tie.
assert.equal(data.GAMES.length,14);
assert.ok(!data.GAMES.some(g=>['spot','golf','basketball','word','tap'].includes(g.id)),'Removed games stay out of the active catalog');
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
for(const id of ['trivia','picture','number','challenge','maze']){
 const f=fixture();f.start(id);const seconds={spot:30,trivia:45,word:45,picture:30,number:30,challenge:20,maze:45,code:60}[id];
 function finishTimed(value){f.advance(seconds*1000);if(id==='challenge'){f.get('challenge-score').value=value;f.get('challenge-form').dispatch('submit');}}
 finishTimed('12');assert.ok(f.get('handoff-countdown'));assert.equal(f.state().turn,1);noNavigation(f);
 f.advance(3999);assert.ok(f.get('handoff-countdown'));f.advance(1);finishTimed('10');
 assert.deepEqual([...f.state().wins],id==='challenge'?[1,0]:[0,0]);assert.match(f.get('game-stage').textContent,id==='challenge'?/win this round/:/tie/);
 f.advance(2200);assert.equal(f.state().starter,1);assert.ok(f.get('handoff-countdown'));noNavigation(f);
}
// Every content mode accepts real answers, including duplicate-tap protection.
for(const id of ['number','trivia','picture']){
 const f=fixture();f.start(id);
 const count=id==='spot'||id==='word'||id==='picture'?3:5;
 for(let n=0;n<count;n++){
  if(id==='number'){
   const [a,op,b]=f.get('quiz-body').querySelector('h3').textContent.split(' ');const answer=op==='+'?Number(a)+Number(b):Number(a)-Number(b);const btn=f.get('quiz-body').querySelectorAll('button').find(b=>b.textContent===String(answer));btn.click();btn.click();f.advance(650);
  }else if(id==='trivia'){
   const prompt=f.get('quiz-body').querySelector('h3').textContent;f.click(data.TRIVIA.find(q=>q[0]===prompt)[1]);f.advance(650);

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
 const narration=()=>`${prompt()} ${f.get('quiz-body').querySelectorAll('button').filter(b=>b.className==='answer').map((b,i)=>`Option ${i+1}: ${b.getAttribute('data-answer')||b.textContent}.`).join(' ')}`;
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
// Fresh random plans contain five trials and get progressively faster.
{
 const a=treasurePlan(),b=treasurePlan();assert.equal(a.length,5);assert.notDeepEqual(a,b);
 for(let i=0;i<5;i++){
  assert.ok(a[i].coin>=0&&a[i].coin<3);assert.equal(a[i].swaps.length,3+i);
  if(i)assert.ok(a[i].duration<a[i-1].duration);
  for(const pair of a[i].swaps){assert.equal(new Set(pair).size,2);assert.ok(pair.every(n=>Number.isInteger(n)&&n>=0&&n<=2));}
 }
}
// Treasure Shuffle: both sides get exactly five guesses, then one final result.
for(const first of [0,1])for(const tie of [false,true]){
 const f=fixture(first);f.start('treasure',first);
 for(const side of [first,1-first]){
  for(let trial=0;trial<5;trial++){
   const cups=()=>f.get('treasure-table').querySelectorAll('button');
   assert.equal(cups().every(c=>c.disabled),true);
   // Fixture random always puts the coin in physical cup 0 (first=0) or 2.
   const coin=first===0?0:2;
   for(let step=0;step<200&&cups().every(c=>c.disabled);step++)f.advance(100);
   assert.equal(cups().every(c=>!c.disabled),true);
   const right=tie||side===0;const target=cups()[right?coin:(coin+1)%3];target.click();target.click();
   assert.equal(cups().every(c=>c.disabled),true);
   f.advance(1600);
  }
  if(side===first){assert.ok(f.get('handoff-countdown'));f.advance(4000);}
 }
 assert.match(f.get('game-stage').textContent,tie?/draw/:/Adults win the Showdown/);
 assert.equal(f.saved.length,tie?0:1);
 if(!tie){assert.deepEqual([...f.saved[0].roundWinners],[0]);assert.deepEqual([...f.saved[0].gameIds],['treasure']);}
 f.advance(10000);assert.equal(f.saved.length,tie?0:1);
}
{
 const f=fixture();f.start('treasure');f.advance(1700);f.doc.hidden=true;f.doc.handlers.visibilitychange();
 f.advance(20000);assert.match(f.get('game-stage').textContent,/interrupted/);assert.equal(f.saved.length,0);
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
 assert.deepEqual([...f.saved[0].roundWinners],[0,1,0,1,0]);f.click('👑 Defend your crown · Rematch →');assert.deepEqual([...f.state().wins],[0,0]);noNavigation(f);
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
 const musicGain=f.audio.gains.find(g=>g.gain.value===.35);assert.ok(musicGain);
 f.get('maze-music-volume').value='65';f.get('maze-music-volume').dispatch('input');
 assert.equal(f.get('maze-music-volume-value').textContent,'65%');assert.equal(musicGain.gain.value,.65);
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
for(const id of ['maze','rps','code','memory','treasure']){
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
console.log('All 14 Arcade games passed: automatic starters, countdown handoffs, automatic rounds/replays, reactions, secret moves, scoring, celebrations, 3–2 matches, random series, cancellation, hidden-tab protection and rotating features.');

// Block Showdown: a full minute each, one-round result, no speed tiebreak.
for(const first of [0,1]){
 const f=fixture();f.start('blocks',first);
 const board=f.get('block-board');board.dispatch('keydown',{key:'1'});board.dispatch('keydown',{key:'Enter'});
 assert.match(f.get('arcade-team-'+first).textContent,/1/);
 f.advance(59999);assert.ok(f.get('block-board'));
 f.advance(17);assert.ok(f.get('handoff-countdown'));
 f.advance(4000);f.advance(60016);
 assert.equal(f.state().champion,first);assert.equal(f.saved.length,1);
 assert.deepEqual([...f.saved[0].roundWinners],[first]);assert.equal(f.saved[0].gameIds[0],'blocks');
}
{
 const f=fixture();f.start('blocks');f.advance(60016);f.advance(4000);f.advance(60016);
 assert.match(f.get('game-stage').textContent,/It’s a tie/);assert.equal(f.saved.length,0);
 f.advance(10000);assert.match(f.get('game-stage').textContent,/MATCH COMPLETE/);
}
{
 const f=fixture();f.start('blocks');f.doc.hidden=true;f.doc.handlers.visibilitychange();
 f.advance(70000);assert.equal(f.saved.length,0);assert.match(f.get('game-stage').textContent,/interrupted/);
}
console.log('PASS: Block Showdown one-minute turns, both starting teams, one-round winner saving, draws and interruption handling.');

// Every visible Trivia answer matches its spoken option and includes a tiny picture.
{
 const f=fixture(0,true);f.start('trivia');
 for(let q=0;q<3;q++){
  const choices=f.get('quiz-body').querySelectorAll('button').filter(b=>b.getAttribute('data-trivia-option'));
  assert.equal(choices.length,4);
  choices.forEach((b,i)=>{
   const value=b.getAttribute('data-answer');
   assert.equal(b.children[0].textContent,String(i+1));
   assert.ok(b.children[1].textContent);assert.equal(b.children[1].getAttribute('aria-hidden'),'true');
   assert.equal(b.children[2].textContent,value);assert.equal(b.getAttribute('aria-label'),`Option ${i+1}: ${value}`);
   assert.ok(f.speech.spoken.at(-1).text.includes(`Option ${i+1}: ${value}.`));
  });
  choices[0].click();f.advance(650);
 }
}
console.log('PASS: numbered Trivia answer bubbles, tiny icons, exact speech/visual option agreement.');

// Frog Hop uses real hold/release controls, crossings and misses, then passes.
{
 const f=fixture(0,false,true);f.start('frog');
 for(let trial=0;trial<3;trial++){
  const course=f.state().plans.frog[trial],started=f.clock();let from=45;
  for(const [index,pad] of [...course.pads,{x:course.finish,r:25,amplitude:0,phase:0}].entries()){
   let hold=650;
   for(let i=0;i<15;i++){
    const target=pad.x+Math.sin(((f.clock()+hold+650-started)/1000)*1.4+pad.phase)*pad.amplitude;
    const previous=index===0?null:course.pads[index-1];
    const launch=previous?previous.x+Math.sin(((f.clock()+hold-started)/1000)*1.4+previous.phase)*previous.amplitude:45;
    hold=(target-launch-24)/180*1400;
   }
   const jump=f.get('frog-jump');jump.dispatch('pointerdown',{pointerId:1});f.advance(hold);jump.dispatch('pointerup',{pointerId:1});f.advance(720);
   from=pad.x+Math.sin(((f.clock()-started)/1000)*1.4+pad.phase)*pad.amplitude;
   if(index<5)assert.equal(jump.disabled,false,`Try ${trial+1}, pad ${index+1}, hold ${hold}: ${f.get('arcade-message').textContent}`);
  }
  f.advance(1400);
 }
 assert.ok(f.get('handoff-countdown'));assert.match(f.get('game-stage').textContent,/3 crossings/);f.advance(4000);
 for(let trial=0;trial<3;trial++){const jump=f.get('frog-jump');jump.dispatch('pointerdown',{pointerId:1});jump.dispatch('pointerup',{pointerId:1});f.advance(2100);}
 assert.deepEqual([...f.state().wins],[1,0]);assert.match(f.get('game-stage').textContent,/win this round/);
 f.advance(2200);assert.equal(f.state().starter,1);assert.match(f.get('round-label').textContent,/ROUND 2 OF 3/);
 f.resolveGame(0,'Another pond won');assert.equal(f.state().champion,0);assert.equal(f.saved.length,1);assert.deepEqual([...f.saved[0].roundWinners],[0,0]);
 assert.ok(f.audio.nodes.some(n=>n.stops.length),'Music and ribbits use stoppable audio nodes');
}
for(const outcomes of [[0,1,0],[1,1]]){
 const f=fixture();f.start('frog');
 outcomes.forEach((winner,i)=>{f.resolveGame(winner,'Pond played');if(i<outcomes.length-1)f.advance(2200);});
 assert.equal(f.saved.length,1);assert.deepEqual([...f.saved[0].roundWinners],outcomes);assert.equal(f.state().champion,outcomes.at(-1));
}
{
 const f=fixture();f.start('frog');f.get('frog-jump').dispatch('pointerdown',{pointerId:1});f.get('frog-jump').dispatch('pointercancel');f.advance(1500);assert.equal(f.get('frog-jump').disabled,false);
 f.doc.hidden=true;f.doc.handlers.visibilitychange();f.advance(60000);assert.match(f.get('game-stage').textContent,/interrupted/);assert.equal(f.saved.length,0);
}
console.log('PASS: Frog Hop real moving-pad landings, three crossings/tries, misses, automatic passing, first-to-two rounds, audio, canceled input and hidden-tab cleanup.');

// Frog controls provide no aiming guide, ambient audio croaks, and misses splash.
{
 const f=fixture(0,false,true);f.start('frog');f.advance(300); // Let the GO chime finish before checking ambient ribbits.
 assert.equal(f.get('frog-power'),null);
 assert.match(f.get('frog-music').textContent,/Background ribbits/);
 assert.ok(f.audio.nodes.length>=2);assert.ok(f.audio.nodes.filter(n=>!n.disconnected).every(n=>n.type==='sawtooth'));
 const pond=f.get('frog-pond');pond.dispatch('pointerdown',{pointerId:2});f.advance(100);
 assert.equal(pond.drawCalls.some(c=>c.name==='setLineDash'),false);
 pond.dispatch('pointerup',{pointerId:2});f.advance(720);
 assert.ok(pond.drawCalls.some(c=>c.name==='fillText'&&c.args[0]==='SPLASH!'));
 assert.ok(pond.drawCalls.filter(c=>c.name==='arc').length>=12);
 const calls=pond.drawCalls.length;f.get('arcade-return').click();f.advance(5000);assert.equal(pond.drawCalls.length,calls);
}
console.log('PASS: hidden jump distance, direct pond hold/release, background frog ribbits, animated splash droplets and cleanup.');

// One mallet, no multi-touch or repeated key farming, exact 30-second turns.
assert.deepEqual(molePlan(123),molePlan(123));
for(const first of [0,1]){
 const f=fixture();f.start('mole',first);const board=f.get('mole-board');
 assert.ok(board);f.advance(400);board.dispatch('keydown',{key:String(molePlan(536870912).find(e=>e.at===350)?.hole+1)});
 // Find the live hole using real controls; only one can score at this instant.
 for(let i=1;i<=8;i++){board.dispatch('keydown',{key:String(i)});f.advance(180);}
 const before=f.get('arcade-team-'+first).textContent;
 board.dispatch('keydown',{key:'1',repeat:true});assert.equal(f.get('arcade-team-'+first).textContent,before);
 f.advance(30000-(f.clock()-4000));assert.ok(f.get('handoff-countdown'));
 f.advance(4000);assert.ok(f.get('mole-board'));f.advance(30000);
 assert.equal(f.saved.length,1);assert.equal(f.saved[0].gameIds[0],'mole');assert.deepEqual([...f.saved[0].roundWinners],[first]);
 f.advance(20000);assert.equal(f.saved.length,1);
}
{
 const f=fixture();f.start('mole');f.advance(30000);f.advance(4000);f.advance(30000);
 assert.match(f.get('game-stage').textContent,/It’s a tie/);assert.equal(f.saved.length,0);
}
{
 const f=fixture();f.start('mole');f.doc.hidden=true;f.doc.handlers.visibilitychange();f.advance(60000);
 assert.match(f.get('game-stage').textContent,/interrupted/);assert.equal(f.saved.length,0);
}
console.log('PASS: Whack-a-Mole fair schedules, 30-second turns, single round, scoring, ties, one-time saving and interruption.');

{
 const f=fixture();f.start('mole');const board=f.get('mole-board');
 board.getBoundingClientRect=()=>({left:10,top:20,width:220,height:205});board.setPointerCapture=()=>{};
 const first=molePlan(536870912)[0],second=molePlan(536870912).find(e=>e.type===1);
 const event=(hole,id=1,primary=true)=>({pointerId:id,isPrimary:primary,button:0,clientX:10+(61+hole%4*106)/2,clientY:20+(196+Math.floor(hole/4)*111-25)/2});
 f.advance(500);board.dispatch('pointerdown',event(first.hole));
 assert.match(f.get('arcade-team-0').textContent,/1/);
 board.dispatch('pointerup',{pointerId:1});f.advance(200);board.dispatch('pointerdown',event(first.hole));
 board.dispatch('pointerup',{pointerId:1});f.advance(250);
 const before=f.get('arcade-team-0').textContent;
 board.dispatch('pointerdown',event(second.hole,2,false));assert.equal(f.get('arcade-team-0').textContent,before);
 board.dispatch('pointerdown',event(second.hole));
 board.dispatch('pointerdown',event(second.hole,2));
 assert.match(f.get('arcade-team-0').textContent,/2/);
 board.dispatch('pointercancel',{pointerId:1});
 f.get('arcade-return').click();f.advance(60000);assert.equal(f.saved.length,0);
}
for(const seed of [1,123,987654]){
 const plan=molePlan(seed);assert.equal(new Set(plan.map(e=>e.type)).size,2);
 assert.ok(plan.every(e=>e.hole>=0&&e.hole<8));
 for(let i=0;i<plan.length;i++)for(let j=i+1;j<plan.length;j++){
  const a=plan[i],b=plan[j];if(b.at<a.at+a.life)assert.notEqual(a.hole,b.hole);
 }
}
console.log('PASS: scaled touch hit targets, single-use moles, secondary finger blocking, cancel/exit cleanup and collision-free appearances.');

// Real claw controller: three attempts, positioning and timing, fair handoff.
{
 const prizes=clawPrizes(123);
 const small=prizes[0],large=prizes[1];
 assert.equal(clawCatch(prizes,small.x+Math.sin(small.phase)*9,.5,0).points,1);
 assert.equal(clawCatch(prizes,large.x+Math.sin(large.phase)*9,.5,0).points,3);
 assert.equal(clawCatch(prizes,large.x,.75,0),null);
 assert.equal(clawCatch(prizes,15,.5,0),null);
 assert.deepEqual(clawPrizes(123),prizes);
}
for(const first of [0,1]){
 const f=fixture();f.start('claw',first);
 const seed=first===0?536870912:1610612734;
 const large=clawPrizes(seed)[1];
 for(let attempt=0;attempt<3;attempt++){
  const board=f.get('claw-board');board.getBoundingClientRect=()=>({left:0,top:0,width:220,height:215});
  // First grab aligns with a large prize and the center grip immediately.
  const x=attempt===0?large.x+Math.sin(large.phase)*9:220;
  board.dispatch('pointerdown',{pointerId:1,isPrimary:true,clientX:x/2});board.dispatch('pointerup',{pointerId:1});
  f.get('claw-grab').click();f.get('claw-grab').click();f.advance(2400);
 }
 assert.ok(f.get('handoff-countdown'));assert.match(f.get('arcade-team-'+first).textContent,/3/);
 f.advance(4000);
 // Second side never presses drop: aim timers automatically use all 3 attempts.
 f.advance(45000);
 assert.equal(f.state().champion,first);assert.equal(f.saved.length,1);assert.equal(f.saved[0].gameIds[0],'claw');
 assert.ok(f.get('claw-fireworks'));assert.match(f.get('game-stage').textContent,/Congratulations/);
 f.advance(10000);assert.equal(f.saved.length,1);
}
{
 const f=fixture();f.start('claw');f.advance(45000);f.advance(45000);
 assert.equal(f.saved.length,0);assert.match(f.get('game-stage').textContent,/tie/);assert.ok(f.get('claw-fireworks'));
}
{
 const f=fixture();f.start('claw');f.doc.hidden=true;f.doc.handlers.visibilitychange();f.advance(60000);
 assert.match(f.get('game-stage').textContent,/interrupted/);assert.equal(f.saved.length,0);
}
console.log('PASS: Harper’s Claw Machine 1/3-point grabs, timing misses, three attempts, handoff, fireworks, ties and interruption.');

// Rivalry HUD follows the actual opponent, including reverse starts, ties and overtakes.
for(const first of [0,1]){
 const f=fixture(0,true,false,[[],['Harper','Chloe']]);f.start('mole',first,false);
 assert.match(f.get('game-stage').textContent,/HarperVS.*Chloe/);
 f.run(`clearTimers();finishTurn({score:12,elapsed:30,label:'12 hits'});`);
 assert.match(f.get('competition-call').textContent,new RegExp('BEAT '+(first===0?'Harper':'Chloe')+"'S 12"));
 f.advance(4000);
 f.run('competitionUpdate({score:9})');assert.match(f.get('competition-call').textContent,/3 MORE TO TIE/);
 f.run('competitionUpdate({score:11})');assert.match(f.get('competition-call').textContent,/ONE SCORE AWAY/);
 f.run('competitionUpdate({score:12})');assert.match(f.get('competition-call').textContent,/TIED/);
 f.run('competitionUpdate({score:13})');assert.match(f.get('competition-call').textContent,/TAKES THE LEAD/);
 const calls=f.speech.spoken.length;f.run('competitionUpdate({score:14})');assert.equal(f.speech.spoken.length,calls,'No repeated lead narration on every hit');
 f.run('finishTurn({score:14,elapsed:30,label:"14 hits"})');
 assert.match(f.get('game-stage').textContent,/HAS THE CROWN/);assert.equal(f.saved.length,0,'Kid-only results remain local');
 f.click('REMATCH!');assert.match(f.get('game-stage').textContent,/DEFENDING CHAMPION/);
 assert.deepEqual([...f.state().wins],[0,0]);assert.doesNotMatch(f.get('competition-detail').textContent,/BEAT.*14/);
}
// Time and distance tie breakers never claim an outright win prematurely.
{
 const f=fixture();f.start('picture');f.run('finishTurn({score:3,elapsed:8.5,label:"3 found"})');f.advance(4000);
 f.run('competitionUpdate({score:3})');assert.match(f.get('competition-call').textContent,/TIME DECIDES/);assert.match(f.get('competition-detail').textContent,/8.5s/);
 const frog=fixture();frog.start('frog');frog.run('finishTurn({score:1,distance:77,flies:2,elapsed:0,label:"1 crossing"})');frog.advance(4000);
 assert.match(frog.get('competition-detail').textContent,/77%/);
 frog.run('competitionUpdate({score:1,distance:80,flies:0})');assert.match(frog.get('competition-call').textContent,/AHEAD ON DISTANCE/);
 assert.ok(frog.get('frog-pond').drawCalls.some(c=>c.name==='fillText'&&String(c.args[0]).includes('77% BEST')),'Pond draws the opponent distance marker');

}
// Every playable game gets a rivalry HUD; safe escaped roster names cannot inject markup.
for(const g of data.GAMES.filter(g=>!g.comingSoon)){
 const f=fixture(0,false,false,[[],['<img src=x>','Chloe']]);f.start(g.id,0,false);
 assert.ok(f.get('competition-call'),g.id);assert.equal(f.get('game-stage').querySelector('img'),null);
}
console.log('PASS: competition targets, reverse starts, score ties, lead transitions, time/distance rules, frog marker, crown rematches, safe roster names and every game HUD.');

// Successful timed turns save independently of match wins; partial turns do not.
for(const [game,score] of [['maze',1],['picture',3],['number',5]]){
 const f=fixture();f.start(game);
 f.run(`finishTurn({score:${score},elapsed:5.432,label:'Complete'})`);
 assert.equal(f.timedSaved.length,1);assert.equal(f.timedSaved[0].game,game);assert.equal(f.timedSaved[0].elapsedMs,5432);assert.equal(f.saved.length,0);
}
{const f=fixture();f.start('maze');f.run("finishTurn({score:0,elapsed:45,label:'No escape'})");assert.equal(f.timedSaved.length,0);}
{const f=fixture();f.start('number');f.run("finishTurn({score:4,elapsed:12,label:'4/5'})");assert.equal(f.timedSaved.length,0);}
console.log('PASS: timed records captured under the family account, partial/failed turns excluded, match ledger preserved.');

// Weighted bonuses use identical opportunities and each mole is consumed once.
for(const first of [0,1]){
 const f=fixture();f.start('mole',first);const plan=molePlan(first===0?536870912:1610612734);
 // Read the actual seeded schedule rather than assuming player order affects it.
 const actual=f.run('game.molePlan');const gold=actual.find(e=>e.gold);
 f.advance(gold.at+200);const board=f.get('mole-board');
 board.dispatch('keydown',{key:String(gold.hole+1)});
 assert.equal(f.run('game.molePoints[turn]'),3);
 f.advance(200);board.dispatch('keydown',{key:String(gold.hole+1)});
 assert.equal(f.run('game.molePoints[turn]'),3,'Gold cannot count twice');
 const reference=JSON.stringify(actual);f.advance(30000-(f.clock()-4000));f.advance(4000);
 assert.equal(JSON.stringify(f.run('game.molePlan')),reference,'Both players share all opportunities');
 f.advance(gold.at+200);f.get('mole-board').dispatch('keydown',{key:String(gold.hole+1)});
 assert.equal(f.run('game.molePoints[turn]'),3);f.advance(30000);
 assert.match(f.get('game-stage').textContent,/It’s a tie/);assert.equal(f.saved.length,0);
 f.click('Optional tiebreaker · 30 seconds each');f.advance(4000);
 assert.deepEqual([...f.run('game.molePoints')],[0,0]);
}
for(let seed=1;seed<=100;seed++){
 const plan=molePlan(seed);assert.equal(plan.filter(e=>e.gold).length,3);
 assert.ok(plan.every(e=>e.at+e.life<=30000));
 assert.equal(new Set(plan.map(e=>e.personality)).size,4);
}
{
 const f=fixture(0,true,true);f.start('mole');f.advance(800);f.get('arcade-sound').click();
 const count=f.speech.spoken.length;f.advance(1000);assert.equal(f.speech.spoken.length,count);
 f.doc.hidden=true;f.doc.handlers.visibilitychange();f.advance(60000);assert.equal(f.saved.length,0);
 assert.ok(f.audio.nodes.every(n=>n.stops.length));
}
console.log('PASS: gold +3 exactly once, equal bonus schedules in both orders, optional tiebreak reset, 100 seeds, mute and interruption cleanup.');

{
 const f=fixture(0,true);f.start('mole');const plan=f.run('game.molePlan');let elapsed=0;
 for(const e of plan){const at=Math.max(e.at+180,elapsed+200);f.advance(at-elapsed);elapsed=at;f.get('mole-board').dispatch('keydown',{key:String(e.hole+1)});}
 assert.equal(f.run('game.molePoints[0]'),plan.length+6,'Combos never add points');
 assert.ok(f.speech.spoken.some(u=>/NICE|ON FIRE|MOLE MASTER/.test(u.text)));
 f.advance(30000-elapsed);f.advance(4000);f.advance(30000);assert.equal(f.saved.length,1);
 for(let n=0;n<3;n++){f.click('REMATCH!');f.advance(4000);assert.deepEqual([...f.run('game.molePoints')],[0,0]);f.advance(30000);f.advance(4000);f.advance(30000);assert.match(f.get('game-stage').textContent,/It’s a tie/);}
}
console.log('PASS: complete perfect turn, visual-only combos, exact score ceiling, three clean rematches.');
