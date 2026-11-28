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
  const stage=find('rack-stage');
  const shirts=Array.from(stage.querySelectorAll('[data-rack-tee]'));
  const count=shirts.length;
  const wrapped=n=>(n%count+count)%count;
  let position=0,target=0,animation=0,gesture=null,ignoreClick=false;

  function paintRack(){
    const width=stage.clientWidth;
    shirts.forEach((shirt,i)=>{
      const angle=(i-position)*2*Math.PI/count;
      const depth=(Math.cos(angle)+1)/2;
      const x=Math.sin(angle)*width*.34;
      const y=(depth-1)*width*.11;
      shirt.style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) scale(${.49+.51*depth}) rotateY(${-Math.sin(angle)*42}deg)`;
      shirt.style.zIndex=String(Math.round(depth*100));
      shirt.style.filter=`brightness(${.45+.55*depth})`;
    });
    stage.classList.add('rack-ready');
  }
  function announceRack(){
    const index=wrapped(Math.round(position));
    stage.setAttribute('aria-label','Customize tee: '+slogans[index]);
    document.querySelector('.rack-status').textContent=slogans[index];
  }
  function settle(next){
    cancelAnimationFrame(animation);
    target=Math.round(next);
    const start=position,begin=performance.now();
    const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:260;
    function frame(now){
      const t=duration?Math.min(1,(now-begin)/duration):1;
      position=start+(target-start)*(1-Math.pow(1-t,3));
      paintRack();
      if(t<1)animation=requestAnimationFrame(frame);
      else announceRack();
    }
    frame(begin);
  }
  stage.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    cancelAnimationFrame(animation);
    ignoreClick=false;
    gesture={id:event.pointerId,x:event.clientX,start:position,dragged:false};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event=>{
    if(gesture?.id!==event.pointerId)return;
    const dx=event.clientX-gesture.x;
    if(Math.abs(dx)>4)gesture.dragged=true;
    if(!gesture.dragged)return;
    position=gesture.start-dx/Math.max(32,stage.clientWidth*.28);
    paintRack();
  });
  function finishGesture(event){
    if(gesture?.id!==event.pointerId)return;
    ignoreClick=gesture.dragged||event.type==='pointercancel';
    gesture=null;
    settle(position);
  }
  stage.addEventListener('pointerup',finishGesture);
  stage.addEventListener('pointercancel',finishGesture);
  stage.addEventListener('click',event=>{
    if(event.detail&&ignoreClick){ignoreClick=false;return;}
    const index=wrapped(Math.round(position));
    opener=stage;
    select(shirts[index].dataset.rackTee,slogans[index],true);
  });
  find('rack-prev').addEventListener('click',()=>settle(target-1));
  find('rack-spin').addEventListener('click',()=>settle(target+1));
  find('rack-next').addEventListener('click',()=>settle(target+1));
  stage.addEventListener('keydown',event=>{
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    event.preventDefault();
    settle(target+(event.key==='ArrowLeft'?-1:1));
  });
  new ResizeObserver(paintRack).observe(stage);
  paintRack();
  announceRack();
  const initial=new URLSearchParams(location.search).get('item');
  if(initial)select(initial);
})();
