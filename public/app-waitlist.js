(() => {
  const dialog = document.getElementById('appWaitlistDialog');
  const launch = document.getElementById('joinAppWaitlist');
  if (!dialog || !launch) return;
  const form = document.getElementById('appWaitlistForm');
  const status = document.getElementById('appWaitlistStatus');
  function openWaitlist() {
    if (!dialog.open) dialog.showModal();
    if (!form.hidden) document.getElementById('waitlistName').focus();
    else document.getElementById('closeAppWaitlist').focus();
  }
  launch.onclick = openWaitlist;
  document.querySelectorAll('[data-open-app-waitlist]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const menu = document.getElementById('sectionMenu');
      if (menu?.open) {
        menu.addEventListener('close', () => requestAnimationFrame(openWaitlist), { once: true });
        document.getElementById('sectionMenuClose').click();
      } else openWaitlist();
    });
  });
  if (location.hash === '#app-waitlist') openWaitlist();
  document.getElementById('closeAppWaitlist').onclick = () => dialog.close();
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => launch.focus());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true; submit.textContent = 'Joining…'; status.textContent = '';
    try {
      const fields = new FormData(form);
      const response = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fields.get('name'), email: fields.get('email'), website: fields.get('website') }) });
      const result = await response.json();
      if (!response.ok || !result.saved) throw new Error(result.error || 'Please try again.');
      form.hidden = true; status.textContent = result.message || 'You’re on the free app waitlist!'; status.className = 'waitlist-success';
    } catch (error) {
      status.textContent = error.message || 'We couldn’t save your signup. Please try again.';
    } finally { submit.disabled = false; submit.textContent = 'Join the free waitlist'; }
  });
})();
