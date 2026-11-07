(()=>{if(location.hash){location.replace('/explore'+location.hash);return}const start=Date.parse('2026-10-30T15:32:00Z');function tick(){const n=Math.max(0,Math.floor((Date.now()-start)/1000));for(const[k,v]of Object.entries({hours:Math.floor(n/3600),minutes:Math.floor(n/60)%60,seconds:n%60})){const e=document.querySelector('[data-clock="'+k+'"]');if(e)e.textContent=String(v).padStart(2,'0')}}tick();setInterval(tick,1000);document.addEventListener('visibilitychange',tick);const mission=document.querySelector('#missionDialog');document.querySelector('#missionBtn').onclick=()=>mission.showModal();mission.querySelector('[data-close]').onclick=()=>mission.close();mission.addEventListener('click',e=>{if(e.target===mission){const r=mission.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)mission.close()}})})();

(()=>{
 const carousel=document.querySelector('.lp-slideshow');if(!carousel)return;
 const slides=[...carousel.querySelectorAll('.lp-slide')],dots=[...carousel.querySelectorAll('[data-slide-index]')],pause=carousel.querySelector('[data-slide-pause]');
 let index=0,timer,paused=false,remaining=5000,startedAt=0;
 const activeVideo=()=>slides[index].querySelector('video');
 function stop(){clearTimeout(timer);timer=undefined;const video=activeVideo();if(video)video.pause();else if(startedAt){remaining=Math.max(0,remaining-(Date.now()-startedAt));startedAt=0}}
 function schedule(){
  if(paused||document.hidden)return;
  const video=activeVideo();
  if(video){
   // Advance on the real ended event so buffering never cuts the clip short.
   video.play().then(()=>{if(activeVideo()!==video||paused||document.hidden)video.pause()}).catch(()=>{if(activeVideo()===video&&!paused&&!document.hidden)timer=setTimeout(()=>choose(index+1),6500)});
  }else{startedAt=Date.now();timer=setTimeout(()=>choose(index+1),remaining)}
 }
 function choose(next){
  stop();
  index=(next+slides.length)%slides.length;remaining=5000;
  // Rewind only the incoming clip; keep the outgoing final frame during its fade.
  const incoming=activeVideo();if(incoming)incoming.currentTime=0;
  slides.forEach((slide,i)=>{slide.classList.toggle('is-active',i===index);slide.setAttribute('aria-hidden',String(i!==index))});
  dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===index)));schedule();
 }
 slides.forEach(slide=>{const video=slide.querySelector('video');if(video){video.muted=true;video.addEventListener('ended',()=>{if(slides[index]===slide&&!paused&&!document.hidden)choose(index+1)});video.addEventListener('error',()=>{if(slides[index]===slide&&!paused&&!document.hidden){clearTimeout(timer);timer=setTimeout(()=>choose(index+1),5000)}})}});
 carousel.querySelector('[data-slide-prev]').onclick=()=>choose(index-1);
 carousel.querySelector('[data-slide-next]').onclick=()=>choose(index+1);
 dots.forEach((dot,i)=>dot.onclick=()=>choose(i));
 pause.onclick=()=>{stop();paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Resume slideshow':'Pause slideshow');pause.textContent=paused?'▶':'Ⅱ';schedule()};
 carousel.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();choose(index+(event.key==='ArrowRight'?1:-1))}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule()});
 schedule();
})();
