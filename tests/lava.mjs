import assert from 'node:assert/strict';
import {course,reachable,flight,danger,placeTrap,validateCourse,scoreAttempt,suddenWinner,LavaMatch,RULES} from '../public/arcade-lava-core.js';
for(let round=0;round<3;round++){
 let tiles=course(round);assert.ok(validateCourse(tiles));
 for(const [id,type] of [[2,'crack'],[6,'spinner'],[10,'ghost']]){const p=placeTrap(tiles,id,type);assert.ok(p.ok);tiles=p.tiles;}
 assert.equal(placeTrap(tiles,14,'spring').ok,false);assert.equal(placeTrap(tiles,0,'crack').ok,false);assert.ok(validateCourse(tiles));
 let t=0,id=0;for(const to of [1,3,5,7,9,11,13,15]){assert.ok(reachable(tiles,id,to));t+=flight(tiles[id]);assert.equal(danger(tiles[to],t,t),null);id=to;}assert.ok(t<30);
 const attack={tile:5,at:3};assert.equal(danger(tiles[5],4,3,attack),null);assert.equal(danger(tiles[5],4.61,3,attack),'attack');assert.equal(danger(tiles[7],4.61,3,attack),null);assert.ok(flight(tiles[5])<RULES.attackWarning);
}
assert.equal(validateCourse([{id:0,x:0,y:0,type:'start'},{id:1,x:999,y:0,type:'finish'}]),false);
assert.equal(reachable(course(),0,15),false);
assert.equal(danger({id:2,type:'crack'},.94,0),null);assert.equal(danger({id:2,type:'crack'},.96,0),'crack');
assert.equal(danger({id:2,type:'ghost'},2.2),null);assert.equal(danger({id:2,type:'ghost'},2.4),'ghost');
assert.equal(danger({id:0,type:'spinner'},Math.PI/5),'spinner');assert.equal(danger({id:0,type:'spinner'},0),null);
let spring=course();spring[2].type='spring';assert.ok(reachable(spring,2,6));assert.equal(flight(spring[2]),.85);
assert.deepEqual(scoreAttempt(true,12.2),{escape:134,trap:0});assert.deepEqual(scoreAttempt(false,30),{escape:0,trap:50});
for(const first of [0,1]){
 const m=new LavaMatch(first),runners=[];for(let n=0;n<6;n++){runners.push(m.runner);assert.equal(m.round,Math.floor(n/2));m.finishAttempt(m.runner===0,10);}
 assert.deepEqual(runners.filter((_,i)=>i%2===0).map((r,i)=>[r,runners[i*2+1]]).every(([a,b])=>a!==b),true);
 assert.equal(m.complete,true);assert.equal(m.winner,0);assert.deepEqual(m.scores,[570,0]);assert.throws(()=>m.finishAttempt(true,2));
 const tie=new LavaMatch(first);for(let n=0;n<6;n++)tie.finishAttempt(false,30);assert.ok(tie.sudden);assert.deepEqual(tie.scores,[150,150]);tie.finishAttempt(false,30);tie.finishAttempt(false,30);assert.ok(tie.easy);assert.equal(tie.complete,false);assert.equal(tie.suddenResults.length,0);tie.finishAttempt(true,5);tie.finishAttempt(true,6);assert.equal(tie.complete,true);assert.equal(tie.winner,1-first);
 const equal=new LavaMatch(first);for(let n=0;n<6;n++)equal.finishAttempt(true,10);equal.finishAttempt(true,5);equal.finishAttempt(true,5);assert.equal(equal.complete,false);assert.ok(equal.easy);
}
assert.equal(suddenWinner({success:false,elapsed:2},{success:true,elapsed:20}),1);
assert.equal(suddenWinner({success:false,elapsed:2},{success:false,elapsed:3}),null);
console.log('PASS Lava: 3 course layouts, actual-timing safe-route validation, impossible route rejection, trap budget/placement, 4 trap rules, attack warning/escape, jump range, scoring, six attempts, both starters, winner, tied/failed/equal sudden death.');

for(let round=0;round<3;round++){
 for(let id=1;id<15;id++)for(const type of ['crack','spinner','spring','ghost'])assert.ok(placeTrap(course(round),id,type).ok,`${type} can be placed on platform ${id}`);
 const lower=placeTrap(course(round),1,'spinner');const both=placeTrap(lower.tiles,2,'ghost');assert.ok(both.ok);assert.ok(validateCourse(both.tiles));
}
console.log('PASS: all four traps on both rows, protected endpoints, and mixed-row course validation.');
