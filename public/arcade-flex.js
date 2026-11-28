import {FlexMatch} from './arcade-flex-core.js?v=2';
import {flexAudio} from './arcade-flex-audio.js?v=2';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button = (action, label, style = '') => `<button type="button" class="fx-btn ${style}" data-flex="${action}">${label}</button>`;

export function mountFlex({players = ['Adults','Kids'], onExit = () => {}, onComplete = () => {}, beforeRematch = () => true, initialSound = true} = {}) {
  const host = document.createElement('section');
  host.className = 'flex-game';
  host.setAttribute('aria-label', 'Flex Off! Harper’s Gymnastics Challenge');
  const oldOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.body.append(host);
  let match, closed = false, sound = initialSound, notice = '';
  const names = [...players];
  const audio = flexAudio(sound);
  document.addEventListener('visibilitychange', audio.visibility);
  host.innerHTML = `<div class="fx-shell"><header class="fx-head">${button('exit','‹ Arcade','quiet')}<div><small>ADULTS vs. KIDS™</small><strong>FLEX <i>OFF!</i></strong></div>${button('sound', sound ? 'Sound on' : 'Sound off','quiet')}</header><div class="fx-main"></div><footer>Original game idea by <b>Harper Crowley</b></footer></div>`;
  const main = host.querySelector('.fx-main');
  function focusTitle() { main.querySelector('h1')?.focus({preventScroll:true}); }
  function dialog(contents, label) {
    const el = document.createElement('dialog');
    el.className = 'fx-dialog';
    el.setAttribute('aria-label', label);
    el.innerHTML = contents;
    host.append(el);
    el.showModal();
    return el;
  }
  function scoreboard() {
    return `<div class="fx-scores">${[1,0].map(i => `<div><span>${esc(names[i])}</span><b>${match.scores[i]}</b></div>`).join('')}</div>`;
  }
  function board() {
    const team = match.selector, used = match.used[team];
    main.innerHTML = `${scoreboard()}<div class="fx-title"><small>CARD ${used.size+1} OF 9 · TEAM ${team ? 'KIDS' : 'ADULTS'}</small><h1 tabindex="-1">${esc(names[team])}, flip a card!</h1><p aria-live="polite">${notice || 'Give the move a try to earn a point.'}</p></div><div class="fx-grid">${match.decks[team].map((c,i) => {
      if (used.has(c.id)) return '<span class="fx-card" style="visibility:hidden" aria-hidden="true"></span>';
      return `<button class="fx-card tint-${i}" data-card="${c.id}" ${match.active && match.active !== c ? 'disabled' : ''} aria-label="Flip card ${i+1}"><span class="fx-pip">${String(i+1).padStart(2,'0')}</span><b>?</b><span>FLEX OFF!</span></button>`;
    }).join('')}</div>`;
    focusTitle();
  }
  function reveal(c) {
    const modal = dialog(`<div class="fx-demo tint-${c.art-1}"><img src="/assets/flex/${c.art}.webp" alt="${esc(c.name)} demonstration"></div><div class="fx-copy"><small>${esc(names[match.selector])}’S CHALLENGE</small><h2>${c.name}</h2><p>${c.instructions}</p>${button('replay','↻ Hear the challenge','listen')}<div class="fx-choices">${button('tried','I tried it <b>+1</b>')}${button('pass','Pass <b>−1</b>','pass')}</div></div>`, c.name);
    modal.addEventListener('cancel', e => { if (!match.active) { e.preventDefault(); return; } audio.stopVoice(); modal.remove(); board(); }, {once:true});
    audio.say(c);
  }
  function finish() {
    audio.stop();
    const winner = match.winner;
    main.innerHTML = `<div class="fx-finish"><span aria-hidden="true">🏆</span><small>NINE CHALLENGES COMPLETE</small><h1 tabindex="-1">${winner === null ? 'Shared victory!' : esc(names[winner])+' wins!'}</h1>${scoreboard()}${button('again','Play again')}${button('leave','Back to arcade','quiet')}</div>`;
    focusTitle();
    onComplete({winner, scores:[...match.scores], rounds:9});
  }
  function start() { match = new FlexMatch(); notice = ''; board(); audio.start(); }
  function dispose() {
    if (closed) return;
    closed = true;
    document.removeEventListener('visibilitychange', audio.visibility);
    audio.dispose();
    host.remove();
    document.body.style.overflow = oldOverflow;
  }
  main.innerHTML = `<div class="fx-setup"><img src="/assets/flex-off-cover.webp" alt="Harper’s Gymnastics Challenge"><form><small>HARPER’S GYMNASTICS CHALLENGE</small><h1>Ready to flex?</h1><p>Take turns flipping cards. Both players get all nine moves. Trying earns a point. Passing costs a point.</p>${[1,0].map(i => `<label>Team ${i ? 'Kids' : 'Adults'}<input name="team${i}" maxlength="60" required value="${esc(names[i])}"></label>`).join('')}<p class="fx-tip">Make some room. Use support if you need it. A partial attempt counts.</p><button class="fx-btn" type="submit">Let’s flex!</button></form></div>`;
  main.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    for (const i of [0,1]) names[i] = e.target.elements['team'+i].value.trim() || (i ? 'Kids' : 'Adults');
    start();
  });
  host.addEventListener('click', async e => {
    const target = e.target.closest('button');
    if (!target || target.disabled) return;
    if (target.dataset.card) {
      const c = match.active || match.select(target.dataset.card);
      reveal(c);
      return;
    }
    const action = target.dataset.flex;
    if (action === 'tried' || action === 'pass') {
      if (!match?.active) return;
      const tried = action === 'tried';
      notice = esc(names[match.selector]) + (tried ? ' tried it! +1 point.' : ' passed. −1 point.');
      audio.stopVoice();
      const modal = target.closest('dialog');
      match.record(tried);
      modal.inert = true;
      if (modal.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const flip = modal.animate([
          {transform:'perspective(900px) rotateY(0deg)', opacity:1},
          {transform:'perspective(900px) rotateY(90deg)', opacity:0}
        ], {duration:220, easing:'ease-in', fill:'forwards'});
        await flip.finished.catch(() => {});
      }
      if (closed) return;
      modal.remove();
      if (match.done) finish(); else board();
    } else if (action === 'replay') {
      sound = true;
      host.querySelector('[data-flex="sound"]').textContent = 'Sound on';
      audio.mute(false);
      audio.say(match.active);
    } else if (action === 'sound') {
      sound = !sound;
      target.textContent = sound ? 'Sound on' : 'Sound off';
      audio.mute(!sound);
    } else if (action === 'again' && beforeRematch()) start();
    else if (action === 'leave' || (action === 'exit' && (!match || match.done))) { dispose(); onExit(); }
    else if (action === 'exit') {
      const modal = dialog(`<div class="fx-copy"><h2>Leave this match?</h2><p>Your current score will reset.</p><div class="fx-choices">${button('stay','Keep playing')}${button('leave','Leave game','pass')}</div></div>`, 'Leave this match?');
      modal.addEventListener('close', () => modal.remove(), {once:true});
    } else if (action === 'stay') target.closest('dialog').close();
  });
  return dispose;
}
