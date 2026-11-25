export const LENGTH=1460, STEP=1/60;
// Curvature in radians per metre. Both drivers use exactly the same circuit.
const bends=[[65,240,.007],[255,395,-.008],[415,550,.006],[590,785,-.009],[815,995,.008],[1020,1160,-.006],[1176,1258,.0095],[1260,1348,-.0095]];
export function bend(s){
 for(const [a,b,k] of bends)if(s>a&&s<b)return k*Math.sin(Math.PI*(s-a)/(b-a));
 return 0;
}
export function grid(){return {s:0,x:0,speed:31,steer:0,lateralSpeed:0,time:0};}
export function drive(car,input){
 if(car.s>=LENGTH)return;
 const k=bend(car.s),dt=STEP;
 car.steer+=(input-car.steer)*.085;
 // Cornering demand grows with speed squared. A short lateral response time
 // lets an early turn-in settle the car before the apex.
 const outward=k*car.speed*car.speed*.73;
 const desired=car.steer*10.8-outward;
 car.lateralSpeed+=(desired-car.lateralSpeed)*dt*6;
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
