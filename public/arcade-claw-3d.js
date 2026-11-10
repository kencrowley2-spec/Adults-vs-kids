import * as T from './vendor/three/three.module.js';
import {softwareClawRenderer} from './arcade-claw-software.js';

// Real perspective geometry, dynamic shadows and physically lit toy materials.
export function createClawScene(canvas,prizes,effects=true){
 let renderer,software=false;
 try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{software=true;renderer=softwareClawRenderer(canvas);}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(520,650,false);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 const scene=new T.Scene();scene.background=new T.Color('#090a17');
 let environment;
 if(!software){
  const image=document.createElement('canvas');image.width=1024;image.height=512;const pen=image.getContext('2d');
  const sky=pen.createLinearGradient(0,0,0,512);sky.addColorStop(0,'#c3d1eb');sky.addColorStop(.4,'#45445b');sky.addColorStop(.6,'#141624');sky.addColorStop(1,'#88744d');pen.fillStyle=sky;pen.fillRect(0,0,1024,512);
  pen.fillStyle='#ffffff';pen.fillRect(140,90,70,210);pen.fillRect(620,60,120,140);pen.fillStyle='#aa96e7';pen.fillRect(390,120,40,160);
  environment=new T.CanvasTexture(image);environment.mapping=T.EquirectangularReflectionMapping;environment.colorSpace=T.SRGBColorSpace;scene.environment=environment;scene.environmentIntensity=.65;
 }
 const camera=new T.PerspectiveCamera(37,520/650,.1,60);camera.position.set(0,4.1,12.8);camera.lookAt(0,3.05,0);

 const mat=(color,roughness=.35,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const black=mat('#111421',.23,.65),gold=mat('#ecc655',.23,.75),chrome=mat('#dce6f7',.16,.88),purple=mat('#47208e',.5),red=mat('#b91b49',.35,.2),glass=new T.MeshPhysicalMaterial({color:'#c6dcff',transparent:true,opacity:.055,roughness:.05,metalness:.1,side:T.DoubleSide,depthWrite:false});
 function mesh(geo,material,parent=scene){const m=new T.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function box(w,h,d,x,y,z,m,parent=scene){const a=mesh(new T.BoxGeometry(w,h,d,software&&w>3?10:1,software&&h>3?16:1,software&&d>2?8:1),m,parent);a.position.set(x,y,z);return a;}
 function ball(r,x,y,z,m,parent){const a=mesh(new T.SphereGeometry(r,software?14:28,software?10:20),m,parent);a.position.set(x,y,z);return a;}
 function rod(a,b,r,m,parent=scene){const v1=new T.Vector3(...a),v2=new T.Vector3(...b),delta=v2.clone().sub(v1);const c=mesh(new T.CylinderGeometry(r,r,delta.length(),12),m,parent);c.position.copy(v1.add(v2).multiplyScalar(.5));c.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return c;}
 function glow(color){return new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:effects?3:.4,toneMapped:false});}
 const violetGlow=glow('#ba8bff'),cyanGlow=glow('#69e5ff'),whiteGlow=glow('#fff0cc');
 scene.add(new T.HemisphereLight('#d9daff','#372137',3));
 const key=new T.DirectionalLight('#ffeed7',4);key.position.set(-3,8,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=8;key.shadow.camera.bottom=-2;key.shadow.bias=-.001;scene.add(key);
 const fill=new T.PointLight('#a880ff',24,12,2);fill.position.set(0,4.8,1);scene.add(fill);
 const rim=new T.PointLight('#55ccff',18,10,2);rim.position.set(2,2,2);scene.add(rim);
 // Cabinet is a full 3D object: back wall, inset floor, side glass and deep fascia.
 box(5.1,6.5,.22,0,3.15,-1.7,black);box(4.65,4.8,.12,0,3.4,-1.54,purple);
 box(4.85,.2,3.5,0,.54,0,red);box(5.2,.85,3.7,0,.05,0,black);
 box(5.25,.25,3.8,0,6.35,0,black);box(5.12,.12,3.65,0,6.2,0,gold);
 for(const side of [-1,1]){
  box(.17,5.65,3.6,side*2.55,3.1,0,black);
  box(.055,5.3,3.2,side*2.43,3.1,0,glass);
  box(.11,5.65,.12,side*2.45,3.2,1.75,gold);
  box(.065,5.2,.065,side*2.30,3.12,1.63,cyanGlow);
  box(.065,4.85,.065,side*2.23,3.05,-1.36,violetGlow);
  box(.12,5.5,.16,side*2.46,3.15,-1.48,red);
 }
 // Raised marquee with a sharp, readable brand texture.
 const label=document.createElement('canvas');label.width=1024;label.height=256;const c=label.getContext('2d');
 const gradient=c.createLinearGradient(0,0,1024,256);gradient.addColorStop(0,'#14182b');gradient.addColorStop(.5,'#312342');gradient.addColorStop(1,'#111421');c.fillStyle=gradient;c.fillRect(0,0,1024,256);
 c.strokeStyle='#eec85b';c.lineWidth=8;c.strokeRect(10,10,1004,236);c.textAlign='center';c.fillStyle='#ffe79c';c.font='bold 28px Arial';c.fillText('ADULTS vs. KIDS  •  PREMIUM ORIGINAL',512,51);c.shadowColor='#ffd458';c.shadowBlur=14;c.fillStyle='#fff6cc';c.font='900 117px Arial';c.fillText('THE CLAW',512,173);c.shadowBlur=0;c.font='bold 22px Arial';c.fillStyle='#d2c8ee';c.fillText('30 SECONDS. GRAB THE GLORY.',512,219);
 const texture=new T.CanvasTexture(label);texture.colorSpace=T.SRGBColorSpace;
 box(5.22,.99,.22,0,5.95,1.8,gold);box(5.02,.83,.04,0,5.95,1.94,new T.MeshBasicMaterial({map:texture}));
 // Lit top rail and mechanical carriage.
 box(4.5,.08,.09,0,5.26,.15,chrome);box(4.5,.035,.035,0,5.38,.1,whiteGlow);
 for(let i=0;i<7;i++)box(.16,.05,.65,-1.9+i*.63,5.37,-.25,whiteGlow);
 // Prize chute opening, chrome lip and smoked transparent hood.
 box(1.04,.08,1.05,-1.65,.69,1.0,gold);box(.86,.09,.88,-1.65,.74,1.0,mat('#05050d',.6));
 box(.08,.48,.97,-2.16,.98,1.02,glass);box(1.05,.48,.06,-1.65,.98,1.5,glass);
 box(1.1,.4,.12,-1.65,.02,1.93,gold);box(.93,.26,.13,-1.65,.02,2.0,mat('#05050d'));
 // Small cabinet screws, lower deck and bright delivery indicator.
 for(const x of [-2.42,2.42])for(const y of [.3,5.45])ball(.045,x,y,1.84,chrome);
 box(5.18,.14,.3,0,-.44,1.8,gold);box(.48,.045,.05,-1.65,-.29,2.08,cyanGlow);
 const shine=mesh(new T.PlaneGeometry(.21,4.3),new T.MeshBasicMaterial({color:'#d0eaff',transparent:true,opacity:.08,depthWrite:false}));shine.position.set(-1.91,3.1,1.83);shine.rotation.z=-.12;
 const toyMeshes=[];
 const colors=['#f36aa2','#ac8cf1','#e5a453','#60cbd3','#fa7159'];
 const dark=mat('#131822',.4),cream=mat('#ffe6c0',.9),eyes=mat('#0d1322',.1);
 function makeToy(p,i){
  const g=new T.Group();scene.add(g);const kind=p.kind;
  if(kind===0){
   // One textured solid cube keeps mobile draw calls low while preserving all six faces.
   const cc=['#ff334a','#ffdb1e','#28cc65','#258aff','#f4f7ff','#ff8d18'];
   const faces=cc.map((_,face)=>{
    const image=document.createElement('canvas');image.width=128;image.height=128;const pen=image.getContext('2d');pen.fillStyle='#10131b';pen.fillRect(0,0,128,128);
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
     pen.fillStyle=cc[(row*3+col+face+i)%6];pen.fillRect(col*42+3,row*42+3,37,37);pen.fillStyle='#ffffff35';pen.fillRect(col*42+4,row*42+4,35,2);
    }
    const tile=new T.CanvasTexture(image);tile.colorSpace=T.SRGBColorSpace;const material=mat('#ffffff',.24);material.map=tile;return material;
   });
   box(.59,.59,.59,0,0,0,faces,g);
  }else if(kind===1||kind===4){
   const r=.36;const material=mat(kind===1?'#ed8a1b':'#8bda21',.65);ball(r,0,0,0,material,g);
   const seam=mat(kind===1?'#452814':'#f8ffbf',.8);
   for(let j=0;j<(kind===1?3:2);j++){const ring=mesh(new T.TorusGeometry(r+.001,kind===1?.009:.012,7,64),seam,g);ring.rotation.set(j===0?Math.PI/2:0,j===2?Math.PI/2:0,kind===4?.6:0);}
   if(kind===1){for(const s of [-1,1]){const ring=mesh(new T.TorusGeometry(.30,.008,6,50),seam,g);ring.position.x=s*.20;ring.rotation.y=Math.PI/2;}}
  }else if(kind===2){
   const fur=mat(colors[i%colors.length],.95),belly=mat('#ffe0c7',1);
   const body=ball(.28,0,-.07,0,fur,g);body.scale.set(1,1.2,.85);
   ball(.27,0,.30,0,fur,g);ball(.115,-.21,.49,0,fur,g);ball(.115,.21,.49,0,fur,g);
   ball(.065,-.21,.49,.085,belly,g);ball(.065,.21,.49,.085,belly,g);
   const muzzle=ball(.13,0,.24,.23,belly,g);muzzle.scale.y=.7;ball(.035,0,.28,.34,eyes,g);
   for(const s of [-1,1]){ball(.027,s*.10,.35,.246,eyes,g);ball(.13,s*.29,-.04,0,fur,g);const foot=ball(.15,s*.17,-.32,.12,fur,g);foot.scale.z=1.3;ball(.08,s*.17,-.31,.245,belly,g);}
   const heart=ball(.16,0,-.04,.23,belly,g);heart.scale.set(.8,1,.35);
  }else if(kind===3){
   const car=mat(colors[(i+2)%colors.length],.2,.2),window=mat('#a6e9ff',.13,.45);
   box(.75,.18,.36,0,-.04,0,car,g);box(.36,.18,.32,-.06,.13,0,window,g);box(.4,.045,.36,-.06,.24,0,car,g);
   box(.18,.025,.32,.24,.06,0,cream,g);
   for(const x of [-.24,.25])for(const z of [-.2,.2]){const w=mesh(new T.CylinderGeometry(.13,.13,.095,20),dark,g);w.rotation.x=Math.PI/2;w.position.set(x,-.10,z);const hub=mesh(new T.CylinderGeometry(.065,.065,.105,16),chrome,g);hub.rotation.x=Math.PI/2;hub.position.copy(w.position);}
   for(const z of [-.11,.11])box(.015,.065,.08,.38,.015,z,whiteGlow,g);
  }else{
   for(let j=0;j<16;j++){const ring=mesh(new T.TorusGeometry(.25,.029,8,40),mat(['#ff366b','#ffab22','#ffee36','#33db90','#348dff','#c44dff'][j%6],.25),g);ring.rotation.x=Math.PI/2;ring.position.y=(j-8)*.037;ring.position.x=Math.sin(j*.23)*.08;}
  }
  const row=Math.floor(i/6),col=i%6;
  g.position.set(-1.76+col*.70+Math.sin(p.phase)*.15,2.35-row*.37+Math.sin(i*2.1)*.20,-1.02+row*.73);
  g.scale.setScalar(1.22);
  g.rotation.set(Math.sin(p.phase)*.35,p.phase,Math.cos(p.phase)*.24);
  // Depth changes actual screen positions: use projected centers for honest aiming.
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const projected=g.position.clone().project(camera);p.x=(projected.x+1)*220;p.y=(1-projected.y)*275;
  g.userData.home=g.position.clone();g.userData.rotation=g.rotation.clone();g.userData.size=1.22;toyMeshes.push(g);
 }
 prizes.forEach(makeToy);
 const claw=new T.Group();claw.scale.setScalar(1.8);scene.add(claw);
 const motor=mesh(new T.CylinderGeometry(.17,.21,.47,32),chrome,claw);motor.position.y=.18;
 ball(.22,-0,.0,0,chrome,claw).scale.y=.55;
 for(let i=0;i<3;i++){const band=mesh(new T.TorusGeometry(.178,.013,8,32),dark,claw);band.rotation.x=Math.PI/2;band.position.y=.05+i*.12;}
 const fingers=new T.Group();claw.add(fingers);
 const fingerRods=Array.from({length:9},()=>rod([0,0,0],[0,1,0],.035,chrome,fingers));
 function moveRod(m,a,b){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);m.position.copy(start.add(end).multiplyScalar(.5));m.scale.y=delta.length();m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());}
 const cable=rod([0,0,0],[0,1,0],.025,dark);
 const carriage=box(.45,.17,.43,0,5.2,.1,chrome);
 const ringMaterial=glow('#ffe16a');ringMaterial.depthTest=false;const targetRing=mesh(new T.TorusGeometry(.48,.014,8,48),ringMaterial);targetRing.renderOrder=999;targetRing.quaternion.copy(camera.quaternion);
 let lastRendered=-Infinity;
 function render({x,caught,phase,age,now,score,remaining}){
  if(software&&now-lastRendered<50)return;lastRendered=now;
  const homeX=(x-220)/220*2.45;
  const target=caught?toyMeshes[caught.index]:null;
  const pos=target?.userData.home;
  let cx=homeX,cy=4.65,cz=.1;
  const t=(duration)=>Math.min(1,age/duration),lerp=T.MathUtils.lerp;
  if(phase==='drop'){const a=t(400);cx=lerp(homeX,pos?.x??homeX,a);cz=lerp(.1,pos?.z??.6,a);cy=lerp(4.65,(pos?.y??1)+1.0,a);}
  if(phase==='lift'){cx=pos?.x??homeX;cz=pos?.z??.6;cy=lerp((pos?.y??1)+1.0,4.65,t(420));}
  if(phase==='carry'){cx=lerp(pos?.x??homeX,-1.65,t(400));cz=lerp(pos?.z??.6,1,t(400));}
  if(phase==='release'){cx=-1.65;cz=1;}
  claw.position.set(cx,cy,cz);carriage.position.x=cx;carriage.position.z=cz;
  cable.position.set(cx,(5.2+cy+.4)/2,cz);cable.scale.y=Math.max(.01,5.2-cy-.4);
  // Articulated fingers close securely around a toy and stay closed on the lift.
  const grip=['lift','carry'].includes(phase)?.27:.50;
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.2,dx=Math.cos(a),dz=Math.sin(a);moveRod(fingerRods[i*3],[dx*.15,0,dz*.15],[dx*grip,-.35,dz*grip]);moveRod(fingerRods[i*3+1],[dx*grip,-.35,dz*grip],[dx*(grip-.10),-.66,dz*(grip-.10)]);moveRod(fingerRods[i*3+2],[dx*(grip-.10),-.66,dz*(grip-.10)],[dx*.13,-.70,dz*.13]);}
  for(let i=0;i<toyMeshes.length;i++){
   const g=toyMeshes[i];g.visible=!prizes[i].taken;
   if(target===g&&['lift','carry','release'].includes(phase)){g.visible=true;g.position.set(cx,cy-1.0,cz);g.rotation.set(0,g.userData.rotation.y,0);if(phase==='release'){g.position.y=lerp(cy-1.0,.5,t(300));g.scale.setScalar(1.22-t(300)*.75);}}
   else if(!prizes[i].taken){g.position.copy(g.userData.home);g.rotation.copy(g.userData.rotation);g.scale.setScalar(g.userData.size);}
  }
  targetRing.visible=false;
  if(phase==='aim'){
   let index=-1,dist=37;prizes.forEach((p,i)=>{if(!p.taken&&Math.abs(p.x-x)<dist){index=i;dist=Math.abs(p.x-x);}});
   if(index>=0){targetRing.visible=true;targetRing.position.copy(toyMeshes[index].userData.home);targetRing.position.y+=.1;targetRing.scale.setScalar(effects?1+Math.sin(now/150)*.04:1);}
  }
  renderer.render(scene,camera);
 }
 function dispose(){environment?.dispose();scene.traverse(obj=>{obj.geometry?.dispose();if(Array.isArray(obj.material))obj.material.forEach(m=>{m.map?.dispose();m.dispose();});else {obj.material?.map?.dispose();obj.material?.dispose();}});texture.dispose();renderer.dispose();}
 return {render,dispose};
}
