// Move the live cabinet closer or farther without changing the surrounding room.
const cabinet=document.querySelector('.upright-cabinet');
const slider=document.getElementById('cabinet-distance');
if(cabinet&&slider){
 const min=65,max=140;
 function setDistance(value){
  const distance=Math.max(min,Math.min(max,Math.round(Number(value)||100)));
  slider.value=String(distance);
  slider.setAttribute('aria-valuetext',distance<100?'Farther away':distance>100?'Closer':'Room view');
  cabinet.style.setProperty('--cabinet-distance',String(distance/100));
  try{localStorage.setItem('avk-cabinet-distance',String(distance));}catch{}
 }
 try{setDistance(localStorage.getItem('avk-cabinet-distance')||100);}catch{setDistance(100);}
 slider.addEventListener('input',()=>setDistance(slider.value));
 document.getElementById('cabinet-farther').addEventListener('click',()=>setDistance(Number(slider.value)-10));
 document.getElementById('cabinet-closer').addEventListener('click',()=>setDistance(Number(slider.value)+10));
 let drag=null;
 cabinet.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('.cabinet-screen-frame,button,a,input'))return;
  drag={id:event.pointerId,y:event.clientY,value:Number(slider.value)};
  cabinet.setPointerCapture(event.pointerId);
 });
 cabinet.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  setDistance(drag.value+(event.clientY-drag.y)*.25);
 });
 const stop=()=>{drag=null;};
 cabinet.addEventListener('pointerup',stop);
 cabinet.addEventListener('pointercancel',stop);
}
