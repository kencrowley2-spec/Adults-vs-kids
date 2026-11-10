(()=>{
 const start=Date.parse('2026-10-30T15:32:00Z');
 function tick(){const n=Math.max(0,Math.floor((Date.now()-start)/1000));for(const[k,v]of Object.entries({hours:Math.floor(n/3600),minutes:Math.floor(n/60)%60,seconds:n%60})){document.querySelectorAll('[data-clock="'+k+'"]').forEach(e=>{e.textContent=String(v).padStart(2,'0')})}}
 tick();setInterval(tick,1000);document.addEventListener('visibilitychange',tick);
 const mission=document.querySelector('#missionDialog');document.querySelectorAll('#missionBtn,[data-mission-open]').forEach(button=>button.addEventListener('click',()=>{tick();mission?.showModal()}));mission?.querySelector('[data-close]')?.addEventListener('click',()=>mission.close());
 mission?.addEventListener('click',event=>{if(event.target===mission){const r=mission.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)mission.close()}});
 const section=document.querySelector('.home-featured'),track=section?.querySelector('.featured-track');if(!track)return;
 const covers=[...track.children],dots=[...section.querySelectorAll('[data-feature-index]')],pause=section.querySelector('[data-feature-pause]');
 let index=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function render(){const visible=matchMedia('(max-width:700px)').matches?2:matchMedia('(max-width:1100px)').matches?3:5;covers.forEach((cover,i)=>{cover.style.order=String((i-index+covers.length)%covers.length);const active=(i-index+covers.length)%covers.length<visible;cover.tabIndex=active?0:-1;cover.setAttribute('aria-hidden',String(!active))});dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===index)))}
 function choose(n){index=(n+covers.length)%covers.length;render()}
 function pauseState(){pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Resume featured slideshow':'Pause featured slideshow')}
 section.querySelector('[data-feature-prev]').onclick=()=>choose(index-1);section.querySelector('[data-feature-next]').onclick=()=>choose(index+1);dots.forEach((dot,i)=>dot.onclick=()=>choose(i));pause.onclick=()=>{paused=!paused;pauseState()};
 section.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose(index+(e.key==='ArrowRight'?1:-1))}});
 let touchX;track.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX},{passive:true});track.addEventListener('touchend',e=>{if(touchX===undefined)return;const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>40)choose(index+(delta<0?1:-1));touchX=undefined},{passive:true});
 setInterval(()=>{if(!paused&&!document.hidden&&!section.matches(':hover')&&!section.contains(document.activeElement)&&!document.querySelector('dialog[open]'))choose(index+1)},5000);window.addEventListener('resize',render);render();pauseState();
})();
