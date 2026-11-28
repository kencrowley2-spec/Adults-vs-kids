import {catalog,delivery,sizes,slogans,backPrice} from '../../lib/merch';
import {escapeHtml as esc,jsonLd} from '../../lib/seo';
const money=(v:number)=>'$'+v.toFixed(2).replace(/\.00$/,'');
const collections=['Team Tees','Headwear','Tees','Hoodies','Outerwear','Bottoms','Accessories','Bundles'];
const groups:Record<string,string>={'Team Tees':'Pick your side',Headwear:'The hat wall',Tees:'Game-day tees',Hoodies:'The hoodie rotation',Outerwear:'Sideline jackets',Bottoms:'Courtside essentials',Accessories:'Locker room gear',Bundles:'Bundle up'};
const img=(id:string,alt:string)=>`<img src="/assets/merch/${id}.webp" alt="${esc(alt)}" loading="lazy">`;
function art(p:typeof catalog[number]){
 if(p.kind==='Bundles')return `<span class="pair">${img('stadium','White Stadium Stripe Tee')}${img('two-tone','Two-Tone Patch Trucker')}</span>`;
 return img(p.id,p.name+' in '+p.color);
}
const qualityPromise = `<p><strong>Our quality promise</strong><br>We stand behind every piece of Adults vs. Kids gear, from our sideline hats to your custom team tee. If you’re not satisfied with the quality of your purchase, <a href="mailto:kencrowley2@gmail.com?subject=Pro%20Shop%20refund%20request">contact us for a full refund</a>.</p>`;
const rackTees=['stadium','sideline','mesh','warmup'];
function shirtRack(){
 return `<section class="shirt-rack" aria-label="Trash-talk tees" aria-roledescription="carousel">
 <span class="rack-heading">Trash-talk tees</span>
 <button class="rack-stage" id="rack-stage" type="button" aria-label="Customize tee: ${esc(slogans[0])}">
 ${slogans.map((s,i)=>{const tee=rackTees[i%rackTees.length];return `<span class="rack-tee ${tee==='sideline'||tee==='warmup'?'rack-dark':''}" data-rack-tee="${tee}" aria-hidden="true"><img src="/assets/merch/print-${tee}.webp" alt="" draggable="false"><span>${esc(s)}</span></span>`;}).join('')}
 </button><div class="rack-controls"><button id="rack-prev" aria-label="Previous tee">‹</button><span>Swipe to spin</span><button id="rack-next" aria-label="Next tee">›</button></div><span class="rack-status" aria-live="polite"></span></section>`;
}
export function GET(){
 const page=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Official Pro Shop | Adults vs. Kids</title><meta name="description" content="Shop official Adults vs. Kids team tees, headwear, athletic apparel and personalized family gear."><link rel="canonical" href="https://adultsvskids.com/merch"><link rel="stylesheet" href="/merch.css?v=5"><script defer src="/merch.js?v=4"></script></head><body>
 <header class="mast"><a href="/" aria-label="Adults vs Kids home">ADULTS <i>VS</i> KIDS<sup>™</sup></a><span>OFFICIAL PRO SHOP</span></header>
 <main><section class="hero"><div><small>ADULTS VS KIDS™</small><h1>Official<br><em>Pro Shop.</em></h1><p>Streetwear, sideline gear and a little friendly competition.</p><div class="hero-actions"><button class="rack-spin" type="button" id="rack-spin" aria-controls="rack-stage"><strong>T-shirt Rolodex</strong><span>Tap to spin</span></button>${shirtRack()}</div></div><img src="/assets/merch/athletic.webp" width="1220" height="814" fetchpriority="high" alt="Adults vs. Kids athletic collection in the team locker room"></section>
 <nav id="catalog" aria-label="Shop departments">${collections.map(k=>`<a href="#g-${k.replace(' ','-')}">${k}</a>`).join('')}<a href="#slogans">Slogan prints</a></nav>
 <div class="floor">${qualityPromise}${collections.map(k=>`<section class="department" id="g-${k.replace(' ','-')}"><header><div><small>${k}</small><h2>${groups[k]}</h2></div></header><div class="grid">${catalog.filter(p=>p.kind===k).map(p=>`<button class="card" data-item="${p.id}"><span class="photo">${art(p)}</span><span class="card-meta">${esc(p.collection)} collection</span><span class="card-name">${esc(p.name)}</span><span class="color">${esc(p.color)}</span><strong>${money(p.price)}</strong></button>`).join('')}</div></section>`).join('')}
 <section id="slogans" class="prints"><small>THE PRINT ROOM</small><h2>Talk a little trash.</h2><p>Pick a front slogan, then choose your tee.</p><div>${slogans.map((s,i)=>`<button data-slogan="${i}">${esc(s)}</button>`).join('')}</div></section><footer><a href="/">Adults vs. Kids home</a><p>${delivery}</p></footer></div></main>
 <dialog id="product" aria-labelledby="product-title"><button class="close" aria-label="Close product">×</button><div class="product-layout"><div class="detail-art"><div class="original-art"></div><figure class="shirt-preview" hidden><img alt=""><figcaption><span class="shirt-slogan"></span><small>ADULTS VS KIDS™</small></figcaption></figure></div><form><small id="line"></small><h2 id="product-title"></h2><p id="detail-color"></p><p id="includes" hidden>Includes one Stadium Stripe Tee and one Two-Tone Patch Trucker. Choose your tee size below.</p>
 <label id="style-wrap" hidden>Tee style<select id="tee-style"></select></label>
 <label id="size-wrap">Size<select name="size"><option value="">Choose a size</option>${sizes.map(s=>`<option>${s}</option>`).join('')}</select></label>
 <div id="print-options"><label>Front design<select name="front"><option value="">Original branded front</option>${slogans.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label><label>Back print · optional (+${money(backPrice)})<input name="back" maxlength="24" placeholder="Family name, team name or custom text"></label><div class="proof" hidden><small>PRINT PREVIEW</small><b id="front-proof"></b><span id="back-proof"></span></div></div>
 <label>Email for your receipt<input type="email" autocomplete="email" name="email" maxlength="200" required></label>${qualityPromise}<button class="action pay">Checkout with Stripe</button><p role="status" id="status"></p><p class="fine">${delivery}</p></form></div></dialog>
 <script id="data" type="application/json">${jsonLd({catalog,slogans,backPrice})}</script></body></html>`;
 return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8'}});
}
