(()=>{
 const badge=document.querySelector('[data-founder-badge]'),dialog=document.getElementById('founder-thank-you');
 if(!badge||!dialog)return;
 let previousOverflow='';
 badge.addEventListener('click',()=>{
  if(dialog.open)return;
  previousOverflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';
 });
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;badge.focus({preventScroll:true});});
})();
