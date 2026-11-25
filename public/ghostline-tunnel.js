// Cross-section in world metres. The projected rings share the road's grade and curvature.
export const tunnelEntrance = 96;
const arch = Array.from({length: 15}, (_, i) => {
 const angle = Math.PI * i / 14;
 return [-8.7 * Math.cos(angle), 2.8 + 3.8 * Math.sin(angle)];
});
const profile = [[-8.7,-.1], ...arch, [8.7,-.1]];
const lamps = [
 {core:'#fff2c8', tint:[249,173,82], spacing:5},
 {core:'#e9fbff', tint:[158,205,222], spacing:3},
 {core:'#c6f3ff', tint:[69,170,240], spacing:4}
];
function rgb(values, alpha){return 'rgba('+values.join(',')+','+alpha+')';}

export function tunnelSlice(a,b,n,point,polygon,strip,far){
 const lamp = lamps[Math.floor((a.s-tunnelEntrance)/180)%lamps.length];
 const phase = n % lamp.spacing;
 const light = .5+.5*Math.cos((phase+.5)*2*Math.PI/lamp.spacing);
 function panel(x,y,u,v,color){
  polygon(color,[point(a,x,y),point(b,x,y),point(b,u,v),point(a,u,v)]);
 }
 if(far)polygon('#182026',profile.map(([x,y])=>point(b,x,y)));
 for(let j=1;j<profile.length;j++){
  const [x,y]=profile[j-1], [u,v]=profile[j];
  const wall=Math.min(j,profile.length-j)<3;
  const shade=(wall?35:20)+Math.abs(x+u)*.85+(n%8===0?-5:0);
  const color=lamp.tint.map(c=>Math.round(shade+c*(.025+.11*light)));
  panel(x,y,u,v,'rgb('+color.join(',')+')');
 }
 for(const side of [-1,1]){
  const wall=8.68*side;
  panel(wall,.25,wall,1.05,'#59636a');
  panel(wall,.35,wall,.44,lamp.core);
  panel(wall,1.38,wall,1.45,'#172128');
  panel(wall,1.45,wall,1.49,'#798187');
  // Expansion joints and recessed service bays give close walls a metre scale.
  if(n%3===0){
   const end=point(a,wall,3.1), foot=point(a,wall,1.06);
   polygon('#313739',[end,foot,[foot[0]+side*a.r*.035,foot[1]],[end[0]+side*a.r*.035,end[1]]]);
  }
  if(n%29===8){
   panel(wall,.48,wall,2.65,'#252e32');
   panel(wall,2.43,wall,2.57,'#69a993');
  }
  if(phase===0){
   const wallLamp=lamp===lamps[2];
   const x=side*(wallLamp?8.65:5.3), y=wallLamp?2.55:5.7;
   for(const [width,alpha] of [[.47,.08],[.27,.19],[.13,1]]){
    panel(x-side*width,y+width*.38,x+side*width,y-width*.38,alpha===1?lamp.core:rgb(lamp.tint,alpha));
   }
  }
 }
 if(a.y>=b.y){
  strip(a,b,-8.7,8.7,'rgba(13,21,30,.53)');
  for(const side of [-1,1]){
   strip(a,b,side*4.2,side*3.65,rgb(lamp.tint,.022+.055*light));
   strip(a,b,side*5.15,side*5.08,'#d4d4bf');
  }
 }
 if(a.s===tunnelEntrance){
  // A deep concrete headwall frames the open bore on approach.
  for(let j=1;j<profile.length;j++){
   const [x,y]=profile[j-1],[u,v]=profile[j];
   polygon('#858580',[point(a,x,y),point(a,u,v),point(a,u*1.26,v*1.26),point(a,x*1.26,y*1.26)]);
  }
 }
}
