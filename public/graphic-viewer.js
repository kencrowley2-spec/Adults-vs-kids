(() => {
  const dialog = document.getElementById('graphicViewer');
  if (!dialog) return;
  const canvas = dialog.querySelector('.graphic-viewer-canvas');
  const zoom = document.getElementById('graphicZoom');
  let opener;
  function setZoom(on) {
    canvas.classList.toggle('is-zoomed', on);
    zoom.setAttribute('aria-pressed', String(on));
    zoom.textContent = on ? 'Fit to window −' : 'Zoom in +';
  }
  document.querySelectorAll('[data-open-graphic]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      opener = link;
      setZoom(false);
      dialog.showModal();
      canvas.scrollTop = canvas.scrollLeft = 0;
      document.getElementById('graphicClose').focus();
    });
  });
  zoom.addEventListener('click', () => setZoom(!canvas.classList.contains('is-zoomed')));
  document.getElementById('graphicClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (opener) opener.focus(); });
})();
