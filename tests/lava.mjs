import assert from 'node:assert/strict';
import {course,reachable,flight,danger,placeTrap,validateCourse,scoreAttempt,suddenWinner,LavaMatch,RULES,platformAppearance,TRAPS,trapSpacingValid} from '../public/arcade-lava-core.js';
for(let round=0;round<3;round++){
 let tiles=course(round);assert.ok(validateCourse(tiles));
 for(const [id,type] of [[4,'crack'],[8,'crack'],[12,'crack']]){const p=placeTrap(tiles,id,type);assert.ok(p.ok);tiles=p.tiles;}
 assert.equal(placeTrap(tiles,14,'crack').ok,false);assert.equal(placeTrap(tiles,0,'crack').ok,false);assert.ok(validateCourse(tiles));
 let t=0,id=0;for(const to of [1,3,5,7,9,11,13,15]){assert.ok(reachable(tiles,id,to));t+=flight(tiles[id]);assert.equal(danger(tiles[to],t,t),null);id=to;}assert.ok(t<30);

}
assert.equal(validateCourse([{id:0,x:0,y:0,type:'start'},{id:1,x:999,y:0,type:'finish'}]),false);
assert.equal(reachable(course(),0,15),false);
assert.equal(danger({id:2,type:'crack'},.94,0),null);assert.equal(danger({id:2,type:'crack'},.96,0),'crack');
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
console.log('PASS Lava: 3 course layouts, actual-timing safe-route validation, impossible route rejection, trap budget/placement, breaking-block timing, jump range, scoring, six attempts, both starters, winner, tied/failed/equal sudden death.');

for(let round=0;round<3;round++){
 for(let id=3;id<15;id++)for(const type of ['crack'])assert.ok(placeTrap(course(round),id,type).ok,`${type} can be placed on platform ${id}`);
 const lower=placeTrap(course(round),3,'crack');const both=placeTrap(lower.tiles,6,'crack');assert.ok(both.ok);assert.ok(validateCourse(both.tiles));
}
console.log('PASS: breaking traps on both rows, protected endpoints, and mixed-row course validation.');

assert.deepEqual(TRAPS,['crack']);
for(const phase of ['welcome','intro','handoff','countdown','escape'])assert.equal(platformAppearance({type:'crack'},phase),'safe');
assert.equal(platformAppearance({type:'crack'},'build'),'crack');assert.equal(platformAppearance({type:'crack',revealed:true},'escape'),'crack');
assert.equal(danger({type:'crack',triggeredAt:1},1.94,1.9),null);assert.equal(danger({type:'crack',triggeredAt:1},1.96,1.9),'crack');
console.log('PASS: breaking traps only; hidden before landing; reveal on contact; collapse timer persists after leaving.');

for(let round=0;round<3;round++){
 let tiles=course(round);for(const id of [3,7,11,6,10]){const p=placeTrap(tiles,id,'crack');assert.ok(p.ok,`five separated traps: ${id}`);tiles=p.tiles;}
 assert.equal(tiles.filter(t=>t.type==='crack').length,5);assert.ok(validateCourse(tiles));
 assert.match(placeTrap(tiles,13,'crack').reason,/Five traps max/);
 let first=placeTrap(course(round),3,'crack').tiles;
 assert.match(placeTrap(first,5,'crack').reason,/safe block between/);
 assert.match(placeTrap(first,4,'crack').reason,/safe block between/);
 assert.ok(placeTrap(first,7,'crack').ok);
 first[5].type='crack';assert.equal(trapSpacingValid(first),false);assert.equal(validateCourse(first),false);
}
console.log('PASS: five traps on both rows, sixth rejected, adjacent/across traps rejected, separated traps allowed, spacing and winnability validated.');

for(let round=0;round<3;round++){
 const tiles=course(round);for(const id of [0,1,2,15]){assert.ok(tiles[id].locked);assert.equal(placeTrap(tiles,id,'crack').ok,false);}
 tiles[1].type='crack';assert.equal(validateCourse(tiles),false,'Protected first landing cannot be sabotaged');
}
console.log('PASS: first platform on each side is protected in all three layouts.');
