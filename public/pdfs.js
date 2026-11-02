(()=>{
 'use strict';
 const el=id=>document.getElementById(id),status=el('pdfStatus'),member=document.body.dataset.pdfMember==='true';
 const money=cents=>'$'+(cents/100).toFixed(2);
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 async function api(path,body){const r=await fetch('/api/pdf/'+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok){if(r.status===401){const a=node('a','Sign in →');a.href='/login';status.replaceChildren(document.createTextNode(d.error+' '),a);}throw new Error(d.error||'Please try again.');}return d;}
 async function library(){
  const session=new URLSearchParams(location.search).get('session_id');let confirmationError='';
  if(session){status.textContent='Confirming your payment…';try{await api('confirm',{session_id:session});localStorage.removeItem('avk-cart-v2');history.replaceState(null,'','/family/downloads');}catch(e){confirmationError=e.message;}}
  const {orders}=await api('orders');el('pdfOrders').replaceChildren();
  for(const o of orders){const card=node('article',null,'pdf-order');card.append(node('h2',new Date(o.paid_at).toLocaleDateString()+' · '+money(o.amount_total)));if(o.status!=='paid'){card.append(node('p','Download access removed because this purchase was refunded or disputed.'));}else for(const book of o.books){const a=node('a','Download '+book.title+' ↓','pdf-download');a.href=book.url;card.append(a);}el('pdfOrders').append(card);}
  status.textContent=confirmationError||(orders.length?'Your PDFs are ready. Download and print whenever your family wants to play.':'No PDF purchases yet. Explore the collection to find your first showdown.');
 }
 async function store(){
  const {products}=await api('catalog');let cart=[];try{cart=JSON.parse(localStorage.getItem('avk-cart-v2')||'[]');if(!Array.isArray(cart))cart=[];}catch{}cart=[...new Set(cart)].filter(id=>products.some(p=>p.id===id&&p.available));if(cart.includes('bundle'))cart=['bundle'];
  const renderCart=()=>{el('pdfCart').replaceChildren();for(const id of cart){const p=products.find(p=>p.id===id),row=node('div',null,'pdf-cart-row'),remove=node('button','Remove');remove.onclick=()=>{cart=cart.filter(x=>x!==id);renderCart();};row.append(node('span',p.title+' · '+money(p.cents)),remove);el('pdfCart').append(row);}el('pdfTotal').textContent=cart.length?'Total: '+money(cart.reduce((n,id)=>n+products.find(p=>p.id===id).cents,0))+' USD':'Choose a book above to start.';el('pdfCheckout').disabled=!cart.length;try{localStorage.setItem('avk-cart-v2',JSON.stringify(cart));}catch{}};
  for(const p of products){const card=node('article',null,'pdf-card'+(p.id==='bundle'?' pdf-bundle':'')),img=node('img');img.src='/assets/'+p.cover;img.alt=p.title+' cover';img.loading='lazy';const button=node('button',p.available?'Add to cart · '+money(p.cents):'Coming soon','primary');button.disabled=!p.available;button.onclick=()=>{if(p.id==='bundle')cart=['bundle'];else{cart=cart.filter(id=>id!=='bundle');if(!cart.includes(p.id))cart.push(p.id);}renderCart();status.textContent='Added to your cart.';};card.append(img,node('p',p.id==='bundle'?'BETTER DEAL · ALL FOUR BOOKS':'PRINT & PLAY PDF','eyebrow'),node('h2',p.title),node('strong',money(p.cents)),node('p','Unlimited home prints for your own household.'),button);el('pdfProducts').append(card);}
  status.textContent=new URLSearchParams(location.search).has('cancelled')?'Checkout cancelled. You can return to your cart whenever you’re ready.':products.some(p=>p.available)?'Choose your books, then complete secure checkout.':'PDF checkout is being connected. Sales open after payment and download testing is complete.';
  el('pdfCheckout').onclick=async()=>{el('pdfCheckout').disabled=true;status.textContent='Opening secure Stripe checkout…';try{const d=await api('checkout',{products:cart});const u=new URL(d.url);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw new Error('Checkout unavailable.');location.assign(u.href);}catch(e){if(!status.querySelector('a'))status.textContent=e.message;el('pdfCheckout').disabled=!cart.length;}};renderCart();
 }
 (member?library():store()).catch(e=>{if(!status.querySelector('a'))status.textContent=e.message;});
})();
