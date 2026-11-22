// Earlier versions saved these two records under the signed-in account on this device.
export async function importDeviceBests(accountId){
 if(!accountId)return false;
 const outcomes=await Promise.all([['mole','avk:mole:best:',1,28],['memory','avk:memory:best:24:',12,2147483647]].map(async ([game,prefix,min,max])=>{
  try{
   const marker='avk:imported-best:v1:'+accountId+':'+game;
   const pending=localStorage.getItem(marker);
   if(pending==='done')return false;
   const score=Number(localStorage.getItem(prefix+accountId));
   if(!Number.isInteger(score)||score<min||score>max){localStorage.setItem(marker,'done');return;}
   const entry=pending?JSON.parse(pending):{id:crypto.randomUUID(),score};
   localStorage.setItem(marker,JSON.stringify(entry));
   const saved=await fetch('/api/arcade/leaderboard',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...entry,accountId,game})});
   if(saved.ok)localStorage.setItem(marker,'done');
   return saved.ok;
  }catch{/* Retry on the next visit if storage or the network is unavailable. */}
 }));
 return outcomes.some(Boolean);
}
