(()=>{
 const dialog=document.querySelector('#charlieProfile');if(!dialog)return;
 function open(join=false){if(!dialog.open)dialog.showModal();if(join){document.querySelector('#charlieSignup').scrollIntoView({block:'start'});document.querySelector('#charlieSignup a').focus({preventScroll:true});}else dialog.scrollTop=0;}
 document.querySelectorAll('[data-open-charlie]').forEach(button=>button.addEventListener('click',()=>open()));
 document.querySelectorAll('[data-join-charlie]').forEach(button=>button.addEventListener('click',()=>open(true)));
 dialog.querySelector('[data-close-charlie]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
})();
