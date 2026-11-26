function galleryRequest(mode, run) {
 return new Promise((resolve, reject) => {
  const opening = indexedDB.open('avk-family-jigsaw', 1);
  opening.onupgradeneeded = () => opening.result.createObjectStore('completed', {keyPath:'id'});
  opening.onerror = () => reject(opening.error);
  opening.onblocked = () => reject(new Error('Gallery is in use in another tab'));
  opening.onsuccess = () => {
   const db = opening.result;
   const transaction = db.transaction('completed', mode);
   const request = run(transaction.objectStore('completed'));
   transaction.oncomplete = () => {db.close(); resolve(request.result);};
   transaction.onabort = () => {db.close(); reject(transaction.error);};
  };
 });
}

function exportPuzzle(canvas) {
 return new Promise((resolve, reject) => {
  canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Puzzle image unavailable')), 'image/png');
 });
}

export function openJigsawGallery(completed) {
 const gallery = document.createElement('dialog');
 gallery.className = 'jigsaw-gallery';
 gallery.setAttribute('aria-labelledby', 'jigsaw-gallery-title');
 gallery.innerHTML = `
  <header>
   <h2 id="jigsaw-gallery-title">Jigsaw Gallery</h2>
   <form method="dialog"><button type="submit" autofocus>Done</button></form>
  </header>
  <section data-finished hidden>
   <h3>Finished puzzle</h3>
   <div data-preview></div>
   <div class="jigsaw-gallery-actions"><button type="button" data-save disabled>Save to Gallery</button><a data-download hidden>Download PNG</a></div>
  </section>
  <section aria-label="Saved puzzles">
   <h3>Saved on this device</h3>
   <div class="jigsaw-gallery-items" data-saved></div>
  </section>
  <p role="status">Opening gallery…</p>`;
 const find = selector => gallery.querySelector(selector);
 const status = find('[role=status]'), items = find('[data-saved]');
 const save = find('[data-save]'), download = find('[data-download]');
 const urls = new Set();
 let current, closed = false;
 function useImage(blob) {
  const url = URL.createObjectURL(blob);
  urls.add(url);
  return url;
 }
 function setDownload(link, url, record) {
  link.href = url;
  link.download = `family-jigsaw-${record.pieces}-pieces.png`;
 }
 function render(records) {
  items.replaceChildren();
  if (!records.length) {
   items.textContent = 'Finished puzzles you save will appear here.';
   return;
  }
  for (const record of records.sort((a,b) => b.savedAt - a.savedAt)) {
   const card = document.createElement('article');
   const img = document.createElement('img');
   const label = document.createElement('p');
   const link = document.createElement('a');
   const url = useImage(record.image);
   img.src = url;
   img.loading = 'lazy';
   img.alt = 'Saved finished puzzle';
   label.textContent = `${record.pieces.toLocaleString()} pieces`;
   link.textContent = 'Download PNG';
   setDownload(link, url, record);
   card.append(img,label,link);
   items.append(card);
  }
 }

 gallery.addEventListener('close', () => {
  closed = true;
  for (const url of urls) URL.revokeObjectURL(url);
  gallery.remove();
 }, {once:true});
 document.body.append(gallery);
 gallery.showModal();
 save.addEventListener('click', async () => {
  if (!current || save.disabled) return;
  save.disabled = true;
  try {
   await galleryRequest('readwrite', store => store.put(current));
   const records = await galleryRequest('readonly', store => store.getAll());
   if (closed) return;
   render(records);
   save.textContent = 'Saved to Gallery';
   status.textContent = 'Puzzle saved on this device.';
  } catch {
   if (closed) return;
   save.disabled = false;
   status.textContent = 'Couldn’t save to this browser. You can still download the PNG.';
  }
 });
 void (async () => {
  const saved = await galleryRequest('readonly', store => store.getAll()).catch(() => null);
  if (closed) return;
  render(saved ?? []);
  status.textContent = saved ? '' : 'This browser couldn’t open saved puzzles.';
  if (!completed) return;
  find('[data-finished]').hidden = false;
  try {
   const image = await exportPuzzle(completed.canvas);
   if (closed) return;
   current = {id:completed.id, pieces:completed.pieces, savedAt:Date.now(), image};
   const img = document.createElement('img');
   img.alt = 'Your finished puzzle';
   const url = useImage(image);
   img.src = url;
   find('[data-preview]').append(img);
   setDownload(download, url, current);
   download.hidden = false;
   if (saved?.some(record => record.id === current.id)) save.textContent = 'Saved to Gallery';
   else save.disabled = false;
  } catch {
   if (!closed) status.textContent = 'The finished image couldn’t be prepared.';
  }
 })();
}
