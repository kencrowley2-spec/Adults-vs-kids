import {scenery,imageFor} from './ghostline-scenery.js?v=2';
export function paint(ctx,w,h,car,ghost){
 const mid=w*.5;
 const rect=(x,y,a,b,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,a,b);};
 function poly(c,...p){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.closePath();ctx.fill();}
 function oval(x,y,a,b,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,a,b,0,0,Math.PI*2);ctx.fill();}
 function grad(y,z,...colors){const g=ctx.createLinearGradient(0,y,0,z);colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));return g;}
 scenery(ctx,w,h,car,ghost);
 // Hood, windshield pillars, stitched dashboard and a rotating three-spoke GT wheel.
 const hood=imageFor('hood');
 if(hood){
  // In portrait the windshield shows a narrower slice of the same bonnet.
  const hoodWidth=Math.max(w*1.035,h*1.02),hoodHeight=h*.17;
  ctx.drawImage(hood,(w-hoodWidth)/2,h*.603,hoodWidth,hoodHeight);
 }else poly(grad(h*.65,h*.77,'#f6bf49','#8c5c12'),0,h*.75,w*.15,h*.70,w*.38,h*.67,w*.63,h*.67,w*.85,h*.70,w,h*.75,w,h,0,h);
 for(const side of [0,1]){
  ctx.save();if(side){ctx.translate(w,0);ctx.scale(-1,1);}
  poly('#161b20',0,0,w*.035,0,w*.13,h*.70,w*.08,h*.8,0,h*.61);
  poly('#485056',0,0,w*.013,0,w*.113,h*.70,w*.1,h*.71);ctx.restore();
 }
 poly(grad(h*.7,h,'#596068','#23272c','#101316'),0,h*.71,w*.15,h*.74,w*.36,h*.70,w*.64,h*.70,w*.85,h*.74,w,h*.71,w,h,0,h);
 const dash=imageFor('dash');
 if(dash)ctx.drawImage(dash,0,h*.685,w,h*.35);
 // Recessed digital binnacle and amber shift lights behind the wheel.
 const dashW=Math.min(w*.28,h*.51),dashY=h*.747;
 poly('#0d1319',mid-dashW*.52,dashY+h*.11,mid-dashW*.4,dashY,mid+dashW*.4,dashY,mid+dashW*.52,dashY+h*.11);
 rect(mid-dashW*.34,dashY+h*.018,dashW*.68,h*.078,'#18272b');
 for(let i=0;i<10;i++)rect(mid-dashW*.29+i*dashW*.06,dashY+h*.026,dashW*.042,h*.007,i<Math.round(car.speed/4)?(i<7?'#79d9ad':'#ffb759'):'#414749');
 const radius=Math.min(w*.29,h*.34),wy=h*.99;
 const wheel=imageFor('wheel');
 ctx.save();ctx.translate(mid,wy);ctx.rotate(car.steer*.76);ctx.lineCap='round';
 if(wheel){
  const sw=radius*2.48,sh=sw*wheel.naturalHeight/wheel.naturalWidth;
  ctx.drawImage(wheel,-sw/2,-sh/2,sw,sh);
 }else{
 for(const [thick,c] of [[.185,'#101114'],[.13,'#34383c'],[.075,'#242629']]){
  ctx.strokeStyle=c;ctx.lineWidth=radius*thick;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
 }
 for(const rot of [-1.48,1.48,Math.PI]){ctx.save();ctx.rotate(rot);poly('#636a70',-radius*.13,0,-radius*.1,-radius*.92,radius*.075,-radius*.94,radius*.13,0);ctx.restore();}
 rect(-radius*.055,-radius*1.055,radius*.11,radius*.11,'#ffc84c');
 oval(0,0,radius*.36,radius*.26,'#1c2023');}
 ctx.restore();
 const fs=Math.max(13,Math.min(h*.038,w*.035));ctx.font='bold '+fs+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#a9f6ef';
 ctx.fillText(Math.round(car.speed*3.6)+' km/h',mid,h*.82);
}
