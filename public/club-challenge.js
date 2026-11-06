'use strict';
(()=>{
 const games={balloons:'Balloon Pop Showdown',trivia:'Trivia Dodge',dash:'Obstacle Dash'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let loading=false;
 window.avkOpenChallenge=async({friendId='',mode='friend'}={})=>{
  if(loading||document.getElementById('friendChallengeDialog'))return;
  loading=true;
  const previous=document.activeElement,d=document.createElement('dialog');d.id='friendChallengeDialog';d.className='friend-challenge';d.setAttribute('aria-labelledby','friendChallengeTitle');
  d.innerHTML='<button class="challenge-close" type="button" aria-label="Close challenge">✕</button><div class="challenge-setup-content"><span class="challenge-brand">ADULTS vs. KIDS™ CLUB</span><h2 id="friendChallengeTitle">START A CHALLENGE</h2><p>Choose your game and your competition.</p><p role="status">Loading your approved friends…</p></div>';
  const close=()=>{d.close();d.remove();previous?.focus?.({preventScroll:true})};d.querySelector('button').onclick=close;d.addEventListener('cancel',e=>{e.preventDefault();close()});document.body.appendChild(d);d.showModal();
  const content=d.querySelector('.challenge-setup-content');
  try{
   const response=await fetch('/admin/app/network-data',{credentials:'same-origin',cache:'no-store'});const snapshot=await response.json();if(!response.ok)throw Error(snapshot.error||'Could not load your friends.');if(!d.isConnected)return;
   const friends=(snapshot.connections||[]).filter(c=>c.status==='accepted');
   content.innerHTML=`<span class="challenge-brand">ADULTS vs. KIDS™ CLUB</span><h2 id="friendChallengeTitle">START A CHALLENGE</h2><p>Choose your game and your competition.</p><form id="friendChallengeForm"><label class="challenge-field">Select game<select name="game" required>${Object.entries(games).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><fieldset><legend>Who’s competing?</legend><p class="challenge-you">Player 1 · <strong>${esc(snapshot.profile?.name||'Your family')}</strong></p><div class="challenge-friends">${friends.length?friends.map(c=>`<label class="challenge-friend"><input type="radio" name="friend" value="${esc(c.id)}" required ${c.id===friendId?'checked':''}><span><strong>${esc(c.name)}</strong><small>Approved club friend · Player 2</small></span></label>`).join(''):'<p>No approved friends yet. Add a friend and they’ll appear here.</p><a href="/admin/app/network" class="gold-button">FIND FRIENDS →</a>'}</div></fieldset><button type="submit" class="challenge-continue" ${friends.length?'':'disabled'}>CONTINUE <span aria-hidden="true">→</span></button><p class="challenge-helper">Sends a challenge invitation. Your buddy must accept. Remote gameplay is still in development.</p><p id="friendChallengeError" role="status"></p></form>`;
   const form=d.querySelector('form');let submitting=false;
   form.onsubmit=async e=>{
    e.preventDefault();if(submitting)return;const data=new FormData(form),friend=friends.find(c=>c.id===data.get('friend')),game=data.get('game');if(!friend||!games[game])return;
    submitting=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;
    const players=[snapshot.profile?.name||'Your family',friend.name];d.close();
    try{
     // The matchup is the first screen after Continue; no instructions precede it.
     await window.avkChallengeIntro({players,game:games[game],mode:mode==='family'?'FAMILY vs FAMILY':'FRIEND vs FRIEND'});
     if(!d.isConnected)return;
     content.innerHTML='<span class="challenge-brand">YOUR SHOWDOWN</span><h2 id="friendChallengeTitle">SETTING IT UP…</h2><p role="status">Sending your invitation…</p>';d.showModal();
     const r=await fetch('/admin/app/network-data',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'challenge',data:{id:friend.id,mode,playerOne:players[0],game}})});let result;try{result=await r.json()}catch{throw Error('Your session may have expired. Sign in and try again.')}if(!r.ok)throw Error(result.error||'Could not send your invitation.');
     if(!d.isConnected)return;
     content.innerHTML=`<span class="challenge-brand">INVITATION SENT</span><h2 id="friendChallengeTitle">${esc(games[game])}</h2><p class="challenge-matchup">${esc(players[0])} <b>VS</b> ${esc(players[1])}</p><p>Your buddy can accept in the Buddies lobby.</p><p>Game instructions and remote match launch will be connected here when online play is ready.</p><a class="challenge-continue" href="/admin/app/lobby">OPEN BUDDIES →</a>`;
    }catch(error){if(!d.isConnected)return;content.replaceChildren();const title=document.createElement('h2');title.id='friendChallengeTitle';title.textContent='CHALLENGE NOT SENT';const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=error.message;const retry=document.createElement('button');retry.className='challenge-continue';retry.textContent='BACK TO SETUP →';retry.onclick=()=>{close();window.avkOpenChallenge({friendId:friend.id,mode})};content.append(title,message,retry);if(!d.open)d.showModal();}
   };
  }catch(error){if(d.isConnected){content.innerHTML='<h2 id="friendChallengeTitle">FRIENDS UNAVAILABLE</h2><p role="alert"></p><a class="gold-button" href="/admin/app/network">OPEN FAMILY &amp; FRIENDS →</a>';content.querySelector('p').textContent=error.message;}}
  finally{loading=false;}
 };
 document.querySelectorAll('[data-open-challenge]').forEach(b=>b.onclick=()=>window.avkOpenChallenge());
})();
