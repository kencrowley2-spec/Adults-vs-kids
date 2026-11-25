import {bend,LENGTH} from './ghostline-core.js?v=3';

// Static centre line sampled in world metres. The same meshes are viewed by both drivers.
const step=4, samples=[];
let centre=0, heading=0;
for(let s=0;s<=LENGTH+440;s+=step){
 samples.push({centre,heading,height:2.1*Math.sin(s/55)+3.6*Math.sin(s/110)});
 centre+=heading*step+bend(s)*step*step/2;heading+=bend(s)*step;
}
function at(s){
 const t=s/step,i=Math.floor(t),f=t-i,a=samples[i],b=samples[i+1];
 return {centre:a.centre+(b.centre-a.centre)*f,heading:a.heading+(b.heading-a.heading)*f,height:a.height+(b.height-a.height)*f};
}
const art={};
export function loadRaceArt(onLoad){
 let active=true;
 for(const id of ['wheel','rival','sky','tree','dash','hood']){
  if(art[id]){art[id].decode?.().then(()=>{if(active)onLoad();}).catch(()=>{});continue;}
  const img=new Image();img.onload=()=>{if(active)onLoad();};img.src='/assets/ghostline/'+id+'.webp';art[id]=img;
 }
 return ()=>{active=false;};
}
export function imageFor(id){const img=art[id];return img?.complete&&img.naturalWidth?img:null;}
export function scenery(ctx,w,h,car,ghost){
 const base=at(car.s),grade=(at(car.s+5).height-base.height)/5;
 const lens=Math.min(w*.86,h*1.32),vertical=Math.min(h*.94,w*1.02),horizon=h*.405;
 const mid=w*(.5-car.steer*.008);
 function project(s,lat=0,up=0){
  const a=at(s),z=Math.max(1,s-car.s);
  return {x:mid+(a.centre-base.centre-base.heading*z+lat-car.x)*lens/z,
   y:horizon+(1.35+base.height+grade*z*.66-a.height-up)*vertical/z,r:lens/z,v:vertical/z,s};
 }
 function polygon(color,points){
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill();
 }
 function point(p,x,y=0){return [p.x+x*p.r,p.y-y*p.v];}
 function strip(a,b,x1,x2,color,up=0){
  const left=point(a,x1,up),right=point(a,x2,up);left[1]+=.68;right[1]+=.68;
  polygon(color,[left,right,point(b,x2,up),point(b,x1,up)]);
 }
 const sky=imageFor('sky');
 if(sky){
  const pan=Math.tanh(base.heading)*w*.13;
  ctx.drawImage(sky,-w*.17-pan,-h*.09,w*1.34,horizon+h*.13);
 }else{
  const g=ctx.createLinearGradient(0,0,0,horizon);g.addColorStop(0,'#779bb5');g.addColorStop(.8,'#ffcfa1');g.addColorStop(1,'#c4a98a');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,horizon+8);
 }
 ctx.fillStyle='#7d804e';ctx.fillRect(0,horizon+h*.035,w,h);
 function stand(p,side){
  const x=side*13;
  for(let tier=0;tier<4;tier++){
   const offset=x+side*tier*1.2,up=.7+tier*.49;
   const back=project(p.s+19.5);
   strip(p,back,offset,offset+side*1.3,tier%2?'#976e54':'#ac8260',up);
   polygon('#503e37',[point(p,offset,up),point(back,offset,up),point(back,offset,up-.4),point(p,offset,up-.4)]);
   for(let n=0;n<6;n++){
    const seat=project(p.s+1.8+n*3);ctx.fillStyle=['#ced6cb','#324859','#956150'][(tier+n)%3];
    ctx.fillRect(seat.x+offset*seat.r,seat.y-(up+.45)*seat.v,.5*seat.r,.45*seat.v);
   }
  }
  const back=project(p.s+20);
  for(const pole of [p,back]){
   ctx.fillStyle='#5a544c';ctx.fillRect(pole.x+(x+side*3.6)*pole.r,pole.y-5*pole.v,.13*pole.r,5*pole.v);
  }
  strip(p,back,x-side,x+side*5,'#b8ab91',5);
  polygon('#3b4043',[point(p,x-side,5),point(back,x-side,5),point(back,x-side,4.72),point(p,x-side,4.72)]);
 }
 const rows=[project(car.s+1.2)];
 for(let s=(Math.floor((car.s+1.2)/step)+1)*step;s<car.s+300;s+=step)rows.push(project(s));
 const ghostS=ghost?ghost.s+3.6:-1;
 for(let i=rows.length-2;i>=0;i--){
  const a=rows[i],b=rows[i+1],n=Math.floor((a.s+.001)/step),alt=n%2;
  // Ground drawn back to front also hides vehicles and barriers beyond a crest.
  if(a.y>=b.y){
   ctx.fillStyle=n%4<2?'#81804c':'#858550';ctx.fillRect(0,b.y,w,a.y-b.y+.55);
   strip(a,b,-6.05,6.05,alt?'#d6cbb6':'#ae4c39');
   strip(a,b,-5.35,5.35,n%4===0?'#505358':'#515459');
   for(const side of [-1,1]){
    strip(a,b,side*5.17,side*5.09,'#dfdccc');
    strip(a,b,side*1.45,side*1.08,'#4c4f53');
   }
   if(a.s-car.s<60){
    // Tiny aggregate marks are fixed to the asphalt, so their flow tracks wheel speed.
    for(let chip=0;chip<10;chip++){
     const seed=(n*7919+chip*6151)%9973,lat=(seed/9973-.5)*10;
     const t=((seed*47)%991)/991,px=(a.x+lat*a.r)*(1-t)+(b.x+lat*b.r)*t;
     const py=a.y*(1-t)+b.y*t;
     ctx.fillStyle=chip%2?'#ffffff0d':'#10131818';
     ctx.fillRect(px,py,Math.max(.5,a.r*.034),Math.max(.5,a.v*.012));
    }
   }
   if(a.s>=LENGTH&&a.s<LENGTH+8)for(let q=0;q<14;q++)strip(a,b,-5+q*10/14,-5+(q+1)*10/14,(n+q)%2?'#e8e6df':'#2d3034');
  }
  for(const side of [-1,1]){
   const edge=side*8.5;
   polygon('#807d70',[point(a,edge,.7),point(b,edge,.7),point(b,edge,.27),point(a,edge,.27)]);
   strip(a,b,edge,edge+side*.25,'#d4c8af',.71);
   // Fence panels and their angled tops sit between the racing surface and spectators.
   if(a.s>120&&a.s<400||a.s>1140){
    const edge=side*10,top=edge+side*.46;
    ctx.beginPath();
    const wire=(p,q)=>{ctx.moveTo(...p);ctx.lineTo(...q);};
    for(const height of [.85,1.65,2.5])wire(point(a,edge,height),point(b,edge,height));
    wire(point(a,edge,2.5),point(a,top,2.95));wire(point(a,top,2.95),point(b,top,2.95));
    if(a.s-car.s<82){
     for(let j=0;j<4;j++){
      const t=j/4,baseA=point(a,edge,.8),baseB=point(b,edge,.8),topA=point(a,edge,2.5),topB=point(b,edge,2.5);
      const mix=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
      wire(mix(baseA,baseB,t),mix(topA,topB,t+.25));wire(mix(topA,topB,t),mix(baseA,baseB,t+.25));
     }
    }
    ctx.strokeStyle='#686b6188';ctx.lineWidth=Math.max(.45,Math.min(2,a.r*.035));ctx.stroke();
    if(n%2===0){ctx.fillStyle='#656763';ctx.fillRect(a.x+edge*a.r,a.y-2.55*a.v,Math.max(.7,.085*a.r),2.55*a.v);}
   }
   if(side===1&&n%7===0&&a.s>1310&&a.s<LENGTH){
    const pole=side*11.4;
    ctx.fillStyle='#a9a69d';ctx.fillRect(a.x+pole*a.r,a.y-5*a.v,Math.max(1,.09*a.r),5*a.v);
    polygon(n%2?'#d9a72d':'#1d788a',[point(a,pole,5),point(a,pole+1.55,4.8),point(a,pole+1.4,3.95),point(a,pole,4.1)]);
   }
   if(n%3===0){ctx.fillStyle='#605d52';ctx.fillRect(a.x+edge*a.r,a.y-.62*a.v,Math.max(.5,.12*a.r),.62*a.v);}
   if((n%9+9)%9===(side===1?4:0)){
    const x=side*(14+n%6),y=4+n%3;
    const tree=imageFor('tree');
    if(tree){
     const th=y*a.v*1.65,tw=th*tree.naturalWidth/tree.naturalHeight,tx=a.x+x*a.r;
     ctx.drawImage(tree,tx-tw/2,a.y-th,tw,th);
    }else{
    ctx.fillStyle='#59553f';ctx.fillRect(a.x+x*a.r,a.y-y*.65*a.v,.36*a.r,y*.65*a.v);
    for(let j=0;j<3;j++){const baseY=1.1+j*1.15,wide=2.4-j*.53;
     polygon(['#344b38','#405a3f','#536746'][j],[point(a,x-wide,baseY),point(a,x,y+j*.55),point(a,x+wide,baseY)]);
    }
    }
   }
  }
  if(n%5===0){
   if((a.s>250&&a.s<400)||(a.s>1150&&a.s<1320)||a.s>1360&&a.s<LENGTH+16)stand(a,-1);
   if(a.s>1348&&a.s<LENGTH+16)stand(a,1);
  }
  if(n%80===50||n===LENGTH/step){
   for(const x of [-6.8,6.8]){ctx.fillStyle='#636563';ctx.fillRect(a.x+x*a.r,a.y-5.4*a.v,.24*a.r,5.4*a.v);}
   polygon('#272d32',[point(a,-7,5.6),point(a,7,5.6),point(a,7,4.4),point(a,-7,4.4)]);
   strip(a,b,-7,7,'#bcb3a2',5.6);
   const font=Math.max(1,.8*a.v);
   ctx.font='bold '+font+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffd675';ctx.fillText(n===LENGTH/step?'FINISH':'GHOSTLINE   GT',a.x,a.y-4.66*a.v);
  }
  // Lay each ribbon on the recorded line so it bends with the rival's path.
  if(ghost?.rolling&&a.s<ghostS&&b.s>ghost.behind.at(-1).s+3.6){
   for(let j=1;j<ghost.behind.length;j++){
    const tail=ghost.behind[j],head=ghost.behind[j-1],start=tail.s+3.6,end=head.s+3.6;
    const lo=Math.max(a.s,start),hi=Math.min(b.s,end);
    if(hi<=lo)continue;
    const lane=s=>tail.x+(head.x-tail.x)*(s-start)/(end-start);
    const fade=1-j/10;
    for(const side of [-1,1]){
     const edge=s=>lane(s)+side*(.78+(ghostS-s)*.055);
     const near=project(lo,edge(lo)),far=project(hi,edge(hi));
     const height=s=>.24+.075*Math.sin(car.time*7-(ghostS-s)*.28);
     const low=height(lo),high=height(hi);
     polygon('rgba(82,219,255,'+(.12+(.18+.36*(ghost.wake||0))*fade)+')',[
      point(near,-.047,low),point(near,.047,low+.055),point(far,.047,high+.055),point(far,-.047,high)]);
    }
   }
  }
  if(ghost&&ghostS>=a.s&&ghostS<b.s&&ghostS-car.s>=2.8){
   const g=project(ghostS,ghost.x),r=Math.min(g.r,w*.235),sprite=imageFor('rival');
   ctx.save();ctx.globalAlpha=.27;ctx.fillStyle='#14404c';ctx.beginPath();ctx.ellipse(g.x,g.y,r*1.08,r*.14,0,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=.68;
   if(sprite){const sw=r*2.18,sh=sw*sprite.naturalHeight/sprite.naturalWidth;ctx.drawImage(sprite,g.x-sw/2,g.y-sh,sw,sh);
    // The rear view exposes the tread faces below the bumper. Roll their grooves
    // by metres travelled, keeping rubber motion tied to the replay through turns.
    for(const side of [-1,1]){
     ctx.save();ctx.translate(g.x+side*sw*.40,g.y-sh*.078);ctx.scale(sw*.064,sh*.063);
     ctx.beginPath();ctx.ellipse(0,0,1,1,0,0,Math.PI*2);ctx.clip();
     const roll=(ghost.s/.42)%1;
     ctx.lineWidth=.11;ctx.strokeStyle='rgba(143,172,179,.62)';ctx.beginPath();
     for(let k=-3;k<3;k++){
      const y=(k+roll)*.68;
      ctx.moveTo(-1,y-.20);ctx.lineTo(-.18,y+.13);ctx.lineTo(.17,y-.05);ctx.lineTo(1,y+.24);
     }
     ctx.stroke();ctx.restore();
    }}
   else polygon('#6bd6e5',[[g.x-r,g.y],[g.x-r,g.y-r*.45],[g.x-r*.6,g.y-r*.9],[g.x+r*.6,g.y-r*.9],[g.x+r,g.y-r*.45],[g.x+r,g.y]]);
   ctx.restore();
  }
 }
}
