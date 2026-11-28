const spotlightIds = ['ghostline', 'claw', 'lava', 'faces', 'mole', 'memory', 'draw', 'maze', 'flex'];
const wrap = (value, size) => ((value % size) + size) % size;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function mountRolodex({lobby, games, coverMarkup, openMatchup}) {
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
        <button type="button" class="rd-auto" aria-label="Automatic rotation"><span aria-hidden="true"></span></button>
      </div>
      <div class="rd-caption"><p></p><h2></h2></div>
      <button type="button" class="rd-open">Open matchup</button>
      <span class="rd-counter" role="status" aria-live="polite" aria-atomic="true"></span>
    </div>
    <div class="rd-options" role="group" aria-label="Game options"><button class="rd-music" type="button">Play music</button></div>`;
  const get = selector => host.querySelector(selector);
  const stage = get('.rd-stage'), layer = get('.rd-cases');
  const title = get('.rd-caption h2'), tag = get('.rd-caption p');
  const openButton = get('.rd-open'), status = get('.rd-counter');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const autoButton = get('.rd-auto');
  const resumeDelay = 2800, cardTravelTime = 4200;
  let autoChoice = null, autoMoving = false, autoVelocity = 0, resumeTimer = 0;
  let heldPointer = null, keyboardBrowsing = false;
  const savedPositions = decks.map(() => 0);
  let active = 0, position = 0, selected = -1, width = 1, height = 1, cardWidth = 0;
  let destination = null, frame = 0, frameTime = 0, velocity = 0;
  let gesture = null, ignoreClick = false;
  // Speeds are measured in cartridges per millisecond, independent of refresh rate.
  const maxSpeed = .0048, settleTime = 78;
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
    card.innerHTML = '<span class="rd-spine" aria-hidden="true"></span><span class="rd-back" aria-hidden="true"></span><span class="rd-face"><span class="rd-label"><span class="rd-case-title"></span></span><span class="rd-contacts" aria-hidden="true"></span><span class="rd-shade" aria-hidden="true"></span></span>';
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

  const shades = cards.map(deck => deck.map(card => card.querySelector('.rd-shade')));

  // Measure once so a long name can fit a narrow phone without resizing the moving stage.
  const ruler = document.createElement('canvas').getContext('2d');
  const titleWidths = new Map();
  if (ruler) {
    ruler.font = '800 100px Arial,sans-serif';
    for (const game of decks.flatMap(deck => deck.entries)) {
      titleWidths.set(game.id, (ruler.measureText(game.name).width / 100 - .05*(game.name.length-1) + .15).toFixed(2));
    }
  }
  function updateCaption(index) {
    const game = entries()[index];
    title.textContent = game.name;
    title.style.setProperty('--title-ems',titleWidths.get(game.id) ?? '1');
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
    const middleX = radius * Math.sin(Math.PI/slots) ** 1.38;
    const clearance = Math.max(0, cardWidth*.39-middleX);
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
      // Turn the two passing cases edgeward, then tuck them back into their resting fan.
      const passing = Math.abs(offset)<1 ? Math.sign(offset)*Math.sin(Math.PI*offset)**2 : 0;
      const x = Math.sign(side)*Math.abs(side)**1.38*radius + passing*clearance;
      const y = (depth - 1)*lift;
      const yaw = -side*42 - 5*depth - passing*18;
      const z = depth * radius * 2;
      card.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) scale(${scale.toFixed(4)}) perspective(800px) rotateY(${yaw.toFixed(2)}deg) rotateX(-2deg)`;
      card.style.opacity = String(clamp((slots/2-Math.abs(offset)) * 2,0,1));
      shades[active][index].style.opacity = (.64 * (1-depth)).toFixed(3);
    });
    if (centered !== selected) {
      if (selected !== -1) {
        cards[active][selected].tabIndex = -1;
        cards[active][selected].classList.remove('rd-front');
      }
      cards[active][centered].tabIndex = 0;
      cards[active][centered].classList.add('rd-front');
      selected = centered;
      updateCaption(centered);
    }
  }
  function updateRotation(delay = 0) {
    clearTimeout(resumeTimer);
    autoMoving = false;
    autoVelocity = 0;
    const enabled = autoChoice ?? !reduced.matches;
    autoButton.setAttribute('aria-pressed',String(enabled));
    autoButton.title = enabled ? 'Pause automatic rotation' : 'Start automatic rotation';
    if (!enabled || heldPointer !== null || keyboardBrowsing || document.hidden ||
        lobby.hidden || document.querySelector('dialog[open]') || entries().length < 2) return;
    if (delay) {
      resumeTimer = setTimeout(updateRotation,delay);
    } else {
      autoMoving = true;
      queuePaint();
    }
  }
  function render(now) {
    frame = 0;
    // Discard long gaps after a stalled or backgrounded frame instead of jumping ahead.
    const dt = clamp(now-frameTime,1,34);
    frameTime = now;
    if (gesture?.dragged) {
      const remaining = gesture.target-position;
      const change = clamp(remaining * -Math.expm1(-dt/24),-maxSpeed*dt,maxSpeed*dt);
      velocity = change/dt;
      position = Math.abs(remaining) < .001 ? gesture.target : position+change;
    } else if (destination !== null) {
      // Ease out from the displayed velocity without overshooting the destination.
      const offset = position-destination;
      const slope = velocity+offset/settleTime;
      const decay = Math.exp(-dt/settleTime);
      const next = destination+(offset+slope*dt)*decay;
      const change = clamp(next-position,-maxSpeed*dt,maxSpeed*dt);
      velocity = clamp((velocity-slope*dt/settleTime)*decay,-maxSpeed,maxSpeed);
      position += change;
      if (Math.abs(position-destination) < .003 && Math.abs(velocity) < .00006) {
        position = destination;
        destination = null;
        velocity = 0;
      }
    } else if (autoMoving && !gesture) {
      autoVelocity += (1/cardTravelTime-autoVelocity) * -Math.expm1(-dt/360);
      position = wrap(position + autoVelocity*dt,entries().length);
    }
    paint();
    if (autoMoving || destination !== null || (gesture?.dragged && position !== gesture.target)) queuePaint();
    else {
      frameTime = 0;
      if (!gesture) announce();
    }
  }
  function queuePaint() {
    if (!frame) {
      if (!frameTime) frameTime = performance.now();
      frame = requestAnimationFrame(render);
    }
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    frameTime = 0;
    destination = null;
  }
  function settle(to) {
    stop();
    if (reduced.matches || Math.abs(to-position) < .001) {
      position = to;
      velocity = 0;
      paint(); announce();
      return;
    }
    const distance = to-position;
    const direction = Math.sign(distance);
    velocity = direction*clamp(velocity*direction,0,Math.abs(distance)/settleTime);
    destination = to;
    queuePaint();
  }
  function openSelected() {
    stop();
    velocity = 0;
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
    savedPositions[active] = position;
    active = deck;
    position = savedPositions[deck];
    velocity = 0;
    selected = -1;
    tabs.forEach((tab,i) => tab.setAttribute('aria-pressed',String(i===active)));
    paint(); announce();
  }
  function step(direction) { settle(Math.round(destination ?? position)+direction); }
  get('.rd-prev').addEventListener('click', () => step(-1));
  get('.rd-next').addEventListener('click', () => step(1));
  openButton.addEventListener('click',openSelected);
  autoButton.addEventListener('click',() => {
    autoChoice = !(autoChoice ?? !reduced.matches);
    keyboardBrowsing = false;
    updateRotation();
  });
  host.addEventListener('focusin',event => {
    if (heldPointer === null && event.target.matches(':focus-visible')) {
      keyboardBrowsing = true;
      updateRotation();
    }
  });
  host.addEventListener('focusout',event => {
    if (!host.contains(event.relatedTarget)) {
      keyboardBrowsing = false;
      updateRotation(resumeDelay);
    }
  });
  host.addEventListener('keydown',event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    keyboardBrowsing = true;
    updateRotation();
    event.preventDefault();
    step(event.key==='ArrowRight' ? 1 : -1);
  });

  // Freeze the displayed game on contact, including while the matchup button is held.
  host.addEventListener('pointerdown',event => {
    if (!event.isPrimary || event.button !== 0) return;
    heldPointer = event.pointerId;
    keyboardBrowsing = false;
    updateRotation();
  },true);
  function endHold(event) {
    if (heldPointer !== event.pointerId) return;
    heldPointer = null;
    updateRotation(resumeDelay);
  }
  document.addEventListener('pointerup',endHold,true);
  document.addEventListener('pointercancel',endHold,true);
  stage.addEventListener('lostpointercapture',endHold);
  stage.addEventListener('pointerdown',event => {
    if (!event.isPrimary || event.button !== 0) return;
    const catching = destination !== null && Math.abs(destination-position) > .04;
    stop();
    ignoreClick = false;
    velocity = 0;
    gesture = {id:event.pointerId,x:event.clientX,y:event.clientY,from:position,target:position,
      lastX:event.clientX,lastTime:event.timeStamp,speed:0,dragged:false,catching,
      card:event.target.closest('.rd-case'),pitch:clamp(width*.29,88,165)};
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
    gesture.target = gesture.from - dx/gesture.pitch;
    if (reduced.matches) position = gesture.target;
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
    if (cancelled || !drag.dragged) {
      stop();
      velocity = 0;
      paint(); announce();
      return;
    }
    // A swipe can rest between covers. Only an explicit arrow or side-card tap centers a game.
    const age = Math.max(0,event.timeStamp-drag.lastTime);
    const speed = drag.speed * Math.exp(-Math.max(0,age-32)/38);
    const glide = reduced.matches ? 0 : clamp(speed*60,-.35,.35);
    settle(position + clamp(drag.target-position+glide,-.75,.75));
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
    if (!stage.clientWidth || !stage.clientHeight) return;
    width = stage.clientWidth;
    height = stage.clientHeight;
    cardWidth = cards[active][indexAt(position)].offsetWidth;
    queuePaint();
  };
  width = stage.clientWidth || 1;
  height = stage.clientHeight || 1;
  selectDeck(0);
  const music = get('#rolodex-music');
  const musicButton = get('.rd-music');
  let musicEnabled = true;
  music.volume = 1;
  music.muted = false;
  function syncMusic() {
    if (!musicEnabled || document.hidden || lobby.hidden || document.querySelector('dialog[open]')) {
      music.pause();
    } else if (music.paused) {
      music.play().catch(() => {});
    }
  }
  function showMusicState() {
    musicButton.textContent = music.paused ? 'Play music' : 'Pause music';
  }
  music.addEventListener('play', showMusicState);
  music.addEventListener('pause', showMusicState);
  musicButton.addEventListener('click', () => {
    musicEnabled = music.paused;
    syncMusic();
  });
  function unlockMusic(event) {
    if (event.target !== musicButton) syncMusic();
  }
  for (const event of ['pointerup', 'keydown', 'click']) {
    document.addEventListener(event, unlockMusic, true);
  }
  window.addEventListener('pagehide', () => music.pause());
  window.addEventListener('pageshow', syncMusic);
  showMusicState();
  syncMusic();
  function roomChanged() {
    syncMusic();
    if (document.hidden || lobby.hidden || document.querySelector('dialog[open]')) {
      heldPointer = gesture = null;
      stop();
      velocity = 0;
    }
    updateRotation(resumeDelay);
  }
  const visibility = new MutationObserver(roomChanged);
  visibility.observe(lobby,{attributes:true,attributeFilter:['hidden']});
  visibility.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',roomChanged);
  reduced.addEventListener('change',() => {
    if (reduced.matches && autoChoice === true) autoChoice = null;
    updateRotation();
  });
  updateRotation();
  new ResizeObserver(fit).observe(stage);
  if (location.hash === '#cabinet-pinball') document.getElementById('cabinet-pinball')?.focus();
  return host;
}
