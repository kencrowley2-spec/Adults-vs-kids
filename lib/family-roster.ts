export type FamilyRoster={adults:string[];kids:string[];playingAdults:number[];playingKids:number[]};
export function cleanRoster(raw:unknown):FamilyRoster{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Enter your roster.');
 const value=raw as Record<string,unknown>;
 const names=(items:unknown,limit:number,label:string)=>{
  if(!Array.isArray(items)||items.length>limit)throw new Error(`You can add up to ${limit} ${label}.`);
  return items.map(item=>{if(typeof item!=='string'||!item.trim()||item.trim().length>30)throw new Error('Use names or nicknames of 1–30 characters.');return item.trim();});
 };
 const adults=names(value.adults,10,'adults'),kids=names(value.kids,5,'kids');
 const playing=(items:unknown,count:number)=>{
  if(items===undefined)return Array.from({length:count},(_,i)=>i);
  if(!Array.isArray(items)||items.length>count||new Set(items).size!==items.length||items.some(i=>!Number.isInteger(i)||i<0||i>=count))throw new Error('Check your selected players.');
  return items as number[];
 };
 return {adults,kids,playingAdults:playing(value.playingAdults,adults.length),playingKids:playing(value.playingKids,kids.length)};
}
