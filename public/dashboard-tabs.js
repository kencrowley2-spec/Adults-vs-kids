(()=>{
 const toggle=document.getElementById('dashboard-more-toggle');
 const dialog=document.getElementById('dashboard-more');
 if(!toggle||!dialog)return;
 toggle.addEventListener('click',()=>{dialog.showModal();toggle.setAttribute('aria-expanded','true')});
 dialog.addEventListener('close',()=>toggle.setAttribute('aria-expanded','false'));
 // Close this menu before an existing account action opens its own dialog.
 dialog.addEventListener('click',event=>{
  if(event.target.closest('[data-member-action], [data-dashboard-jump]'))dialog.close();
  if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()}
 },true);
})();
