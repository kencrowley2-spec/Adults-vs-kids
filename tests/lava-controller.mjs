import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';import * as core from '../public/arcade-lava-core.js';
function fixture(width=844,height=390){
 const dom=new JSDOM('<!doctype html><body></body>',{url:'https://adultsvskids.com'}),{window}=dom,{document}=window;let now=1,raf=null,complete=[],exits=0;
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{})});
 window.HTMLCanvasElement.prototype.getContext=()=>context;window.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({x:0,y:46,left:0,top:46,width,height:height-104});
 window.HTMLElement.prototype.setPointerCapture=()=>{};
 const speech={spoken:[],cancel(){},speak(u){this.spoken.push(u.text);}};window.speechSynthesis=speech;
 let resumes=0,suspends=0,closed=0;class Audio{constructor(){this.state='running';this.sampleRate=8000;this.currentTime=0;this.destination={};}resume(){resumes++;this.state='running';return Promise.resolve();}suspend(){suspends++;this.state='suspended';return Promise.resolve();}close(){closed++;return Promise.resolve();}createOscillator(){return {frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}createGain(){return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}createBuffer(_,n){return {getChannelData:()=>new Float32Array(n)};}createBufferSource(){return {connect(){},start(){},disconnect(){}};}}
 window.AudioContext=Audio;
 const c=vm.createContext({...core,window,document,Math,Image:class{complete=false;},SpeechSynthesisUtterance:class{constructor(t){this.text=t;}},ResizeObserver:class{observe(){}disconnect(){}},matchMedia:()=>({matches:false}),innerWidth:width,innerHeight:height,devicePixelRatio:2,performance:{now:()=>now},requestAnimationFrame:fn=>{raf=fn;return 1;},cancelAnimationFrame:()=>{raf=null;}});
 vm.runInContext(readFileSync(new URL('../public/arcade-lava.js',import.meta.url),'utf8').replace(/^import .*;\n/,'').replace('export function mountLava','function mountLava'),c);
 c.complete=r=>complete.push(r);c.exit=()=>exits++;vm.runInContext('this.cleanup=mountLava({players:["Dad","Harper"],onExit:exit,onComplete:complete})',c);
 const $=s=>document.querySelector(s),phase=()=>$('.lava-phase strong').textContent,host=()=>$('.lava-game');
 function advance(sec){const end=now+sec*1000;while(now<end&&raf){now=Math.min(end,now+10);const fn=raf;raf=null;fn(now);}}
 function click(s){const b=$(s);assert.ok(b,`Missing ${s}`);b.click();}
 function point(id,round=0){const t=core.course(round)[id],h=height-104,scale=Math.min(width/1030,h/360),ox=(width-1030*scale)/2,oy=(h-360*scale)/2;return {clientX:ox+t.x*scale,clientY:46+oy+t.y*scale};}
 function tap(id,round=0){const e=new window.MouseEvent('pointerdown',{bubbles:true,...point(id,round)});$('canvas').dispatchEvent(e);}
 function trap(type,id,round=0,drag=false){const b=$(`[data-trap=${type}]`);b.dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true,clientX:10,clientY:height-20}));host().dispatchEvent(new window.MouseEvent('pointerup',{bubbles:true,...(drag?point(id,round):{clientX:10,clientY:height-20})}));if(!drag)tap(id,round);}
 advance(.02);return {$,click,advance,tap,trap,phase,complete,exits:()=>exits,cleanup:c.cleanup,speech,audio:()=>({resumes,suspends,closed}),document};
}
for(const [w,h] of [[844,390],[740,360],[932,430]]){
 const f=fixture(w,h);f.click('[data-action=start]');f.advance(3.1);assert.match(f.phase(),/BUILD YOUR TRAP/);f.trap('crack',2,0,true);assert.match(f.$('.lava-toast').textContent,/placed/);f.tap(2);f.trap('spinner',4);f.trap('spring',6);f.trap('ghost',8);f.trap('crack',10);assert.match(f.$('.lava-toast').textContent,/Three traps max/);
 f.click('[data-action=pause]');const time=f.$('.lava-phase b').textContent;f.advance(8);assert.equal(f.$('.lava-phase b').textContent,time);f.click('[data-action=resume]');f.click('[data-action=attack]');assert.match(f.$('[data-action=attack]').textContent,/AUTO/);f.advance(27);assert.match(f.phase(),/ESCAPE THE LAVA/);
 // Six complete escape attempts on the guaranteed blue route. Vary time so no tie.
 for(let n=0;n<6;n++){
  const round=Math.floor(n/2);if(n>0){f.advance(31.7);assert.match(f.phase(),/ESCAPE THE LAVA/);}
  if(n%2)f.advance(1.1);
  for(const id of [1,3,5,7,9,11,13,15]){f.tap(id,round);f.advance(.65);}
  assert.match(f.$('.lava-overlay').textContent,/THEY MADE IT/);f.advance(4.6);
 }
 assert.equal(f.complete.length,1);assert.equal(f.complete[0].attempts.length,6);assert.match(f.$('.lava-overlay').textContent,/LAVA CHAMPION/);f.advance(5);assert.equal(f.complete.length,1);f.click('[data-action=rematch]');f.advance(3.1);assert.match(f.phase(),/BUILD/);f.click('[data-action=exit]');assert.equal(f.exits(),1);assert.equal(f.$('.lava-game'),null);assert.equal(f.audio().closed,1);
}
// One-use live attack catches an idle runner, gives one failure bonus, times out fairly.
{
 const f=fixture();f.click('[data-action=start]');f.advance(30.2);assert.match(f.phase(),/ESCAPE/);f.click('[data-action=attack]');assert.equal(f.$('[data-action=attack]').disabled,true);f.advance(1);assert.doesNotMatch(f.$('.lava-overlay').textContent,/LAVA GOT/);f.advance(.7);assert.match(f.$('.lava-overlay').textContent,/LAVA GOT YOU/);assert.match(f.$('.lava-score').textContent,/50/);f.advance(4.6);assert.match(f.phase(),/BUILD/);f.advance(57.1);assert.match(f.$('.lava-overlay').textContent,/Time expired/);f.cleanup();
}
{
 const f=fixture();f.click('[data-action=tutorial]');f.tap(1);f.advance(.7);assert.match(f.$('.lava-overlay').textContent,/NICE JUMP/);assert.equal(f.complete.length,0);f.click('[data-action=continue]');f.advance(3.1);assert.match(f.phase(),/BUILD/);f.click('[data-action=sfx]');assert.equal(f.$('[data-action=sfx]').getAttribute('aria-pressed'),'false');f.click('[data-action=music]');assert.equal(f.$('[data-action=music]').getAttribute('aria-pressed'),'false');Object.defineProperty(f.document,'hidden',{value:true,configurable:true});f.document.dispatchEvent(new f.document.defaultView.Event('visibilitychange'));assert.ok(f.$('.lava-pause'));f.cleanup();
}
console.log('PASS Lava controller: Android/iPhone landscape sizes, touch taps/drag/remove/budget, all six live escapes, auto/live attack, failure/timeout, scores, role switching, final once-only result, pause clock, tutorial, audio toggles, rematch and cleanup.');
