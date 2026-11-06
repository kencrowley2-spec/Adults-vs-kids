/* Lobby navigation. Game sessions retain their existing full-screen controls. */
(()=>{
 const more=document.getElementById('arcade-more');
 const toggle=document.getElementById('arcade-more-toggle');
 const tools=document.getElementById('memberDialog');
 if(!more||!toggle||!tools)return;
 const notify=type=>window.dispatchEvent(new Event(type));
 toggle.addEventListener('click',()=>{more.showModal();toggle.setAttribute('aria-expanded','true');notify('arcade-overlay-open')});
 more.addEventListener('close',()=>{toggle.setAttribute('aria-expanded','false');notify('arcade-overlay-close')});
 more.querySelectorAll('[data-close-arcade-menu]').forEach(link=>link.addEventListener('click',()=>more.close()));
 document.getElementById('arcade-menu-random').addEventListener('click',()=>{more.close();document.getElementById('arcade-random').click()});
 document.querySelectorAll('[data-arcade-tools]').forEach(button=>button.addEventListener('click',()=>{
  if(typeof window.openFamilyTools!=='function')return;
  notify('arcade-overlay-open');window.openFamilyTools();button.setAttribute('aria-expanded','true');
 }));
 document.querySelector('[data-arcade-tools-close]').addEventListener('click',()=>tools.close());
 tools.addEventListener('close',()=>{document.querySelectorAll('[data-arcade-tools]').forEach(button=>button.setAttribute('aria-expanded','false'));notify('arcade-overlay-close')});
 for(const dialog of [more,tools])dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
 });
})();
