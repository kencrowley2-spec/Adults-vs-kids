/* Phone-sized Clubhouse pages. Original controls and IDs stay in place. */
(()=>{
 const main=document.getElementById('appContent');
 if(!main||document.body.classList.contains('club-home'))return;
 const candidates='.panel,.badge-card,.gold-banner,.winter-banner,.challenge-entry,.lobby-entry,.network-entry,.lobby-hero,.lobby-buddies,.lobby-chat,.lobby-invites,.network-profile,.network-invite,.network-banner,.network-rules,.network-notice,.charlie-art,.wide-link';
 const pager=document.createElement('nav');pager.className='club-screen-pager';pager.setAttribute('aria-label','Content pages');
 pager.innerHTML='<button type="button" data-screen-prev aria-label="Previous page">←</button><span role="status" aria-live="polite"></span><button type="button" data-screen-next aria-label="Next page">→</button>';
 main.after(pager);
 let index=0,units=[],queued=false,shown=1,history=[];
 function available(el){return !el.closest('[hidden]')&&getComputedStyle(el).visibility!=='hidden'}
 function render(reset=false){
  if(reset){index=0;history=[];}
  const found=[...main.querySelectorAll(candidates)].filter(el=>!el.parentElement.closest(candidates));
  units=found.filter(available);
  found.forEach(el=>{el.classList.add('club-screen-unit');el.classList.remove('is-screen-visible');el.style.removeProperty('zoom')});
  index=Math.max(0,Math.min(index,units.length-1));
  const current=units[index];shown=1;
  if(current){current.classList.add('is-screen-visible');
   const bottom=main.getBoundingClientRect().bottom-10;
   const room=Math.max(60,bottom-current.getBoundingClientRect().top);
   if(current.offsetHeight>room)current.style.zoom=String(Math.min(1,room/current.offsetHeight));
   else for(let next=index+1;next<units.length;next++){
    units[next].classList.add('is-screen-visible');
    if(units[next].getBoundingClientRect().bottom>bottom){units[next].classList.remove('is-screen-visible');break;}
    shown++;
   }
  }
  pager.querySelector('span').textContent=units.length?`${index+1}${shown>1?'–'+(index+shown):''} / ${units.length}`:'Ready to play';
  pager.querySelector('[data-screen-prev]').disabled=index===0;
  pager.querySelector('[data-screen-next]').disabled=index+shown>=units.length;
 }
 pager.addEventListener('click',e=>{if(e.target.closest('[data-screen-prev]'))index=history.pop()??Math.max(0,index-1);else if(e.target.closest('[data-screen-next]')){history.push(index);index+=shown;}else return;render()});
 const observer=new MutationObserver(records=>{if(records.every(r=>r.target===pager||pager.contains(r.target)))return;if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;render()})}});
 observer.observe(main,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 main.addEventListener('click',e=>{if(e.target.closest('.tabs button'))requestAnimationFrame(()=>render(true))});
 window.addEventListener('resize',()=>render());
 document.fonts.ready.then(()=>render());render();
})();
