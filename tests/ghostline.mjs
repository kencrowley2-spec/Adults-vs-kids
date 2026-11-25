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

const early=run(c=>Math.sign(bend(c.s+9)*c.speed*c.speed*.73-2*c.x-.55*c.lateralSpeed));
const late=run(c=>Math.abs(c.x)>4.7?-Math.sign(c.x):0);
assert.ok(early.trace.every(frame=>Math.abs(frame.x)<=5.2),'Early steering can hold the asphalt through every turn');
assert.ok(late.trace.some(frame=>Math.abs(frame.x)>5.2),'Waiting until the edge carries the car onto grass');
assert.ok(late.time>early.time+1,'Mistimed turn-ins cost time');

const {paceRun,rivalAt,wakeStrength}=await import('../public/ghostline-core.js');
const pace=paceRun(),paceTime=(pace.length-1)*STEP;
assert.ok(pace[0].s>0&&early.time<paceTime&&paceTime<wide.time);
const rival=rivalAt(pace,2);
assert.ok(wakeStrength({s:rival.s-6,x:rival.x},rival)>.4);
assert.equal(wakeStrength({s:rival.s-6,x:rival.x+5},rival),0);
assert.equal(wakeStrength({s:rival.s+2,x:rival.x},rival),0);
assert.equal(rivalAt(pace,46).rolling,false);
console.log('Pace target',paceTime.toFixed(2),'seconds; a clean line can catch it.');
