import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';import * as core from '../public/arcade-lava-core.js';
function fixture(width=844,height=390){
 const dom=new JSDOM('<!doctype html><body></body>',{url:'https://adultsvskids.com',pretendToBeVisual:true}),{window}=dom,{document}=window;let now=1,raf=null,complete=[],exits=0;
 let draws=[];const context=new Proxy({clearRect(){draws=[];},drawImage(...args){draws.push(args);},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{})});
 window.HTMLCanvasElement.prototype.getContext=()=>context;window.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({x:0,y:46,left:0,top:46,width,height:height-104});
 window.HTMLElement.prototype.setPointerCapture=()=>{};
 const tracks=[];window.Audio=class{constructor(src){this.src=src;this.paused=true;this.plays=0;this.pauses=0;tracks.push(this);}play(){this.plays++;this.paused=false;return Promise.resolve();}pause(){this.pauses++;this.paused=true;}removeAttribute(name){if(name==='src')this.src='';}load(){this.loaded=true;}};
 const speech={spoken:[],cancel(){},speak(u){this.spoken.push(u.text);}};window.speechSynthesis=speech;
 let resumes=0,suspends=0,closed=0;class Audio{constructor(){this.state='running';this.sampleRate=8000;this.currentTime=0;this.destination={};}resume(){resumes++;this.state='running';return Promise.resolve();}suspend(){suspends++;this.state='suspended';return Promise.resolve();}close(){closed++;return Promise.resolve();}createOscillator(){return {frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}createGain(){return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}createBuffer(_,n){return {getChannelData:()=>new Float32Array(n)};}createBufferSource(){return {connect(){},start(){},disconnect(){}};}}
 window.AudioContext=Audio;
 const c=vm.createContext({...core,window,document,Math,Image:class{complete=true;naturalWidth=1536;naturalHeight=1024;},SpeechSynthesisUtterance:class{constructor(t){this.text=t;}},ResizeObserver:class{observe(){}disconnect(){}},matchMedia:()=>({matches:false}),innerWidth:width,innerHeight:height,devicePixelRatio:2,performance:{now:()=>now},requestAnimationFrame:fn=>{raf=fn;return 1;},cancelAnimationFrame:()=>{raf=null;}});
 vm.runInContext(readFileSync(new URL('../public/arcade-lava.js',import.meta.url),'utf8').replace(/^import .*;\n/,'').replace('export function mountLava','function mountLava'),c);
 c.complete=r=>complete.push(r);c.exit=()=>exits++;vm.runInContext('this.cleanup=mountLava({players:["Dad","Harper"],onExit:exit,onComplete:complete})',c);
 const $=s=>document.querySelector(s),phase=()=>$('.lava-phase strong').textContent,host=()=>$('.lava-game');
 function advance(sec){const end=now+sec*1000;while(now<end&&raf){now=Math.min(end,now+10);const fn=raf;raf=null;fn(now);}}
 function click(s){const b=$(s);assert.ok(b,`Missing ${s}`);b.click();}
 function point(id,round=0){const t=core.course(round)[id],h=height-104,scale=Math.min(width/1030,h/360),ox=(width-1030*scale)/2,oy=(h-360*scale)/2;return {clientX:ox+t.x*scale,clientY:46+oy+t.y*scale};}
 function tap(id,round=0){const e=new window.MouseEvent('pointerdown',{bubbles:true,...point(id,round)});$('canvas').dispatchEvent(e);}
 function trap(type,id,round=0,drag=false){const b=$(`[data-trap=${type}]`);b.dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true,clientX:10,clientY:height-20}));host().dispatchEvent(new window.MouseEvent('pointerup',{bubbles:true,...(drag?point(id,round):{clientX:10,clientY:height-20})}));if(!drag)tap(id,round);}
 advance(.02);return {tracks,draws:()=>draws,$,click,advance,tap,trap,phase,complete,exits:()=>exits,cleanup:c.cleanup,speech,audio:()=>({resumes,suspends,closed}),document};
}


const TRAP_LAYOUT=[3,7,11,6,10];
function fillTraps(f,round=0){for(const id of TRAP_LAYOUT)f.tap(id,round);}
for(const [w,h] of [[844,390],[740,360],[932,430]]){
 const f=fixture(w,h);f.click('[data-action=start]');f.advance(3.1);assert.match(f.phase(),/BUILD YOUR TRAP/);
 assert.equal(f.document.querySelectorAll('[data-trap]').length,0);assert.equal(f.$('[data-action=attack]'),null);
 for(const id of [1,2]){f.tap(id);assert.match(f.$('.lava-toast').textContent,/first two blocks/);}assert.match(f.$('.lava-phase b').textContent,/0\/5 TRAPS/);
 f.tap(4);f.advance(.02);assert.ok(f.draws().some(a=>a[1]===512&&a[2]===0),'Builder sees sabotage');f.tap(4);
 f.tap(3);f.tap(5);assert.match(f.$('.lava-toast').textContent,/safe block between/);f.tap(3);
 for(const id of TRAP_LAYOUT.slice(0,4))f.tap(id);assert.match(f.$('.lava-phase b').textContent,/4\/5 TRAPS.*NO TIMER/);
 f.click('[data-action=pause]');f.advance(8);f.click('[data-action=resume]');
 f.advance(65);assert.match(f.phase(),/BUILD YOUR TRAP/);assert.equal(f.$('.lava-overlay').innerHTML,'','No automatic pass after the former countdown');
 f.tap(TRAP_LAYOUT[4]);assert.match(f.$('.lava-overlay').textContent,/PASS THE PHONE/,'Fifth trap immediately hands off');f.advance(.02);
 assert.ok(!f.draws().some(a=>a[1]===512&&a[2]===0),'Handoff hides every trap');
 f.advance(7.1);assert.match(f.phase(),/ESCAPE THE LAVA/);assert.ok(!f.draws().some(a=>a[1]===512&&a[2]===0),'Runner sees blue blocks');
 for(let n=0;n<6;n++){
  const round=Math.floor(n/2);if(n>0){assert.match(f.phase(),/BUILD/);fillTraps(f,round);f.advance(7.1);assert.match(f.phase(),/ESCAPE/);}
  if(n%2)f.advance(1.1);
  for(const id of [1,3,5,7,9,11,13,15]){f.tap(id,round);f.advance(.65);}
  assert.match(f.$('.lava-overlay').textContent,/THEY MADE IT/);f.advance(4.6);
 }
 assert.equal(f.speech.spoken.length,0);assert.equal(f.complete.length,1);assert.equal(f.complete[0].attempts.length,6);assert.match(f.$('.lava-overlay').textContent,/LAVA CHAMPION/);
 f.advance(5);assert.equal(f.complete.length,1);f.click('[data-action=rematch]');f.advance(3.1);assert.match(f.phase(),/BUILD/);assert.match(f.$('.lava-phase b').textContent,/0\/5 TRAPS.*NO TIMER/);
 f.click('[data-action=exit]');assert.equal(f.exits(),1);assert.equal(f.$('.lava-game'),null);assert.equal(f.audio().closed,1);
}
{
 const f=fixture();f.click('[data-action=start]');f.advance(3.1);fillTraps(f);f.advance(7.1);f.tap(1);f.advance(.65);
 assert.ok(!f.draws().some(a=>a[1]===512&&a[2]===0),'First landing stays safe');f.tap(3);f.advance(.3);assert.ok(!f.draws().some(a=>a[1]===512&&a[2]===0));
 f.advance(.35);assert.match(f.$('.lava-toast').textContent,/CRACKING/);assert.ok(f.draws().some(a=>a[1]===512&&a[2]===0));
 f.advance(1);assert.match(f.phase(),/INTO THE LAVA/);assert.equal(f.$('.lava-overlay').innerHTML,'');assert.doesNotMatch(f.$('.lava-score').textContent,/50/);
 f.click('[data-action=pause]');f.advance(3);f.click('[data-action=resume]');f.advance(.6);assert.equal(f.$('.lava-overlay').innerHTML,'');
 assert.ok(f.draws().some(a=>a[1]===1024&&a[2]===512));f.advance(1.3);assert.match(f.$('.lava-overlay').textContent,/LAVA GOT YOU/);assert.match(f.$('.lava-score').textContent,/50/);f.cleanup();
}
{
 const f=fixture();f.click('[data-action=start]');f.advance(3.1);fillTraps(f);f.advance(37.2);assert.match(f.phase(),/INTO THE LAVA/);f.advance(1.9);assert.match(f.$('.lava-overlay').textContent,/Time expired/);f.cleanup();
}
{
 const f=fixture();f.click('[data-action=tutorial]');f.tap(1);f.advance(.7);assert.match(f.$('.lava-overlay').textContent,/NICE JUMP/);f.click('[data-action=continue]');f.advance(3.1);assert.match(f.phase(),/BUILD/);
 Object.defineProperty(f.document,'hidden',{value:true,configurable:true});f.document.dispatchEvent(new f.document.defaultView.Event('visibilitychange'));assert.ok(f.$('.lava-pause'));f.cleanup();
}
{
 const f=fixture();assert.equal(f.tracks.length,0);f.click('[data-action=start]');const track=f.tracks[0];assert.equal(track.loop,true);assert.equal(track.paused,false);f.advance(3.1);assert.equal(track.volume,.4);
 f.click('[data-action=sfx]');assert.equal(track.paused,false);f.click('[data-action=music]');assert.equal(track.paused,true);f.click('[data-action=music]');assert.equal(track.paused,false);
 f.click('[data-action=pause]');assert.equal(track.paused,true);f.click('[data-action=resume]');assert.equal(track.paused,false);
 fillTraps(f);f.advance(7.1);assert.equal(track.volume,.48);assert.equal(f.speech.spoken.length,0);assert.equal(f.tracks.length,1);
 f.cleanup();assert.equal(track.paused,true);assert.equal(track.src,'');assert.equal(track.loaded,true);
}
console.log('PASS: untimed setup survives 65 seconds; first pair protected; fifth trap immediately hides and passes; all six escape turns, rematch, hidden traps, splash, escape timeout, pause and soundtrack remain functional.');
