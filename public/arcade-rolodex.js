const spotlightIds = ['ghostline', 'claw', 'lava', 'faces', 'mole', 'memory', 'draw', 'maze', 'flex'];
const names = ['Spotlight', 'More games'];
const wrap = (value, size) => ((value % size) + size) % size;

export function mountRolodex({lobby, games, coverMarkup, openMatchup}) {
  const shelves = [
    spotlightIds.map(id => games.find(game => game.id === id)).filter(Boolean),
    games.filter(game => !spotlightIds.includes(game.id))
  ].filter(list => list.length);
  const host = document.createElement('section');
  host.id = 'avk-rolodex';
  host.setAttribute('aria-label', 'Arcade Game Rolodex');
  host.innerHTML = `
    <div class="rd-heading">
      <img src="/assets/brand-logo-320.webp" alt="Adults vs. Kids" width="88" height="58">
      <h1>Game Rolodex</h1><span class="rd-preview">Preview</span>
    </div>
    <div class="rd-tabs" role="group" aria-label="Choose a game deck"></div>
    <div class="rd-stage" role="group" aria-roledescription="carousel" aria-label="Rotating game covers">
      <div class="rd-room" aria-hidden="true"></div>
      <div class="rd-aura" aria-hidden="true"></div>
      <svg class="rd-power" viewBox="0 0 960 390" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="rd-wire"><stop stop-color="#53deff" stop-opacity=".05"/><stop offset=".22" stop-color="#80edff"/><stop offset=".48" stop-color="#ffe99b"/><stop offset=".8" stop-color="#52e3ff"/><stop offset="1" stop-color="#27bfff" stop-opacity=".12"/></linearGradient>
        </defs>
        <g class="rd-rails" fill="none" stroke="url(#rd-wire)">
          <ellipse cx="480" cy="121" rx="362" ry="33"/><ellipse cx="480" cy="125" rx="362" ry="33"/>
          <ellipse cx="480" cy="288" rx="441" ry="63"/><ellipse cx="480" cy="293" rx="441" ry="64"/>
          <ellipse cx="480" cy="310" rx="365" ry="51" stroke-dasharray="15 7 3 7"/>
        </g>
        <g class="rd-electric" fill="none" stroke="url(#rd-wire)" stroke-linejoin="round"></g>
      </svg>
      <div class="rd-cases"></div>
    </div>
    <div class="rd-controls">
      <div class="rd-turn">
        <button type="button" class="rd-prev" aria-label="Previous game">‹</button>
        <span class="rd-counter"></span>
        <button type="button" class="rd-next" aria-label="Next game">›</button>
      </div>
      <div class="rd-caption" role="status" aria-live="polite" aria-atomic="true">
        <p></p><h2></h2>
      </div>
      <button type="button" class="rd-open">Open matchup</button>
    </div>
    <div class="rd-hint">Swipe to spin · Tap the front cover to open</div>`;
  const get = selector => host.querySelector(selector);
  const stage = get('.rd-stage');
  const layer = get('.rd-cases');
  const openButton = get('.rd-open');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const positions = shelves.map(() => 0);
  let active = 0, target = 0, frame = 0, lastTime = 0, gesture = null, blockClick = false;
  const tabs = shelves.map((list, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.textContent = names[index];
    tab.addEventListener('click', () => selectDeck(index));
    get('.rd-tabs').append(tab);
    return tab;
  });
  const shelfCards = shelves.map((list, deck) => list.map((game, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rd-case';
    button.dataset.game = game.id;
    const source = document.createElement('template');
    source.innerHTML = coverMarkup(game);
    const image = source.content.querySelector('.cover-art');
    image.classList.add('rd-art');
    for (const img of image.querySelectorAll('img')) {
      img.draggable = false;
      if (img.srcset) img.sizes = '(max-width: 650px) 57vw, 370px';
    }
    const label = document.createElement('span');
    label.className = 'rd-case-title';
    label.textContent = game.name;
    button.append(image, label);
    button.setAttribute('aria-label', game.name);
    button.addEventListener('click', () => {
      if (blockClick) return;
      if (deck !== active) selectDeck(deck, index);
      else if (wrap(Math.round(positions[active]), list.length) === index) openSelected();
      else spinToIndex(index);
    });
    layer.append(button);
    return button;
  }));

  // Two grounded conductors and branching traces on either side of the rotating decks.
  const lightning = get('.rd-electric');
  const traces = [
    '12,121 69,119 88,105 99,111 120,86 115,111 148,99 130,119 173,117',
    '44,269 90,258 112,238 120,248 147,209 133,246 160,237 129,273 153,263 140,282',
    '96,320 149,309 165,296 157,312 190,302 181,318 218,315',
    '72,164 98,155 96,143 112,138 119,118',
    '131,249 107,267 101,268 84,288'
  ];
  for (const flip of [false, true]) {
    traces.forEach((points, index) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('points', points);
      if (flip) line.setAttribute('transform', 'translate(960 9) scale(-1 1)');
      if (index > 2) line.setAttribute('opacity', '.5');
      lightning.append(line);
    });
  }
  const indexOf = (deck) => wrap(Math.round(positions[deck]), shelves[deck].length);

  function updateSelection() {
    const i = indexOf(active), selected = shelves[active][i];
    get('.rd-counter').textContent = (i + 1) + ' / ' + shelves[active].length;
    get('.rd-caption p').textContent = selected.tag;
    get('.rd-caption h2').textContent = selected.name;
    openButton.disabled = !!selected.comingSoon;
    openButton.textContent = selected.comingSoon ? 'Coming soon' : 'Open matchup';
    tabs.forEach((tab, d) => tab.setAttribute('aria-pressed', String(d === active)));
  }
  function openSelected() {
    const selected = shelves[active][indexOf(active)];
    if (!selected.comingSoon) openMatchup(selected);
  }
  function draw() {
    const width = stage.clientWidth, height = stage.clientHeight;
    shelfCards.forEach((cards, deck) => {
      const main = deck === active;
      const radius = Math.min(width * (main ? .49 : .35), main ? 420 : 315);
      cards.forEach((card, index) => {
        const theta = (index - positions[deck]) * Math.PI * 2 / cards.length;
        const depth = (Math.cos(theta) + 1) / 2;
        const x = Math.sin(theta) * radius;
        const y = height * (main ? .39 + .23 * depth : .10 + .11 * depth);
        const scale = main ? .35 + .65 * depth ** 1.8 : .21 + .19 * depth;
        const front = main && indexOf(deck) === index;
        card.style.transform = 'translate(-50%, -50%) translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) perspective(850px) rotateY(' + (-Math.sin(theta) * 48).toFixed(2) + 'deg) scale(' + scale.toFixed(4) + ')';
        card.style.zIndex = String((main ? 130 : 2) + Math.round(depth * 100));
        card.style.setProperty('--rd-shade', String((1-depth) * .60 + (main ? 0 : .22)));
        card.classList.toggle('rd-front', front);
        card.tabIndex = front ? 0 : -1;
      });
    });
  }
  function animate(now) {
    const distance = target - positions[active];
    const elapsed = Math.min(50, now - lastTime || 16);
    lastTime = now;
    if (Math.abs(distance) < .002 || reduced.matches) {
      positions[active] = target;
      draw(); updateSelection(); frame = 0;
      return;
    }
    positions[active] += distance * (1 - Math.exp(-elapsed / 68));
    draw(); frame = requestAnimationFrame(animate);
  }
  function move(to) {
    target = to;
    if (!frame) { lastTime = 0; frame = requestAnimationFrame(animate); }
  }
  function spinToIndex(index) {
    const size = shelves[active].length;
    move(target + wrap(index - target + size / 2, size) - size / 2);
  }
  function selectDeck(deck, index) {
    cancelAnimationFrame(frame); frame = 0;
    positions[active] = Math.round(positions[active]);
    active = deck;
    positions[deck] = index ?? Math.round(positions[deck]);
    target = positions[deck];
    draw(); updateSelection();
  }
  get('.rd-prev').addEventListener('click', () => move(Math.round(target) - 1));
  get('.rd-next').addEventListener('click', () => move(Math.round(target) + 1));
  openButton.addEventListener('click', openSelected);
  host.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(Math.round(target) + (event.key === 'ArrowRight' ? 1 : -1));
  });
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    blockClick = false;
    cancelAnimationFrame(frame); frame = 0;
    gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, start:positions[active], moved:false};
  });
  stage.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
      gesture.moved = true;
      stage.setPointerCapture(event.pointerId);
    }
    positions[active] = gesture.start - dx / Math.min(155, stage.clientWidth * .26);
    draw();
  });
  function finish(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (gesture.moved) {
      blockClick = true;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      move(Math.round(positions[active]));
      setTimeout(() => { blockClick = false; }, 0);
    } else move(Math.round(positions[active]));
    gesture = null;
  }
  stage.addEventListener('pointerup', finish);
  stage.addEventListener('pointercancel', finish);
  stage.addEventListener('pointerleave', event => { if (gesture && !gesture.moved) finish(event); });
  lobby.prepend(host);
  new ResizeObserver(draw).observe(stage);
  draw(); updateSelection();
  return host;
}
