import assert from 'node:assert/strict';
import {LENGTH,STEP,drive,grid,replay,bend} from '../public/ghostline-core.js';
function run(input){
 const car=grid(),trace=[{s:0,x:0}];
 while(car.s<LENGTH&&car.time<46){drive(car,input(car));trace.push({s:car.s,x:car.x});}
 assert.equal(car.s,LENGTH);assert.ok(car.time>=30&&car.time<=45);
 return {trace,time:car.time};
}
const clean=run(c=>Math.sign(bend(c.s)*c.speed*14-c.x*2)),wide=run(()=>1);
assert.ok(clean.time<wide.time);
for(let i=0;i<clean.trace.length;i+=41){
 const p=replay(clean.trace,i*STEP);
 assert.ok(Math.abs(p.s-clean.trace[i].s)<1e-7&&Math.abs(p.x-clean.trace[i].x)<1e-7);
}
assert.deepEqual(replay(clean.trace,48),clean.trace.at(-1));
assert.deepEqual(run(()=>1),wide);
console.log('Clean lap',clean.time.toFixed(2),'s; grass-heavy lap',wide.time.toFixed(2),'s. Ghost position and timing verified.');
