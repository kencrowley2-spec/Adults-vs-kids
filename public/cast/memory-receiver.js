import {memoryFace, memorySymbols} from './memory-faces.js';
const namespace = 'urn:x-cast:com.adultsvskids.memory';
const board = document.querySelector('#cards');
const display = document.querySelector('main');
function show(state) {
  if (!state) {
    display.className = 'idle';
    board.replaceChildren();
    document.querySelector('#scores').textContent = '';
    document.querySelector('#phase').textContent = 'Open Memory Match on your controller.';
    return;
  }
  const {cards, columns, players, points, turn, phase} = state;
  if (!Array.isArray(cards) || ![6,24].includes(cards.length) ||
      !(cards.length === 6 ? columns === 3 : [4,6].includes(columns)) ||
      !Array.isArray(players) || players.length !== 2 || !players.every(p => typeof p === 'string') ||
      !Array.isArray(points) || points.length !== 2 || !points.every(Number.isInteger) ||
      ![0,1].includes(turn) || typeof phase !== 'string' ||
      !cards.every(card => card && (card.face === null || memorySymbols.includes(card.face)))) return;
  display.className = '';
  document.querySelector('#phase').textContent = phase.endsWith('wins!') ? phase : players[turn] + ' · ' + phase;
  document.querySelector('#scores').textContent = players.map((p,i) => p + '  ' + points[i]).join('　·　');
  board.style.gridTemplateColumns = 'repeat(' + columns + ',1fr)';
  board.style.gridTemplateRows = 'repeat(' + cards.length / columns + ',minmax(0,1fr))';
  board.style.maxWidth = (columns * 78 / (cards.length / columns)) + 'vh';
  board.replaceChildren(...cards.map(({face, matched}) => {
    const card = document.createElement('div');
    card.className = matched ? 'card matched' : 'card';
    if (face) {
      card.innerHTML = memoryFace(face);
      const label = document.createElement('span');
      label.className = 'memory-label';
      label.textContent = face;
      card.append(label);
    }
    return card;
  }));
}
if (window.cast?.framework) {
  const receiver = cast.framework.CastReceiverContext.getInstance();
  receiver.addCustomMessageListener(namespace, event => {
    if (event.data?.version === 1) show(event.data.state);
  });
  receiver.start({disableIdleTimeout:true, customNamespaces:{[namespace]:cast.framework.system.MessageType.JSON}});
}
