import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { GAMES } from '../public/arcade-data.js';
import { FEATURED_GAMES, mountFeaturedGames } from '../public/arcade-featured.js';
import { coverMarkup } from '../public/arcade-library.js';

const route=readFileSync(new URL('../app/family/arcade/route.ts',import.meta.url),'utf8');
const {window}=new JSDOM(route.split('const html=`')[1].split('`;')[0],{pretendToBeVisual:true});
const doc=window.document,by=id=>doc.getElementById(id);
const track=by('arcade-rotating'),pause=by('arcade-rotation-pause'),next=by('arcade-rotation-next');
const previous=by('arcade-rotation-prev'),count=by('arcade-rotation-count');
const games=GAMES.filter(g=>!FEATURED_GAMES.includes(g.id));
let width=310,resize,advance;
track.getBoundingClientRect=()=>({width});
window.matchMedia=query=>({matches:query.includes('reduced-motion')});
window.ResizeObserver=class {constructor(callback){resize=callback} observe(){} disconnect(){}};
window.setInterval=callback=>{advance=callback;return 1};
window.clearInterval=()=>{advance=null};

const stop=mountFeaturedGames({document:doc,games:GAMES,gameTile(game,parent){
 const button=doc.createElement('button');button.dataset.game=game.id;
 button.innerHTML=coverMarkup(game);parent.append(button);return button;
}});
assert.equal(by('arcade-favorites').children.length,FEATURED_GAMES.length);
assert.equal(pause.getAttribute('aria-label'),'Resume game rotation');
assert.equal(advance,null);
const ids=()=>Array.from(track.children,el=>el.dataset.game);
for(const [panelWidth,pageSize] of [[310,2],[400,3],[145,1]]){
 width=panelWidth;resize();
 const seen=[];
 for(let page=0;page<Math.ceil(games.length/pageSize);page++){
  assert.equal(count.textContent,`${page+1} / ${Math.ceil(games.length/pageSize)}`);
  seen.push(...ids());next.click();
 }
 assert.deepEqual(seen,games.map(game=>game.id));
 previous.click();assert.equal(ids().at(-1),games.at(-1).id);next.click();
}
width=310;resize();next.click();
const focus=track.lastElementChild;focus.focus();width=420;resize();
assert.equal(doc.activeElement.dataset.game,focus.dataset.game);
pause.focus();pause.click();assert.equal(typeof advance,'function');
const page=count.textContent;advance();assert.notEqual(count.textContent,page);
pause.click();assert.equal(advance,null);
stop();window.close();
console.log('More Games paging, wraparound, resize, focus retention, reduced motion and playback passed.');
