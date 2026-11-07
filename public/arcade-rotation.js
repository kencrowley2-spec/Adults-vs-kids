export const ROTATING_COVERS=['challenge','frog','mole','claw'];
export function mountCoverRotation({document:doc=globalThis.document,games,markup}){
 const tile=doc.querySelector('[data-game="challenge"]'),cabinet=doc.querySelector('.reference-cabinet');if(!tile||!cabinet)return;
 const entries=ROTATING_COVERS.map(id=>games.find(game=>game.id===id)).filter(Boolean);let index=0;
 tile.classList.add('rotation-case');
 const controls=doc.createElement('div');controls.className='cabinet-case-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Switch games in the rotating cover slot');
 const previous=doc.createElement('button'),next=doc.createElement('button'),count=doc.createElement('span');
 previous.type=next.type='button';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','Previous game cover');next.setAttribute('aria-label','Next game cover');count.setAttribute('aria-live','polite');
 controls.append(previous,count,next);cabinet.appendChild(controls);
 function render(){const entry=entries[index];tile.setAttribute('data-game',entry.id);tile.setAttribute('aria-label',`Play ${entry.name}`);tile.innerHTML=markup(entry);tile.classList.toggle('rotation-active',index!==0);count.textContent=`${index+1}/${entries.length}`;count.setAttribute('aria-label',`${entry.name}, cover ${index+1} of ${entries.length}`);}
 previous.addEventListener('click',()=>{index=(index+entries.length-1)%entries.length;render();});next.addEventListener('click',()=>{index=(index+1)%entries.length;render();});render();
}
