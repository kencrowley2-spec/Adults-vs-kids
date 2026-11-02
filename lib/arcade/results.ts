export const ARCADE_GAMES=['memory','tic','spot','trivia','word','tap','picture','number','challenge','maze','rps','code','golf'];
type CompletedResult={id:string;mode:'single'|'series';gameIds:string[];roundWinners:number[]};
export function completedResult(raw:unknown):CompletedResult{
 if(!raw||typeof raw!=='object')throw new Error('Invalid result');
 const d=raw as Record<string,unknown>;
 if(typeof d.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.id))throw new Error('Invalid match ID');
 if(d.mode!=='single'&&d.mode!=='series')throw new Error('Invalid match format');
 if(!Array.isArray(d.gameIds)||d.gameIds.some(g=>typeof g!=='string'||!ARCADE_GAMES.includes(g)))throw new Error('Invalid games');
 const games=d.gameIds as string[];
 if(games.length!==(d.mode==='series'?3:1)||new Set(games).size!==games.length)throw new Error('Invalid lineup');
 if(!Array.isArray(d.roundWinners)||d.roundWinners.some(w=>w!==0&&w!==1))throw new Error('Invalid outcomes');
 const rounds=d.roundWinners as number[];
 if(d.mode==='series') {if(rounds.length!==3)throw new Error('Series is incomplete');}
 else {
  if(rounds.length<3||rounds.length>5)throw new Error('Match is incomplete');
  const wins=[0,0];rounds.forEach((w,i)=>{wins[w]++;if(i<rounds.length-1&&wins[w]>=3)throw new Error('Match already ended');});
  if(Math.max(...wins)!==3)throw new Error('Match is incomplete');
 }
 return {id:d.id,mode:d.mode,gameIds:[...games],roundWinners:[...rounds]};
}
export function sameResult(row:{mode:string;game_ids:string[];round_winners:number[]},result:CompletedResult){
 return row.mode===result.mode&&JSON.stringify(row.game_ids)===JSON.stringify(result.gameIds)&&JSON.stringify(row.round_winners)===JSON.stringify(result.roundWinners);
}
