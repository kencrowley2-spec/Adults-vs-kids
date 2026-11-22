export async function chooseArcadePlayers(onSaved){
 if(document.getElementById('arcade-players'))return;
 const dialog=document.createElement('dialog');
 dialog.id='arcade-players';
 dialog.setAttribute('aria-labelledby','arcade-players-title');
 dialog.innerHTML='<h2 id="arcade-players-title">Who’s playing?</h2><p>Check the family members playing this time.</p><form><div class="teams"></div><p role="status">Loading players…</p><button type="submit" disabled>Use these players</button><button type="button">Close</button></form>';
 document.body.append(dialog);
 const form=dialog.querySelector('form'),teams=form.querySelector('.teams'),status=form.querySelector('[role=status]');
 const submit=form.querySelector('[type=submit]'),close=form.querySelector('[type=button]');
 let saving=false;
 close.onclick=()=>dialog.close();
 dialog.oncancel=event=>{if(saving)event.preventDefault();};
 dialog.onclose=()=>dialog.remove();
 dialog.showModal();
 try{
  const response=await fetch('/auth/family-roster',{credentials:'same-origin',cache:'no-store'});
  const {roster,version,error}=await response.json();
  if(!response.ok)throw Error(error||'Could not load players.');
  if(!dialog.open)return;
  for(const [team,playing] of [['adults','playingAdults'],['kids','playingKids']]){
   const group=document.createElement('fieldset'),legend=document.createElement('legend');
   legend.textContent=team==='kids'?'Team Kids':'Team Adults';
   group.append(legend);teams.append(group);
   const selected=new Set(roster[playing]);
   roster[team].forEach((name,index)=>{
    const label=document.createElement('label'),box=document.createElement('input');
    box.type='checkbox';box.name=playing;box.value=String(index);box.checked=selected.has(index);
    label.append(box,document.createTextNode(name));group.append(label);
   });
   if(!roster[team].length)group.append('No players added yet.');
  }
  const hasPlayers=roster.adults.length+roster.kids.length>0;
  status.textContent='';
  if(!hasPlayers){
   const manage=document.createElement('a');manage.href='/family#family-roster';manage.textContent='Add players to your Family Roster';status.append(manage);
  }
  submit.disabled=!hasPlayers;
  form.onsubmit=async event=>{
   event.preventDefault();if(saving||submit.disabled)return;
   saving=true;submit.disabled=close.disabled=true;status.textContent='Saving players…';
   const fields=[...teams.querySelectorAll('fieldset')];fields.forEach(field=>field.disabled=true);
   const chosen={...roster};
   for(const key of ['playingAdults','playingKids'])chosen[key]=[...form.querySelectorAll('input[name="'+key+'"]:checked')].map(box=>Number(box.value));
   let stale=false;
   try{
    const response=await fetch('/auth/family-roster',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...chosen,version})});
    const result=await response.json();stale=response.status===409;
    if(!response.ok)throw Error(result.error||'Could not save players.');
    onSaved(result.roster);dialog.close();
   }catch(error){status.textContent=error.message;}
   finally{saving=false;close.disabled=false;submit.disabled=stale;fields.forEach(field=>field.disabled=stale);}
  };
 }catch(error){status.textContent=error.message;}
}
