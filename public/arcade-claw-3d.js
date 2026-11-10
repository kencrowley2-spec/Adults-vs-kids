// Pre-rendered 3D art from licensed model assets. Identical quality on GPU and
// non-WebGL browsers, with depth layers and animated retrieval rendered at runtime.
const ART='/assets/the-claw/';
const assetNames=['chamber','dog','claw-open','claw-closed','cube','basketball','tennis','rainbow','bear'];
let artPromise;
function loadArt(){
 return artPromise??=Promise.all(assetNames.map(name=>new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve([name,img]);img.onerror=()=>reject(new Error('Unable to load '+name));img.src=ART+name+'.webp';
 }))).then(entries=>Object.fromEntries(entries)).catch(error=>{artPromise=null;throw error;});
}
export function createClawScene(canvas,prizes,effects=true){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas unavailable');
 let images,disposed=false,H=700,ratio=1;
 const ready=loadArt().then(loaded=>{images=loaded;});
 const mix=(a,b,t)=>a+(b-a)*Math.max(0,Math.min(1,t));
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const typeFor=i=>['cube','basketball','dog','bear','tennis','rainbow','bear','dog'][i%8];
 const prizeArt=[];prizes.map((p,i)=>i).sort((a,b)=>Math.sin(prizes[a].phase+a)-Math.sin(prizes[b].phase+b)).forEach((id,rank)=>{prizeArt[id]=typeFor(rank);});
 function resize(){
  const r=canvas.getBoundingClientRect();const height=r.width&&r.height?Math.max(360,Math.min(1000,440*r.height/r.width)):700;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  if(Math.abs(height-H)>1||ratio!==dpr||canvas.width!==Math.round(440*dpr)){
   H=height;ratio=dpr;canvas.width=Math.round(440*ratio);canvas.height=Math.round(H*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  prizes.forEach((p,i)=>{const row=Math.floor(i/6),col=i%6;p.x=57+col*65+Math.sin(p.phase)*8;p.y=H*(.59+row*.083)+Math.cos(p.phase)*11;p.size=95+row*11;p.art=prizeArt[i];p.angle=Math.sin(p.phase)*.36;});
 }
 function shadow(x,y,width,alpha=.45){
  ctx.save();ctx.translate(x,y);ctx.scale(1,.28);const gradient=ctx.createRadialGradient(0,0,1,0,0,width*.6);gradient.addColorStop(0,'rgba(0,0,0,'+alpha+')');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(-width*.65,-width*.65,width*1.3,width*1.3);ctx.restore();
 }
 function sprite(name,x,y,size,rotation=0){
  const image=images[name];const fit=size/Math.max(image.width,image.height);ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.drawImage(image,-image.width*fit/2,-image.height*fit/2,image.width*fit,image.height*fit);ctx.restore();
 }
 function drawChute(){
  const y=H-46;ctx.save();ctx.shadowBlur=10;ctx.shadowColor='#ffdb7755';
  const frame=ctx.createLinearGradient(29,y-8,108,y+32);frame.addColorStop(0,'#fff3af');frame.addColorStop(.35,'#ccaa58');frame.addColorStop(.7,'#685127');frame.addColorStop(1,'#e9ce7e');ctx.fillStyle=frame;
  ctx.beginPath();ctx.moveTo(27,y-9);ctx.lineTo(112,y-9);ctx.lineTo(102,y+31);ctx.lineTo(18,y+31);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#04050c';ctx.beginPath();ctx.moveTo(34,y-1);ctx.lineTo(102,y-1);ctx.lineTo(95,y+23);ctx.lineTo(26,y+23);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff0b6';ctx.font='700 9px Arial';ctx.textAlign='center';ctx.fillText('PRIZE CHUTE',65,y+43);ctx.restore();
 }
 function render({x,caught,phase,age,now}){
  if(disposed||!images)return;resize();ctx.setTransform(ratio,0,0,ratio,0,0);ctx.globalAlpha=1;ctx.fillStyle='#160c32';ctx.fillRect(0,0,440,H);
  // The chamber fills the available screen; there is no smaller cabinet inside it.
  ctx.drawImage(images.chamber,0,0,440,H);
  const target=caught?prizes[caught.index]:null;
  let cx=x,cy=36;
  const grabY=target?target.y-150:H*.59-150;
  if(phase==='drop'){cy=mix(36,grabY,ease(age/400));if(target)cx=mix(x,target.x,ease(age/400));}
  if(phase==='lift'){cy=mix(grabY,36,ease(age/420));cx=target?.x??x;}
  if(phase==='carry')cx=mix(target?.x??x,65,ease(age/400));
  if(phase==='release')cx=65;
  let highlight=null;
  if(phase==='aim'){
   let distance=37;prizes.forEach(p=>{if(!p.taken&&Math.abs(p.x-x)<distance){highlight=p;distance=Math.abs(p.x-x);}});
  }
  for(const p of prizes){
   if(p.taken)continue;shadow(p.x,p.y+p.size*.32,p.size);
   sprite(p.art,p.x,p.y,p.size,p.angle);
  }
  if(highlight){
   ctx.save();ctx.globalAlpha=effects?.65+.2*Math.sin(now/160):.8;ctx.strokeStyle='#ffe38d';ctx.lineWidth=2.5;ctx.shadowColor='#ffce4a';ctx.shadowBlur=effects?14:0;ctx.beginPath();ctx.ellipse(highlight.x,highlight.y+highlight.size*.17,highlight.size*.44,highlight.size*.20,highlight.angle,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  drawChute();
  // The carried toy sits within the prongs, then physically travels to the chute.
  if(target&&['lift','carry','release'].includes(phase)){
   const released=phase==='release';const t=released?ease(age/300):0;
   const ty=released?mix(cy+158,H-31,t):cy+158;
   sprite(target.art,cx,ty,mix(target.size*.92,35,t),Math.sin(now/180)*.06*(effects?1:0));
  }
  // Cable, rolling carriage and the sourced articulated chrome claw.
  const cable=ctx.createLinearGradient(cx-3,0,cx+3,0);cable.addColorStop(0,'#171a25');cable.addColorStop(.3,'#ecf0f7');cable.addColorStop(.6,'#69768d');cable.addColorStop(1,'#171a25');ctx.fillStyle=cable;ctx.fillRect(cx-2,0,4,cy+10);
  const motor=ctx.createLinearGradient(cx-24,0,cx+24,0);motor.addColorStop(0,'#465060');motor.addColorStop(.25,'#cdd4df');motor.addColorStop(.5,'#fff');motor.addColorStop(.8,'#8c97a7');motor.addColorStop(1,'#374252');ctx.fillStyle=motor;ctx.fillRect(cx-23,0,46,19);ctx.fillStyle='#0f1627';ctx.fillRect(cx-27,18,54,4);
  const closed=['lift','carry'].includes(phase);const clawImage=closed?'claw-closed':'claw-open';
  sprite(clawImage,cx,cy+108,222,(effects&&phase==='carry'?Math.sin(now/130)*.035:0));
  // Front glass catches a restrained light sweep over the toys and metal.
  ctx.save();ctx.globalAlpha=.045;ctx.fillStyle='#e9efff';ctx.beginPath();ctx.moveTo(31,0);ctx.lineTo(62,0);ctx.lineTo(27,H*.66);ctx.lineTo(21,H*.66);ctx.closePath();ctx.fill();ctx.restore();
  // Case edges occlude any toy leaning against the side of the machine.
  const strip=21;ctx.drawImage(images.chamber,0,0,images.chamber.width*strip/440,images.chamber.height,0,0,strip,H);ctx.drawImage(images.chamber,images.chamber.width*(1-strip/440),0,images.chamber.width*strip/440,images.chamber.height,440-strip,0,strip,H);
  if(phase==='release'&&target){ctx.save();ctx.globalAlpha=1-Math.min(1,age/420);ctx.font='900 32px Arial';ctx.textAlign='center';ctx.fillStyle='#fff0b5';ctx.shadowColor='#ffd435';ctx.shadowBlur=14;ctx.fillText('+1',65,H-105-age/12);ctx.restore();}
 }
 return {ready,render,dispose(){disposed=true;}};
}
