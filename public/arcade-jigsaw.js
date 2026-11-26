import {shuffle} from './arcade-core.js';
import {openJigsawGallery} from './arcade-jigsaw-gallery.js?v=1';

const SAMPLE_PHOTO = '/assets/guide-family-patio.webp';
const COUNTS = [12, 24, 48, 96, 192, 384, 768, 1024];
const PAGE_SIZE = 12;
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

const SECTIONS = ['all', 'corners', 'edges', 'center'];
const INTRO_HOLD = 2200;
const INTRO_SPLIT = 760;

// Generate one physical cut per seam. Adjacent pieces trace the same Bézier
// segments in opposite directions, so even asymmetric tabs fit exactly.
function seam() {
 const center = .5 + (Math.random() - .5) * .17;
 const radius = .13 + Math.random() * .04;
 const height = (.23 + Math.random() * .08) * (Math.random() < .5 ? -1 : 1);
 const bend = (Math.random() - .5) * .075;
 const skew = (Math.random() - .5) * .075;
 const neck = radius * .45;
 const left = center - neck, right = center + neck, tip = center + skew;
 return [
  [[.12, -bend], [left - .10, bend], [left, bend]],
  [[left + .025, bend], [tip - radius, height * .38], [tip - radius, height * .60]],
  [[tip - radius, height * 1.13], [tip + radius, height * 1.09], [tip + radius, height * .60]],
  [[tip + radius, height * .35], [right - .035, -bend], [right, -bend]],
  [[right + .10, -bend], [.88, bend], [1, 0]]
 ];
}

function cut(path, x, y, horizontal, shape, reverse = false) {
 const at = ([u, v]) => horizontal ? [x + u, y + v] : [x + v, y + u];
 if (!shape) {
  path.lineTo(...at([reverse ? 0 : 1, 0]));
  return;
 }
 if (reverse) {
  for (let i = shape.length - 1; i >= 0; i--) {
   const [first, second] = shape[i];
   path.bezierCurveTo(...at(second), ...at(first), ...at(shape[i - 1]?.[2] ?? [0, 0]));
  }
 } else {
  for (const [first, second, end] of shape) path.bezierCurveTo(...at(first), ...at(second), ...at(end));
 }
}

function newPieces(columns, rows) {
 const horizontal = Array.from({length: (rows - 1) * columns}, seam);
 const vertical = Array.from({length: rows * (columns - 1)}, seam);
 return Array.from({length: columns * rows}, (_, id) => {
  const column = id % columns, row = Math.floor(id / columns);
  const left = column === 0, right = column === columns - 1;
  const top = row === 0, bottom = row === rows - 1;
  const path = new Path2D();
  path.moveTo(0, 0);
  cut(path, 0, 0, true, !top && horizontal[id - columns]);
  cut(path, 1, 0, false, !right && vertical[row * (columns - 1) + column]);
  cut(path, 0, 1, true, !bottom && horizontal[id], true);
  cut(path, 0, 0, false, !left && vertical[row * (columns - 1) + column - 1], true);
  path.closePath();
  const section = (left || right) && (top || bottom) ? 'corners' :
   left || right || top || bottom ? 'edges' : 'center';
  return {id, column, row, path, section, placed: false};
 });
}

function drawPiecePhoto(context, piece, photo, columns, rows) {
 // Only sample the cell and neighboring tabs, especially during Auto Solve.
 const left = Math.max(0, piece.column - .4), top = Math.max(0, piece.row - .4);
 const width = Math.min(columns, piece.column + 1.4) - left;
 const height = Math.min(rows, piece.row + 1.4) - top;
 const cellWidth = photo.width / columns, cellHeight = photo.height / rows;
 context.drawImage(photo, left * cellWidth, top * cellHeight, width * cellWidth, height * cellHeight,
  left - piece.column, top - piece.row, width, height);
}

function drawPiece(context, piece, photo, columns, rows, x, y, width, height, loose) {
 context.save();
 context.translate(x, y);
 context.scale(width, height);
 context.lineJoin = 'round';
 if (loose) {
  context.save();
  context.translate(.029, .055);
  context.shadowColor = '#09100cba';
  context.shadowBlur = 8;
  context.shadowOffsetY = 4;
  const board = context.createLinearGradient(0, 0, .85, 1);
  board.addColorStop(0, '#c3a279');
  board.addColorStop(.48, '#8c6b4a');
  board.addColorStop(1, '#483022');
  context.fillStyle = board;
  context.fill(piece.path);
  context.shadowColor = 'transparent';
  context.strokeStyle = '#3c291c';
  context.lineWidth = .024;
  context.stroke(piece.path);
  context.translate(-.01, -.021);
  context.strokeStyle = '#e4c39a98';
  context.lineWidth = .022;
  context.stroke(piece.path);
  context.restore();
 }
 context.save();
 context.clip(piece.path);
 drawPiecePhoto(context, piece, photo, columns, rows);
 // Light catches the top-left bevel. The opposite rim falls into shadow.
 context.save();
 const bevel = loose ? .013 : .009;
 context.lineWidth = bevel * 1.6;
 context.translate(bevel / 2, bevel / 2);
 context.strokeStyle = loose ? '#fff6e3ad' : '#fff6e393';
 context.stroke(piece.path);
 context.translate(-bevel, -bevel);
 context.strokeStyle = loose ? '#22150db8' : '#22150d85';
 context.stroke(piece.path);
 context.restore();
 if (loose) {
  const finish = context.createLinearGradient(0, 0, .9, 1);
  finish.addColorStop(0, '#fff0d138');
  finish.addColorStop(.44, '#ffffff00');
  finish.addColorStop(1, '#19110935');
  context.fillStyle = finish;
  context.fill(piece.path);
 }
 context.restore();
 context.strokeStyle = loose ? '#36271ba6' : '#291c1680';
 context.lineWidth = loose ? .012 : .009;
 context.stroke(piece.path);
 context.restore();
}

function drawAssembled(canvas, {photo, columns, rows, pieces}) {
 const context = canvas.getContext('2d');
 const width = canvas.width / columns, height = canvas.height / rows;
 context.drawImage(photo, 0, 0, canvas.width, canvas.height);
 for (const piece of pieces) {
  context.save();
  context.translate(piece.column * width, piece.row * height);
  context.scale(width, height);
  context.strokeStyle = '#241910bc';
  context.lineWidth = clamp(1.35 / Math.min(width, height), .009, .041);
  context.stroke(piece.path);
  context.translate(-.011, -.014);
  context.strokeStyle = '#fff1d68c';
  context.lineWidth *= .65;
  context.stroke(piece.path);
  context.restore();
 }
}

function addPaperGrain(context, width, height) {
 const texture = document.createElement('canvas');
 texture.width = texture.height = 96;
 const noise = texture.getContext('2d');
 const image = noise.createImageData(96, 96);
 for (let i = 0; i < image.data.length; i += 4) {
  const value = Math.random() < .52 ? 255 : 0;
  image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
  image.data[i + 3] = Math.random() * 30;
 }
 noise.putImageData(image, 0, 0);
 context.save();
 context.globalCompositeOperation = 'soft-light';
 context.fillStyle = context.createPattern(texture, 'repeat');
 context.fillRect(0, 0, width, height);
 context.restore();
}

function decodeImage(url) {
 const image = new Image();
 image.src = url;
 return image.decode().then(() => {
  const scale = Math.min(MAX_IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight), 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  addPaperGrain(context, canvas.width, canvas.height);
  return canvas;
 });
}

export function mountJigsaw({onStart, onComplete, beforeStart, onExit, onSnap}) {
 const dialog = document.createElement('dialog');
 dialog.className = 'jigsaw';
 dialog.setAttribute('aria-labelledby', 'jigsaw-title');
 dialog.innerHTML = `
  <header class="jigsaw-head">
   <div><p>ADULTS vs. KIDS™ ARCADE</p><h2 id="jigsaw-title">Family Jigsaw 3D</h2></div>
   <div class="jigsaw-head-actions"><button type="button" data-gallery>Gallery</button><button type="button" data-exit>Back to Arcade</button></div>
  </header>
  <form class="jigsaw-setup">
   <figure class="jigsaw-photo">
    <canvas aria-label="Your assembled puzzle with cut lines"></canvas>
    <figcaption>Assembled puzzle</figcaption>
   </figure>
   <div class="jigsaw-options">
    <h3>Turn a family photo into a puzzle.</h3>
    <p>Build it together on one screen.</p>
    <label class="jigsaw-button jigsaw-upload">Choose a photo<input type="file" accept="image/*"></label>
    <button type="button" data-sample hidden>Use sample photo</button>
    <small>Your photo stays on this device.</small>
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
     <button type="button" class="jigsaw-primary" data-skip hidden>Skip to play</button>
    </div>
    <div class="jigsaw-assist" role="group" aria-label="Puzzle assistance">
     <button type="button" data-hints aria-pressed="false">Red hint</button>
     <button type="button" data-auto>Auto Solve</button>
    </div>
   </div>
   <div class="jigsaw-bed">
    <div class="jigsaw-scroll" aria-label="Scrollable puzzle board">
     <div class="jigsaw-board-wrap">
      <canvas class="jigsaw-board" tabindex="0" aria-label="Puzzle board. Pinch to zoom and swipe to pan. Choose a piece, then tap a spot or use the arrow keys and press Enter." aria-describedby="jigsaw-status"></canvas>
      <canvas class="jigsaw-hint" width="176" height="176" hidden aria-hidden="true"></canvas>
      <canvas class="jigsaw-target" width="176" height="176" hidden aria-hidden="true"></canvas>
      <i class="jigsaw-cursor" hidden aria-hidden="true"></i>
      <i class="jigsaw-flash" aria-hidden="true"></i>
     </div>
    </div>
    <canvas class="jigsaw-reference" hidden aria-label="Reference photo"></canvas>
   </div>
   <div class="jigsaw-tray">
    <div class="jigsaw-tray-head">
     <div class="jigsaw-sections" role="group" aria-label="Piece sections">
      <button type="button" data-section="all" aria-pressed="true">All</button>
      <button type="button" data-section="corners" aria-pressed="false">Corners</button>
      <button type="button" data-section="edges" aria-pressed="false">Edges</button>
      <button type="button" data-section="center" aria-pressed="false">Center</button>
     </div>
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
  <div class="jigsaw-scatter" aria-hidden="true"></div>
  <canvas class="jigsaw-drag" hidden aria-hidden="true"></canvas>`;
 document.body.append(dialog);
 const find = selector => dialog.querySelector(selector);
 const setup = find('form'), photoInput = find('input'), photoPreview = find('.jigsaw-photo canvas');
 const play = find('.jigsaw-play'), board = find('.jigsaw-board'), scroll = find('.jigsaw-scroll');
 const bed = find('.jigsaw-bed'), tools = find('.jigsaw-tools'), target = find('.jigsaw-target');
 const statusLine = find('#jigsaw-status');
 const hint = find('.jigsaw-hint'), hintsButton = find('[data-hints]'), autoButton = find('[data-auto]');
 const wrap = find('.jigsaw-board-wrap'), tray = find('.jigsaw-tray'), pieceList = find('.jigsaw-pieces');
 const reference = find('.jigsaw-reference'), cursor = find('.jigsaw-cursor'), floating = find('.jigsaw-drag');
 const flash = find('.jigsaw-flash');
 const start = find('[type=submit]'), sampleButton = find('[data-sample]'), progress = find('[data-progress]');
 const pager = find('.jigsaw-pages');
 const prev = find('[data-previous]'), next = find('[data-next]'), pageLabel = find('[data-page]');
 const sectionButtons = [...dialog.querySelectorAll('[data-section]')];
 const previewButton = find('[data-reference]'), skip = find('[data-skip]'), scatter = find('.jigsaw-scatter');
 const pieceCount = find('#jigsaw-count');
 const motion = matchMedia('(prefers-reduced-motion: reduce)');
 const zoomOut = find('[data-zoom-out]'), zoomIn = find('[data-zoom-in]');
 const zoomLevels = [1, 1.5, 2, 3, 4, 6];
 const maxZoom = zoomLevels.at(-1), contacts = new Map();
 let source, sample, sourceVersion = 0, blueprint, round, selected, drag, animation = 0, page = 0;
 let section = 'all', preview = false, zoom = 1, row = 0, column = 0, introTimer;
 let hovered, touchOrigin, movedBoard, pinch;
 let hintsOn = false, autoSolving = false, autoTimer, autoFlight;
 try { hintsOn = localStorage.getItem('avk.jigsaw.redHint') === '1'; } catch {}
 hintsButton.setAttribute('aria-pressed', String(hintsOn));
 const status = message => {statusLine.textContent = message;};

 async function loadPhoto(file) {
  const version = ++sourceVersion;
  start.disabled = true;
  status(file ? 'Opening photo…' : 'Loading sample photo…');
  const url = file ? URL.createObjectURL(file) : SAMPLE_PHOTO;
  try {
   const image = file ? await decodeImage(url) : await (sample ??= decodeImage(url));
   if (version !== sourceVersion) return;
   source = image;
   previewAssembly();
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

 function previewAssembly() {
  if (!source) return;
  const photo = source;
  const {columns, rows} = puzzleGrid(Number(pieceCount.value), photo.width / photo.height);
  blueprint = {photo, columns, rows, pieces:newPieces(columns, rows)};
  const scale = 920 / Math.max(photo.width, photo.height);
  photoPreview.width = Math.max(1, Math.round(photo.width * scale));
  photoPreview.height = Math.max(1, Math.round(photo.height * scale));
  drawAssembled(photoPreview, blueprint);
 }

 function centerOfBoardView() {
  const frame = scroll.getBoundingClientRect();
  return {x:frame.left + scroll.clientWidth / 2, y:frame.top + scroll.clientHeight / 2};
 }
 function pointOnBoard(anchor) {
  const rect = board.getBoundingClientRect();
  return {x:rect.width ? clamp((anchor.x - rect.left) / rect.width, 0, 1) : .5,
   y:rect.height ? clamp((anchor.y - rect.top) / rect.height, 0, 1) : .5};
 }
 function setZoom(value, anchor = pointOnBoard(centerOfBoardView()), destination) {
  showTarget();
  zoom = clamp(value, 1, maxZoom);
  wrap.style.setProperty('--zoom', zoom);
  play.toggleAttribute('data-zoomed', zoom > 1);
  zoomOut.disabled = autoSolving || zoom <= 1;
  zoomIn.disabled = autoSolving || zoom >= maxZoom;
  fitBoard();
  const after = board.getBoundingClientRect();
  const focus = destination ?? centerOfBoardView();
  scroll.scrollLeft += after.left + anchor.x * after.width - focus.x;
  scroll.scrollTop += after.top + anchor.y * after.height - focus.y;
 }
 function fitBoard() {
  if (!round || play.hidden) return;
  const aspect = round.photo.width / round.photo.height;
  const style = getComputedStyle(bed);
  const frameWidth = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
   parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
  const frameHeight = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
   parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  const gap = parseFloat(getComputedStyle(play).rowGap);
  const trayHeight = tray.hidden ? 0 : tray.offsetHeight + gap;
  const maxWidth = Math.max(1, play.clientWidth - frameWidth);
  const maxHeight = Math.max(88, play.clientHeight - tools.offsetHeight - statusLine.offsetHeight - gap * 2 - trayHeight - frameHeight);
  const width = Math.min(maxWidth, maxHeight * aspect);
  const height = width / aspect;
  bed.style.setProperty('--bed-width', `${Math.min(maxWidth, width * zoom) + frameWidth}px`);
  bed.style.setProperty('--bed-height', `${Math.min(maxHeight, height * zoom) + frameHeight}px`);
  wrap.style.setProperty('--base-width', `${width}px`);
  wrap.style.setProperty('--base-height', `${height}px`);
 }
 const observer = new ResizeObserver(fitBoard);
 for (const element of [play, tools, tray, statusLine]) observer.observe(element);

 function drawBoard() {
  const {columns, rows, pieces, count} = round;
  const context = board.getContext('2d');
  context.clearRect(0, 0, board.width, board.height);
  if (count === pieces.length) {
   drawAssembled(board, round);
   return;
  }
  const width = board.width / columns, height = board.height / rows;
  context.strokeStyle = '#37778f47';
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
  const available = round.order.filter(piece => !piece.placed);
  const remaining = section === 'all' ? available : available.filter(piece => piece.section === section);
  const pages = Math.max(1, Math.ceil(remaining.length / PAGE_SIZE));
  page = clamp(page, 0, pages - 1);
  prev.disabled = page === 0;
  next.disabled = page === pages - 1;
  pageLabel.textContent = `${page + 1} / ${pages}`;
  pager.hidden = pages < 2;
  for (const button of sectionButtons) {
   const name = button.dataset.section;
   const count = name === 'all' ? available.length : available.filter(piece => piece.section === name).length;
   button.setAttribute('aria-pressed', String(name === section));
   const label = button.dataset.label;
   button.textContent = `${label} ${count.toLocaleString()}`;
  }
  const existing = new Map([...pieceList.querySelectorAll('button')].map(button => [Number(button.dataset.piece), button]));
  const tiles = remaining.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(piece => {
   const button = existing.get(piece.id) ?? createPieceTile(piece);
   button.setAttribute('aria-pressed', String(piece === selected));
   return button;
  });
  pieceList.replaceChildren(...tiles);
  if (!remaining.length && round.count < round.pieces.length) {
   const message = document.createElement('p');
   message.textContent = 'This section is complete. Pick another section to keep going.';
   pieceList.append(message);
  }
  progress.textContent = `${round.count.toLocaleString()} / ${round.pieces.length.toLocaleString()} placed`;
 }
 function createPieceTile(piece) {
  const button = document.createElement('button');
  const tile = document.createElement('canvas');
  button.type = 'button';
  button.setAttribute('aria-label', `${piece.section === 'corners' ? 'Corner piece' : piece.section === 'edges' ? 'Edge piece' : 'Center piece'} ${piece.label}`);
  button.dataset.piece = String(piece.id);
  tile.width = tile.height = 192;
  tile.setAttribute('aria-hidden', 'true');
  tile.style.animationDelay = `${-(piece.id % 17) * .29}s`;
  const aspect = round.photo.width * round.rows / (round.photo.height * round.columns);
  const width = Math.min(108, 108 * aspect), height = Math.min(108, 108 / aspect);
  drawPiece(tile.getContext('2d'), piece, round.photo, round.columns, round.rows, (192 - width) / 2, (192 - height) / 2, width, height, true);
  button.append(tile);
  button.addEventListener('pointerdown', event => grab(event, piece, button));
  button.addEventListener('click', event => {
   if (event.detail === 0) select(piece, true);
  });
  return button;
 }
 function updateCursor(visible = false) {
  cursor.hidden = !selected || !visible;
  if (cursor.hidden) return;
  cursor.style.setProperty('--column', column);
  cursor.style.setProperty('--row', row);
  // Scroll only the board. The tray and frame stay put during keyboard play.
  const focus = cursor.getBoundingClientRect();
  const frame = scroll.getBoundingClientRect();
  scroll.scrollLeft += Math.max(0, focus.right - frame.left - scroll.clientWidth) + Math.min(0, focus.left - frame.left);
  scroll.scrollTop += Math.max(0, focus.bottom - frame.top - scroll.clientHeight) + Math.min(0, focus.top - frame.top);
 }
 function select(piece, keyboard = false) {
  if (autoSolving) return;
  selected = piece;
  if (keyboard && hintsOn) ({column, row} = piece);
  pieceList.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.piece) === piece.id)));
  showTarget();
  updateCursor(keyboard);
  showHint(piece, true);
  status('Piece selected. Tap its spot or use the arrow keys and Enter.');
  board.focus({preventScroll: true});
 }
 function positionAt(x, y) {
  const frame = scroll.getBoundingClientRect();
  if (x < frame.left || x >= frame.left + scroll.clientWidth ||
      y < frame.top || y >= frame.top + scroll.clientHeight) return null;
  const rect = board.getBoundingClientRect();
  const col = (x - rect.left) / rect.width * round.columns;
  const line = (y - rect.top) / rect.height * round.rows;
  return col >= 0 && col < round.columns && line >= 0 && line < round.rows ?
   {column: Math.floor(col), row: Math.floor(line)} : null;
 }
 function showTarget(piece, position) {
  if (!piece || !position) {
   if (hovered) target.hidden = true;
   hovered = undefined;
   return;
  }
  if (hovered?.piece === piece && hovered.column === position.column && hovered.row === position.row) return;
  hovered = {piece, ...position};
  const fits = piece.column === position.column && piece.row === position.row;
  cursor.hidden = true;
  target.style.setProperty('--column', position.column);
  target.style.setProperty('--row', position.row);
  target.dataset.fits = String(fits);
  target.hidden = false;
  const context = target.getContext('2d');
  context.clearRect(0, 0, target.width, target.height);
  context.save();
  context.translate(38, 38);
  context.scale(100, 100);
  context.fillStyle = fits ? '#a9f6a98c' : '#101e19ad';
  context.fill(piece.path);
  if (fits) {
   context.save();
   context.clip(piece.path);
   const {photo, columns, rows} = round;
   context.globalAlpha = .56;
   drawPiecePhoto(context, piece, photo, columns, rows);
   context.restore();
  }
  context.lineWidth = .027;
  context.strokeStyle = fits ? '#d4ffb8' : '#e2d5a19c';
  context.stroke(piece.path);
  context.restore();
 }

 function showHint(piece, reveal = false) {
  hint.hidden = !hintsOn || !piece || autoSolving;
  if (hint.hidden) return;
  hint.style.setProperty('--column', piece.column);
  hint.style.setProperty('--row', piece.row);
  const context = hint.getContext('2d');
  context.clearRect(0, 0, hint.width, hint.height);
  context.save();
  context.translate(38, 38);
  context.scale(100, 100);
  context.fillStyle = '#ff526b32';
  context.strokeStyle = '#cd1639';
  context.lineJoin = 'round';
  context.lineWidth = .055;
  context.fill(piece.path);
  context.stroke(piece.path);
  context.restore();
  if (!reveal) return;
  const marker = hint.getBoundingClientRect();
  const view = scroll.getBoundingClientRect();
  const x = marker.left + marker.width / 2, y = marker.top + marker.height / 2;
  if (x < view.left || x >= view.left + scroll.clientWidth) scroll.scrollLeft += x - view.left - scroll.clientWidth / 2;
  if (y < view.top || y >= view.top + scroll.clientHeight) scroll.scrollTop += y - view.top - scroll.clientHeight / 2;
 }

 function place(position) {
  if (!position || !selected) return;
  if (selected.column !== position.column || selected.row !== position.row) {
   status('That piece fits somewhere else.');
   return;
  }
  const piece = selected;
  showTarget();
  showHint();
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
   stopAutoSolve();
   tray.hidden = true;
   round.galleryId = crypto.randomUUID();
   hintsButton.disabled = autoButton.disabled = true;
   previewButton.disabled = true;
   setPreview(false);
   setZoom(1);
   board.classList.add('jigsaw-solved');
   status('Puzzle complete! Open Gallery to save your image.');
   onComplete?.({pieces: round.count});
  } else {
   flash.style.setProperty('--column', position.column);
   flash.style.setProperty('--row', position.row);
   flash.getAnimations().forEach(animation => animation.cancel());
   if (!motion.matches) {
    flash.animate([{opacity:1, transform:'scale(1.14)'},{opacity:0, transform:'scale(1)'}], {duration:280, easing:'ease-out'});
   }
   if (!autoSolving) status('Piece snapped into place. Choose another piece.');
  }
 }

 function stopAutoSolve() {
  if (!autoSolving) return;
  autoSolving = false;
  dialog.removeAttribute('data-auto-solving');
  clearTimeout(autoTimer);
  autoFlight?.cancel();
  autoFlight = null;
  floating.hidden = true;
  const lifted = pieceList.querySelector('[data-lifted]');
  if (lifted) delete lifted.dataset.lifted;
  tray.inert = false;
  hintsButton.disabled = false;
  zoomOut.disabled = zoom <= 1;
  zoomIn.disabled = zoom >= maxZoom;
  autoButton.textContent = 'Auto Solve';
 }
 function flyNextPiece() {
  if (!autoSolving || !dialog.open) return;
  const piece = round.order.find(item => !item.placed);
  if (!piece) return;
  const pace = round.pieces.length <= 96 ? 195 : 105;
  const finish = () => {
   if (!autoSolving || !dialog.open) return;
   autoFlight?.cancel();
   autoFlight = null;
   floating.hidden = true;
   selected = piece;
   place(piece);
   if (autoSolving) flyNextPiece();
  };
  const slot = pieceList.querySelector(`[data-piece="${piece.id}"]`);
  const tile = slot?.querySelector('canvas');
  if (!motion.matches && tile) {
   const from = tile.getBoundingClientRect(), to = board.getBoundingClientRect();
   const size = Math.min(from.width, from.height);
   const cellWidth = to.width / round.columns, cellHeight = to.height / round.rows;
   const scale = Math.max(cellWidth, cellHeight) * 192 / (108 * size);
   floating.width = floating.height = 192;
   floating.style.width = floating.style.height = `${size}px`;
   floating.getContext('2d').drawImage(tile, 0, 0);
   floating.hidden = false;
   slot.dataset.lifted = 'true';
   const x = to.left + (piece.column + .5) * cellWidth - size / 2;
   const y = to.top + (piece.row + .5) * cellHeight - size / 2;
   autoFlight = floating.animate([
    {transform:`translate3d(${from.left}px,${from.top}px,0)`},
    {transform:`translate3d(${x}px,${y}px,0) scale(${scale})`}
   ], {duration:pace,easing:'ease-in-out',fill:'both'});
  }
  autoTimer = setTimeout(finish, pace);
 }
 function toggleAutoSolve() {
  if (autoSolving) {
   stopAutoSolve();
   status('Auto Solve paused. Place a piece or start Auto Solve again.');
   return;
  }
  if (drag || contacts.size || !round || round.galleryId) return;
  floating.getAnimations().forEach(flight => flight.cancel());
  floating.hidden = true;
  autoSolving = true;
  dialog.setAttribute('data-auto-solving','');
  selected = null;
  section = 'all';
  page = 0;
  tray.inert = true;
  hintsButton.disabled = true;
  autoButton.textContent = 'Pause Auto Solve';
  showHint();
  updateCursor();
  updateTray();
  setZoom(1);
  status('Auto Solve is placing pieces one at a time.');
  flyNextPiece();
 }
 function dragCenter(x, y, size, lift) {
  const radius = size * .45;
  return [clamp(x, radius, innerWidth - radius), clamp(y - lift, radius, innerHeight - radius)];
 }

 function moveFloating() {
  animation = 0;
  if (!drag) return;
  const [x,y] = dragCenter(drag.x, drag.y, drag.size, drag.lift);
  floating.style.transform = `translate3d(${x - drag.size / 2}px, ${y - drag.size / 2}px, 0)`;
  showTarget(drag.piece, positionAt(drag.x, drag.y));
 }
 function grab(event, piece, button) {
  if (autoSolving || drag || contacts.size || !event.isPrimary || event.button !== 0) return;
  floating.getAnimations().forEach(animation => animation.cancel());
  floating.hidden = true;
  button.setPointerCapture(event.pointerId);
  showHint(piece, true);
  drag = {id:event.pointerId, pointerType:event.pointerType, piece, button, x:event.clientX, y:event.clientY, startX:event.clientX, startY:event.clientY, lifted:false};
 }
 function move(event) {
  if (drag?.id !== event.pointerId) return;
  drag.x = event.clientX;
  drag.y = event.clientY;
  if (!drag.lifted && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
  if (!drag.lifted) {
   drag.lifted = true;
   cursor.hidden = true;
   const rect = board.getBoundingClientRect();
   const cellWidth = rect.width / round.columns, cellHeight = rect.height / round.rows;
   drag.size = clamp(Math.max(cellWidth, cellHeight) * 2.35, 118, 258);
   drag.lift = drag.size * (drag.pointerType === 'touch' ? .55 : .27);
   floating.width = floating.height = 288;
   floating.style.width = floating.style.height = `${drag.size}px`;
   const scale = 162 / Math.max(cellWidth, cellHeight);
   const width = cellWidth * scale, height = cellHeight * scale;
   drawPiece(floating.getContext('2d'), drag.piece, round.photo, round.columns, round.rows, (288 - width) / 2, (288 - height) / 2, width, height, true);
   floating.hidden = false;
   drag.button.dataset.lifted = 'true';
  }
  if (!animation) animation = requestAnimationFrame(moveFloating);
 }
 function drop(event, cancelled = false) {
  if (drag?.id !== event.pointerId) return;
  const {piece, lifted, button, size, lift} = drag;
  drag = null;
  delete button.dataset.lifted;
  floating.hidden = true;
  cancelAnimationFrame(animation);
  animation = 0;
  showTarget();
  if (cancelled) {showHint(selected);return;}
  select(piece);
  if (!lifted) return;
  const position = positionAt(event.clientX, event.clientY);
  place(position);
  if (!piece.placed || round.count === round.pieces.length || motion.matches) return;
  const rect = board.getBoundingClientRect();
  const from = dragCenter(event.clientX, event.clientY, size, lift);
  const to = [rect.left + (piece.column + .5) * rect.width / round.columns,
   rect.top + (piece.row + .5) * rect.height / round.rows];
  const scale = Math.max(rect.width / round.columns, rect.height / round.rows) * 288 / (162 * size);
  const transformAt = ([x, y]) => `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
  floating.hidden = false;
  const settling = floating.animate([
   {transform:transformAt(from), opacity:1},
   {transform:`${transformAt(to)} scale(${scale})`, opacity:0}
  ], {duration:170, easing:'cubic-bezier(.2,.75,.25,1)'});
  settling.onfinish = () => {floating.hidden = true;};
 }
 pieceList.addEventListener('pointermove', move);
 pieceList.addEventListener('pointerup', drop);
 pieceList.addEventListener('pointercancel', event => drop(event, true));
 pieceList.addEventListener('lostpointercapture', event => drop(event, true));
 board.addEventListener('pointermove', event => {
  if (!drag && event.pointerType === 'mouse') showTarget(selected, positionAt(event.clientX, event.clientY));
 });
 board.addEventListener('pointerleave', () => {if (!drag) showTarget();});
 scroll.addEventListener('scroll', () => {
  if (drag?.lifted) showTarget(drag.piece, positionAt(drag.x, drag.y));
  else showTarget();
 });
 function tapBoard(x, y) {
  if (autoSolving) return;
  const position = positionAt(x, y);
  if (position) ({column, row} = position);
  place(position);
  updateCursor();
 }
 board.addEventListener('click', event => {
  if (event.pointerType !== 'touch') tapBoard(event.clientX, event.clientY);
 });
 function pinchGeometry() {
  if (contacts.size < 2) return;
  const [first, second] = contacts.values();
  return {x:(first.x + second.x) / 2, y:(first.y + second.y) / 2,
   span:Math.hypot(first.x - second.x, first.y - second.y)};
 }
 scroll.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || autoSolving || drag || dialog.dataset.phase !== 'play' || contacts.size >= 2) return;
  const point = {x:event.clientX, y:event.clientY};
  if (!contacts.size) {
   touchOrigin = point;
   movedBoard = false;
  } else {
   movedBoard = true;
  }
  contacts.set(event.pointerId, point);
  const geometry = pinchGeometry();
  if (geometry?.span) pinch = {span:geometry.span, zoom, anchor:pointOnBoard(geometry)};
 });
 scroll.addEventListener('pointermove', event => {
  const previous = contacts.get(event.pointerId);
  if (!previous) return;
  const point = {x:event.clientX, y:event.clientY};
  contacts.set(event.pointerId, point);
  const geometry = pinchGeometry();
  if (geometry) {
   if (pinch) setZoom(pinch.zoom * geometry.span / pinch.span, pinch.anchor, geometry);
   else if (geometry.span) pinch = {span:geometry.span, zoom, anchor:pointOnBoard(geometry)};
   return;
  }
  if (!movedBoard) {
   if (Math.hypot(point.x - touchOrigin.x, point.y - touchOrigin.y) < 6) return;
   movedBoard = true;
  }
  scroll.scrollLeft += previous.x - point.x;
  scroll.scrollTop += previous.y - point.y;
 });
 function endBoardTouch(event) {
  if (!contacts.delete(event.pointerId)) return;
  pinch = undefined;
  if (event.type === 'pointerup' && !movedBoard &&
      Math.hypot(event.clientX - touchOrigin.x, event.clientY - touchOrigin.y) < 6) {
   tapBoard(event.clientX, event.clientY);
  }
 }
 for (const event of ['pointerup','pointercancel','lostpointercapture']) scroll.addEventListener(event, endBoardTouch);
 board.addEventListener('keydown', event => {
  if (autoSolving || !selected) return;
  const shifts = {ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0]};
  if (event.key === 'Enter' || event.key === ' ') {
   event.preventDefault();
   place({column, row});
  } else if (shifts[event.key]) {
   event.preventDefault();
   const [dx, dy] = shifts[event.key];
   column = clamp(column + dx, 0, round.columns - 1);
   row = clamp(row + dy, 0, round.rows - 1);
   showTarget();
   updateCursor(true);
  }
 });

 function setPreview(value) {
  preview = value;
  reference.hidden = !value;
  previewButton.setAttribute('aria-pressed', String(value));
 }
 function showBoard() {
  play.append(statusLine);
  setup.hidden = true;
  play.hidden = false;
  fitBoard();
  board.focus({preventScroll:true});
 }
 function startPlaying() {
  clearTimeout(introTimer);
  scatter.replaceChildren();
  dialog.dataset.phase = 'play';
  tray.inert = false;
  skip.hidden = true;
  find('[data-new]').hidden = false;
  previewButton.disabled = false;
  hintsButton.disabled = autoButton.disabled = false;
  setZoom(1);
  drawBoard();
  status('Drag a piece into place, or select it and tap its spot.');
  board.focus({preventScroll:true});
 }

 function splitPuzzle() {
  if (!dialog.open) return;
  dialog.dataset.phase = 'split';
  drawBoard();
  status('Sorting pieces into corners, edges, and center…');
  if (motion.matches) {
   startPlaying();
   return;
  }
  const rect = board.getBoundingClientRect();
  const faceWidth = rect.width / round.columns, faceHeight = rect.height / round.rows;
  const slots = [...pieceList.querySelectorAll('button')];
  const visible = new Map(slots.map(button => [Number(button.dataset.piece), button.querySelector('canvas')]));
  const bins = new Map(sectionButtons.map(button => [button.dataset.section, button]));
  // Visible pieces land in their slots. Other pieces fan into their sections.
  // On large boards, animate a sample from each section to keep phones responsive.
  const bySection = SECTIONS.slice(1).flatMap(name => round.order
   .filter(piece => piece.section === name && !visible.has(piece.id)).slice(0, 14));
  const travelers = round.pieces.length <= 48 ? round.pieces :
   [...round.pieces.filter(piece => visible.has(piece.id)), ...bySection];
  const illustrated = Math.min(rect.width, rect.height) > 0;
  if (illustrated) travelers.forEach((piece, index) => {
   const canvas = document.createElement('canvas');
   canvas.width = canvas.height = 192;
   const cell = Math.max(faceWidth, faceHeight);
   const size = Math.max(1, cell * 192 / 108);
   const scale = 192 / size;
   drawPiece(canvas.getContext('2d'), piece, round.photo, round.columns, round.rows,
    (192 - faceWidth * scale) / 2, (192 - faceHeight * scale) / 2, faceWidth * scale, faceHeight * scale, true);
   const originX = rect.left + (piece.column + .5) * faceWidth;
   const originY = rect.top + (piece.row + .5) * faceHeight;
   const tile = visible.get(piece.id);
   const target = (tile || bins.get(piece.section)).getBoundingClientRect();
   const x = target.left + target.width / 2 - originX;
   const y = target.top + target.height / 2 - originY;
   const endScale = Math.min(target.width, target.height) / size * (tile ? 1 : .45);
   canvas.style.cssText = `left:${originX - size / 2}px;top:${originY - size / 2}px;width:${size}px;height:${size}px;`;
   scatter.append(canvas);
   const spin = piece.id % 2 ? -1 : 1;
   canvas.animate([
    {transform:'translate3d(0,0,0) rotate(0deg)', opacity:1},
    {transform:`translate3d(${x * .39}px,${y * .25 - 26}px,0) rotate(${spin * 9}deg) scale(${.8 + endScale * .25})`, opacity:1, offset:.48},
    {transform:`translate3d(${x}px,${y}px,0) rotate(0deg) scale(${endScale})`, opacity:tile ? 1 : 0}
   ], {duration:INTRO_SPLIT - 120, delay:index % 5 * 24, easing:'cubic-bezier(.25,.65,.28,1)', fill:'both'});
  });
  introTimer = setTimeout(startPlaying, INTRO_SPLIT);
 }

 setup.addEventListener('submit', event => {
  event.preventDefault();
  if (!source || !blueprint || start.disabled || (beforeStart && !beforeStart())) return;
  const {photo, columns, rows} = blueprint;
  const pieces = blueprint.pieces.map(piece => ({...piece, placed:false}));
  const scattered = shuffle(pieces);
  const order = SECTIONS.slice(1).flatMap(name => scattered.filter(piece => piece.section === name));
  order.forEach((piece, index) => {piece.label = index + 1;});
  round = {photo, columns, rows, pieces, order, count: 0};
  pieceList.replaceChildren();
  row = column = page = 0;
  selected = null;
  showHint();
  section = 'all';
  tray.hidden = false;
  tray.inert = true;
  dialog.dataset.phase = 'assembled';
  previewButton.disabled = true;
  hintsButton.disabled = autoButton.disabled = true;
  find('[data-new]').hidden = true;
  skip.hidden = false;
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
  setZoom(1);
  zoomOut.disabled = zoomIn.disabled = true;
  updateCursor();
  drawAssembled(board, round);
  updateTray();
  status('Study the assembled picture. The pieces will separate automatically.');
  skip.focus({preventScroll:true});
  introTimer = setTimeout(splitPuzzle, INTRO_HOLD);
  onStart?.();
 });
 skip.addEventListener('click', startPlaying);
 pieceCount.addEventListener('change', previewAssembly);
 photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  photoInput.value = '';
  if (file) void loadPhoto(file);
 });
 sampleButton.addEventListener('click', () => {void loadPhoto();});
 find('[data-new]').addEventListener('click', () => {
  stopAutoSolve();
  play.hidden = true;
  dialog.insertBefore(statusLine, scatter);
  setup.hidden = false;
  find('[data-resume]').hidden = false;
  start.focus();
  status('Choose a photo and piece count, or resume this puzzle.');
 });
 find('[data-resume]').addEventListener('click', () => {
  showBoard();
  status(round.count === round.pieces.length ? 'Puzzle complete! High fives all around.' : 'Pick a piece to keep going.');
 });
 for (const button of sectionButtons) {
  button.dataset.label = button.textContent;
  button.addEventListener('click', () => {
   section = button.dataset.section;
   page = 0;
   selected = null;
   showTarget();
   showHint();
   updateCursor();
   updateTray();
  });
 }
 prev.addEventListener('click', () => {page--; updateTray();});
 next.addEventListener('click', () => {page++; updateTray();});
 previewButton.addEventListener('click', () => setPreview(!preview));
 zoomOut.addEventListener('click', () => setZoom(zoomLevels.findLast(level => level < zoom - .035) ?? 1));
 zoomIn.addEventListener('click', () => setZoom(zoomLevels.find(level => level > zoom + .035) ?? maxZoom));
 hintsButton.addEventListener('click', () => {
  hintsOn = !hintsOn;
  hintsButton.setAttribute('aria-pressed', String(hintsOn));
  try {localStorage.setItem('avk.jigsaw.redHint', hintsOn ? '1' : '0');} catch {}
  showHint(selected, true);
  status(hintsOn ? 'Pick up a piece to see its red outline on the board.' : 'Red placement hints are off.');
 });
 autoButton.addEventListener('click', toggleAutoSolve);
 find('[data-gallery]').addEventListener('click', () => {
  if (autoSolving) {
   stopAutoSolve();
   status('Auto Solve paused. Place a piece or start Auto Solve again.');
  }
  openJigsawGallery(round?.galleryId ? {id:round.galleryId, pieces:round.count, canvas:board} : null);
 });
 find('[data-exit]').addEventListener('click', () => dialog.close());
 dialog.addEventListener('close', () => {
  sourceVersion++;
  stopAutoSolve();
  observer.disconnect();
  clearTimeout(introTimer);
  cancelAnimationFrame(animation);
  dialog.remove();
  onExit?.();
 }, {once:true});
 dialog.showModal();
 void loadPhoto();
}
