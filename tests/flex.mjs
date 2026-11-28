import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {FlexMatch, FLEX_CARDS} from '../public/arcade-flex-core.js';
import {mountFlex} from '../public/arcade-flex.js';

assert.equal(new Set(FLEX_CARDS.map(c => c.id)).size, 9);
for (const c of FLEX_CARDS) {
  for (const asset of [c.art+'.webp','voice/'+c.id+'.mp3'])
    assert.ok(existsSync(new URL('../public/assets/flex/'+asset, import.meta.url)));
}
for (const attempted of [() => true, () => false, team => team === 0]) {
  const match = new FlexMatch();
  for (let round = 0; round < 9; round++) {
    for (const team of [1,0]) {
      assert.equal(match.selector, team);
      const id = match.decks[team][round].id;
      match.select(id);
      assert.throws(() => match.select(id));
      match.record(attempted(team));
      assert.throws(() => match.record(true));
    }
  }
  assert.equal(match.done, true);
  for (const team of [1,0]) assert.equal(match.scores[team], attempted(team) ? 9 : -9);
  assert.equal(match.winner, attempted(0) === attempted(1) ? null : 0);
}
const dom = new JSDOM('<body></body>', {pretendToBeVisual:true});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const clips = [];
window.Audio = class {
  constructor(src) { this.src = src; clips.push(this); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
};
window.HTMLDialogElement.prototype.showModal = function() {this.open = true;};
let results = [], exits = 0, allowed = false;
const dispose = mountFlex({players:['<Dad>','Harper'], onComplete: result => results.push(result), beforeRematch:() => allowed, onExit:() => exits++});
const click = selector => document.querySelector(selector).click();
click('button[type=submit]');
assert.equal(document.querySelectorAll('[data-card]').length,9);
assert.equal(clips[0].loop, true);
for (let turn = 0; turn < 18; turn++) {
  click('[data-card]:enabled');
  assert.equal(document.querySelectorAll('dialog .fx-choices button').length, 2);
  assert.match(clips.at(-1).src,/voice\//);
  assert.ok(clips[0].volume < .1);
  click(turn % 2 ? '[data-flex=pass]' : '[data-flex=tried]');
  assert.ok(clips.at(-1).paused);
  assert.ok(clips[0].volume > .1);
}
assert.deepEqual(results,[{winner:1,scores:[-9,9],rounds:9}]);
assert.ok(clips[0].paused);
click('[data-flex=again]');
assert.equal(document.querySelector('[data-card]'),null);
allowed = true;
click('[data-flex=again]');
assert.equal(document.querySelectorAll('[data-card]:enabled').length,9);
click('[data-flex=sound]');
assert.ok(clips[0].paused);
click('[data-flex=exit]');
click('[data-flex=leave]');
assert.equal(exits,1);
assert.equal(document.body.style.overflow,'');
dispose();
console.log('Flex Off passed nine-card play, attempts, passes, negative scores, ties, duplicate protection, narration, music ducking, mute, rematch and exit.');
