// The cabinet has short interaction sounds only. No looping music or external audio.
export function createCaseReader({document:doc=globalThis.document,coverMarkup,onPlay,players,getAudioContext,soundEnabled=()=>true}){
 const win=doc.defaultView,by=id=>doc.getElementById(id),dialog=by('arcade-book');
 let opening=false,selection=null,launching=false,page=0,turnTimer=null,turnReset=null,flight=null;
 let fx=true;try{fx=win.localStorage.getItem('avk:case-fx')!=='off';}catch{}
 const reduced=()=>!!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const fxButton=by('cabinet-fx');
 function updateFx(){fxButton.textContent=fx?'✦ FX ON':'✦ FX OFF';fxButton.setAttribute('aria-pressed',String(fx));fxButton.setAttribute('aria-label',`Magical sound effects ${fx?'on':'off'}`);}
 // Filtered air and a brief bell shimmer, never a continuous tone.
 function sound(kind){
  if(!fx||!soundEnabled())return;
  try{
   const ctx=getAudioContext();if(!ctx||ctx.state!=='running')return;
   const now=ctx.currentTime,duration=kind==='turn'?.18:.38;
   const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),samples=buffer.getChannelData(0);
   for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/samples.length);
   const air=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   air.buffer=buffer;filter.type='bandpass';filter.Q.value=.8;filter.frequency.setValueAtTime(kind==='turn'?1800:350,now);filter.frequency.exponentialRampToValueAtTime(kind==='turn'?500:3200,now+duration);
   gain.gain.value=kind==='turn'?.065:.075;air.connect(filter);filter.connect(gain);gain.connect(ctx.destination);air.onended=()=>{air.disconnect();filter.disconnect();gain.disconnect();};air.start(now);air.stop(now+duration);
   if(kind!=='turn'){
    const notes=kind==='start'?[392,587.33,783.99]:[523.25,783.99,1046.5,1567.98];
    notes.forEach((hz,i)=>{const tone=ctx.createOscillator(),volume=ctx.createGain(),at=now+.035+i*.055;tone.type='sine';tone.frequency.value=hz;volume.gain.setValueAtTime(.0001,at);volume.gain.exponentialRampToValueAtTime(.026,at+.008);volume.gain.exponentialRampToValueAtTime(.0001,at+.24);tone.connect(volume);volume.connect(ctx.destination);tone.onended=()=>{tone.disconnect();volume.disconnect();};tone.start(at);tone.stop(at+.26);});
   }
  }catch{/* Audio is decorative; opening and gameplay must still work. */}
 }
 updateFx();fxButton.addEventListener('click',()=>{fx=!fx;try{win.localStorage.setItem('avk:case-fx',fx?'on':'off');}catch{}updateFx();if(fx)sound('open');});
 function renderPage(){
  by('book-page-number').textContent=`${page+1} / 2`;
  by('book-page-title').textContent=page===0?'How to play':'Your family lineup';
  by('book-game-rules').textContent=page===0?selection.description:'One game. Your family. A fresh chance for bragging rights.';
  by('book-lineup').hidden=page===0;
  if(page===1){const names=players();by('book-player-one').textContent=names[0];by('book-player-two').textContent=names[1];}
  by('book-prev').disabled=page===0;by('book-next').disabled=page===1;
 }
 function turn(next){
  if(!selection||turnTimer!==null||next<0||next>1||page===next)return;
  sound('turn');page=next;
  if(reduced()){renderPage();return;}
  by('book-paper').classList.add('is-turning');
  turnTimer=win.setTimeout(()=>{if(selection)renderPage();},160);
  turnReset=win.setTimeout(()=>{by('book-paper').classList.remove('is-turning');turnTimer=null;turnReset=null;},420);
 }
 by('book-prev').addEventListener('click',()=>turn(page-1));by('book-next').addEventListener('click',()=>turn(page+1));
 function open(entry,tile,slot){
  if(opening||dialog.open||entry.comingSoon)return;
  opening=true;selection=entry;launching=false;page=0;sound('open');tile.setAttribute('aria-busy','true');slot.classList.add('is-picking');
  function reveal(){
   flight?.remove();flight=null;tile.removeAttribute('aria-busy');slot.classList.remove('is-picking');opening=false;
   if(doc.hidden||!by('arcade-game').hidden){selection=null;return;}
   by('book-game-title').textContent=entry.name;by('book-cover').setAttribute('data-game',entry.id);by('book-cover').innerHTML=coverMarkup(entry);
   by('book-construction').hidden=entry.id!=='neighborhood';renderPage();dialog.showModal();win.dispatchEvent(new win.Event('arcade-overlay-open'));
  }
  if(reduced()||tile.closest('.reference-cabinet')){reveal();return;}
  const r=tile.getBoundingClientRect(),targetWidth=Math.min(205,win.innerWidth*.48),scale=targetWidth/r.width;
  flight=doc.createElement('div');flight.className='book-cover book-flight';flight.setAttribute('data-game',entry.id);flight.setAttribute('aria-hidden','true');flight.innerHTML=coverMarkup(entry);
  Object.assign(flight.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});doc.body.appendChild(flight);
  const x=win.innerWidth/2-r.left-r.width/2,y=win.innerHeight*.43-r.top-r.height/2;
  if(typeof flight.animate==='function'){
   const movement=flight.animate([{transform:'translate3d(0,0,0) scale(1) rotateY(0deg)'},{offset:.65,transform:`translate3d(${x}px,${y-12}px,120px) scale(${scale}) rotateY(-18deg) rotate(-4deg)`},{transform:`translate3d(${x}px,${y}px,120px) scale(${scale}) rotateY(-8deg) rotate(-2deg)`}],{duration:650,easing:'cubic-bezier(.2,.75,.2,1)',fill:'forwards'});
   movement.finished.then(reveal,reveal);
  }else win.setTimeout(reveal,300);
 }
 function close(){dialog.close();}
 by('book-close').addEventListener('click',close);by('book-back').addEventListener('click',close);
 by('book-play').addEventListener('click',()=>{if(!selection||launching)return;launching=true;const id=selection.id;sound('start');dialog.close();onPlay(id);});
 dialog.addEventListener('close',()=>{selection=null;win.clearTimeout(turnTimer);win.clearTimeout(turnReset);turnTimer=null;turnReset=null;by('book-paper').classList.remove('is-turning');win.dispatchEvent(new win.Event('arcade-overlay-close'));});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 return {open};
}
