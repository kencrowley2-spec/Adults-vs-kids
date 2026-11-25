import assert from 'node:assert/strict';
import {course,reachable,flight,danger,placeTrap,validateCourse,scoreAttempt,LavaMatch,RULES,platformAppearance,TRAPS,trapSpacingValid} from '../public/arcade-lava-core.js';
for(let round=0;round<3;round++){
 let tiles=course(round);assert.ok(validateCourse(tiles));
 for(const [id,type] of [[4,'crack'],[8,'crack'],[12,'crack']]){const p=placeTrap(tiles,id,type);assert.ok(p.ok);tiles=p.tiles;}
 assert.equal(placeTrap(tiles,14,'crack').ok,false);assert.equal(placeTrap(tiles,0,'crack').ok,false);assert.ok(validateCourse(tiles));
 let t=0,id=0;for(const to of [1,3,5,7,9,11,13,15,16,18,20,22,24,26,28,30]){assert.ok(reachable(tiles,id,to));t+=flight(tiles[id]);assert.equal(danger(tiles[to],t,t),null);id=to;}assert.equal(tiles[id].type,'finish');assert.ok(t<30);assert.equal(tiles.filter(t=>t.crystal).length,2);

}
assert.equal(validateCourse([{id:0,x:0,y:0,type:'start'},{id:1,x:999,y:0,type:'finish'}]),false);
assert.equal(reachable(course(),0,15),false);
assert.equal(danger({id:2,type:'crack'},.94,0),null);assert.equal(danger({id:2,type:'crack'},.96,0),'crack');
assert.deepEqual(scoreAttempt(true,12.2),{escape:134,trap:0});assert.deepEqual(scoreAttempt(false,30),{escape:0,trap:50});
for(const first of [0,1]){
 for(const [a,b,winningLeg] of [
  [[true,18],[false,12,8,9],0],[[true,12.55],[true,12.51],1],
  [[false,12,8,9],[false,15,6,4],0],[[false,30,8,7],[false,20,8,6],1],
  [[false,30,0,0],[false,30,0,0],null]
 ]){
  const m=new LavaMatch(first);assert.equal(m.builder,first);
  m.finishAttempt(...a);assert.equal(m.complete,false);assert.equal(m.builder,1-first);
  m.finishAttempt(...b);assert.equal(m.complete,true);assert.equal(m.attempts.length,2);
  if(winningLeg===null){assert.ok(m.coinFlip);assert.ok([0,1].includes(m.winner));}
  else assert.equal(m.winner,m.attempts[winningLeg].runner);
  assert.throws(()=>m.finishAttempt(true,1));
 }
}
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
