export const FULL_LOCK=.76;
export function wheelGeometry(width,height){
 return {x:width*.47,y:height*.946,radius:Math.min(width*.31,height*.285)};
}
export function wheelControl(canvas,active,currentSteer){
 let pointer=null,angle=null,value=0;
 function position(e){
  const rect=canvas.getBoundingClientRect(),wheel=wheelGeometry(rect.width,rect.height);
  const x=e.clientX-rect.left-wheel.x,y=e.clientY-rect.top-wheel.y;
  return {angle:Math.atan2(y,x),distance:Math.hypot(x,y)/wheel.radius};
 }
 function reset(){
  const id=pointer;pointer=null;angle=null;value=0;
  if(id!==null&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);
 }
 canvas.addEventListener('pointerdown',e=>{
  if(!active()||pointer!==null||e.button!==0)return;
  const p=position(e);
  if(p.distance<.22||p.distance>1.38)return;
  e.preventDefault();pointer=e.pointerId;angle=p.angle;value=currentSteer();
  canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointer)return;
  const p=position(e);
  if(p.distance<.2){angle=null;return;}
  if(angle!==null){
   const change=p.angle-angle;
   value=Math.max(-1,Math.min(1,value+Math.atan2(Math.sin(change),Math.cos(change))/FULL_LOCK));
  }
  angle=p.angle;
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture']){
  canvas.addEventListener(event,e=>{if(e.pointerId===pointer)reset();});
 }
 return {reset,read:()=>value};
}
