const spotlightIds = ['ghostline', 'claw', 'lava', 'faces', 'mole', 'memory', 'draw', 'maze', 'flex'];
const wrap = (value, size) => ((value % size) + size) % size;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function mountRolodex({lobby, games, coverMarkup, openMatchup, onStep}) {
  const decks = [
    {name:'Spotlight', entries:spotlightIds.map(id => games.find(game => game.id === id)).filter(Boolean)},
    {name:'More games', entries:games.filter(game => !spotlightIds.includes(game.id))}
  ].filter(deck => deck.entries.length);
  const host = lobby.querySelector('#avk-rolodex');
  host.querySelector('.rd-content').innerHTML = `
    <div class="rd-tabs" role="group" aria-label="Choose a game deck"></div>
    <div class="rd-stage" role="group" aria-roledescription="carousel" aria-label="Rotating game covers">
      <div class="rd-cases"></div>
    </div>
    <div class="rd-controls">
      <div class="rd-turn">
        <button type="button" class="rd-prev" aria-label="Previous game">‹</button>
        <span>Swipe to spin</span>
        <button type="button" class="rd-next" aria-label="Next game">›</button>
      </div>
      <div class="rd-caption"><p></p><h2></h2></div>
      <button type="button" class="rd-open">Open matchup</button>
      <span class="rd-counter" role="status" aria-live="polite" aria-atomic="true"></span>
    </div>
    <div class="rd-options" role="group" aria-label="Game options"></div>`;
  const get = selector => host.querySelector(selector);
  const stage = get('.rd-stage'), layer = get('.rd-cases');
  const title = get('.rd-caption h2'), tag = get('.rd-caption p');
  const openButton = get('.rd-open'), status = get('.rd-counter');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const savedPositions = decks.map(() => 0);
  let active = 0, position = 0, selected = -1, width = 1, height = 1;
  let animation = null, frame = 0, gesture = null, ignoreClick = false;
  const entries = () => decks[active].entries;
  const indexAt = value => wrap(Math.round(value), entries().length);

  const tabs = decks.map((deck, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.textContent = deck.name;
    tab.addEventListener('click', () => selectDeck(index));
    get('.rd-tabs').append(tab);
    return tab;
  });
  const cards = decks.map(deck => deck.entries.map((game, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'rd-case';
    card.dataset.game = game.id;
    card.tabIndex = -1;
    card.hidden = true;
    card.setAttribute('aria-label',game.name);
    card.innerHTML = '<span class="rd-spine" aria-hidden="true"></span><span class="rd-back" aria-hidden="true"></span><span class="rd-face"><span class="rd-label"><span class="rd-case-title"></span></span><span class="rd-contacts" aria-hidden="true"></span></span>';
    const source = document.createElement('template');
    source.innerHTML = coverMarkup(game);
    const art = source.content.querySelector('.cover-art');
    art.classList.add('rd-art');
    const img = art.querySelector('img');
    if (img) {
      img.draggable = false;
      if (game.id === 'ghostline') img.srcset = '/assets/display/ghostline-cover.webp 600w, /assets/ghostline-gt.webp 1000w';
      if (game.id === 'flex') img.srcset = '/assets/display/flex-cover.webp 480w, /assets/flex-off-cover-960.webp 960w, /assets/flex-off-cover.webp 1448w';
      if (img.srcset) img.sizes = '(max-width: 640px) 61vw, 370px';
    }
    card.querySelector('.rd-label').prepend(art);
    card.querySelector('.rd-case-title').textContent = game.name;
    card.addEventListener('click', event => {
      if (event.detail && ignoreClick) return;
      activateCard(index);
    });
    layer.append(card);
    return card;
  }));

  function updateCaption(index) {
    const game = entries()[index];
    title.textContent = game.name;
    tag.textContent = game.tag;
    openButton.disabled = !!game.comingSoon;
    openButton.textContent = game.comingSoon ? 'Coming soon' : 'Open matchup';
  }
  function announce() {
    const index = indexAt(position);
    const front = cards[active][index];
    if (layer.contains(document.activeElement) && document.activeElement !== front) {
      front.focus({preventScroll:true});
    }
    status.textContent = (index + 1) + ' / ' + entries().length + ' · ' + entries()[index].name;
  }
  function paint() {
    const count = entries().length, centered = indexAt(position);
    // Five prominent cases follow the same shallow, overlapping orbit as the tee rack.
    // The remaining games exchange places at the back, out of view.
    const slots = Math.min(8, count);
    const radius = width * .335;
    const lift = Math.min(width * .24, height * .29, 155);
    cards[active].forEach((card, index) => {
      const offset = wrap(index - position + count/2, count) - count/2;
      if (Math.abs(offset) >= slots/2) {
        if (!card.hidden) {
          card.hidden = true;
          card.classList.remove('rd-front');
          card.tabIndex = -1;
        }
        return;
      }
      if (card.hidden) card.hidden = false;
      const angle = offset * 2 * Math.PI / slots;
      const side = Math.sin(angle), depth = (Math.cos(angle) + 1) / 2;
      const scale = .46 + .54 * depth * depth;
      const x = Math.sign(side) * Math.abs(side) ** 1.38 * radius, y = (depth - 1) * lift;
      const yaw = -side * 42 - 5 * depth;
      card.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale.toFixed(4)}) perspective(800px) rotateY(${yaw.toFixed(2)}deg) rotateX(-2deg)`;
      card.style.zIndex = String(Math.round(depth * 1000));
      card.style.opacity = String(clamp((slots/2-Math.abs(offset)) * 2,0,1));
      card.style.setProperty('--shade', String(.64 * (1-depth)));
      card.tabIndex = index === centered ? 0 : -1;
      card.classList.toggle('rd-front', index === centered);
    });
    if (centered !== selected) {
      if (selected !== -1) onStep();
      selected = centered;
      updateCaption(centered);
    }
  }
  function render(now) {
    frame = 0;
    if (animation) {
      const t = clamp((now-animation.start)/animation.duration,0,1);
      position = animation.from + (animation.to-animation.from) * (1-(1-t)**3);
      if (t === 1) { position = animation.to; animation = null; }
    }
    paint();
    if (animation) queuePaint();
    else if (!gesture) announce();
  }
  function queuePaint() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    animation = null;
  }
  function settle(to, duration = 260) {
    stop();
    to = Math.round(to);
    if (reduced.matches || Math.abs(to-position) < .001) {
      position = to;
      paint(); announce();
      return;
    }
    animation = {from:position, to, start:performance.now(), duration};
    queuePaint();
  }
  function openSelected() {
    stop();
    position = Math.round(position);
    paint(); announce();
    const game = entries()[indexAt(position)];
    if (!game.comingSoon) openMatchup(game);
  }
  function activateCard(index) {
    if (index === indexAt(position)) { openSelected(); return; }
    const count = entries().length;
    settle(position + wrap(index-position+count/2,count)-count/2);
  }
  function selectDeck(deck) {
    stop();
    gesture = null;
    for (const card of cards[active]) {
      card.hidden = true;
      card.classList.remove('rd-front');
      card.tabIndex = -1;
    }
    savedPositions[active] = Math.round(position);
    active = deck;
    position = savedPositions[deck];
    selected = -1;
    tabs.forEach((tab,i) => tab.setAttribute('aria-pressed',String(i===active)));
    paint(); announce();
  }
  function step(direction) { settle(Math.round(animation?.to ?? position)+direction); }
  get('.rd-prev').addEventListener('click', () => step(-1));
  get('.rd-next').addEventListener('click', () => step(1));
  openButton.addEventListener('click',openSelected);
  host.addEventListener('keydown',event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    step(event.key==='ArrowRight' ? 1 : -1);
  });

  stage.addEventListener('pointerdown',event => {
    if (!event.isPrimary || event.button !== 0) return;
    const catching = !!animation && Math.abs(animation.to-position) > .25;
    stop();
    ignoreClick = false;
    gesture = {id:event.pointerId,x:event.clientX,y:event.clientY,from:position,
      lastX:event.clientX,lastTime:event.timeStamp,speed:0,dragged:false,catching,
      card:event.target.closest('.rd-case'),pitch:clamp(width*.14,38,78)};
    stage.setPointerCapture(event.pointerId);
  });
  function track(event) {
    const dx = event.clientX-gesture.x;
    if (!gesture.dragged) {
      if (Math.abs(dx) <= 4 || Math.abs(dx) < Math.abs(event.clientY-gesture.y)) return;
      gesture.dragged = true;
    }
    const elapsed = event.timeStamp-gesture.lastTime;
    if (elapsed > 0) {
      const speed = (gesture.lastX-event.clientX)/gesture.pitch/elapsed;
      gesture.speed += (speed-gesture.speed) * (1-Math.exp(-elapsed/38));
      gesture.lastTime = event.timeStamp;
      gesture.lastX = event.clientX;
    }
    position = gesture.from - dx/gesture.pitch;
    queuePaint();
  }
  stage.addEventListener('pointermove',event => { if (gesture?.id === event.pointerId) track(event); });
  function release(event) {
    if (gesture?.id !== event.pointerId) return;
    const cancelled = event.type !== 'pointerup';
    if (!cancelled && event.clientX !== gesture.lastX) track(event);
    const drag = gesture;
    gesture = null;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    // Capture keeps fast swipes continuous. Resolve taps from the original hit object.
    ignoreClick = true;
    if (!cancelled && !drag.dragged && !drag.catching && drag.card) {
      activateCard(cards[active].indexOf(drag.card));
      return;
    }
    const age = Math.max(0,event.timeStamp-drag.lastTime);
    // A finger lifts between display frames. Treat the first frame interval as part of the flick.
    const speed = drag.speed * Math.exp(-Math.max(0,age-32)/38);
    const glide = cancelled || reduced.matches || Math.abs(speed)<.003 ? 0 : clamp(speed*195,-5,5);
    const destination = Math.round(position+glide);
    const duration = glide ? clamp(3*Math.abs(destination-position)/Math.abs(speed),190,500) : 260;
    settle(destination,duration);
  }
  stage.addEventListener('pointerup',release);
  stage.addEventListener('pointercancel',release);
  stage.addEventListener('lostpointercapture',release);
  const options = get('.rd-options');
  for (const id of ['cabinet-pinball','choose-arcade-players','cabinet-fx']) {
    const control = document.getElementById(id);
    if (control) options.append(control);
  }
  const fit = () => {
    width = stage.clientWidth || 1;
    height = stage.clientHeight || 1;
    queuePaint();
  };
  width = stage.clientWidth || 1;
  height = stage.clientHeight || 1;
  selectDeck(0);
  new ResizeObserver(fit).observe(stage);
  if (location.hash === '#cabinet-pinball') document.getElementById('cabinet-pinball')?.focus();
  return host;
}
