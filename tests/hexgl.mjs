import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {GAMES} from '../public/arcade-data.js';
import {ROTATING_COVERS} from '../public/arcade-rotation.js';
const root=new URL('../public/games/hexgl/',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const dom=new JSDOM(html,{url:'https://adultsvskids.com/games/hexgl/index.html',runScripts:'outside-only'});
const win=dom.window,doc=win.document;
for(const el of doc.querySelectorAll('script[src],link[href]')){
 const path=el.getAttribute('src')||el.getAttribute('href');
 assert.ok(existsSync(new URL(path,root)),`Bundled dependency exists: ${path}`);
}
const track=readFileSync(new URL('bkcore/hexgl/tracks/Cityscape.js',root),'utf8');
for(const match of track.matchAll(/["']((?:textures|geometries|audio)\/[^"']+)["']/g)){
 const paths=match[1].includes('%1')?['px','nx','py','ny','pz','nz'].map(face=>match[1].replace('%1',face)):[match[1]];
 for(const path of paths)assert.ok(existsSync(new URL(path,root)),`Track asset exists: ${path}`);
}
assert.ok(GAMES.find(g=>g.id==='hexgl'));assert.ok(ROTATING_COVERS.includes('hexgl'));
const controller=readFileSync(new URL('../public/arcade.js',import.meta.url),'utf8');
assert.match(controller,/g\.id!=='hexgl'/,'Solo game excluded from random series');
const key={left:false,right:false,forward:false};let suspended=0,resumed=0;
function HexGL(){}
HexGL.prototype.displayScore=function(){};
win.bkcore={hexgl:{HexGL},Audio:{_ctx:{suspend(){suspended++},resume(){resumed++}},stop(){}}};
win.hexGL={components:{shipControls:{key}}};
win.eval(readFileSync(new URL('avk.js',root),'utf8'));
for(const button of doc.querySelectorAll('[data-drive]'))button.setPointerCapture=()=>{};
function pointer(button,type,id){const event=new win.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'pointerId',{value:id});button.dispatchEvent(event)}
const forward=doc.querySelector('[data-drive=forward]'),left=doc.querySelector('[data-drive=left]');
pointer(forward,'pointerdown',1);pointer(left,'pointerdown',2);assert.equal(key.forward,true);assert.equal(key.left,true);
pointer(left,'pointercancel',2);assert.equal(key.left,false);assert.equal(key.forward,true);
win.dispatchEvent(new win.Event('blur'));assert.equal(key.forward,false);assert.equal(forward.getAttribute('aria-pressed'),'false');
doc.getElementById('avk-sound').click();assert.equal(suspended,1);doc.getElementById('avk-sound').click();assert.equal(resumed,1);
win.hexGL.gameplay={result:2,results:{FINISH:1}};HexGL.prototype.displayScore.call(win.hexGL,1000,[]);assert.match(doc.getElementById('time').textContent,/destroyed/);assert.equal(doc.getElementById('avk-drive').hidden,true);
assert.equal(doc.querySelector('#avk-nav a').getAttribute('href'),'/family/arcade');assert.doesNotMatch(html,/google-analytics/);
console.log('PASS: HexGL bundled track assets, catalog entry, solo routing, multi-touch driving, cancellation, blur release, mute, finish screen, and return link.');
win.close();
