(()=>{
 'use strict';
 const el=id=>document.getElementById(id),status=el('pdfStatus'),member=document.body.dataset.pdfMember==='true';
 function removePurchased(products){
  try {
   const cart=JSON.parse(localStorage.getItem('avk-cart-v2')||'[]');
   if(Array.isArray(cart))localStorage.setItem('avk-cart-v2',JSON.stringify(cart.filter(id=>!products.includes(id))));
  } catch {}
 }
 const receipt=document.querySelector('script[data-pdf-guest-receipt]');
 if(receipt){
  removePurchased(receipt.dataset.pdfGuestReceipt.split(','));
  return;
 }
 const money=cents=>'$'+(cents/100).toFixed(2);
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 async function api(path,body){const r=await fetch('/api/pdf/'+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok){if(r.status===401&&path!=='checkout'){const a=node('a','Sign in →');a.href='/login?purchase='+encodeURIComponent(member?'library':body?.products?.join(',')||'');status.replaceChildren(document.createTextNode(d.error+' '),a);}throw new Error(d.error||'Please try again.');}return d;}
 async function library(){
  const session=new URLSearchParams(location.search).get('session_id');let confirmationError='';
  if(session){status.textContent='Confirming your payment…';try{const {products}=await api('confirm',{session_id:session});removePurchased(products);history.replaceState(null,'','/family/downloads');}catch(e){confirmationError=e.message;}}
  const {orders}=await api('orders');el('pdfOrders').replaceChildren();
  for(const o of orders){const card=node('article',null,'pdf-order');card.append(node('h2',new Date(o.paid_at).toLocaleDateString()+' · '+money(o.amount_total)));if(o.product_ids?.some(id=>id.startsWith('club-'))){card.append(node('p','All-Access Club · '+(o.product_ids.includes('club-year')?'Annual plan':'Monthly plan')+'. For new recurring memberships, use Manage membership to view billing dates, update your card or cancel renewal. Earlier one-time prelaunch purchases keep their original terms. Your included book PDFs are ready below.'));}if(o.status==='paid' && o.product_ids?.some(id=>id.startsWith('club-'))){const weekly=node('a','Play this week’s Club challenge','pdf-download');weekly.href='/family/weekly-challenge';card.append(weekly);}if(o.status!=='paid'){card.append(node('p','Download access removed because this purchase was refunded or disputed.'));}else for(const book of o.books){const a=node('a','Download '+book.title+' ↓','pdf-download');a.href=book.url;card.append(a);}el('pdfOrders').append(card);}
  status.textContent=confirmationError||(orders.length?'Your PDFs are ready. Download and print whenever your family wants to play.':'No PDF purchases yet. Explore the collection to find your first showdown.');
 }
 async function store(){
  const {products}=await api('catalog');
  const cartRows=el('pdfCart'), cartButton=el('pdfCheckout'), cartStatus=el('pdfCheckoutStatus');
  let cart=[], pending=false;
  const attempts=new Map();
  try {
   cart=JSON.parse(localStorage.getItem('avk-cart-v2')||'[]');
   if(!Array.isArray(cart))cart=[];
  } catch {}
  const url=new URL(location.href), selection=url.searchParams.get('cart');
  const hasSelection=selection && selection.split(',').every(id=>products.some(p=>p.id===id));
  if(hasSelection){
   cart=selection.split(',');
   url.searchParams.delete('cart');
   history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
  cart=[...new Set(cart)].filter(id=>products.some(p=>p.id===id&&p.available));
  if(cart.includes('bundle'))cart=['bundle'];

  function renderCart(){
   cartRows.replaceChildren();
   for(const id of cart){
    const p=products.find(p=>p.id===id), row=node('div',null,'pdf-cart-row'), remove=node('button','Remove');
    remove.onclick=()=>{cart=cart.filter(x=>x!==id);renderCart();};
    row.append(node('span',p.title+' · '+money(p.cents)),remove);
    cartRows.append(row);
   }
   el('pdfTotal').textContent=cart.length?'Total: '+money(cart.reduce((n,id)=>n+products.find(p=>p.id===id).cents,0))+' USD':'Choose a book above to start.';
   cartButton.disabled=pending||!cart.length;
   try{localStorage.setItem('avk-cart-v2',JSON.stringify(cart));}catch{}
  }

  async function checkout(ids,button,message){
   if(pending||!ids.length)return;
   pending=true;
   button.disabled=cartButton.disabled=true;
   message.hidden=false;
   message.textContent='Opening secure Stripe checkout…';
   const reset=()=>{
    pending=false;
    button.disabled=false;
    cartButton.disabled=!cart.length;
   };
   const leaveFor=destination=>{
    const restore=event=>{
     if(!event.persisted)return;
     window.removeEventListener('pageshow',restore);
     reset();
     message.hidden=true;
     message.textContent='';
    };
    window.addEventListener('pageshow',restore);
    location.assign(destination);
   };
   try {
    const selection=[...ids].sort().join(',');
    if(!attempts.has(selection))attempts.set(selection,crypto.randomUUID());
    const {url}=await api('checkout',{products:ids,attempt:attempts.get(selection)});
    const destination=new URL(url);
    if(destination.protocol!=='https:'||destination.hostname!=='checkout.stripe.com')throw new Error('Checkout unavailable.');
    leaveFor(destination.href);
   } catch(e) {
    message.textContent=e.message||'Checkout is temporarily unavailable. Please try again.';
    reset();
   }
  }

  let resumeColoring;
  el('pdfProducts').replaceChildren();
  for(const p of products){
   const card=node('article',null,'pdf-card'+(p.id==='bundle'?' pdf-bundle':''));
   const img=node('img');
   img.src='/assets/'+p.cover;
   img.alt=p.title+' cover';
   img.loading='lazy';
   card.id=p.id;
   const add=node('button',p.available?'Add to cart · '+money(p.cents):'Coming soon','primary');
   const feedback=node('p',null,'pdf-card-status');
   feedback.setAttribute('role','status');
   feedback.hidden=true;
   add.disabled=!p.available;
   add.onclick=()=>{
    if(p.id==='bundle')cart=['bundle'];
    else {
     cart=cart.filter(id=>id!=='bundle');
     if(!cart.includes(p.id))cart.push(p.id);
    }
    renderCart();
    const viewCart=node('a','View cart');
    viewCart.href='#pdfCart';
    feedback.hidden=false;
    feedback.replaceChildren(document.createTextNode('In your cart. '),viewCart);
   };
   card.append(img,node('p',p.id==='bundle'?'BETTER DEAL · ALL FOUR BOOKS':'PRINT & PLAY PDF','eyebrow'),node('h2',p.title),node('strong',money(p.cents)),node('p','Unlimited home prints for your own household.'));
   if(p.available){
    const buyPdf=node('button',(p.id==='bundle'?'Buy bundle':'Buy PDF')+' · '+money(p.cents),'primary');
    buyPdf.id=p.id==='book-1'?'pdfCheckoutColoring':'pdfCheckout-'+p.id;
    const checkoutStatus=node('p',null,'pdf-card-status');
    checkoutStatus.setAttribute('role','status');
    checkoutStatus.hidden=true;
    buyPdf.onclick=()=>checkout([p.id],buyPdf,checkoutStatus);
    if(url.searchParams.get('checkout')===p.id){
     buyPdf.textContent='Continue to checkout · '+money(p.cents);
     resumeColoring=buyPdf;
    }
    add.textContent='Add to cart';
    add.className='pdf-secondary-action';
    card.append(buyPdf,checkoutStatus);
   }
   card.append(add,feedback);
   if(p.id==='book-1'||p.id==='book-2'||p.id==='book-3'){
    const buy=node('a','Purchase Paperback on Amazon — $'+(p.id==='book-3'?'14.99':'11.99')+' →','primary');
    buy.style.cssText='display:inline-flex;align-items:center;justify-content:center;margin:16px 0 24px;padding:14px 20px;max-width:100%;box-sizing:border-box;white-space:normal;text-align:center;line-height:1.4';
    buy.href=p.id==='book-3'?'https://link.amazon/B05l1li7L':p.id==='book-2'?'https://link.amazon/B02ibAV08':'https://link.amazon/B0aNnoK6K';
    buy.target='_blank';
    buy.rel='noopener noreferrer';
    card.append(buy,node('p','Physical book · separate Amazon purchase'));
   }
   el('pdfProducts').append(card);
  }
  status.textContent=url.searchParams.has('cancelled')?'Checkout cancelled. You can return to your cart whenever you’re ready.':products.some(p=>p.available)?'Choose your books, then complete secure checkout.':'PDF checkout is being connected. Sales open after payment and download testing is complete.';
  cartButton.onclick=()=>checkout(cart,cartButton,cartStatus);
  renderCart();
  if(resumeColoring)resumeColoring.focus();
  else if(hasSelection&&cart.length)cartButton.focus();
 }
 (member?library():store()).catch(e=>{if(!status.querySelector('a'))status.textContent=e.message;});
})();
