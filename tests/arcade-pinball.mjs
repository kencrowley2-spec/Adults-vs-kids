import assert from 'node:assert/strict';
import {createPinball,launchPinball,stepPinball,PINBALL} from '../public/arcade-pinball-core.js';
let s=createPinball();assert.equal(s.balls,3);assert.equal(launchPinball(s),true);assert.equal(launchPinball(s),false);
for(let i=0;i<90;i++)stepPinball(s,{},1/120);assert.equal(s.ball.inLane,false,'Launcher feeds the main table');
s=createPinball();s.phase='live';s.ball={x:92,y:131,vx:0,vy:250,inLane:false,flipCooldown:0};
for(let i=0;i<5;i++)stepPinball(s,{},1/120);assert.equal(s.score,100);assert.ok(s.ball.vy<0,'Bumper rebounds the ball');
s=createPinball();s.phase='live';s.flippers[0].angle=-.54;const x=86+Math.cos(-.54)*35,y=510+Math.sin(-.54)*35-10;s.ball={x,y,vx:0,vy:240,inLane:false,flipCooldown:0};stepPinball(s,{left:true},1/120);assert.ok(s.ball.vy<0,'Left flipper returns the ball up the table');assert.ok(s.events.some(e=>e.kind==='flipper'));
s=createPinball();s.phase='live';s.flippers[1].angle=Math.PI+.54;s.ball={x:234+Math.cos(Math.PI+.54)*35,y:510+Math.sin(Math.PI+.54)*35-10,vx:0,vy:240,inLane:false,flipCooldown:0};stepPinball(s,{right:true},1/120);assert.ok(s.ball.vy<0,'Right flipper returns the ball');
s=createPinball();for(let n=2;n>=0;n--){launchPinball(s);s.ball.inLane=false;s.ball.x=160;s.ball.y=614;s.ball.vy=500;stepPinball(s,{},1/120);assert.equal(s.balls,n);assert.equal(s.phase,n?'ready':'over');}assert.equal(launchPinball(s),false);
s=createPinball();launchPinball(s);for(let i=0;i<36000;i++){if(s.phase==='ready')launchPinball(s);stepPinball(s,{left:i%53<8,right:i%79<8},1/120);assert.ok([s.ball.x,s.ball.y,s.ball.vx,s.ball.vy].every(Number.isFinite));if(s.phase==='over')break;}
assert.ok(s.balls<3,'Normal play can drain');assert.ok(s.score>=0);
console.log('PASS: launcher, bumper scoring/rebound, both flippers, three-ball drain/game-over, repeat-launch guard and stable simulation.');
