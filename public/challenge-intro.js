/* Shared club match introduction. Starts gameplay only after the reveal finishes. */
(()=>{
 let current=null;
 window.avkChallengeIntro=({players=['Parents','Kids'],game='Family showdown',mode='FRIENDLY RIVALRY'}={})=>{
  if(current)return current.promise;
  const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='challenge-intro';dialog.setAttribute('aria-label','Challenge matchup');
  dialog.innerHTML='<div class="matchup-brand">ADULTS <span>vs.</span> KIDS™<small>ALL-ACCESS CLUB</small></div><div class="matchup-half matchup-left"><div class="matchup-contender"><span class="matchup-number">PLAYER 1</span><strong></strong><span class="matchup-caption">BRING YOUR A-GAME.</span></div></div><div class="matchup-half matchup-right"><div class="matchup-contender"><span class="matchup-number">PLAYER 2</span><strong></strong><span class="matchup-caption">LET’S SETTLE THIS.</span></div></div><div class="matchup-bolt" aria-hidden="true"></div><div class="matchup-vs" aria-hidden="true">V<span>S</span></div><div class="matchup-game"><small></small><strong></strong><span>GET READY FOR THE SHOWDOWN</span></div><button class="matchup-skip" type="button">Skip intro →</button>';
  dialog.querySelectorAll('.matchup-contender strong').forEach((el,i)=>{el.textContent=String(players[i]||`Player ${i+1}`).slice(0,150)});dialog.querySelector('.matchup-game small').textContent=mode;dialog.querySelector('.matchup-game strong').textContent=game;
  let resolve;const promise=new Promise(r=>{resolve=r});current={promise};let timer;
  const finish=()=>{if(!dialog.isConnected)return;clearTimeout(timer);dialog.close();dialog.remove();current=null;previous?.focus?.({preventScroll:true});resolve()};
  dialog.querySelector('button').onclick=finish;dialog.addEventListener('cancel',e=>{e.preventDefault();finish()});document.body.appendChild(dialog);dialog.showModal();timer=setTimeout(finish,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1400:3000);return promise;
 };
})();
