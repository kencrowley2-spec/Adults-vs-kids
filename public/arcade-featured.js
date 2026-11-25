export const FEATURED_GAMES=['ghostline','faces','claw','mole','memory'];

export function mountFeaturedGames({document:doc=globalThis.document,games,gameTile}){
 const featured=doc.getElementById('arcade-favorites'),track=doc.getElementById('arcade-rotating');
 if(!featured||!track)return;
 FEATURED_GAMES.forEach(id=>{const game=games.find(g=>g.id===id);if(game)gameTile(game,featured).classList.add('featured-game');});
 const remaining=games.filter(game=>!FEATURED_GAMES.includes(game.id));
 const win=doc.defaultView;
 const count=doc.getElementById('arcade-rotation-count'),pause=doc.getElementById('arcade-rotation-pause');
 const previous=doc.getElementById('arcade-rotation-prev'),next=doc.getElementById('arcade-rotation-next');
 const hover=win.matchMedia?.('(hover: hover)');
 let paused=!!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let page=0,perPage=0,timer;
 function pageCount(){return Math.ceil(remaining.length/perPage);}
 function render(){
  track.replaceChildren();
  const first=page*perPage;
  for(const game of remaining.slice(first,first+perPage))gameTile(game,track);
  count.textContent=pageCount()?`${page+1} / ${pageCount()}`:'0 / 0';
  count.setAttribute('aria-label',`Page ${pageCount()?page+1:0} of ${pageCount()}`);
  for(const button of [previous,next,pause])button.disabled=pageCount()<2;
 }
 function move(direction){
  const pages=pageCount();
  if(pages<2)return;
  page=(page+direction+pages)%pages;render();
 }
 function schedule(){
  win.clearInterval(timer);
  if(paused||pageCount()<2)return;
  timer=win.setInterval(()=>{
   if(doc.hidden||doc.getElementById('arcade-lobby')?.hidden||doc.querySelector('dialog[open]')||
      track.contains(doc.activeElement)||(hover?.matches&&track.matches(':hover')))return;
   move(1);
  },8000);
 }
 function fit(){
  const width=track.getBoundingClientRect().width;
  if(!width&&perPage)return;
  const columns=width>=350?3:width>=200?2:1;
  if(columns===perPage)return;
  const focused=track.contains(doc.activeElement)?doc.activeElement.dataset.game:null;
  const first=focused?remaining.findIndex(game=>game.id===focused):page*perPage;
  page=Math.floor(Math.max(0,first)/columns);perPage=columns;
  track.style.setProperty('--games-per-page',String(columns));render();schedule();
  if(focused)track.querySelector('[data-game="'+focused+'"]')?.focus({preventScroll:true});
 }
 function updatePlayback(){
  pause.dataset.paused=String(paused);
  pause.setAttribute('aria-label',paused?'Resume game rotation':'Pause game rotation');
  pause.title=paused?'Resume rotation':'Pause rotation';
 }
 previous.addEventListener('click',()=>{move(-1);schedule();});
 next.addEventListener('click',()=>{move(1);schedule();});
 pause.addEventListener('click',()=>{paused=!paused;updatePlayback();schedule();});
 updatePlayback();fit();
 const observer=win.ResizeObserver&&new win.ResizeObserver(fit);
 if(observer)observer.observe(track);else win.addEventListener('resize',fit);
 return ()=>{win.clearInterval(timer);observer?.disconnect();win.removeEventListener('resize',fit);};
}
