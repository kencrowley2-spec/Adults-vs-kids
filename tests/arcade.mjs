import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as core from '../public/arcade-core.js';
import * as data from '../public/arcade-data.js';

// Small DOM/clock fixture executes the actual game controller without a browser
// or real-time waits. Browser QA covers layout and native form behavior.
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.handlers={};this.hidden=false;this.disabled=false;this.value='';this._text='';this.className='';this.classList={add:(s)=>{this.className+=' '+s;}};}
  appendChild(el){this.children.push(el);return el;}
  replaceChildren(...els){this.children=els;this._text='';}
  setAttribute(k,v){this.attrs[k]=v;if(k==='id')this.id=v;if(k==='class')this.className=v;}
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
  click(){if(!this.disabled)this.dispatch('click');}
  dispatch(type){for(const fn of this.handlers[type]??[])fn({preventDefault(){}});}
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
function fixture(){
  let now=0,seq=0,scheduled=new Map();const root=new Element();
  root.innerHTML=readFileSync(new URL('../app/family/arcade/route.ts',import.meta.url),'utf8').split('const html=`')[1].split('`;')[0];
  const doc={hidden:false,getElementById:id=>root.querySelector('#'+id),createElement:tag=>new Element(tag),handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}};
  const context=vm.createContext({...core,...data,document:doc,performance:{now:()=>now},console,setTimeout:(fn,delay)=>{scheduled.set(++seq,{at:now+delay,fn});return seq;},clearTimeout:id=>scheduled.delete(id)});
  const source=readFileSync(new URL('../public/arcade.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(source+'\nthis.state=()=>({wins:[...wins],round,champion,turn});',context);
  const get=id=>doc.getElementById(id);
  const buttons=()=>get('game-stage').querySelectorAll('button');
  const click=text=>{const b=buttons().find(b=>b.textContent===text);assert.ok(b,`Missing button: ${text}`);b.click();};
  function advance(ms){const end=now+ms;let guard=0;while(true){const task=[...scheduled.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!task)break;assert.ok(++guard<10000);scheduled.delete(task[0]);now=task[1].at;task[1].fn();}now=end;}
  function start(id,first=0){const i=data.GAMES.findIndex(g=>g.id===id);get('arcade-grid').children[i].click();click(first===0?'Parents first →':'Kids first →');click(`${core.teamName(first)} ready →`);}
  return {root,doc,get,buttons,click,advance,start,state:context.state};
}
assert.equal(data.GAMES.length,9);
for(const outcome of [[0,1,0,1,0],[1,0,1,0,1],[0,0,0]]){
  let wins=[0,0],champion=-1;outcome.forEach(w=>({wins,champion}=core.awardRound(wins,w)));
  assert.equal(champion,outcome.at(-1));assert.equal(wins[champion],3);
}
assert.deepEqual(core.awardRound([2,2],null),{wins:[2,2],champion:-1});
assert.equal(core.roundWinner({score:2,elapsed:4},{score:2,elapsed:5},false,true),0);
assert.equal(core.roundWinner({score:230},{score:250},true),0);
assert.equal(core.lineWinner([0,0,0,null,1,null,1,null,null]),0);

// Every game honors either starting team, with the existing handoff preserved.
for(const game of data.GAMES){
 for(const first of [0,1]){
  const f=fixture();f.start(game.id,first);assert.equal(f.state().turn,first,`${game.id}: selected team starts`);
  if(game.id==='memory'){f.advance(5000);assert.match(f.get('turn-strip').textContent,new RegExp(`${core.teamName(first)}’ turn`));}
  else if(game.id==='tic'){
   f.get('tic-board').children[0].click();assert.equal(f.get('tic-board').children[0].textContent,first===0?'X':'O');
   f.click(`Pass to ${core.teamName(1-first)} →`);assert.equal(f.state().turn,1-first);
  }else if(game.id!=='tap'){
   f.advance(46000);
   if(game.id==='challenge'){f.get('challenge-score').value='5';f.get('challenge-form').dispatch('submit');}
   f.click(`Pass to ${core.teamName(1-first)} →`);f.click(`${core.teamName(1-first)} ready →`);assert.equal(f.state().turn,1-first);
  }
 }
}

// Full Memory Match: preview, pass every attempt, seven pairs, first-to-three,
// reshuffled decks each round, and no extra round after a match winner.
{
 const f=fixture();f.start('memory');assert.equal(f.get('memory-cards').children.length,14);
 const layouts=[];
 for(let r=0;r<3;r++){
  const cards=f.get('memory-cards').children;assert.ok(cards.every(c=>c.disabled&&c.textContent!=='?'));
  const symbols=cards.map(c=>c.textContent);layouts.push(symbols.join(''));
  const pairs=[...new Set(symbols)].map(s=>symbols.flatMap((v,i)=>v===s?[i]:[]));
  f.advance(4999);assert.ok(f.get('memory-cards').children.every(c=>c.disabled));
  f.advance(1);assert.ok(f.get('memory-cards').children.every(c=>c.textContent==='?'));
  for(let i=0;i<pairs.length;i++){
   for(const pos of pairs[i])f.get('memory-cards').children[pos].click();
   if(i<6){f.click('Hide cards & pass →');assert.ok(f.get('memory-cards').children.every(c=>c.disabled));f.click(`${core.teamName(f.state().turn)} ready →`);}
  }
  f.advance(800);
  if(r<2){assert.equal(f.state().champion,-1);f.click('Next round →');f.click(`${core.teamName(f.state().turn)} ready →`);}
 }
 // Alternating round starters make the winners Adults, Kids, Adults here.
 assert.deepEqual([...f.state().wins],[2,1]);assert.equal(f.state().round,3);
 assert.ok(new Set(layouts).size>1);
}
// Mismatched cards stay visible until the handoff, then hide; leaving the
// game cancels an outstanding preview and cannot mutate the next game.
{
 const f=fixture();f.start('memory');const cards=f.get('memory-cards').children;
 const j=cards.findIndex(c=>c.textContent!==cards[0].textContent);f.advance(5000);
 f.get('memory-cards').children[0].click();f.get('memory-cards').children[j].click();
 assert.match(f.get('arcade-message').textContent,/No match/);f.click('Hide cards & pass →');assert.equal(f.state().turn,1);
 f.get('arcade-return').click();f.start('tic');f.advance(10000);assert.ok(f.get('tic-board'));
}
// TTT accepts no moves until the other team acknowledges the handoff.
{
 const f=fixture();f.start('tic');const board=()=>f.get('tic-board').children;
 for(const move of [0,3,1,4,2]){board()[move].click();if(move!==2){assert.ok(board().every(c=>c.disabled));f.click(`Pass to ${core.teamName(1-f.state().turn)} →`);}}
 f.advance(500);assert.deepEqual([...f.state().wins],[1,0]);
}
// Every timed mode completes turns and awards a round, including zero-score
// ties, and clears timers before the handoff. Challenge uses honest manual scores.
for(const game of ['spot','trivia','word','picture','number','challenge']){
 const f=fixture();f.start(game);
 if(game==='challenge'){f.advance(20000);f.get('challenge-score').value='12';f.get('challenge-form').dispatch('submit');}
 else f.advance(46000);
 assert.match(f.get('game-stage').textContent,/turn is complete/);f.advance(100000);
 f.click('Pass to Kids →');f.click('Kids ready →');
 if(game==='challenge'){f.advance(20000);f.get('challenge-score').value='10';f.get('challenge-form').dispatch('submit');assert.deepEqual([...f.state().wins],[1,0]);}
 else {f.advance(46000);assert.deepEqual([...f.state().wins],[0,0]);assert.match(f.get('game-stage').textContent,/It’s a tie/);f.click('Replay round →');assert.equal(f.state().round,1);}
}
// Answer a real generated arithmetic question; rapid repeated taps only score once.
{
 const f=fixture();f.start('number');const prompt=f.get('quiz-body').querySelector('h3').textContent;
 const [a,op,b]=prompt.split(' ');const answer=op==='+'?Number(a)+Number(b):Number(a)-Number(b);
 const btt=f.get('quiz-body').querySelectorAll('button').find(b=>b.textContent===String(answer));btt.click();btt.click();f.advance(650);
 assert.match(f.get('question-progress').textContent,/2 \/ 5 · 1 correct/);
 f.doc.hidden=true;f.doc.handlers.visibilitychange();assert.match(f.get('game-stage').textContent,/interrupted/);f.advance(60000);assert.deepEqual([...f.state().wins],[0,0]);
}
// Three early taps per team incur penalties and tie fairly.
{
 const f=fixture();f.start('tap');
 for(const team of [0,1]){
  for(let i=0;i<3;i++){f.click('Start reaction test →');f.click('WAIT…');if(i<2)f.click('Next test →');}
  f.click('Finish turn →');if(team===0){f.click('Pass to Kids →');f.click('Kids ready →');}
 }
 assert.match(f.get('game-stage').textContent,/It’s a tie/);assert.deepEqual([...f.state().wins],[0,0]);
}
// Awarded rounds stop at a 3–2 win through the actual UI (Family Challenge).
{
 const f=fixture();f.start('challenge');
 for(let r=0;r<5;r++){
  const first=f.state().turn;const winner=r%2===0?0:1;
  for(const team of [first,1-first]){
   f.advance(20000);f.get('challenge-score').value=team===winner?'10':'5';f.get('challenge-form').dispatch('submit');
   if(team===first){f.click(`Pass to ${core.teamName(1-team)} →`);f.click(`${core.teamName(1-team)} ready →`);}
  }
  if(r<4){assert.equal(f.state().champion,-1);f.click('Next round →');f.click(`${core.teamName(f.state().turn)} ready →`);}
 }
 assert.equal(f.state().champion,0);assert.deepEqual([...f.state().wins],[3,2]);assert.match(f.get('game-stage').textContent,/win the match/);
 f.click('Rematch →');assert.deepEqual([...f.state().wins],[0,0]);assert.equal(f.state().round,1);
}
// Solve visible puzzles in each content mode and verify first-team results.
for(const game of ['spot','trivia','word','picture']){
 const f=fixture();f.start(game);
 const total=game==='trivia'?5:3;
 for(let i=0;i<total;i++){
  if(game==='spot'){
   const grids=f.get('spot-body').querySelectorAll('div');
   const original=grids[0].children,target=grids[1].children;
   const changed=target.findIndex((t,j)=>t.textContent!==original[j].textContent);target[changed].click();
  }else if(game==='trivia'){
   const question=f.get('quiz-body').querySelector('h3').textContent;
   f.click(data.TRIVIA.find(q=>q[0]===question)[1]);f.advance(650);
  }else if(game==='word'){
   const clue=f.get('quiz-body').querySelector('p').textContent;
   f.get('word-answer').value=data.WORDS.find(q=>q[1]===clue)[0];f.get('word-form').dispatch('submit');f.advance(650);
  }else{
   const symbol=f.get('quiz-body').querySelector('span').textContent;
   f.click(data.PICTURES.find(q=>q[0]===symbol)[1]);f.advance(650);
  }
 }
 assert.match(f.get('game-stage').textContent,new RegExp(`${total}/${total}`));
 f.click('Pass to Kids →');f.click('Kids ready →');f.advance(46000);assert.deepEqual([...f.state().wins],[1,0]);
}
// Green taps and non-responses both advance through all reaction trials.
{
 const f=fixture();f.start('tap');
 f.click('Start reaction test →');
 for(let t=0;t<34&&f.get('tap-zone').querySelector('button').textContent==='WAIT…';t++)f.advance(100);
 const pad=f.get('tap-zone').querySelector('button');assert.equal(pad.textContent,'GO! TAP!');pad.click();
 f.click('Next test →');f.click('Start reaction test →');f.advance(5000);
 assert.match(f.get('tap-zone').textContent,/Time’s up/);
 f.click('Next test →');f.click('Start reaction test →');f.click('WAIT…');f.click('Finish turn →');
 assert.match(f.get('game-stage').textContent,/ms average/);
}
console.log('Arcade checks passed: all nine game flows, preview, handoffs, scoring, ties, 3–2 match, reset, interrupted turns, timer cleanup.');
