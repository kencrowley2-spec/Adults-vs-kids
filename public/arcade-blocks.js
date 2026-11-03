// Block Showdown: original drag-and-drop puzzle, one point per placed piece.
export const BLOCK_SHAPES=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[1,1]],[[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[0,1],[0,2],[1,2]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],[[0,0],[1,0],[2,0],[3,0],[4,0]]];
export function blockFits(board,shape,x,y){return shape.every(([dx,dy])=>{const a=x+dx,b=y+dy;return a>=0&&a<8&&b>=0&&b<8&&!board[b*8+a];});}
export function placeBlock(board,shape,x,y,color){
 if(!blockFits(board,shape,x,y))return null;
 const next=[...board];shape.forEach(([dx,dy])=>{next[(y+dy)*8+x+dx]=color;});
 // Collect rows AND columns before removing anything, including intersections.
 const rows=[],cols=[];for(let i=0;i<8;i++){if(next.slice(i*8,i*8+8).every(Boolean))rows.push(i);if(Array.from({length:8},(_,y)=>next[y*8+i]).every(Boolean))cols.push(i);}
 const cleared=[];next.forEach((v,i)=>{if(rows.includes(Math.floor(i/8))||cols.includes(i%8)){cleared.push({x:i%8,y:Math.floor(i/8),color:v});next[i]=0;}});
 return {board:next,cleared,lines:rows.length+cols.length};
}
export function fittingShapes(board){return BLOCK_SHAPES.filter(shape=>Array.from({length:64},(_,i)=>blockFits(board,shape,i%8,Math.floor(i/8))).some(Boolean));}
export function mountBlocks({canvas,team,later,onScore,onEnd,sound,onStatus,effects=true,seed=7103}){
 const ctx=canvas.getContext('2d');if(!ctx){onStatus('Your browser cannot display this puzzle. Please try an updated browser.');return;}
 const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=400*ratio;canvas.height=570*ratio;ctx.scale(ratio,ratio);
 const palette=['','#34bfe8','#6079f5','#b46bea','#49ce67','#ffd244','#ff8c55'];
 const left=24,top=83,cell=44,deadline=performance.now()+60000;
 let board=Array(64).fill(0),tray=[],points=0,lines=0,drag=null,selected=-1,cursor={x:0,y:0},ended=false,particles=[],notice='',noticeUntil=0;
 function random(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;}
 function refill(i){const options=fittingShapes(board);tray[i]={shape:options[Math.floor(random()*options.length)],color:1+Math.floor(random()*6)};}
 [0,1,2].forEach(refill);
 function size(shape){return {w:Math.max(...shape.map(p=>p[0]))+1,h:Math.max(...shape.map(p=>p[1]))+1};}
 function tile(x,y,s,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=palette[color];ctx.fillRect(x+1,y+1,s-2,s-2);ctx.fillStyle='#ffffff70';ctx.beginPath();ctx.moveTo(x+1,y+1);ctx.lineTo(x+s-1,y+1);ctx.lineTo(x+s-7,y+7);ctx.lineTo(x+7,y+7);ctx.fill();ctx.fillStyle='#00000035';ctx.beginPath();ctx.moveTo(x+1,y+s-1);ctx.lineTo(x+s-1,y+s-1);ctx.lineTo(x+s-7,y+s-7);ctx.lineTo(x+7,y+s-7);ctx.fill();ctx.strokeStyle='#0003';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,s-2,s-2);ctx.restore();}
 function text(value,x,y,font,color='#fff'){ctx.fillStyle=color;ctx.font=`900 ${font}px Arial, sans-serif`;ctx.textAlign='center';ctx.fillText(value,x,y);}
 function finish(){if(ended)return;ended=true;drag=null;onEnd({score:points,label:`${points} pieces placed · ${lines} lines cleared`});}
 function drop(i,x,y){
  if(ended||performance.now()>=deadline){finish();return;}
  const result=placeBlock(board,tray[i].shape,x,y,tray[i].color);if(!result){sound('tap');onStatus('That piece does not fit. Try a green highlighted space.');return;}
  board=result.board;points++;lines+=result.lines;
  if(effects)particles.push(...result.cleared.map(p=>({...p,at:performance.now()})));
  sound(result.lines?'match':'tap');notice=result.lines?`${result.lines} LINE${result.lines>1?'S':''} CLEARED!`:'+1 PIECE';noticeUntil=performance.now()+700;
  refill(i);
  // Keep the full 60 seconds playable if a previously offered shape becomes blocked.
  tray.forEach((piece,j)=>{if(!Array.from({length:64},(_,k)=>blockFits(board,piece.shape,k%8,Math.floor(k/8))).some(Boolean))refill(j);});
  selected=-1;onScore(points);onStatus(`${team}: ${points} points. ${result.lines?'Line cleared! ':''}Drag another piece.`);
 }
 function target(p,shape,touch=false){const s=size(shape);return {x:Math.round((p.x-left-s.w*cell/2)/cell),y:Math.round((p.y-top-s.h*cell/2-(touch?48:0))/cell)};}
 function frame(){
  if(ended)return;if(performance.now()>=deadline)return finish();
  const now=performance.now();ctx.fillStyle='#11141f';ctx.fillRect(0,0,400,570);
  text(team.toUpperCase(),83,25,13,'#ffd522');text('PIECES',200,21,10,'#c3c7dc');text(String(points),200,58,35);const seconds=Math.max(0,Math.ceil((deadline-now)/1000));text(`${seconds}s`,332,49,32,seconds<=10?'#ff7777':'#ffd522');text('1 PIECE = 1 POINT',82,48,9,'#fff');
  ctx.fillStyle='#080b15';ctx.fillRect(left-5,top-5,362,362);
  board.forEach((v,i)=>{const x=left+i%8*cell,y=top+Math.floor(i/8)*cell;if(v)tile(x,y,cell,v);else{ctx.fillStyle='#252a40';ctx.fillRect(x+1,y+1,cell-2,cell-2);}});
  const active=drag?{...drag.target,i:drag.i}:selected>=0?{...cursor,i:selected}:null;
  if(active){const shape=tray[active.i].shape,valid=blockFits(board,shape,active.x,active.y);shape.forEach(([dx,dy])=>{const x=active.x+dx,y=active.y+dy;if(x<0||y<0||x>7||y>7)return;ctx.fillStyle=valid?'#77ffad88':'#ff657577';ctx.fillRect(left+x*cell+2,top+y*cell+2,cell-4,cell-4);ctx.strokeStyle=valid?'#a3ffd0':'#ff7b85';ctx.lineWidth=2;ctx.strokeRect(left+x*cell+3,top+y*cell+3,cell-6,cell-6);});}
  particles=particles.filter(p=>now-p.at<400);particles.forEach(p=>{const t=(now-p.at)/400;tile(left+p.x*cell,top+p.y*cell+t*t*90,cell,p.color,1-t);});
  text(now<noticeUntil?notice:'DRAG A PIECE • FILL ROWS OR COLUMNS',200,458,11,now<noticeUntil?'#ffd522':'#c3c7dc');
  tray.forEach((piece,i)=>{const s=size(piece.shape),cx=69+i*131;ctx.fillStyle=selected===i?'#394838':'#202538';ctx.fillRect(cx-61,474,122,81);if(drag?.i!==i)piece.shape.forEach(([x,y])=>tile(cx-s.w*11+x*22,513-s.h*11+y*22,22,piece.color));text(String(i+1),cx,568,9,'#959db9');});
  if(drag){const s=size(tray[drag.i].shape),y=drag.p.y-s.h*cell/2-(drag.touch?48:0);tray[drag.i].shape.forEach(([dx,dy])=>tile(drag.p.x-s.w*cell/2+dx*cell,y+dy*cell,cell,tray[drag.i].color,.85));}
  later(frame,16);
 }
 function position(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*400/r.width,y:(e.clientY-r.top)*570/r.height};}
 canvas.addEventListener('pointerdown',e=>{
  if(ended||performance.now()>=deadline||e.isPrimary===false||e.button>0)return;e.preventDefault();const p=position(e);
  if(p.y>=474&&p.y<=555){const i=Math.min(2,Math.max(0,Math.floor(p.x/133.34)));selected=i;const touch=e.pointerType==='touch';drag={i,p,start:p,touch,id:e.pointerId,moved:false,target:target(p,tray[i].shape,touch)};canvas.setPointerCapture(e.pointerId);}
  else if(selected>=0&&p.x>=left&&p.x<left+352&&p.y>=top&&p.y<top+352){cursor={x:Math.floor((p.x-left)/cell),y:Math.floor((p.y-top)/cell)};drop(selected,cursor.x,cursor.y);}
 });
 canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;e.preventDefault();drag.p=position(e);if(Math.hypot(drag.p.x-drag.start.x,drag.p.y-drag.start.y)>6)drag.moved=true;drag.target=target(drag.p,tray[drag.i].shape,drag.touch);});
 canvas.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;e.preventDefault();const d=drag;drag=null;if(d.moved){const t=target(position(e),tray[d.i].shape,d.touch);drop(d.i,t.x,t.y);}else onStatus('Piece selected. Tap an empty square for its top-left corner, or drag it.');});
 canvas.addEventListener('pointercancel',()=>{drag=null;});canvas.addEventListener('lostpointercapture',()=>{drag=null;});
 canvas.addEventListener('keydown',e=>{
  if(!['1','2','3','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Escape'].includes(e.key))return;e.preventDefault();if(ended)return;
  if(['1','2','3'].includes(e.key))selected=Number(e.key)-1;
  if(e.key==='Escape'){selected=-1;return;}
  if(selected<0)return;
  if(e.key==='ArrowLeft')cursor.x=Math.max(0,cursor.x-1);if(e.key==='ArrowRight')cursor.x=Math.min(7,cursor.x+1);if(e.key==='ArrowUp')cursor.y=Math.max(0,cursor.y-1);if(e.key==='ArrowDown')cursor.y=Math.min(7,cursor.y+1);
  if(e.key==='Enter'||e.key===' ')drop(selected,cursor.x,cursor.y);
  else onStatus(`Piece ${selected+1}, row ${cursor.y+1}, column ${cursor.x+1}. ${blockFits(board,tray[selected].shape,cursor.x,cursor.y)?'Fits. Enter to place.':'Does not fit.'}`);
 });
 onStatus(`${team}: 60 seconds! Drag blocks onto the grid. Green means they fit. One point per piece.`);frame();
}
