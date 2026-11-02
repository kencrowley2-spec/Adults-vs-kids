// A connected perfect maze; each edge is carved in both directions.
export function makeMaze(size=6,random=Math.random){
  const cells=Array.from({length:size*size},()=>[true,true,true,true]);
  const visited=new Set([0]),stack=[0],delta=[-size,1,size,-1];
  while(stack.length){
    const at=stack.at(-1),x=at%size,y=Math.floor(at/size);
    const options=[0,1,2,3].filter(d=>(d!==0||y>0)&&(d!==1||x<size-1)&&(d!==2||y<size-1)&&(d!==3||x>0)&&!visited.has(at+delta[d]));
    if(!options.length){stack.pop();continue;}
    const d=options[Math.floor(random()*options.length)],next=at+delta[d];
    cells[at][d]=false;cells[next][(d+2)%4]=false;visited.add(next);stack.push(next);
  }
  return {size,cells};
}
export function codeClues(secret,guess){
  let exact=0;const a=[],b=[];
  secret.forEach((v,i)=>{if(v===guess[i])exact++;else {a.push(v);b.push(guess[i]);}});
  let misplaced=0;for(const v of b){const i=a.indexOf(v);if(i>=0){misplaced++;a.splice(i,1);}}
  return {exact,misplaced};
}
export function rpsWinner(choices){
  if(choices[0]===choices[1])return null;
  return (choices[0]-choices[1]+3)%3===1?0:1;
}
export const GOLF_COURSES=[
  {ball:[35,155],hole:[320,40],wall:[165,65,22,90]},
  {ball:[35,40],hole:[320,155],wall:[165,45,22,90]},
  {ball:[35,100],hole:[320,100],wall:[170,55,22,90]},
  {ball:[35,160],hole:[310,150],wall:[160,100,22,85]},
  {ball:[40,40],hole:[310,45],wall:[160,15,22,90]},
];
export function golfStep(ball,course){
  const p={...ball},r=4;
  p.x+=p.vx;p.y+=p.vy;
  if(p.x<r||p.x>360-r){p.x=Math.max(r,Math.min(360-r,p.x));p.vx*=-0.8;}
  if(p.y<r||p.y>200-r){p.y=Math.max(r,Math.min(200-r,p.y));p.vy*=-0.8;}
  const [x,y,w,h]=course.wall;
  if(p.x>x-r&&p.x<x+w+r&&p.y>y-r&&p.y<y+h+r){
    if(ball.x<=x-r||ball.x>=x+w+r)p.vx*=-0.8;else p.vy*=-0.8;
    p.x=ball.x;p.y=ball.y;
  }
  p.vx*=0.98;p.vy*=0.98;
  p.sunk=Math.hypot(p.x-course.hole[0],p.y-course.hole[1])<10&&Math.hypot(p.vx,p.vy)<3.5;
  return p;
}
