export const TIMED_GAMES = {
 maze:{name:'Maze Dash',target:1,rule:'Reach the flag before the 45-second buzzer.'},
 spot:{name:'Spot the Difference',target:3,rule:'Find all 3 differences. Wrong taps add 1 second each.'},
 picture:{name:'Guess the Picture',target:3,rule:'Answer all 3 pictures correctly within 30 seconds.'},
 number:{name:'Number Battle',target:5,rule:'Answer all 5 number puzzles correctly within 30 seconds.'},
} as const;
export function timedResult(raw:unknown){
 if(!raw||typeof raw!=='object')throw new Error('Invalid result');
 const d=raw as Record<string,unknown>;
 if(typeof d.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.id))throw new Error('Invalid ID');
 if(typeof d.game!=='string'||!Object.hasOwn(TIMED_GAMES,d.game))throw new Error('Invalid game');
 const game=d.game as keyof typeof TIMED_GAMES;
 if(d.score!==TIMED_GAMES[game].target||!Number.isInteger(d.elapsedMs)||(d.elapsedMs as number)<100||(d.elapsedMs as number)>(game==='maze'?45000:game==='spot'?45000:30000))throw new Error('Only fully successful timed runs qualify');
 return {id:d.id,game,score:d.score as number,elapsedMs:d.elapsedMs as number};
}
