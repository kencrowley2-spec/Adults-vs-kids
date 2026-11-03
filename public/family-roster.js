(()=>{
 const card=document.querySelector('.family-roster-card');if(!card)return;
 const $=id=>document.getElementById(id),preview=card.dataset.rosterPreview==='true';
 let roster={adults:[],kids:[],playingAdults:[],playingKids:[]},loaded=false,saving=false,loadPromise=null;
 const copy=value=>JSON.parse(JSON.stringify(value));
 const status=$('roster-load-status');
 function render(){
  for(const [team,selected,label] of [['adults','playingAdults','adult'],['kids','playingKids','kid']]){
   const list=$('roster-'+team);list.replaceChildren();
   if(!roster[team].length){const item=document.createElement('li');item.className='roster-empty';item.textContent=team==='kids'?'Add up to 5 kids':'Add your adults';list.appendChild(item);}
   roster[team].forEach((name,index)=>{
    const item=document.createElement('li'),button=document.createElement('button'),star=document.createElement('span'),text=document.createElement('b'),check=document.createElement('span');
    const active=roster[selected].includes(index);button.type='button';button.className='roster-player';button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',`${name}, ${label}, ${active?'playing':'not playing'}`);button.disabled=saving||preview;
    star.className='roster-player-star';star.textContent='☆';star.setAttribute('aria-hidden','true');text.textContent=name;check.className='roster-player-check';check.textContent=active?'✓':'';check.setAttribute('aria-hidden','true');button.append(star,text,check);
    button.onclick=async()=>{
     if(saving)return;const previous=copy(roster);roster[selected]=active?roster[selected].filter(i=>i!==index):[...roster[selected],index];saving=true;render();status.textContent='Saving who’s playing…';
     try{roster=await save(roster);status.textContent='Players selected. Your lineup carries into the Arcade.';}catch(error){roster=previous;status.textContent=error.message;}finally{saving=false;render();}
    };
    item.appendChild(button);list.appendChild(item);
   });
  }
  const a=roster.playingAdults.length,k=roster.playingKids.length;
  $('roster-playing-status').textContent=loaded?(a+k?(a===0&&k>=2?'KIDS vs. KIDS · '+roster.playingKids.map(i=>roster.kids[i]).join(' · '):`PLAYING: ${a} ${a===1?'ADULT':'ADULTS'} · ${k} ${k===1?'KID':'KIDS'}`):'Select who’s playing, then open the Arcade.'):'Loading your family roster…';
 }
 async function save(value){
  const response=await fetch('/auth/family-roster',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not save your roster.');return result.roster;
 }
 async function load(){
  if(loadPromise)return loadPromise;
  loadPromise=(async()=>{
  if(preview){roster={adults:['Mom','Dad'],kids:['Emma','Liam','Noah'],playingAdults:[0,1],playingKids:[0,1,2]};loaded=true;render();status.textContent='Example roster · sign in to save your family’s players.';return;}
  try{const response=await fetch('/auth/family-roster',{credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not load your roster.');roster=result.roster;loaded=true;status.textContent='';render();}
  catch(error){status.textContent=error.message;$('roster-playing-status').textContent='Use Manage Roster to retry.';}
  })();
  try{await loadPromise;}finally{loadPromise=null;}
 }
 const dialog=document.createElement('dialog');dialog.className='roster-dialog';dialog.setAttribute('aria-labelledby','roster-dialog-title');
 dialog.innerHTML='<div class="roster-dialog-heading"><h2 id="roster-dialog-title">Manage Family Roster</h2><button type="button" id="roster-close" aria-label="Close roster editor">✕</button></div><p class="roster-dialog-intro">Names or nicknames are perfect. Add up to 5 kids. Tap names on your roster to choose who’s playing. Select two or more kids with no adults for Kids vs. Kids in the Arcade.</p><form id="roster-form"><div class="roster-editor-teams"><fieldset><legend>☆ TEAM ADULTS</legend><div id="roster-edit-adults"></div><button type="button" id="roster-add-adult">+ Add adult</button></fieldset><fieldset><legend>☆ TEAM KIDS <span id="roster-kid-count"></span></legend><div id="roster-edit-kids"></div><button type="button" id="roster-add-kid">+ Add kid</button></fieldset></div><button class="roster-save" type="submit">Save Roster →</button><p id="roster-editor-status" role="status"></p></form>';
 document.body.appendChild(dialog);$('roster-close').onclick=()=>dialog.close();
 function updateEditor(){
  $('roster-add-adult').disabled=$('roster-edit-adults').children.length>=10;$('roster-add-kid').disabled=$('roster-edit-kids').children.length>=5;$('roster-kid-count').textContent=`(${$('roster-edit-kids').children.length}/5)`;
  for(const team of ['adults','kids'])Array.from($('roster-edit-'+team).children).forEach((row,i)=>row.querySelector('input').setAttribute('aria-label',`${team==='adults'?'Adult':'Kid'} ${i+1} name`));
 }
 function addRow(team,name='',active=true){
  const holder=$('roster-edit-'+team),limit=team==='kids'?5:10;if(holder.children.length>=limit)return;
  const row=document.createElement('div'),input=document.createElement('input'),remove=document.createElement('button');row.className='roster-editor-row';input.type='text';input.maxLength=30;input.value=name;input.placeholder=team==='kids'?'Kid’s name or nickname':'Adult’s name or nickname';input.autocomplete='off';input.dataset.playing=String(active);remove.type='button';remove.textContent='✕';remove.setAttribute('aria-label','Remove '+(team==='kids'?'kid':'adult'));remove.onclick=()=>{row.remove();updateEditor();};row.append(input,remove);holder.appendChild(row);updateEditor();return input;
 }
 $('roster-add-adult').onclick=()=>addRow('adults')?.focus();$('roster-add-kid').onclick=()=>addRow('kids')?.focus();
 async function open(){
  if(preview){status.textContent='Sign in to manage your own Family Roster.';return;}if(saving)return;
  if(!loaded)await load();if(!loaded)return;
  for(const [team,selected] of [['adults','playingAdults'],['kids','playingKids']]){
   $('roster-edit-'+team).replaceChildren();roster[team].forEach((name,i)=>addRow(team,name,roster[selected].includes(i)));if(!roster[team].length)addRow(team);
  }
  updateEditor();$('roster-editor-status').textContent='';dialog.showModal();
 }
 $('manage-family-roster').onclick=open;
 document.querySelectorAll('[data-member-action="roster"]').forEach(button=>button.onclick=open);
 $('roster-form').onsubmit=async event=>{
  event.preventDefault();if(saving)return;const value={adults:[],kids:[],playingAdults:[],playingKids:[]};
  for(const [team,selected] of [['adults','playingAdults'],['kids','playingKids']])for(const input of $('roster-edit-'+team).querySelectorAll('input')){
   const name=input.value.trim();if(!name)continue;if(input.dataset.playing==='true')value[selected].push(value[team].length);value[team].push(name);
  }
  saving=true;const submit=dialog.querySelector('.roster-save');submit.disabled=true;$('roster-editor-status').textContent='Saving your roster…';
  try{roster=await save(value);loaded=true;render();status.textContent='Family Roster saved. Tap names to choose who’s playing.';dialog.close();}catch(error){$('roster-editor-status').textContent=error.message;}finally{saving=false;submit.disabled=false;render();}
 };
 render();load();
})();
