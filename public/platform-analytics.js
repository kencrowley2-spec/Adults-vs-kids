(()=>{
 if(location.pathname.startsWith('/admin'))return;
 const send=(type,detail='',id=crypto.randomUUID())=>fetch('/api/analytics',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({id,type,path:location.pathname,detail,referrer:document.referrer?new URL(document.referrer).hostname:'Direct / unknown'})}).catch(()=>{});
 send('page_view');
 window.addEventListener('avk:game-start',e=>send('game_start',e.detail.game,e.detail.id));
 document.addEventListener('click',e=>{
  const a=e.target.closest('a,button');if(!a)return;
  const href=a.getAttribute('href')||'',id=a.id||'';
  if(/amazon\.|amzn\./i.test(href))send('outbound','Amazon');
  else if(/liveStart|liveResume|showdownStart/.test(id))send('tool_start','Timer / music / scorecard');
  else if(/pdfCheckout/.test(id))send('checkout_click','PDF checkout');
  else if(href.startsWith('/api/pdf/download'))send('download_click','PDF download');
 });
})();
