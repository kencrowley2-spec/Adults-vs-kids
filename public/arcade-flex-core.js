export const FLEX_CARDS = [
  ['flamingo', 'Flamingo Freeze', 'Lift one foot off the floor. Spread your arms and balance for ten seconds. Use a wall for support if you like.'],
  ['wall', 'Wall Sit', 'Stand with your back against a wall and your feet a step forward. Slide down to a comfortable height. Hold for ten seconds, then stand up.'],
  ['cross', 'Hands-Free Rise', 'Sit cross-legged on the floor. Fold your arms across your chest and try to stand up without pushing off with your hands. Use support whenever you need it.'],
  ['line', 'Tightrope Walk', 'Stretch your arms out to the sides. Take six slow steps in a straight line, placing each heel just in front of your other toes.'],
  ['taps', 'Cross-Body Taps', 'Stand tall. Lift one knee and tap it with your opposite hand. Switch sides and keep alternating for six taps.'],
  ['tiptoe', 'Tiptoe Tower', 'Stand with your feet hip-width apart. Slowly lift both heels. Balance on your toes for five seconds, then gently lower your heels.'],
  ['plane', 'Airplane Balance', 'Stretch your arms out like wings. Lean forward a little and lift one foot behind you. Hold for five seconds, then land softly.'],
  ['squat', 'Slow-Motion Squat', 'Stand with your feet comfortably apart. Reach forward and bend your knees as if sitting in a chair. Stand tall again. Try three slow squats.'],
  ['pushup', 'Wall Push-Up', 'Place both palms on a wall at shoulder height and step back a little. Bend your elbows to lean in, then press away. Try five slow wall push-ups.']
].map(([id, name, instructions], i) => ({id, name, instructions, art: i + 1}));

export function shuffleFlex(random = Math.random) {
  const deck = [...FLEX_CARDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// The arcade uses index zero for adults and one for kids.
export class FlexMatch {
  constructor(random = Math.random) {
    this.decks = [shuffleFlex(random), shuffleFlex(random)];
    this.used = [new Set(), new Set()];
    this.scores = [0, 0];
    this.turn = 0;
    this.active = null;
  }
  get selector() { return (this.turn + 1) % 2; }
  get done() { return this.turn === FLEX_CARDS.length * 2; }
  get winner() {
    if (!this.done || this.scores[0] === this.scores[1]) return null;
    return this.scores[0] > this.scores[1] ? 0 : 1;
  }
  select(id) {
    const team = this.selector;
    const card = this.decks[team].find(card => card.id === id);
    if (!card || this.done || this.active || this.used[team].has(id)) throw Error('Card unavailable');
    this.active = card;
    return card;
  }
  record(tried) {
    if (!this.active || typeof tried !== 'boolean') throw Error('No attempt to score');
    this.used[this.selector].add(this.active.id);
    this.scores[this.selector] += tried ? 1 : -1;
    this.turn++;
    this.active = null;
  }
}
