(()=>{
 const triggers=[...document.querySelectorAll('[data-game-idea-open]')],dialog=document.getElementById('memberDialog'),content=document.getElementById('memberDialogContent');
 if(!triggers.length||!dialog||!content)return;
 let draft='',sending=false;
 function open(){
  window.pauseFamilyTools?.();dialog.classList.remove('showdown-tools');dialog.setAttribute('aria-labelledby','gameIdeaTitle');
  content.innerHTML='<h2 id="gameIdeaTitle">Submit Your Game Idea</h2><p class="game-idea-summary" id="gameIdeaSummary">Please type and submit any game ideas you have for the arcade. If your idea is picked, you will be credited for the idea in the arcade.</p><form class="game-idea-form"><label for="gameIdeaBody">Your game idea<textarea id="gameIdeaBody" name="idea" required minlength="10" maxlength="4800" rows="6" placeholder="Tell us how your game works and how adults and kids would play…" aria-describedby="gameIdeaSummary"></textarea></label><button class="primary" type="submit">Submit Your Game Idea →</button><p class="game-idea-status" role="status" aria-live="polite"></p></form>';
  const form=content.querySelector('form'),input=form.querySelector('textarea'),button=form.querySelector('button'),status=form.querySelector('[role=status]');
  input.value=draft;input.oninput=()=>{draft=input.value};button.disabled=sending;
  if(!dialog.open)dialog.showModal();input.focus();
  form.onsubmit=async event=>{
   event.preventDefault();if(sending)return;
   const idea=input.value.trim();if(idea.length<10){status.textContent='Please describe your game idea in at least 10 characters.';input.focus();return}
   if(document.querySelector('.platform-preview')){status.textContent='This is a design preview. Sign in to your family dashboard to submit your game idea.';return}
   sending=true;button.disabled=true;status.textContent='Submitting your idea…';
   try{
    const response=await fetch('/api/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'challenge',body:'ARCADE GAME IDEA\n\n'+idea,permission:true})});
    const result=await response.json();
    if(!response.ok||result.saved!==true)throw Error(result.error||'We could not submit your idea. Please try again.');
    draft='';input.value='';input.disabled=true;button.hidden=true;status.textContent='Thank you! Your game idea has been submitted for review. If it’s picked, you’ll be credited in the arcade.';
   }catch(error){status.textContent=error.message||'We could not connect. Your idea is still here—please try again.'}
   finally{sending=false;button.disabled=false;const current=content.querySelector('.game-idea-form button');if(current)current.disabled=false}
  };
 }
 triggers.forEach(button=>button.addEventListener('click',open));
})();
