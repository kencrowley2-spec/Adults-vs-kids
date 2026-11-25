export function allowArcadeVoice(returnLabel) {
 const dialog = document.getElementById('arcade-voice');
 if (dialog.dataset.access === 'member') return true;
 if (dialog.open) return false;

 const purchase = dialog.querySelector('[data-voice-purchase]');
 const plans = dialog.querySelector('[data-voice-plans]');
 const returnButton = dialog.querySelector('[data-voice-return]');
 returnButton.textContent = returnLabel;
 plans.hidden = true;
 purchase.hidden = dialog.dataset.access === 'unavailable';
 if (purchase.hidden) {
  dialog.querySelector('h2').textContent = 'Voice access is temporarily unavailable';
  dialog.querySelector('p').textContent = 'We couldn’t check your Clubhouse membership. You can keep playing and try again later.';
 }
 purchase.onclick = () => {
  plans.hidden = false;
  purchase.hidden = true;
  plans.querySelector('a').focus();
 };
 dialog.showModal();
 return false;
}
