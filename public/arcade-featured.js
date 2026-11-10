export const FEATURED_GAMES=['lava','treasure','claw','mole','memory'];

export function mountFeaturedGames({document:doc=globalThis.document,games,gameTile}){
 const featured=doc.getElementById('arcade-favorites'),track=doc.getElementById('arcade-rotating');
 if(!featured||!track)return;
 FEATURED_GAMES.forEach(id=>{const game=games.find(g=>g.id===id);if(game)gameTile(game,featured).classList.add('featured-game');});
 const remaining=games.filter(g=>!FEATURED_GAMES.includes(g.id));
 const section=doc.getElementById('arcade-rotating-section'),count=doc.getElementById('arcade-rotation-count'),pause=doc.getElementById('arcade-rotation-pause');
 let start=0,paused=!!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function render(){
  track.replaceChildren();
  for(let i=0;i<Math.min(3,remaining.length);i++)gameTile(remaining[(start+i)%remaining.length],track);
  count.textContent=remaining.length?`${start+1} / ${remaining.length}`:'No more games';
 }
 function move(direction){if(!remaining.length)return;start=(start+direction*3+remaining.length)%remaining.length;render();}
 doc.getElementById('arcade-rotation-prev').addEventListener('click',()=>move(-1));
 doc.getElementById('arcade-rotation-next').addEventListener('click',()=>move(1));
 function setPause(){pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Resume game rotation':'Pause game rotation');pause.setAttribute('aria-pressed',String(paused));}
 pause.addEventListener('click',()=>{paused=!paused;setPause();});
 render();setPause();
 const timer=doc.defaultView.setInterval(()=>{
  if(paused||doc.hidden||doc.getElementById('arcade-lobby')?.hidden||doc.querySelector('dialog[open]')||section.matches(':hover')||section.contains(doc.activeElement))return;
  move(1);
 },8000);
 return ()=>doc.defaultView.clearInterval(timer);
}
