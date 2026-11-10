// Guest sampling is a browser-level conversion limit, never account authorization.
const KEY='avk.arcade.guest-plays.v1',COOKIE='avk_arcade_guest_plays';
export function createGuestAllowance({storage,readCookie=()=>'',writeCookie=()=>{}}={}){
 let memory=0;
 const count=value=>Number.isInteger(Number(value))&&Number(value)>0?Math.min(2,Number(value)):0;
 function used(){
  let local=0,cookie=0;
  try{local=count(storage.getItem(KEY));}catch{}
  try{cookie=count(readCookie().split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1));}catch{}
  return memory=Math.max(memory,local,cookie);
 }
 return {remaining:()=>Math.max(0,2-used()),take(){
  if(used()>=2)return false;
  memory++;try{storage.setItem(KEY,String(memory));}catch{}
  try{writeCookie(COOKIE+'='+memory+'; Path=/; Max-Age=31536000; SameSite=Lax');}catch{}
  return true;
 }};
}
export function mountGuestGate({signedIn=false,document:doc=globalThis.document}={}){
 if(signedIn)return {allow:()=>true,prompt:()=>{},remaining:()=>Infinity};
 const win=doc.defaultView;
 const allowance=createGuestAllowance({storage:{getItem:k=>win.localStorage.getItem(k),setItem:(k,v)=>win.localStorage.setItem(k,v)},readCookie:()=>doc.cookie,writeCookie:v=>{doc.cookie=v;}});
 function update(){const el=doc.getElementById('arcade-guest-status'),left=allowance.remaining();if(el)el.textContent=left?left+' free guest '+(left===1?'play left':'plays left')+' · Create a free account to keep playing.':'Your 2 free games are used. Create a free account to keep playing!';}
 let dialog;
 function prompt(game){
  if(!dialog){dialog=doc.createElement('dialog');dialog.className='arcade-more';dialog.setAttribute('aria-labelledby','guest-signup-title');
   dialog.innerHTML='<div style="padding:24px;display:grid;gap:16px;text-align:center"><p style="margin:0;color:#ffd522;font-weight:900">KEEP THE FAMILY RIVALRY GOING!</p><h2 id="guest-signup-title" style="margin:0">Your next game is waiting.</h2><p data-guest-message>You’ve played your 2 free games. An adult can create a free family account to keep playing.</p><a data-guest-signup href="/signup" style="background:#ffd522;color:#111;padding:16px;border-radius:12px;font-weight:900;text-decoration:none">CREATE A FREE ACCOUNT →</a><a data-guest-login href="/login">Already have an account? Log in</a><form method="dialog"><button type="submit" style="min-height:44px">Back to the Arcade</button></form></div>';doc.body.append(dialog);}
  const query=game?'?game='+encodeURIComponent(game):'';
  dialog.querySelector('[data-guest-signup]').href='/signup'+query;dialog.querySelector('[data-guest-login]').href='/login'+query;
  dialog.querySelector('[data-guest-message]').textContent=game==='series'?'The Random 3 Game Challenge needs a free family account. An adult can create one to play the full series.':'You’ve played your 2 free games. An adult can create a free family account to keep playing.';
  if(!dialog.open)dialog.showModal();
 }
 update();win.addEventListener('storage',update);win.addEventListener('pageshow',update);
 const saving=doc.querySelector('.arcade-saving');if(saving)saving.hidden=true;
 return {remaining:allowance.remaining,prompt,allow(game){if(allowance.take()){update();return true;}update();prompt(game);return false;}};
}
