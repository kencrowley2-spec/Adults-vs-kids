// All distances and timing are shared by rendering, play, and route validation.
export const RULES=Object.freeze({escape:30,jump:.62,range:163,crack:.95,maxTraps:5});
export const TRAPS=['crack'];
export function course(round=0,easy=false){
 const tiles=[{id:0,x:65,y:230,type:'start',locked:true}];
 for(let c=1;c<=7;c++){
  const x=65+c*112;
  tiles.push({id:tiles.length,column:c,row:0,x,y:easy?230:270+[0,-12,10][(c+round)%3],type:'safe',locked:c===1});
  tiles.push({id:tiles.length,column:c,row:1,x,y:140+[0,18,-14][(c+round)%3],type:'safe',locked:c===1});
 }
 tiles.push({id:tiles.length,x:961,y:230,type:'finish',locked:true});return tiles;
}
export function reachable(tiles,from,to){if(from===to)return false;const a=tiles[from],b=tiles[to];return !!a&&!!b&&Math.hypot(a.x-b.x,a.y-b.y)<=RULES.range;}
export function flight(tile){return RULES.jump;}
// Only the builder sees sabotaged blocks before the runner lands on them.
export function platformAppearance(tile,phase){return tile.type==='crack'&&phase!=='build'&&!tile.revealed?'safe':tile.type;}
export function danger(tile,t,landedAt=t){
 if(tile.type==='crack'&&t-(tile.triggeredAt??landedAt)>=RULES.crack)return 'crack';
 return null;
}
export function scoreAttempt(success,elapsed){return success?{escape:100+2*Math.floor(Math.max(0,RULES.escape-elapsed)),trap:0}:{escape:0,trap:50};}
// Time-expanded search with the exact jump durations and trap danger predicates.
// Waiting is allowed only when the platform remains safe throughout the wait.
export function trapSpacingValid(tiles){
 const traps=tiles.filter(t=>TRAPS.includes(t.type));
 return traps.every((a,i)=>traps.slice(i+1).every(b=>Math.abs(a.column-b.column)+Math.abs(a.row-b.row)!==1));
}
export function validateCourse(tiles){
 if(tiles.some(t=>t.locked&&TRAPS.includes(t.type))||tiles.filter(t=>TRAPS.includes(t.type)).length>RULES.maxTraps||!trapSpacingValid(tiles))return false;
 const step=.05,queue=[{id:0,t:0,landed:0}],seen=new Set();
 for(let q=0;q<queue.length;q++){
  const s=queue[q];if(tiles[s.id].type==='finish')return true;
  const key=`${s.id}:${Math.round(s.t/step)}:${tiles[s.id].type==='crack'?Math.round(s.landed/step):0}`;
  if(seen.has(key)||s.t>RULES.escape)continue;seen.add(key);
  if(danger(tiles[s.id],s.t,s.landed))continue;
  const wait=+(s.t+step).toFixed(2);
  if(!danger(tiles[s.id],wait,s.landed))queue.push({...s,t:wait});
  for(const tile of tiles){if(!reachable(tiles,s.id,tile.id))continue;const arrival=s.t+flight(tiles[s.id]);if(arrival<=RULES.escape&&!danger(tile,arrival,arrival))queue.push({id:tile.id,t:arrival,landed:arrival});}
 }
 return false;
}
export function placeTrap(tiles,id,type){
 if(!TRAPS.includes(type)||!tiles[id]||tiles[id].locked)return {ok:false,reason:'The first two blocks, start and finish stay safe. Choose a later block.'};
 const next=tiles.map(t=>({...t}));next[id].type=type;
 if(next.filter(t=>TRAPS.includes(t.type)).length>RULES.maxTraps)return {ok:false,reason:'Five traps max. Tap a placed trap to remove it.'};
 if(!trapSpacingValid(next))return {ok:false,reason:'Leave a safe block between traps. No traps directly beside or across from each other.'};
 if(!validateCourse(next))return {ok:false,reason:'That course has no safe escape route.'};
 return {ok:true,tiles:next};
}
export function suddenWinner(a,b){if(a.success!==b.success)return a.success?0:1;if(!a.success)return null;return Math.abs(a.elapsed-b.elapsed)<.001?null:a.elapsed<b.elapsed?0:1;}
export function advanceTurn(round,leg){return leg===0?{round,leg:1,complete:false}:{round:round+1,leg:0,complete:round>=2};}
export class LavaMatch{
 constructor(first=0){this.first=first;this.round=0;this.leg=0;this.scores=[0,0];this.attempts=[];this.sudden=false;this.suddenResults=[];this.complete=false;this.winner=null;this.easy=false;}
 get builder(){return (this.first+this.round+this.leg)%2;}
 get runner(){return 1-this.builder;}
 finishAttempt(success,elapsed){
  if(this.complete)throw new Error('Match already completed');
  if(this.sudden){this.suddenResults.push({success,elapsed});if(this.suddenResults.length===2){const w=suddenWinner(...this.suddenResults);if(w!==null){this.winner=w===0?1-this.first:this.first;this.complete=true;}else{this.suddenResults=[];this.leg=0;this.easy=true;}}else this.leg=1;return;}
  const points=scoreAttempt(success,elapsed);this.scores[this.runner]+=points.escape;this.scores[this.builder]+=points.trap;
  this.attempts.push({round:this.round,runner:this.runner,success,elapsed,...points});
  const next=advanceTurn(this.round,this.leg);this.round=next.round;this.leg=next.leg;
  if(next.complete){if(this.scores[0]===this.scores[1]){this.sudden=true;this.round=0;this.leg=0;}else{this.complete=true;this.winner=this.scores[0]>this.scores[1]?0:1;}}
 }
}
