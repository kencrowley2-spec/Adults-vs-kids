(()=>{
 const dialog=document.getElementById('clubRosterDialog');if(!dialog)return;
 let trigger=null;
 document.querySelectorAll('[data-open-club-roster]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();trigger=button;if(!dialog.open)dialog.showModal()}));
 document.getElementById('closeClubRoster').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>trigger?.focus({preventScroll:true}));
})();
