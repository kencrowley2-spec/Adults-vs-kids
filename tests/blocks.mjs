import assert from 'node:assert/strict';
import {blockFits,placeBlock,fittingShapes,mountBlocks} from '../public/arcade-blocks.js';
const blank=()=>Array(64).fill(0),single=[[0,0]];
assert.equal(blockFits(blank(),[[0,0],[1,0]],7,0),false);
assert.equal(blockFits(blank(),single,-1,0),false);
const occupied=blank();occupied[0]=2;assert.equal(placeBlock(occupied,single,0,0,1),null);
const cross=blank();for(let i=0;i<8;i++){cross[i]=2;cross[i*8]=3;}cross[0]=0;
const result=placeBlock(cross,single,0,0,4);assert.equal(result.lines,2);assert.equal(result.cleared.length,15);assert.ok(result.board.every(v=>!v));assert.equal(cross[0],0);
const row=blank();for(let i=0;i<7;i++)row[8+i]=1;row[1]=2;
const r=placeBlock(row,single,7,1,3);assert.equal(r.lines,1);assert.equal(r.board[1],2);assert.ok(r.board.slice(8,16).every(v=>!v));
assert.ok(fittingShapes(row).length>0);
// Real pointer handlers with a scaled canvas, including touch lift and fit ghost.
function fixture(){
 let now=0,points=0,finished=0,seq=0;const timers=new Map(),handlers={},fills=[];
 const ctx=new Proxy({fillRect:(...args)=>fills.push({color:ctx.fillStyle,args})},{get:(t,k)=>t[k]??(()=>{})});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:10,top:20,width:200,height:285}),addEventListener:(key,fn)=>handlers[key]=fn,setPointerCapture(){}};
 const oldWindow=globalThis.window,oldPerformance=globalThis.performance;
 globalThis.window={devicePixelRatio:1};globalThis.performance={now:()=>now};
 mountBlocks({canvas,team:'Adults',later:(fn,ms)=>timers.set(++seq,{fn,at:now+ms}),onScore:p=>points=p,onEnd:()=>finished++,sound(){},onStatus(){},seed:7103});
 const event=(type,x,y,pointerType='mouse')=>handlers[type]({clientX:10+x/2,clientY:20+y/2,pointerId:1,pointerType,preventDefault(){}});
 function advance(ms){const end=now+ms;for(;;){const task=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!task||task[1].at>end)break;timers.delete(task[0]);now=task[1].at;task[1].fn();}now=end;}
 return {event,advance,fills,points:()=>points,finished:()=>finished,restore(){globalThis.window=oldWindow;globalThis.performance=oldPerformance;}};
}
for(const type of ['mouse','touch']){
 const f=fixture();try{
 f.event('pointerdown',69,513,type);f.event('pointermove',180,type==='touch'?271:223,type);f.advance(16);
 assert.ok(f.fills.some(v=>v.color==='#77ffad88'),'Valid placement must show a green fit preview');
 f.event('pointerup',180,type==='touch'?271:223,type);assert.equal(f.points(),1);
 f.event('pointerdown',200,513,type);f.event('pointermove',-100,-100,type);f.event('pointerup',-100,-100,type);assert.equal(f.points(),1);
 f.advance(60016);assert.equal(f.finished(),1);f.event('pointerdown',69,513,type);f.event('pointerup',180,223,type);assert.equal(f.points(),1);assert.equal(f.finished(),1);
 }finally{f.restore();}
}
console.log('PASS: block boundaries, occupied cells, simultaneous row/column clears, preserved cells, scaled mouse/touch drops, green fit preview, invalid drops and deadline lockout.');
