// Immutable completed-result queue. A match keeps its UUID through retries and
// page reloads. Each queue belongs to one account, including on shared devices.
export function createResultRecorder({accountId,storage,send,changed=()=>{}}){
 const key=`avk.arcade.results.v1.${accountId}`;
 let pending=[],active=null,storageFailed=false;
 try{const parsed=JSON.parse(storage.getItem(key)||'[]');if(Array.isArray(parsed))pending=parsed.filter(r=>r&&typeof r.id==='string');}catch{}
 function persist(){try{storage.setItem(key,JSON.stringify(pending));storageFailed=false;}catch{storageFailed=true;}}
 function update(){changed({pending:pending.length,storageFailed});}
 async function drain(){
  if(active)return active;
  active=(async()=>{
   while(pending.length){
    const item=pending[0];
    try{const response=await send(item);if(!response.ok)break;
     // Merge other-tab additions before removing the acknowledged UUID.
     try{const external=JSON.parse(storage.getItem(key)||'[]');if(Array.isArray(external))for(const r of external)if(r&&typeof r.id==='string'&&!pending.some(p=>p.id===r.id))pending.push(r);}catch{}
     pending=pending.filter(r=>r.id!==item.id);persist();update();
    }catch{break;}
   }
  })();
  try{await active;}finally{active=null;update();}
 }
 function capture(result){if(!pending.some(r=>r.id===result.id)){pending.push(result);persist();}update();return drain();}
 update();return {capture,drain,pendingCount:()=>pending.length};
}
