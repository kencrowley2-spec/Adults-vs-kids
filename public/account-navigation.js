(()=>{
 const links=[...document.querySelectorAll('header a[href="/login"]')];
 if(!links.length)return;
 async function update(){
  try{
   const response=await fetch('/auth/status',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)return;
   const {signedIn}=await response.json();
   for(const link of links){
    if(!link.dataset.loginLabel)link.dataset.loginLabel=link.innerHTML;
    link.href=signedIn?'/family':'/login';
    if(signedIn){link.textContent='Dashboard';link.setAttribute('aria-label','Open your family dashboard')}
    else{link.innerHTML=link.dataset.loginLabel;link.removeAttribute('aria-label')}
   }
  }catch{}
 }
 update();
 window.addEventListener('pageshow',event=>{if(event.persisted)update()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
})();
