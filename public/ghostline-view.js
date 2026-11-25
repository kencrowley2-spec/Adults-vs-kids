import {bend,LENGTH} from './ghostline-core.js';
export function paint(ctx,w,h,car,ghost){
 const horizon=h*.32, lens=Math.min(w*.94,h*1.75), eye=h*.49,mid=w*.5;
 const rect=(x,y,a,b,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,a,b);};
 function poly(c,...p){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.closePath();ctx.fill();}
 function oval(x,y,a,b,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,a,b,0,0,Math.PI*2);ctx.fill();}
 function grad(y,z,...colors){const g=ctx.createLinearGradient(0,y,0,z);colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));return g;}
 rect(0,0,w,h,grad(0,horizon,'#628aab','#f2c9a0','#ffe1a8'));
 oval(w*.73,h*.19,h*.055,h*.055,'#fff2bd');
 for(let j=0;j<2;j++){
  ctx.fillStyle=j?'#455a4b':'#838778';ctx.beginPath();ctx.moveTo(0,horizon+8);
  for(let i=0;i<=60;i++){const u=i/60,shift=car.s*.00018;ctx.lineTo(w*u,horizon-h*(.03+.045*Math.sin((u+shift)*11+j)**2+.026*Math.sin(u*19+j)));}
  ctx.lineTo(w,horizon+8);ctx.fill();
 }
 rect(0,horizon,w,h-horizon,'#718147');
 // Integrate the centre line relative to the driver's current heading.
 const near=2.6,far=255,step=3.2,rows=[];let center=0,angle=0;
 function project(z,offset,c){return {x:mid+(c+offset-car.x)*lens/z,y:horizon+eye*near/z,r:lens/z,z};}
 for(let z=near;z<far;z+=step){rows.push(project(z,0,center));angle+=bend(car.s+z)*step;center+=angle*step;}
 function band(a,b,l,r,c){poly(c,a.x+l*a.r,a.y,a.x+r*a.r,a.y,b.x+r*b.r,b.y,b.x+l*b.r,b.y);}
 for(let i=rows.length-2;i>=0;i--){
  const a=rows[i],b=rows[i+1],s=car.s+a.z,n=Math.floor(s/6),stripe=n%2;
  rect(0,b.y,w,a.y-b.y+1,stripe?'#7b8849':'#788448');
  band(a,b,-6.05,6.05,stripe?'#ece5cc':'#c84835');
  band(a,b,-5.35,5.35,stripe?'#4a4e50':'#4c5052');
  band(a,b,-5.24,-5.14,'#e6dfc8');band(a,b,5.14,5.24,'#e6dfc8');
  if(s>=LENGTH&&s<LENGTH+5)for(let q=0;q<12;q++)band(a,b,-5.1+q*.85,-5.1+(q+1)*.85,(q+i)%2?'#fff':'#202126');
  for(const side of [-1,1]){
   const edge=side*8,ax=a.x+edge*a.r,bx=b.x+edge*b.r;
   poly('#acaca4',ax,a.y-.58*a.r,bx,b.y-.58*b.r,bx,b.y-.37*b.r,ax,a.y-.37*a.r);
   if(Math.floor(s/13)!==Math.floor((s+step)/13))rect(ax,a.y-.55*a.r,Math.max(1,a.r*.12),.55*a.r,'#656a66');
   if(Math.floor(s/24)!==Math.floor((s+step)/24)){
    const tx=a.x+side*(12+(n%3))*a.r;
    rect(tx-.2*a.r,a.y-2*a.r,.4*a.r,2*a.r,'#655744');
    poly(n%3?'#395844':'#4b6342',tx-1.6*a.r,a.y-.8*a.r,tx,a.y-4.8*a.r,tx+1.6*a.r,a.y-.8*a.r);
   }
  }
 }
 if(ghost){
  const dz=ghost.s-car.s+3.6;
  if(dz>=2.8&&dz<far-5){
   const t=(dz-near)/step,j=Math.max(0,Math.floor(t)),a=rows[j],b=rows[j+1];
   const x=a.x+(b.x-a.x)*(t-j)+ghost.x*lens/dz,y=horizon+eye*near/dz,r=Math.min(lens/dz,w*.26);
   ctx.save();ctx.translate(x,y);ctx.scale(r,r);ctx.globalAlpha=.52;
   poly('#58ddec',-1,0,-1,-.35,-.78,-.52,-.54,-.87,.56,-.87,.8,-.5,1,-.35,1,0);
   poly('#134c65',-.56,-.58,-.43,-.79,.44,-.79,.57,-.58);
   rect(-.94,-.36,.53,.08,'#ff7474');rect(.41,-.36,.53,.08,'#ff7474');rect(-1,-.47,2,.06,'#d9ffff');ctx.restore();
  }
 }
 // Hood, windshield pillars, stitched dashboard and a rotating three-spoke GT wheel.
 poly(grad(h*.65,h*.77,'#f6bf49','#8c5c12'),0,h*.75,w*.15,h*.70,w*.38,h*.67,w*.63,h*.67,w*.85,h*.70,w,h*.75,w,h,0,h);
 for(const side of [0,1]){
  ctx.save();if(side){ctx.translate(w,0);ctx.scale(-1,1);}
  poly('#161b20',0,0,w*.035,0,w*.13,h*.70,w*.08,h*.8,0,h*.61);
  poly('#485056',0,0,w*.013,0,w*.113,h*.70,w*.1,h*.71);ctx.restore();
 }
 poly(grad(h*.7,h,'#596068','#23272c','#101316'),0,h*.71,w*.15,h*.74,w*.36,h*.70,w*.64,h*.70,w*.85,h*.74,w,h*.71,w,h,0,h);
 const radius=Math.min(w*.29,h*.34),wy=h*.99;
 ctx.save();ctx.translate(mid,wy);ctx.rotate(car.steer*.76);ctx.lineCap='round';
 for(const [thick,c] of [[.185,'#101114'],[.13,'#34383c'],[.075,'#242629']]){
  ctx.strokeStyle=c;ctx.lineWidth=radius*thick;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
 }
 for(const rot of [-1.48,1.48,Math.PI]){ctx.save();ctx.rotate(rot);poly('#636a70',-radius*.13,0,-radius*.1,-radius*.92,radius*.075,-radius*.94,radius*.13,0);ctx.restore();}
 rect(-radius*.055,-radius*1.055,radius*.11,radius*.11,'#ffc84c');
 oval(0,0,radius*.36,radius*.26,'#1c2023');ctx.restore();
 const fs=Math.max(13,Math.min(h*.038,w*.035));ctx.font='bold '+fs+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#a9f6ef';
 ctx.fillText(Math.round(car.speed*3.6)+' km/h',mid,h*.865);
}
