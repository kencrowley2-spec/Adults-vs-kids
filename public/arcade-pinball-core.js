export const PINBALL={width:360,height:600,radius:7,bumpers:[{x:92,y:167,r:25},{x:224,y:167,r:25},{x:158,y:251,r:29}],targets:[{x:38,y:318,r:12},{x:278,y:318,r:12},{x:158,y:75,r:13}]};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createPinball(){return {score:0,balls:3,phase:'ready',time:0,ball:{x:336,y:544,vx:0,vy:0,inLane:true,flipCooldown:0},flippers:[{x:86,y:510,angle:.42},{x:234,y:510,angle:Math.PI-.42}],hits:Array(6).fill(-10),events:[]};}
export function launchPinball(s){if(s.phase!=='ready')return false;s.ball={x:336,y:544,vx:0,vy:-1020,inLane:true,flipCooldown:0};s.phase='live';s.events.push({kind:'launch'});return true;}
function segment(ball,ax,ay,bx,by,bounce=.8,surface={x:0,y:0}){
 const dx=bx-ax,dy=by-ay,t=clamp(((ball.x-ax)*dx+(ball.y-ay)*dy)/(dx*dx+dy*dy||1),0,1),px=ax+t*dx,py=ay+t*dy;
 let nx=ball.x-px,ny=ball.y-py,d=Math.hypot(nx,ny);const radius=PINBALL.radius+4;
 if(d>=radius)return null;if(d<.001){nx=-dy;ny=dx;d=Math.hypot(nx,ny)||1;}nx/=d;ny/=d;
 ball.x=px+nx*(radius+.15);ball.y=py+ny*(radius+.15);
 const approach=(ball.vx-surface.x)*nx+(ball.vy-surface.y)*ny;
 if(approach<0){ball.vx-=(1+bounce)*approach*nx;ball.vy-=(1+bounce)*approach*ny;}
 return {t,approach,px,py};
}
export function stepPinball(s,input={},dt=1/60){
 const elapsed=clamp(Number(dt)||0,0,.05),steps=Math.max(1,Math.ceil(elapsed/(1/180))),h=elapsed/steps;
 for(let sub=0;sub<steps;sub++){
  s.time+=h;
  const angles=input.left?[-.54]:[.42];angles[1]=input.right?Math.PI+.54:Math.PI-.42;
  const angular=s.flippers.map((f,i)=>{const before=f.angle;f.angle+=clamp(angles[i]-f.angle,-16*h,16*h);return (f.angle-before)/(h||1);});
  if(s.phase!=='live')continue;
  const b=s.ball;b.flipCooldown=Math.max(0,b.flipCooldown-h);b.vy+=590*h;b.vx*=Math.exp(-.035*h);b.x+=b.vx*h;b.y+=b.vy*h;
  if(b.inLane){
   if(b.x<325){b.x=325;b.vx=Math.abs(b.vx)*.8;}if(b.x>345){b.x=345;b.vx=-Math.abs(b.vx)*.8;}
   if(b.y<78){b.inLane=false;b.x=272;b.y=68;b.vx=-245;b.vy=-160;}
  }else{
   if(b.x<22){b.x=22;b.vx=Math.abs(b.vx)*.88;}if(b.x>306){b.x=306;b.vx=-Math.abs(b.vx)*.88;}
   if(b.y<28){b.y=28;b.vy=Math.abs(b.vy)*.8;}
   // Angled return rails funnel the ball onto the two physical flippers.
   segment(b,22,415,82,505,.85);segment(b,306,415,238,505,.85);
   segment(b,22,90,58,39,.85);segment(b,306,90,266,39,.85);
   [...PINBALL.bumpers,...PINBALL.targets].forEach((p,i)=>{
    const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),r=p.r+PINBALL.radius;
    if(d>=r)return;const nx=d>.001?dx/d:0,ny=d>.001?dy/d:-1;
    b.x=p.x+nx*(r+.2);b.y=p.y+ny*(r+.2);
    const outward=b.vx*nx+b.vy*ny;if(outward<0||s.time-s.hits[i]>.1){const speed=i<3?610:510;b.vx=nx*speed;b.vy=ny*speed;}
    if(s.time-s.hits[i]>.12){s.hits[i]=s.time;const points=i<3?100:i===5?250:50;s.score+=points;s.events.push({kind:'bumper',index:i,points});}
   });
   s.flippers.forEach((f,i)=>{
    const length=64,ex=f.x+Math.cos(f.angle)*length,ey=f.y+Math.sin(f.angle)*length;
    const dx=b.x-f.x,dy=b.y-f.y,surface={x:-angular[i]*dy,y:angular[i]*dx};
    const contact=segment(b,f.x,f.y,ex,ey,.82,surface);
    if(contact&&contact.approach<0&&(i===0?input.left:input.right)&&b.flipCooldown===0){
     b.vy=-Math.max(420,Math.min(780,Math.abs(b.vy)));b.vx+=(i===0?1:-1)*(80+contact.t*160);b.flipCooldown=.09;s.events.push({kind:'flipper'});
    }
   });
  }
  const speed=Math.hypot(b.vx,b.vy);if(speed>1120){b.vx*=1120/speed;b.vy*=1120/speed;}
  if(b.y>612){s.balls--;s.phase=s.balls>0?'ready':'over';s.events.push({kind:s.phase==='over'?'over':'drain'});b.x=336;b.y=544;b.vx=0;b.vy=0;b.inLane=true;}
 }
 return s;
}
