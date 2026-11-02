export const teamName = team => team === 0 ? 'Adults' : 'Kids';
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function roundWinner(a,b,lower=false,timeBreak=false) {
  if(a.score!==b.score) return (lower ? a.score<b.score : a.score>b.score) ? 0 : 1;
  if(timeBreak && Math.abs(a.elapsed-b.elapsed)>0.001) return a.elapsed<b.elapsed ? 0 : 1;
  return null;
}
export function awardRound(wins,winner) {
  const next=[...wins]; if(winner!==null) next[winner]++;
  return {wins:next,champion:next.findIndex(v=>v>=3)};
}
export function lineWinner(board) {
  for(const [a,b,c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]) {
    if(board[a]!==null && board[a]===board[b] && board[a]===board[c]) return board[a];
  }
  return null;
}
