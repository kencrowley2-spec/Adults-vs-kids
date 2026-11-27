(() => {
  const {catalog,slogans,backPrice}=JSON.parse(document.querySelector('#data').textContent);
  const modal=document.querySelector('#product'), form=modal.querySelector('form');
  const field=name=>form.elements.namedItem(name);
  const find=id=>document.getElementById(id);
  const money=n=>'$'+n.toFixed(2).replace(/\.00$/,'');
  let item, intent, opener, submitting=false;
  const tees=catalog.filter(p=>['Tees','Team Tees'].includes(p.kind));
  const style=find('tee-style');
  tees.forEach(p=>style.add(new Option(p.name+' · '+p.color,p.id)));
  const preview=modal.querySelector('.shirt-preview');
  const original=modal.querySelector('.original-art');
  const teeBlanks={
    stadium:'stadium',sideline:'sideline',warmup:'warmup',mesh:'mesh',
    'team-adults':'sideline','team-kids':'stadium','matchday-duo':'stadium',
  };
  function drawShirt(front){
    const blank=teeBlanks[item.id];
    const visible=Boolean(front && blank);
    preview.hidden=!visible;
    original.hidden=visible;
    if(!visible)return;
    const image=preview.querySelector('img');
    const src='/assets/merch/print-'+blank+'.webp';
    if(image.getAttribute('src')!==src)image.src=src;
    image.alt=item.name+' front print mockup in '+item.color;
    preview.querySelector('.shirt-slogan').textContent=front;
    preview.classList.toggle('dark-shirt',blank==='sideline'||blank==='warmup');
  }
  function draw(){
    const back=field('back').value.trim(), front=field('front').value;
    drawShirt(front);
    find('front-proof').textContent=front?'Front · '+front:'';
    find('back-proof').textContent=back?'Back · '+back:'';
    form.querySelector('.proof').hidden=!back&&!front;
    form.querySelector('.pay').textContent='Checkout with Stripe · '+money(item.price+(back?backPrice:0));
  }
  function select(id,slogan='',chooseStyle=false){
    item=catalog.find(p=>p.id===id);
    if(!item)return;
    if(!modal.open)form.reset();
    intent=crypto.randomUUID();
    find('line').textContent=item.collection+' / '+item.kind;
    find('product-title').textContent=item.name;
    find('detail-color').textContent=item.color;
    find('includes').hidden=item.kind!=='Bundles';
    const productCard=document.querySelector('[data-item="'+id+'"] .photo');
    original.replaceChildren(...Array.from(productCard.childNodes,n=>n.cloneNode(true)));
    const printable=['Team Tees','Tees','Hoodies','Bundles'].includes(item.kind);
    find('print-options').hidden=!printable;
    find('size-wrap').hidden=['Accessories','Headwear'].includes(item.kind);
    field('size').required=!find('size-wrap').hidden;
    field('front').value=slogan;
    find('style-wrap').hidden=!chooseStyle;
    style.value=id;
    find('status').textContent='';
    draw();
    if(!modal.open)modal.showModal();
    modal.scrollTop=0;
  }
  document.querySelectorAll('[data-item],[data-slogan]').forEach(button=>{
    button.addEventListener('click',()=>{
      opener=button;
      if(button.dataset.item)select(button.dataset.item);
      else select('stadium',slogans[Number(button.dataset.slogan)],true);
    });
  });
  style.addEventListener('change',()=>select(style.value,field('front').value,true));
  modal.querySelector('.close').addEventListener('click',()=>modal.close());
  modal.addEventListener('close',()=>opener?.focus());
  form.addEventListener('input',()=>{intent=crypto.randomUUID();draw();});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(submitting)return;
    submitting=true;
    const button=form.querySelector('.pay');
    button.disabled=true;
    find('status').textContent='Opening secure checkout…';
    try{
      const res=await fetch('/api/merch/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:item.id,size:field('size').value,front:field('front').value,back:field('back').value,email:field('email').value,intent})});
      const data=await res.json();
      if(!res.ok||!data.url)throw new Error(data.error||'Please try again.');
      location.assign(data.url);
    }catch(error){
      find('status').textContent=error.message||'Please try again.';
      submitting=false;button.disabled=false;
    }
  });
  const initial=new URLSearchParams(location.search).get('item');
  if(initial)select(initial);
})();
