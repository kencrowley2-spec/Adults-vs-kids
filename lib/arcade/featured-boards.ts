import { FEATURED_GAMES } from '../../public/arcade-featured.js';
import { GAMES } from '../../public/arcade-data.js';
import { featuredGame, FEATURED_RANKING } from './leaderboard';

export const featuredBoards = [...new Set([...FEATURED_GAMES, 'lava'])].filter(featuredGame).map(id => ({
 id,
 name: GAMES.find(game => game.id === id)!.name,
 cover: id === 'ghostline' ? '/assets/ghostline-gt.webp' : `/assets/featured/${id}-480.webp`,
 ...FEATURED_RANKING[id],
}));
