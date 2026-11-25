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
 if(d.game==='ghostline'){
  if(d.score!==1||typeof d.elapsedMs!=='number'||!Number.isInteger(d.elapsedMs)||d.elapsedMs<20000||d.elapsedMs>600000)throw new Error('Invalid race time');
  return {id:d.id,game:d.game,score:1,elapsedMs:d.elapsedMs};
 }
 if(featuredGame(d.game)){
  const {min,max}=FEATURED_RANKING[d.game];
  if(typeof d.score!=='number'||!Number.isInteger(d.score)||d.score<min||d.score>max||d.elapsedMs!=null)throw new Error('Invalid score');
  return {id:d.id,game:d.game,score:d.score,elapsedMs:null};
 }
 if(typeof d.game!=='string'||!Object.hasOwn(TIMED_GAMES,d.game))throw new Error('Invalid game');
 const game=d.game as keyof typeof TIMED_GAMES;
 if(d.score!==TIMED_GAMES[game].target||!Number.isInteger(d.elapsedMs)||(d.elapsedMs as number)<100||(d.elapsedMs as number)>(game==='maze'?45000:game==='spot'?45000:30000))throw new Error('Only fully successful timed runs qualify');
 return {id:d.id,game,score:d.score as number,elapsedMs:d.elapsedMs as number};
}

export const FEATURED_RANKING={
 ghostline:{unit:'seconds',lower:true,min:1,max:1,rule:'Finish both drives on Sunset Circuit. The faster time is your family’s entry.'},
 lava:{unit:'points',lower:false,min:1,max:630,rule:'Finish the showdown. The higher team score is your family’s entry.'},
 faces:{unit:'questions',lower:true,min:0,max:2147483647,rule:'Correctly guess the mystery face using the fewest questions.'},
 claw:{unit:'toys',lower:false,min:1,max:24,rule:'Collect the most toys in one 30-second turn.'},
 mole:{unit:'hits',lower:false,min:1,max:28,rule:'Whack the most moles in one 20-second turn.'},
 memory:{unit:'moves',lower:true,min:12,max:2147483647,rule:'Find all 12 pairs in the fewest moves.'}
} as const;
export function featuredGame(game:unknown):game is keyof typeof FEATURED_RANKING{
 return typeof game==='string'&&Object.hasOwn(FEATURED_RANKING,game);
}
