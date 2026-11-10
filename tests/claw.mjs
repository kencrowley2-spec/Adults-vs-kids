import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/arcade-claw.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
class Input{
 constructor(){this.handlers={};this.disabled=false;this.textContent='';}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 emit(type,event={}){for(const fn of this.handlers[type]??[])fn({preventDefault(){},...event});}
 click(){if(!this.disabled)this.emit('click');}
 getBoundingClientRect(){return{left:0,width:220};}
}
function fixture(){
 let now=0,id=0,disposed=0,prizes;const jobs=new Map(),scores=[],ends=[],frames=[],statuses=[];
 const c=vm.createContext({console,Math,performance:{now:()=>now},createClawScene:(canvas,p)=>{prizes=p;return{render:f=>frames.push({...f}),dispose:()=>disposed++};}});
 vm.runInContext(source+'\nthis.api={mountClaw,clawCatch,clawPrizes}',c);
 const canvas=new Input(),left=new Input(),right=new Input(),grab=new Input(),timer=new Input(),counter=new Input();
 const layout=c.api.clawPrizes(123);
 const stop=c.api.mountClaw({canvas,left,right,grab,timer,counter,team:'Crowley',prizes:layout,later:(fn,delay)=>jobs.set(++id,{at:now+delay,fn}),onScore:n=>scores.push(n),onEnd:r=>ends.push(r),onStatus:s=>statuses.push(s),sound:()=>{}});
 function advance(ms){const end=now+ms;for(;;){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;jobs.delete(next[0]);now=next[1].at;next[1].fn();}now=end;}
 return{...c.api,canvas,left,right,grab,timer,counter,layout,prizes,scores,ends,frames,statuses,stop,advance,disposed:()=>disposed};
}
{
 const f=fixture();assert.equal(f.prizes.length,24);assert.deepEqual(f.layout,f.clawPrizes(123));
 for(const p of f.prizes)assert.equal(f.clawCatch(f.prizes,p.x).points,1);
 assert.equal(f.clawCatch(f.prizes,0),null);
 assert.equal(f.clawCatch(f.prizes.map(p=>({...p,taken:true})),220),null);
 // Well-aligned grabs do not require a grip timing meter.
 assert.equal(f.clawCatch(f.prizes,f.prizes[0].x+25).points,1);
 for(let i=0;i<4;i++){
  f.grab.click();f.grab.click();f.advance(1000);assert.equal(f.scores.length,i);
  f.advance(600);assert.equal(f.scores.at(-1),i+1);
 }
 assert.equal(f.ended,undefined);assert.equal(f.ends.length,0);
 assert.equal(f.prizes.filter(p=>p.taken).length,4);
 assert.ok(f.layout.every(p=>!p.taken),'The next player receives the untouched pile');
 f.advance(23600);assert.equal(f.ends.length,1);assert.equal(f.ends[0].score,4);
 assert.equal(f.ends[0].elapsed,30);assert.equal(f.disposed(),1);
 f.advance(60000);f.grab.click();assert.equal(f.ends.length,1);f.stop();assert.equal(f.disposed(),1);
}
{
 const f=fixture();f.advance(29900);f.grab.click();f.advance(200);
 assert.equal(f.ends.length,0,'An accepted grab finishes after the buzzer');
 f.advance(1500);assert.equal(f.ends.length,1);assert.equal(f.ends[0].score,1);
}
{
 const f=fixture();f.advance(30000);f.grab.click();f.advance(1700);
 assert.equal(f.ends[0].score,0,'New grabs at the deadline are rejected');
}
{
 const f=fixture();f.left.emit('pointerdown',{pointerId:1});f.advance(250);f.left.emit('pointerup');
 assert.ok(f.frames.at(-1).x<220);const x=f.frames.at(-1).x;f.advance(250);assert.equal(f.frames.at(-1).x,x);
 f.canvas.emit('pointerdown',{pointerId:2,clientX:60});f.advance(16);assert.equal(f.frames.at(-1).x,120);
 f.canvas.emit('pointercancel');f.canvas.emit('pointermove',{pointerId:2,clientX:10});f.advance(16);assert.equal(f.frames.at(-1).x,120);
 f.stop();f.advance(60000);assert.equal(f.ends.length,0);assert.equal(f.disposed(),1);
}
{
 const f=fixture();f.canvas.emit('keydown',{key:' ',repeat:true});f.advance(1600);assert.equal(f.scores.length,0);
 f.canvas.emit('keydown',{key:'Enter',repeat:false});f.advance(1600);assert.equal(f.scores[0],1);
}
console.log('PASS: THE CLAW — 30 seconds, one point per delivered toy, forgiving grabs, unlimited attempts, late completion, deadline rejection, identical piles, input and cleanup.');
