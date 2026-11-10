import * as T from './vendor/three/three.module.js';

// Same perspective scene on devices without WebGL. No flat replacement artwork.
export function softwareClawRenderer(canvas){
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
 let width=520,height=650;const projected=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3(),light=new T.Vector3(-.35,.8,.9).normalize(),view=new T.Vector3();
 const color=new T.Color();
 function texturedTriangle(texture,xy,uv){
  const img=texture.image;if(!img)return;
  const [u0,v0,u1,v1,u2,v2]=uv,[x0,y0,x1,y1,x2,y2]=xy;
  const a=u1-u0,b=v1-v0,c=u2-u0,d=v2-v0,det=a*d-b*c;if(Math.abs(det)<.000001)return;
  const m0=((x1-x0)*d-(x2-x0)*b)/det,m2=((x2-x0)*a-(x1-x0)*c)/det;
  const m1=((y1-y0)*d-(y2-y0)*b)/det,m3=((y2-y0)*a-(y1-y0)*c)/det;
  ctx.save();ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.lineTo(x2,y2);ctx.closePath();ctx.clip();
  ctx.transform(m0,m1,m2,m3,x0-m0*u0-m2*v0,y0-m1*u0-m3*v0);ctx.drawImage(img,0,0);ctx.restore();
 }
 return {shadowMap:{},setPixelRatio(){},setSize(w,h){width=w;height=h;canvas.width=w;canvas.height=h;},dispose(){},render(scene,camera){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const faces=[];
  scene.traverse(obj=>{
   if(!obj.isMesh||!obj.visible)return;let parent=obj.parent;while(parent){if(!parent.visible)return;parent=parent.parent;}
   const geo=obj.geometry,pos=geo.attributes.position,normals=geo.attributes.normal,uvs=geo.attributes.uv,indices=geo.index;normalMatrix.getNormalMatrix(obj.matrixWorld);
   const matrix=new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,obj.matrixWorld);const mvp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,matrix);
   const count=indices?indices.count:pos.count;
   const coords=new Float32Array(pos.count*3);
   for(let k=0;k<pos.count;k++){projected.fromBufferAttribute(pos,k).applyMatrix4(mvp);coords[k*3]=(projected.x+1)*width/2;coords[k*3+1]=(1-projected.y)*height/2;coords[k*3+2]=projected.z;}
   for(let i=0;i<count;i+=3){
    const a=indices?indices.getX(i):i,b=indices?indices.getX(i+1):i+1,c=indices?indices.getX(i+2):i+2;
    const xy=[coords[a*3],coords[a*3+1],coords[b*3],coords[b*3+1],coords[c*3],coords[c*3+1]];
    let material=obj.material;if(Array.isArray(material)){const group=geo.groups.find(g=>i>=g.start&&i<g.start+g.count);material=material[group?.materialIndex??0];}
    if(!material||material.opacity<.08)return;
    const cross=(xy[2]-xy[0])*(xy[5]-xy[1])-(xy[3]-xy[1])*(xy[4]-xy[0]);if(material.side!==T.DoubleSide&&cross>=0)continue;
    if(Math.max(...xy.filter((_,n)=>n%2===0))<0||Math.min(...xy.filter((_,n)=>n%2===0))>width)return;
    normal.fromBufferAttribute(normals,a).add(new T.Vector3().fromBufferAttribute(normals,b)).add(new T.Vector3().fromBufferAttribute(normals,c)).normalize().applyMatrix3(normalMatrix).normalize();
    const diffuse=Math.max(0,normal.dot(light));let brightness=material.isMeshBasicMaterial?1:.40+diffuse*.65;
    if(material.metalness>.5)brightness=.34+diffuse*.65+Math.pow(Math.max(0,normal.z*.94+normal.y*.34),18)*.7;
    color.copy(material.color);color.multiplyScalar(brightness);if(material.emissive)color.add(material.emissive.clone().multiplyScalar(Math.min(1,material.emissiveIntensity??0)));
    const texture=material.map;let uv;
    if(texture&&uvs){const img=texture.image;uv=[uvs.getX(a)*img.width,(1-uvs.getY(a))*img.height,uvs.getX(b)*img.width,(1-uvs.getY(b))*img.height,uvs.getX(c)*img.width,(1-uvs.getY(c))*img.height];}
    faces.push({xy,z:(coords[a*3+2]+coords[b*3+2]+coords[c*3+2])/3,color:color.getStyle(),opacity:material.opacity,texture,uv});
   }
  });
  faces.sort((a,b)=>b.z-a.z);ctx.fillStyle='#090a17';ctx.fillRect(0,0,width,height);
  for(const f of faces){ctx.globalAlpha=f.opacity;if(f.texture){texturedTriangle(f.texture,f.xy,f.uv);continue;}ctx.beginPath();ctx.moveTo(f.xy[0],f.xy[1]);ctx.lineTo(f.xy[2],f.xy[3]);ctx.lineTo(f.xy[4],f.xy[5]);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.lineWidth=.45;ctx.strokeStyle=f.color;ctx.stroke();}
  ctx.globalAlpha=1;
 }};
}
