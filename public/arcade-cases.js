// The cabinet has short interaction sounds only. No looping music or external audio.
export function createCaseReader({document:doc=globalThis.document,onPlay,players,getAudioContext,soundEnabled=()=>true}){
 const win=doc.defaultView,by=id=>doc.getElementById(id),dialog=by('arcade-book');
 let selection=null;
 let fx=true;try{fx=win.localStorage.getItem('avk:case-fx')!=='off';}catch{}
 const fxButton=by('cabinet-fx');
 function updateFx(){fxButton.textContent=fx?'✦ FX ON':'✦ FX OFF';fxButton.setAttribute('aria-pressed',String(fx));fxButton.setAttribute('aria-label',`Magical sound effects ${fx?'on':'off'}`);}
 function sound(kind){
  if(!fx||!soundEnabled())return;
  try{
   const ctx=getAudioContext();if(!ctx||ctx.state!=='running')return;
   const tone=ctx.createOscillator(),volume=ctx.createGain(),now=ctx.currentTime;
   tone.frequency.value=kind==='start'?660:440;
   volume.gain.setValueAtTime(.025,now);volume.gain.exponentialRampToValueAtTime(.0001,now+.12);
   tone.connect(volume);volume.connect(ctx.destination);
   tone.onended=()=>{tone.disconnect();volume.disconnect();};
   tone.start(now);tone.stop(now+.13);
  }catch{/* Sound is optional. */}
 }
 updateFx();fxButton.addEventListener('click',()=>{fx=!fx;try{win.localStorage.setItem('avk:case-fx',fx?'on':'off');}catch{}updateFx();if(fx)sound('open');});
 function open(entry){
  if(dialog.open||entry.comingSoon||doc.hidden||!by('arcade-game').hidden)return;
  selection=entry;dialog.dataset.game=entry.id;
  const [one,two]=players();
  by('book-game-title').textContent=entry.name;
  by('book-player-one').textContent=one;
  by('book-player-two').textContent=two;
  dialog.showModal();
  win.dispatchEvent(new win.Event('arcade-overlay-open'));
  sound('open');
 }
 by('book-close').addEventListener('click',()=>dialog.close());
 by('book-play').addEventListener('click',()=>{
  if(!dialog.open||!selection)return;
  const id=selection.id;selection=null;
  dialog.close();sound('start');onPlay(id);
 });
 dialog.addEventListener('close',()=>{
  if(dialog.open)return;
  selection=null;win.dispatchEvent(new win.Event('arcade-overlay-close'));
 });
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
 });
 return {open};
}
