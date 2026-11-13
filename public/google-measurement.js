(()=>{
 if(window.avkGoogleMeasurement)return;window.avkGoogleMeasurement=true;
 if(!['adultsvskids.com','www.adultsvskids.com'].includes(location.hostname)||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1')return;
 const canonical=document.querySelector('link[rel="canonical"]');if(!canonical)return;
 let page;try{page=new URL(canonical.href);if(page.origin!=='https://adultsvskids.com')return;}catch{return;}
 if(/^\/(?:admin|auth|api|family|login|signup|logout|play|club-checkout|verify-email|reset-password|forgot-password|member-preview|clubhouse-setup|preview|defend-your-neighborhood)(?:\/|$)/.test(page.pathname))return;
 const params=new URLSearchParams(location.search);if(params.get('utm_medium')==='internal'||params.get('utm_source')==='qa')return;
 const key='avk_google_consent_v1',maxAge=180*86400000;
 let consent='unset',id=null,configured=false,starting=false;
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Date.now()-saved.at<maxAge&&['granted','denied'].includes(saved.choice))consent=saved.choice;}catch{}
 const remember=choice=>{consent=choice;try{localStorage.setItem(key,JSON.stringify({choice,at:Date.now()}));}catch{}};
 const referrer=()=>{try{return document.referrer?new URL(document.referrer).origin+'/':'';}catch{return '';}};
 const campaign=value=>typeof value==='string'&&value.length<=100&&/^[a-zA-Z0-9 _.,:+()\-]*$/.test(value)&&!/@|email|token|secret|password/i.test(value)?value:undefined;
 async function start(){
  if(starting||configured||consent!=='granted')return;starting=true;
  try{
   const r=await fetch('/api/measurement/config',{cache:'no-store',credentials:'same-origin'});const config=await r.json();
   if(!r.ok||!config.enabled||!/^G-[A-Z0-9]{6,20}$/.test(config.measurementId)||consent!=='granted')return;
   id=config.measurementId;window['ga-disable-'+id]=false;
   // Refuse a second installation rather than silently double-counting.
   if(document.querySelector('script[src*="googletagmanager.com/gtag/js"],script[src*="googletagmanager.com/gtm.js"]'))return;
   window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
   window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   window.gtag('consent','update',{analytics_storage:'granted'});
   window.gtag('js',new Date());
   window.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:page.href,page_referrer:referrer(),page_title:document.title,
    campaign_source:campaign(params.get('utm_source')),campaign_medium:campaign(params.get('utm_medium')),campaign_name:campaign(params.get('utm_campaign')),campaign_content:campaign(params.get('utm_content'))});
   window.gtag('event','page_view',{send_to:id,page_location:page.href,page_referrer:referrer(),page_title:document.title});
   configured=true;const tag=document.createElement('script');tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.append(tag);
  }catch{/* Optional analytics must never block the website. */}finally{starting=false;}
 }
 function withdraw(){
  remember('denied');if(id){window['ga-disable-'+id]=true;if(window.gtag)window.gtag('consent','update',{analytics_storage:'denied'});}
  for(const entry of document.cookie.split(';')){const name=entry.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue;for(const domain of ['', '; Domain=adultsvskids.com','; Domain=.adultsvskids.com','; Domain=www.adultsvskids.com'])document.cookie=name+'=; Path=/; Max-Age=0; SameSite=Lax'+domain;}
 }
 const style=document.createElement('style');style.textContent='.avk-google-choice{position:fixed;z-index:12000;bottom:12px;left:12px;right:12px;max-width:600px;padding:18px;background:#111;color:#fff;border:2px solid #ffd006;border-radius:12px;font:16px/1.5 Arial,sans-serif;box-shadow:0 4px 24px #0008}.avk-google-choice p{margin:0 0 12px}.avk-google-choice button,.avk-google-settings{font:inherit;padding:10px 16px;border:1px solid #ffd006;border-radius:8px;background:#111;color:#ffd006;margin:4px;cursor:pointer}.avk-google-choice button:focus-visible,.avk-google-settings:focus-visible{outline:3px solid #fff;outline-offset:2px}.avk-google-settings{position:fixed;right:10px;bottom:10px;z-index:11999;font:12px Arial,sans-serif}';document.head.append(style);
 const settings=document.createElement('button');settings.type='button';settings.className='avk-google-settings';settings.textContent='Analytics choices';document.body.append(settings);
 function choose(){
  if(document.getElementById('avkGoogleChoices'))return;
  const panel=document.createElement('section');panel.id='avkGoogleChoices';panel.className='avk-google-choice';panel.setAttribute('aria-label','Optional Google Analytics');
  const copy=document.createElement('p');copy.textContent='Adults: may we use optional Google Analytics on public pages to understand visits? Google receives browser/device and approximate location data. No names, email addresses, account pages or gameplay are sent by this implementation. Your choice does not affect access to games.';panel.append(copy);
  for(const [label,action] of [['Allow analytics',()=>{remember('granted');panel.remove();start();}],['Decline analytics',()=>{withdraw();panel.remove();}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;panel.append(b);}
  document.body.append(panel);
 }
 settings.onclick=choose;if(consent==='granted')start();else if(consent==='unset')choose();
 document.addEventListener('click',e=>{
  if(!configured||consent!=='granted'||!id||!window.gtag)return;const a=e.target.closest('a[href]');if(!a)return;
  let host;try{host=new URL(a.href).hostname;}catch{return;}
  if(/(^|\.)amazon\.[a-z.]+$/i.test(host)||host==='link.amazon'||host==='amzn.to')window.gtag('event','paperback_outbound',{send_to:id,destination:'amazon',page_location:page.href});
 });
})();
