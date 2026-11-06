import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {FaceMatch,FACES,portrait} from '../public/arcade-faces-core.js';
import {mountFaces} from '../public/arcade-faces.js';
assert.equal(new Set(FACES.map(c=>c.name)).size,24);
assert.equal(new Set(FACES.map(c=>[c.skin,c.hair,c.style,c.eyes,c.hat,c.glasses,c.earrings,c.beard].join())).size,24);
for(const c of FACES){assert.match(portrait(c),/^<svg/);}
for(const first of [0,1]){const m=new FaceMatch(first);assert.throws(()=>m.guess(0));m.choose(0,4);m.choose(1,7);m.toggle(2);m.next();assert.equal(m.down[m.turn].size,0);m.toggle(5);m.next();assert.ok(m.down[m.turn].has(2));m.toggle(2);assert.equal(m.down[m.turn].size,0);assert.equal(m.guess(m.secrets[1-first]),first);assert.throws(()=>m.guess(3));}
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://adultsvskids.com'});globalThis.document=dom.window.document;globalThis.window=dom.window;
let results=[],exits=0;const dispose=mountFaces({players:['<Dad>','Harper'],onComplete:r=>results.push(r),onExit:()=>exits++});
const host=()=>document.querySelector('.faces-game');const click=a=>{const el=host().querySelector(`[data-action="${a}"]`);assert.ok(el,`Missing ${a}`);el.click();};const face=id=>host().querySelector(`[data-face="${id}"]`).click();
assert.match(host().textContent,/Mystery|mystery/);click('start');assert.equal(host().querySelectorAll('[data-face]').length,0);assert.match(host().textContent,/<Dad>/);assert.equal(host().querySelector('dad'),null);
click('ready-pick');assert.equal(host().querySelectorAll('[data-face]').length,24);assert.ok(host().querySelector('[data-action="lock"]').disabled);face(0);click('lock');assert.equal(host().querySelectorAll('[data-face]').length,0);assert.doesNotMatch(host().textContent,/Poppy/);
click('ready-pick');face(7);click('lock');assert.equal(host().querySelectorAll('[data-face]').length,0);click('ready-turn');
const first=host().textContent.includes('<Dad> · YOUR TURN')?0:1;
click('secret');assert.match(host().querySelector('.face-overlay').textContent,new RegExp(first===0?'Poppy':'Hugo'));click('hide-secret');assert.equal(host().querySelector('.face-overlay'),null);
face(4);assert.ok(host().querySelector('[data-face="4"]').classList.contains('face-down'));face(4);assert.ok(!host().querySelector('[data-face="4"]').classList.contains('face-down'));face(4);click('ideas');assert.match(host().textContent,/wear glasses/);click('dismiss');click('answer');click('pass');assert.equal(host().querySelectorAll('[data-face]').length,0);click('ready-turn');assert.ok(!host().querySelector('[data-face="4"]').classList.contains('face-down'));click('answer');click('pass');click('ready-turn');assert.ok(host().querySelector('[data-face="4"]').classList.contains('face-down'));
click('guess');face(first===0?7:0);assert.match(host().textContent,/final guess/);click('dismiss');assert.equal(results.length,0);face(first===0?7:0);click('confirm');assert.deepEqual(results,[{winner:first}]);assert.match(host().textContent,/CASE CLOSED/);
click('start');click('ready-pick');face(1);click('lock');click('ready-pick');face(1);click('lock');click('ready-turn');const second=host().textContent.includes('<Dad> · YOUR TURN')?0:1;click('guess');face(2);click('confirm');assert.equal(results.at(-1).winner,1-second);click('start');click('exit');click('dismiss');assert.ok(host());click('exit');click('leave');assert.equal(exits,1);assert.equal(document.body.style.overflow,'');assert.equal(host(),null);dispose();
console.log('Mystery Face: secret handoffs, board isolation, folding, same-person picks, correct/wrong guesses, rematch and exit passed.');
