import assert from 'node:assert/strict';
import {wheelGeometry,wheelControl,FULL_LOCK} from '../public/ghostline-wheel.js';
for(const [width,height] of [[390,800],[844,390]]){
 const canvas=new EventTarget(),wheel=wheelGeometry(width,height);
 canvas.getBoundingClientRect=()=>({width,height,left:8,top:16});
 let capture=null;canvas.setPointerCapture=id=>{capture=id;};canvas.hasPointerCapture=id=>capture===id;canvas.releasePointerCapture=()=>{capture=null;};
 const control=wheelControl(canvas,()=>true,()=>0);
 function fire(type,angle,id=1){
  const event=new Event(type,{cancelable:true});
  Object.assign(event,{clientX:8+wheel.x+wheel.radius*Math.sin(angle),clientY:16+wheel.y-wheel.radius*Math.cos(angle),button:0,pointerId:id});
  canvas.dispatchEvent(event);
 }
 fire('pointerdown',0);fire('pointermove',FULL_LOCK/2);assert.ok(Math.abs(control.read()-.5)<1e-8);
 fire('pointermove',-FULL_LOCK,2);assert.ok(control.read()>0);
 fire('pointermove',-FULL_LOCK);assert.ok(control.read()<-.99);
 fire('pointerup',0);assert.equal(control.read(),0);assert.equal(capture,null);
 fire('pointerdown',0);fire('pointermove',FULL_LOCK);fire('pointercancel',0);assert.equal(control.read(),0);
}
