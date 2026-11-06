'use strict';
(()=>{
 const $=id=>document.getElementById(id);if(!$('playerHero'))return;
 const dialog=$('playerProfileDialog'),form=$('playerProfileForm'),avatarMarkup=$('profilePhotoPreview').innerHTML;
 let snapshot=null,active='account',draft=null,busy=false,processing=0,generation=0,previous=null;
 try{active=sessionStorage.getItem('avk-club-player')||'account'}catch{}
 const player=key=>snapshot?.players.find(p=>p.key===key);
 const validImage=value=>typeof value==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
 const saved=key=>{const p=player(key),v=snapshot?.profiles.find(p=>p.profile_key===key);return {key,name:v?.display_name||p?.name||'Family Captain',scene:['alpine','coast','dusk'].includes(v?.scene)?v.scene:'coast',headshot:validImage(v?.headshot)?v.headshot:'',backdrop:validImage(v?.backdrop)?v.backdrop:''}};
 function paintPhoto(target,src,name){target.replaceChildren();if(src){const img=document.createElement('img');img.src=src;img.alt=name+' profile photo';target.appendChild(img)}else target.innerHTML=avatarMarkup;}
 function notice(text,error=false){$('profileFormStatus').textContent=text;$('profileFormStatus').classList.toggle('error',error)}
 function controls(){const unavailable=!snapshot||busy;form.querySelectorAll('input,select,button').forEach(e=>e.disabled=unavailable);$('savePlayerProfile').disabled=unavailable||processing>0;$('savePlayerProfile').textContent=busy?'SAVING…':processing?'PREPARING PHOTO…':'SAVE MY PROFILE →';}
 function renderHeader(){const p=saved(active);$('playerName').textContent=p.name;$('playerRole').textContent=(player(active)?.role||'Family administrator').toUpperCase();$('playerHero').dataset.scene=p.scene;$('playerHero').style.backgroundImage=p.backdrop?`url("${p.backdrop}")`:'';paintPhoto($('playerAvatar'),p.headshot,p.name);try{sessionStorage.setItem('avk-club-player',active)}catch{}}
 function preview(){if(!draft)return;paintPhoto($('profilePhotoPreview'),draft.headshot,draft.name);$('profileBackdropPreview').hidden=!draft.backdrop;$('profileBackdropPreview').style.backgroundImage=draft.backdrop?`url("${draft.backdrop}")`:'';$('removeProfileBackdrop').hidden=!draft.backdrop;}
 function selectDraft(key){generation++;draft=saved(key);$('profileNameInput').value=draft.name;form.elements.scene.value=draft.scene;$('profileHeadshotFile').value='';$('profileBackdropFile').value='';notice('');preview();controls();}
 function open(){previous=document.activeElement;if(snapshot){$('profilePlayer').value=active;selectDraft(active)}else notice('Your profile is loading. Please wait a moment.');if(!dialog.open)dialog.showModal();}
 function close(){if(busy)return;generation++;dialog.close();previous?.focus?.({preventScroll:true})}
 $('editHeadshot').onclick=open;$('switchPlayer').onclick=open;$('editScenery').onclick=open;$('closePlayerProfile').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 $('profilePlayer').onchange=e=>selectDraft(e.target.value);
 $('profileNameInput').oninput=e=>{if(draft)draft.name=e.target.value};
 form.querySelectorAll('[name=scene]').forEach(input=>input.onchange=()=>{if(!draft)return;draft.scene=input.value;draft.backdrop='';preview()});
 $('removeProfilePhoto').onclick=()=>{if(draft){draft.headshot='';preview()}};
 $('removeProfileBackdrop').onclick=()=>{if(draft){draft.backdrop='';preview()}};
 async function compress(file,backdrop){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPG, PNG or WebP image under 10 MB.');
  const url=URL.createObjectURL(file),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('That photo could not be read. Choose another image.'));img.src=url});const canvas=document.createElement('canvas');canvas.width=backdrop?1000:240;canvas.height=backdrop?650:240;const context=canvas.getContext('2d');if(!context)throw Error('Photo editing is unavailable in this browser.');const ratio=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight),width=img.naturalWidth*ratio,height=img.naturalHeight*ratio;context.fillStyle='#ecf1ec';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,(canvas.width-width)/2,(canvas.height-height)/2,width,height);let quality=.86,result;do{result=canvas.toDataURL('image/jpeg',quality);quality-=.12}while(result.length>(backdrop?325000:85000)&&quality>=.24);if(result.length>(backdrop?325000:85000))throw Error('That photo is too detailed. Try a smaller image.');return result;}finally{URL.revokeObjectURL(url)}
 }
 for(const [id,field] of [['profileHeadshotFile','headshot'],['profileBackdropFile','backdrop']])$(id).onchange=async e=>{const file=e.target.files?.[0];if(!file||!draft)return;const token=generation;processing++;controls();notice('Preparing your photo…');try{const src=await compress(file,field==='backdrop');if(token!==generation)return;draft[field]=src;preview();notice('Photo ready. Save your profile to keep it.')}catch(error){if(token===generation)notice(error.message,true)}finally{processing--;controls();e.target.value=''}};
 form.onsubmit=async e=>{
  e.preventDefault();if(!draft||busy||processing)return;busy=true;controls();notice('Saving your player profile…');
  try{const response=await fetch('/admin/app/profile-data',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not save your profile.');snapshot.profiles=snapshot.profiles.filter(p=>p.profile_key!==draft.key);snapshot.profiles.push(result.profile);active=draft.key;renderHeader();$('profileLoadStatus').textContent='Your personal clubhouse. Ready when you are.';busy=false;close();}
  catch(error){notice(error.message||'Could not save your profile. Please try again.',true)}finally{busy=false;controls()}
 };
 function clock(){const now=new Date();$('profileTime').textContent=now.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});$('profileTime').dateTime=now.toISOString();$('profileDate').textContent=now.toLocaleDateString([],{month:'long',day:'numeric',year:'numeric'})}clock();const clockTimer=setInterval(clock,30000);window.addEventListener('pagehide',()=>clearInterval(clockTimer));
 async function load(){controls();try{const response=await fetch('/admin/app/profile-data',{credentials:'same-origin',cache:'no-store'}),result=await response.json();if(!response.ok)throw Error(result.error||'Could not load your profile.');if(!Array.isArray(result.players)||!result.players.length||!Array.isArray(result.profiles))throw Error('Could not load your players.');snapshot=result;if(!player(active))active='account';$('profilePlayer').replaceChildren(...snapshot.players.map(p=>{const option=document.createElement('option');option.value=p.key;option.textContent=p.name+' · '+p.role;return option}));$('profilePlayer').value=active;selectDraft(active);renderHeader();$('profileLoadStatus').textContent='Your personal clubhouse. Ready when you are.';if(new URLSearchParams(location.search).get('profile')==='1')open();}
  catch(error){$('profileLoadStatus').textContent=error.message+' Tap your profile photo to retry.';notice(error.message,true);$('editHeadshot').onclick=()=>{load();open()};$('switchPlayer').onclick=()=>{load();open()};$('editScenery').onclick=()=>{load();open()};}
 }load();
})();
