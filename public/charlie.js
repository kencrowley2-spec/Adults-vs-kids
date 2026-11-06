(()=>{
 const dialog=document.querySelector('#charlieProfile');if(!dialog)return;
 function open(join=false){if(!dialog.open)dialog.showModal();if(join){document.querySelector('#charlieSignup').scrollIntoView({block:'start'});document.querySelector('#charlieName').focus({preventScroll:true});}else dialog.scrollTop=0;}
 document.querySelectorAll('[data-open-charlie]').forEach(button=>button.addEventListener('click',()=>open()));
 document.querySelectorAll('[data-join-charlie]').forEach(button=>button.addEventListener('click',()=>open(true)));
 dialog.querySelector('[data-close-charlie]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 const form=document.querySelector('#charlieWaitlist'),status=document.querySelector('#charlieWaitlistStatus'),submit=form.querySelector('[type=submit]');
 form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity()||submit.disabled)return;submit.disabled=true;submit.textContent='Joining…';status.textContent='';
 try{const response=await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.elements.name.value.trim(),email:form.elements.email.value.trim()})});const result=await response.json();if(!response.ok||!result.saved)throw new Error(result.error||'We couldn’t save your signup. Please try again.');status.textContent=result.message;form.reset();submit.textContent='You’re on the Waitlist!';}
 catch(error){status.textContent=error.message||'We couldn’t save your signup. Please try again.';submit.disabled=false;submit.textContent='Join the Free Waitlist';}
 });
})();
