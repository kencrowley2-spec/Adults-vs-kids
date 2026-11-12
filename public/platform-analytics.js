(()=>{
 const utm=new URLSearchParams(location.search),landing={};
 for(const k of ['source','medium','campaign','content','term'])landing['utm_'+k]=utm.get('utm_'+k)||'';
 let referrer='';try{referrer=document.referrer?new URL(document.referrer).hostname:'';}catch{}
 // Serialize requests so the initial HttpOnly session cookie exists before subsequent events.
 let queue=Promise.resolve(),lastActivity=Date.now();
 const send=(type,detail='',id=crypto.randomUUID())=>{
  const body=JSON.stringify({...landing,id,type,path:location.pathname,detail,referrer});
  queue=queue.then(async()=>{for(let attempt=0;attempt<2;attempt++){try{const r=await fetch('/api/analytics',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body});if(r.ok||r.status<500)return;}catch{}}}).catch(()=>{});
 };
 send('page_view');
 window.avkAnalyticsReady=queue;
 window.addEventListener('avk:game-start',e=>send('game_start',e.detail.game,e.detail.id));
 window.addEventListener('avk:game-complete',e=>{if(e.detail.id)send('game_complete',e.detail.game,e.detail.id)});
 window.avkAnalyticsListening=true;
 for(const event of window.avkPendingGameEvents||[])window.dispatchEvent(event);
 window.avkPendingGameEvents=[];
 for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{lastActivity=Date.now()},{passive:true});
 setInterval(()=>{if(document.visibilityState==='visible'&&Date.now()-lastActivity<60000)send('heartbeat')},60000);
 document.addEventListener('click',e=>{
  const a=e.target.closest('a,button');if(!a)return;
  const href=a.getAttribute('href')||'',id=a.id||'';
  let amazon=false;try{const host=new URL(href,location.href).hostname;amazon=/(^|\.)amazon\.[a-z.]+$/i.test(host)||host==='link.amazon'||host==='amzn.to';}catch{}
  if(amazon)send('outbound','Amazon');
  else if(/liveStart|liveResume|showdownStart/.test(id))send('tool_start','Timer / music / scorecard');
  else if(a.closest('#clubCheckoutForm')||href.startsWith('/club-checkout'))send('checkout_click','Club checkout');
  else if(/pdfCheckout/.test(id))send('checkout_click','PDF checkout');
  else if(href.startsWith('/api/pdf/download'))send('download_click','PDF download');
 });
})();
