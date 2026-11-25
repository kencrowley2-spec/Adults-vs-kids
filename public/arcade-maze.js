import {makeMaze} from './arcade-new-core.js?v=5';

// Curated seeds keep each route repeatable and give every board a similar finish distance.
export const MAZE_BOARDS = [
  ['Neon Foundry', 6, '#50f5e0', '#216868', '#0b202a', '#132f39'],
  ['Lava Vault', 13, '#ff9061', '#8f3a22', '#2d1314', '#401d1b'],
  ['Glacier Run', 25, '#a4e4ff', '#386ba7', '#131f3b', '#1e3353'],
  ['Emerald Ruins', 21, '#9eec73', '#4e7835', '#18261a', '#243923'],
  ['Midnight Metro', 1, '#c2a5ff', '#594597', '#201831', '#2f2144'],
  ['Golden Citadel', 15, '#ffd768', '#866124', '#302515', '#43331b'],
  ['Coral Station', 18, '#ff9fcd', '#963f6b', '#311528', '#432039'],
  ['Storm Circuit', 11, '#82aaff', '#344e9c', '#121b31', '#1e2b4c'],
  ['Sunset Canyon', 22, '#ffb37b', '#975b33', '#351d17', '#4a2a20'],
  ['Phantom Lab', 26, '#e2ecff', '#57647f', '#202735', '#303a49'],
  ['Acid Garden', 12, '#d7f76f', '#647a2d', '#222b15', '#303b1d'],
  ['Ruby Reactor', 34, '#ff8396', '#953448', '#30151c', '#472129'],
];

export function mazeBoard(index) {
  const [name, seed, edge, wall, floor, tile] = MAZE_BOARDS[index];
  let state = seed * 65537;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return {...makeMaze(6, random), index, name, edge, wall, floor, tile};
}

export const MAZE_DIRECTIONS = [
  ['↑', 'Up', 0, -1], ['→', 'Right', 1, 0],
  ['↓', 'Down', 0, 1], ['←', 'Left', -1, 0],
];

export function mazeWalls({size,cells}) {
  return cells.map(([top,right,bottom,left], i) => {
    const x=i%size, y=Math.floor(i/size);
    // Render each shared edge once. The bevel won't double in thickness at joined cells.
    return [
      top ? `M${x} ${y}h1` : '',
      left ? `M${x} ${y}v1` : '',
      right && x===size-1 ? `M${x+1} ${y}v1` : '',
      bottom && y===size-1 ? `M${x} ${y+1}h1` : '',
    ].join('');
  }).join('');
}
