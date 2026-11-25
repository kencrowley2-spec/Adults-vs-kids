export const LENGTH=1460, STEP=1/60;
// Curvature in radians per metre. Both drivers use exactly the same circuit.
const bends=[[65,240,.007],[255,395,-.008],[415,550,.006],[590,785,-.009],[815,995,.008],[1020,1160,-.006],[1176,1258,.0095],[1260,1348,-.0095]];
export function bend(s){
 for(const [a,b,k] of bends)if(s>a&&s<b)return k*Math.sin(Math.PI*(s-a)/(b-a));
 return 0;
}
export function grid(){return {s:0,x:0,speed:31,steer:0,lateralSpeed:0,time:0};}
export function drive(car,input,direction=1){
 if(car.s>=LENGTH)return;
 const k=direction*bend(car.s),dt=STEP;
 car.steer+=(input-car.steer)*.085;
 // Cornering demand grows with speed squared. A short lateral response time
 // lets an early turn-in settle the car before the apex.
 const edgeLoad=Math.max(0,Math.min(1,(Math.abs(car.x)-3.6)/1.5));
 const outward=k*car.speed*car.speed*(1.12+.12*edgeLoad);
 const desired=car.steer*(13.5-edgeLoad*1.3)-outward;
 car.lateralSpeed+=(desired-car.lateralSpeed)*dt*4.35;
 car.x=Math.max(-7.4,Math.min(7.4,car.x+car.lateralSpeed*dt));
 const target=Math.abs(car.x)>5.2?32.5:40-Math.abs(car.steer)*1.3;
 car.speed+=(target-car.speed)*dt*(target<car.speed?2.4:1.5);
 const travel=Math.min(LENGTH-car.s,car.speed*dt);
 car.s+=travel;car.time+=travel/car.speed;
}
export function replay(trace,time){
 const pos=Math.min(time/STEP,trace.length-1),i=Math.floor(pos),a=trace[i],b=trace[i+1]||a,t=pos-i;
 return {s:a.s+(b.s-a.s)*t,x:a.x+(b.x-a.x)*t};
}

// A rolling start puts the benchmark in sight. It gives up speed at the apex,
// leaving room for a clean human racing line to catch it.
export function paceRun(direction=1){
 const frames=[];let s=12;
 while(s<LENGTH){
  frames.push({s,x:-direction*bend(s+10)*145});
  s=Math.min(LENGTH,s+(38.6-310*Math.abs(bend(s)))*STEP);
 }
 frames.push({s:LENGTH,x:0});return frames;
}
export function rivalAt(frames,time){
 const rival=replay(frames,time),behind=[];
 for(let i=0;i<=8;i++)behind.push(replay(frames,Math.max(0,time-i*.075)));
 return {...rival,behind,rolling:time<(frames.length-1)*STEP};
}
export function wakeStrength(car,rival){
 const gap=rival.s-car.s;
 if(!rival.rolling||gap<=0||gap>24)return 0;
 const nearest=rival.behind.reduce((a,b)=>Math.abs(b.s-car.s)<Math.abs(a.s-car.s)?b:a);
 return (1-gap/25)*Math.max(0,1-Math.abs(nearest.x-car.x)/2.1);
}
