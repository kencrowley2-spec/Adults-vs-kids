import {shuffle} from './arcade-core.js';

const SAMPLE_PHOTO = '/assets/guide-family-patio.webp';
const COUNTS = [12, 24, 48, 96, 192, 384, 768, 1024];
const PAGE_SIZE = 8;
const MAX_IMAGE_SIZE = 2048;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function puzzleGrid(count, aspect) {
 let best = {columns: count, rows: 1}, error = Infinity;
 for (let rows = 1; rows <= count / 2; rows++) {
  if (count % rows) continue;
  const columns = count / rows;
  const distance = Math.abs(Math.log(columns / rows / aspect));
  if (distance < error) {
   error = distance;
   best = {columns, rows};
  }
 }
 return best;
}

// The symmetric cut traces the same seam in reverse for the neighboring piece.
function cut(path, x, y, length, alongX, outward) {
 if (!outward) {
  path.lineTo(x + (alongX ? length : 0), y + (alongX ? 0 : length));
  return;
 }
 const point = (along, across) => {
  const u = length * along;
  const v = length * across * outward;
  return alongX ? [x + u, y + v] :
   [x + v, y + u];
 };
 path.lineTo(...point(.34, 0));
 path.bezierCurveTo(...point(.47, 0), ...point(.32, .20), ...point(.44, .24));
 path.bezierCurveTo(...point(.47, .26), ...point(.53, .26), ...point(.56, .24));
 path.bezierCurveTo(...point(.68, .20), ...point(.53, 0), ...point(.66, 0));
 path.lineTo(...point(1, 0));
}

function newPieces(columns, rows) {
 const horizontal = Array.from({length: (rows - 1) * columns}, () => Math.random() < .5 ? -1 : 1);
 const vertical = Array.from({length: rows * (columns - 1)}, () => Math.random() < .5 ? -1 : 1);
 return Array.from({length: columns * rows}, (_, id) => {
  const column = id % columns, row = Math.floor(id / columns);
  const path = new Path2D();
  path.moveTo(0, 0);
  cut(path, 0, 0, 1, true, row && horizontal[id - columns]);
  cut(path, 1, 0, 1, false, column + 1 < columns && vertical[row * (columns - 1) + column]);
  cut(path, 1, 1, -1, true, row + 1 < rows && -horizontal[id]);
  cut(path, 0, 1, -1, false, column && -vertical[row * (columns - 1) + column - 1]);
  path.closePath();
  return {id, column, row, path, edge: !column || !row || column === columns - 1 || row === rows - 1, placed: false};
 });
}

function drawPiece(context, piece, photo, columns, rows, x, y, width, height, loose) {
 context.save();
 context.translate(x, y);
 context.scale(width, height);
 if (loose) {
  context.save();
  context.translate(.035, .085);
  context.shadowColor = '#000c';
  context.shadowBlur = 8;
  context.shadowOffsetY = 5;
  context.fillStyle = '#593a21';
  context.fill(piece.path);
  context.shadowColor = 'transparent';
  context.strokeStyle = '#b38754';
  context.lineWidth = .027;
  context.stroke(piece.path);
  context.restore();
 }
 context.save();
 context.clip(piece.path);
 context.drawImage(photo, -piece.column, -piece.row, columns, rows);
 if (loose) {
  const light = context.createLinearGradient(0, 0, 1, 1);
  light.addColorStop(0, '#ffffff54');
  light.addColorStop(.45, '#ffffff00');
  light.addColorStop(1, '#02091455');
  context.fillStyle = light;
  context.fill(piece.path);
 }
 context.restore();
 context.strokeStyle = loose ? '#fff4d8bb' : '#0a0e1866';
 context.lineWidth = loose ? .027 : .022;
 context.stroke(piece.path);
 context.restore();
}

function decodeImage(url) {
 const image = new Image();
 image.src = url;
 return image.decode().then(() => {
  const ratio = clamp(image.naturalWidth / image.naturalHeight, .4, 2.5);
  const scale = Math.min(MAX_IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight), 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(Math.max(image.naturalWidth, image.naturalHeight * ratio) * scale));
  canvas.height = Math.max(1, Math.round(canvas.width / ratio));
  const fit = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * fit, height = image.naturalHeight * fit;
  const context = canvas.getContext('2d');
  context.fillStyle = '#151823';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  return canvas;
 });
}

export function mountJigsaw({onStart, onComplete, beforeReplay, onExit, onSnap}) {
 const dialog = document.createElement('dialog');
 dialog.className = 'jigsaw';
 dialog.setAttribute('aria-labelledby', 'jigsaw-title');
 dialog.innerHTML = `
  <header class="jigsaw-head">
   <div><p>ADULTS vs. KIDS™ ARCADE</p><h2 id="jigsaw-title">Family Jigsaw 3D</h2></div>
   <button type="button" data-exit>Back to Arcade</button>
  </header>
  <form class="jigsaw-setup">
   <div class="jigsaw-photo" aria-hidden="true">
    <img src="${SAMPLE_PHOTO}" alt="">
    <span></span><span></span><span></span>
   </div>
   <div class="jigsaw-options">
    <h3>Turn a family photo into a puzzle.</h3>
    <p>Build it together on one screen.</p>
    <label class="jigsaw-button jigsaw-upload">Choose a photo<input type="file" accept="image/*"></label>
    <button type="button" data-sample hidden>Use sample photo</button>
    <small>Your photo stays in this browser tab.</small>
    <div class="jigsaw-count"><label for="jigsaw-count">Pieces</label><select id="jigsaw-count">${COUNTS.map(count => `<option value="${count}">${count.toLocaleString()}</option>`).join('')}</select></div>
    <button class="jigsaw-primary" type="submit" disabled>Start puzzle</button>
    <button type="button" data-resume hidden>Resume puzzle</button>
   </div>
  </form>
  <section class="jigsaw-play" hidden aria-label="Puzzle table">
   <div class="jigsaw-tools">
    <strong data-progress></strong>
    <div class="jigsaw-actions">
     <button type="button" data-reference aria-pressed="false">Preview</button>
     <button type="button" data-zoom-out aria-label="Zoom out">−</button>
     <button type="button" data-zoom-in aria-label="Zoom in">+</button>
     <button type="button" data-new>New puzzle</button>
    </div>
   </div>
   <div class="jigsaw-bed">
    <div class="jigsaw-scroll" aria-label="Scrollable puzzle board">
     <div class="jigsaw-board-wrap">
      <canvas class="jigsaw-board" tabindex="0" aria-label="Puzzle board. Choose a piece, then tap a spot or use the arrow keys and press Enter." aria-describedby="jigsaw-status"></canvas>
      <i class="jigsaw-cursor" hidden aria-hidden="true"></i>
      <i class="jigsaw-flash" aria-hidden="true"></i>
     </div>
    </div>
    <canvas class="jigsaw-reference" hidden aria-label="Reference photo"></canvas>
   </div>
   <div class="jigsaw-tray">
    <div class="jigsaw-tray-head">
     <strong>Piece tray</strong>
     <button type="button" data-edges aria-pressed="false">Edges only</button>
     <div class="jigsaw-pages">
      <button type="button" data-previous aria-label="Previous pieces">‹</button>
      <span data-page></span>
      <button type="button" data-next aria-label="Next pieces">›</button>
     </div>
    </div>
    <div class="jigsaw-pieces" aria-label="Loose pieces"></div>
   </div>
  </section>
  <p id="jigsaw-status" role="status">Loading sample photo…</p>
  <canvas class="jigsaw-drag" hidden aria-hidden="true"></canvas>`;
 document.body.append(dialog);
 const find = selector => dialog.querySelector(selector);
 const setup = find('form'), photoInput = find('input'), photoPreview = find('.jigsaw-photo img');
 const play = find('.jigsaw-play'), board = find('.jigsaw-board'), scroll = find('.jigsaw-scroll');
 const wrap = find('.jigsaw-board-wrap'), tray = find('.jigsaw-tray'), pieceList = find('.jigsaw-pieces');
 const reference = find('.jigsaw-reference'), cursor = find('.jigsaw-cursor'), floating = find('.jigsaw-drag');
 const flash = find('.jigsaw-flash');
 const start = find('[type=submit]'), sampleButton = find('[data-sample]'), progress = find('[data-progress]');
 const prev = find('[data-previous]'), next = find('[data-next]'), pageLabel = find('[data-page]');
 const edgeButton = find('[data-edges]'), previewButton = find('[data-reference]');
 const zoomOut = find('[data-zoom-out]'), zoomIn = find('[data-zoom-in]');
 const zoomLevels = [1, 1.5, 2, 3, 4, 6];
 let source, sample, sourceVersion = 0, round, selected, drag, animation = 0, page = 0;
 let edges = false, preview = false, zoomIndex = 0, row = 0, column = 0;
 const status = message => {find('#jigsaw-status').textContent = message;};

 async function loadPhoto(file) {
  const version = ++sourceVersion;
  start.disabled = true;
  status(file ? 'Opening photo…' : 'Loading sample photo…');
  const url = file ? URL.createObjectURL(file) : SAMPLE_PHOTO;
  try {
   const image = file ? await decodeImage(url) : await (sample ??= decodeImage(url));
   if (version !== sourceVersion) return;
   source = image;
   photoPreview.src = file ? image.toDataURL('image/jpeg', .86) : SAMPLE_PHOTO;
   sampleButton.hidden = !file;
   status(file ? 'Photo ready. Choose how many pieces to play.' : 'Use the sample photo or choose one of your own.');
  } catch {
   if (version !== sourceVersion) return;
   if (!file) sample = undefined;
   status('That image couldn’t be opened. Try a JPG, PNG, or WebP photo.');
  } finally {
   if (file) URL.revokeObjectURL(url);
   if (version === sourceVersion) start.disabled = !source;
  }
 }

 function setZoom(index, centered = true) {
  const old = zoomLevels[zoomIndex];
  const scale = zoomLevels[index] / old;
  const x = scroll.scrollLeft + scroll.clientWidth / 2;
  const y = scroll.scrollTop + scroll.clientHeight / 2;
  zoomIndex = index;
  wrap.style.setProperty('--zoom', zoomLevels[index]);
  scroll.scrollLeft = centered ? x * scale - scroll.clientWidth / 2 : 0;
  scroll.scrollTop = centered ? y * scale - scroll.clientHeight / 2 : 0;
  zoomOut.disabled = !index;
  zoomIn.disabled = index === zoomLevels.length - 1;
 }
 function fitBoard() {
  if (!round || play.hidden) return;
  const aspect = round.photo.width / round.photo.height;
  const width = Math.min(scroll.clientWidth, scroll.clientHeight * aspect);
  wrap.style.setProperty('--base-width', `${width}px`);
  wrap.style.setProperty('--base-height', `${width / aspect}px`);
 }
 const observer = new ResizeObserver(fitBoard);
 observer.observe(scroll);

 function drawBoard() {
  const {photo, columns, rows, pieces, count} = round;
  const context = board.getContext('2d');
  context.clearRect(0, 0, board.width, board.height);
  if (count === pieces.length) {
   context.drawImage(photo, 0, 0, board.width, board.height);
   return;
  }
  const width = board.width / columns, height = board.height / rows;
  context.strokeStyle = '#cbe4f631';
  context.lineWidth = Math.max(1, board.width / 760);
  context.beginPath();
  for (let i = 1; i < columns; i++) {
   context.moveTo(i * width, 0);
   context.lineTo(i * width, board.height);
  }
  for (let i = 1; i < rows; i++) {
   context.moveTo(0, i * height);
   context.lineTo(board.width, i * height);
  }
  context.stroke();
 }
 function updateTray() {
  const remaining = round.order.filter(piece => !piece.placed && (!edges || piece.edge));
  const pages = Math.max(1, Math.ceil(remaining.length / PAGE_SIZE));
  page = clamp(page, 0, pages - 1);
  prev.disabled = page === 0;
  next.disabled = page === pages - 1;
  pageLabel.textContent = `${page + 1} / ${pages}`;
  edgeButton.setAttribute('aria-pressed', String(edges));
  pieceList.replaceChildren();
  for (const piece of remaining.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)) {
   const button = document.createElement('button');
   const tile = document.createElement('canvas');
   button.type = 'button';
   button.setAttribute('aria-label', `${piece.edge ? 'Edge piece' : 'Piece'} ${piece.label}`);
   button.dataset.piece = String(piece.id);
   button.setAttribute('aria-pressed', String(piece === selected));
   tile.width = tile.height = 144;
   tile.setAttribute('aria-hidden', 'true');
   tile.style.animationDelay = `${-(piece.id % 17) * .23}s`;
   const aspect = round.photo.width * round.rows / (round.photo.height * round.columns);
   const width = Math.min(81, 81 * aspect), height = Math.min(81, 81 / aspect);
   drawPiece(tile.getContext('2d'), piece, round.photo, round.columns, round.rows, (144 - width) / 2, (144 - height) / 2, width, height, true);
   button.append(tile);
   button.addEventListener('pointerdown', event => grab(event, piece, button));
   button.addEventListener('click', event => {
    if (event.detail === 0) select(piece);
   });
   pieceList.append(button);
  }
  if (!remaining.length && round.count < round.pieces.length) {
   pieceList.textContent = 'All edge pieces placed. Turn off Edges only to keep going.';
  }
  progress.textContent = `${round.count.toLocaleString()} / ${round.pieces.length.toLocaleString()} placed`;
 }
 function updateCursor(reveal = false) {
  cursor.hidden = !selected;
  if (!selected) return;
  cursor.style.setProperty('--column', column);
  cursor.style.setProperty('--row', row);
  if (reveal) cursor.scrollIntoView({block:'nearest', inline:'nearest'});
 }
 function select(piece) {
  selected = piece;
  pieceList.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.piece) === piece.id)));
  updateCursor();
  status('Piece selected. Tap its spot or use the arrow keys and Enter.');
  board.focus({preventScroll: true});
 }
 function positionAt(x, y) {
  const rect = board.getBoundingClientRect();
  const col = (x - rect.left) / rect.width * round.columns;
  const line = (y - rect.top) / rect.height * round.rows;
  return col >= 0 && col < round.columns && line >= 0 && line < round.rows ?
   {column: Math.floor(col), row: Math.floor(line)} : null;
 }
 function place(position) {
  if (!position || !selected) return;
  if (selected.column !== position.column || selected.row !== position.row) {
   status('That piece fits somewhere else.');
   return;
  }
  const piece = selected;
  piece.placed = true;
  selected = null;
  round.count++;
  const complete = round.count === round.pieces.length;
  if (complete) drawBoard();
  else {
   const {photo, columns, rows} = round;
   const width = board.width / columns, height = board.height / rows;
   drawPiece(board.getContext('2d'), piece, photo, columns, rows, piece.column * width, piece.row * height, width, height, false);
  }
  updateCursor();
  updateTray();
  onSnap?.(complete);
  if (complete) {
   tray.hidden = true;
   previewButton.disabled = true;
   setPreview(false);
   setZoom(0, false);
   board.classList.add('jigsaw-solved');
   status('Puzzle complete! High fives all around.');
   onComplete?.({pieces: round.count});
  } else {
   flash.style.setProperty('--column', position.column);
   flash.style.setProperty('--row', position.row);
   flash.getAnimations().forEach(animation => animation.cancel());
   if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    flash.animate([{opacity:1, transform:'scale(1.14)'},{opacity:0, transform:'scale(1)'}], {duration:280, easing:'ease-out'});
   }
   status('Piece snapped into place. Choose another piece.');
  }
 }

 function moveFloating() {
  animation = 0;
  if (!drag) return;
  floating.style.transform = `translate3d(${drag.x - drag.size / 2}px, ${drag.y - drag.size / 2}px, 0)`;
 }
 function grab(event, piece, button) {
  if (drag || !event.isPrimary || event.button !== 0) return;
  floating.getAnimations().forEach(animation => animation.cancel());
  floating.hidden = true;
  button.setPointerCapture(event.pointerId);
  drag = {id:event.pointerId, piece, button, x:event.clientX, y:event.clientY, startX:event.clientX, startY:event.clientY, lifted:false};
 }
 function move(event) {
  if (drag?.id !== event.pointerId) return;
  drag.x = event.clientX;
  drag.y = event.clientY;
  if (!drag.lifted && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
  if (!drag.lifted) {
   drag.lifted = true;
   const rect = board.getBoundingClientRect();
   const cellWidth = rect.width / round.columns, cellHeight = rect.height / round.rows;
   drag.size = clamp(Math.max(cellWidth, cellHeight) * 1.8, 40, 240);
   floating.width = floating.height = 288;
   floating.style.width = floating.style.height = `${drag.size}px`;
   const scale = Math.min(288 * 1.13 / drag.size, 162 / Math.max(cellWidth, cellHeight));
   const width = cellWidth * scale, height = cellHeight * scale;
   drawPiece(floating.getContext('2d'), drag.piece, round.photo, round.columns, round.rows, (288 - width) / 2, (288 - height) / 2, width, height, true);
   floating.hidden = false;
   drag.button.dataset.lifted = 'true';
  }
  if (!animation) animation = requestAnimationFrame(moveFloating);
 }
 function drop(event, cancelled = false) {
  if (drag?.id !== event.pointerId) return;
  const {piece, lifted, button, size} = drag;
  drag = null;
  delete button.dataset.lifted;
  floating.hidden = true;
  cancelAnimationFrame(animation);
  animation = 0;
  if (cancelled) return;
  select(piece);
  if (!lifted) return;
  const position = positionAt(event.clientX, event.clientY);
  place(position);
  if (!piece.placed || round.count === round.pieces.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = board.getBoundingClientRect();
  const from = [event.clientX, event.clientY];
  const to = [rect.left + (piece.column + .5) * rect.width / round.columns,
   rect.top + (piece.row + .5) * rect.height / round.rows];
  const transformAt = ([x, y]) => `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
  floating.hidden = false;
  const settling = floating.animate([
   {transform:transformAt(from), opacity:1},
   {transform:transformAt(to), opacity:0}
  ], {duration:170, easing:'cubic-bezier(.2,.75,.25,1)'});
  settling.onfinish = () => {floating.hidden = true;};
 }
 pieceList.addEventListener('pointermove', move);
 pieceList.addEventListener('pointerup', drop);
 pieceList.addEventListener('pointercancel', event => drop(event, true));
 pieceList.addEventListener('lostpointercapture', event => drop(event, true));
 board.addEventListener('click', event => {
  const position = positionAt(event.clientX, event.clientY);
  if (position) ({column, row} = position);
  place(position);
  updateCursor();
 });
 board.addEventListener('keydown', event => {
  if (!selected) return;
  const shifts = {ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0]};
  if (event.key === 'Enter' || event.key === ' ') {
   event.preventDefault();
   place({column, row});
  } else if (shifts[event.key]) {
   event.preventDefault();
   const [dx, dy] = shifts[event.key];
   column = clamp(column + dx, 0, round.columns - 1);
   row = clamp(row + dy, 0, round.rows - 1);
   updateCursor(true);
  }
 });

 function setPreview(value) {
  preview = value;
  reference.hidden = !value;
  previewButton.setAttribute('aria-pressed', String(value));
 }
 function showBoard() {
  setup.hidden = true;
  play.hidden = false;
  fitBoard();
  board.focus({preventScroll:true});
 }
 setup.addEventListener('submit', event => {
  event.preventDefault();
  if (!source || start.disabled || (round && beforeReplay && !beforeReplay())) return;
  const count = Number(find('select').value);
  if (!COUNTS.includes(count)) return;
  const photo = source;
  const {columns, rows} = puzzleGrid(count, photo.width / photo.height);
  const pieces = newPieces(columns, rows);
  const order = shuffle(pieces);
  order.forEach((piece, index) => {piece.label = index + 1;});
  round = {photo, columns, rows, pieces, order, count: 0};
  row = column = page = 0;
  selected = null;
  edges = false;
  tray.hidden = false;
  previewButton.disabled = false;
  setPreview(false);
  const resolution = MAX_IMAGE_SIZE / Math.max(photo.width, photo.height);
  board.width = Math.round(photo.width * resolution);
  board.height = Math.round(photo.height * resolution);
  board.classList.remove('jigsaw-solved');
  wrap.style.setProperty('--columns', columns);
  wrap.style.setProperty('--rows', rows);
  reference.width = photo.width;
  reference.height = photo.height;
  reference.getContext('2d').drawImage(photo, 0, 0);
  showBoard();
  setZoom(0, false);
  updateCursor();
  drawBoard();
  updateTray();
  status('Drag a piece into place, or select it and tap its spot.');
  onStart?.();
 });
 photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  photoInput.value = '';
  if (file) void loadPhoto(file);
 });
 sampleButton.addEventListener('click', () => {void loadPhoto();});
 find('[data-new]').addEventListener('click', () => {
  play.hidden = true;
  setup.hidden = false;
  find('[data-resume]').hidden = false;
  start.focus();
  status('Choose a photo and piece count, or resume this puzzle.');
 });
 find('[data-resume]').addEventListener('click', () => {
  showBoard();
  status(round.count === round.pieces.length ? 'Puzzle complete! High fives all around.' : 'Pick a piece to keep going.');
 });
 edgeButton.addEventListener('click', () => {
  edges = !edges;
  page = 0;
  updateTray();
 });
 prev.addEventListener('click', () => {page--; updateTray();});
 next.addEventListener('click', () => {page++; updateTray();});
 previewButton.addEventListener('click', () => setPreview(!preview));
 zoomOut.addEventListener('click', () => setZoom(zoomIndex - 1));
 zoomIn.addEventListener('click', () => setZoom(zoomIndex + 1));
 find('[data-exit]').addEventListener('click', () => dialog.close());
 dialog.addEventListener('close', () => {
  sourceVersion++;
  observer.disconnect();
  cancelAnimationFrame(animation);
  dialog.remove();
  onExit?.();
 }, {once:true});
 dialog.showModal();
 void loadPhoto();
}
