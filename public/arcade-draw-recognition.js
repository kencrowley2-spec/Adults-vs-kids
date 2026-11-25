// The model is fetched only when Draw It needs it. No player data enters the request.
let modelPromise;
async function loadModel() {
  if (!modelPromise) {
    modelPromise = fetch('/assets/draw-it/doodle-model-v1.json', {signal: AbortSignal.timeout(4500)})
      .then(async response => {
        if (!response.ok) throw Error('Doodle model unavailable');
        const {side, labels, weights, biases} = await response.json();
        const layers = weights.map(({bytes, scale}, i) => {
          const values = Float32Array.from(atob(bytes), c => (c.charCodeAt(0) << 24 >> 24) * scale);
          return {values, bias: biases[i]};
        });
        return {side, labels, layers};
      }).catch(error => { modelPromise = undefined; throw error; });
  }
  return modelPromise;
}

function canvas(width, height) {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  return el;
}

// Crop the finished bitmap so undo, erasing, light ink and off-center drawings
// are interpreted exactly as they appear on the paper.
function readInk(paper, side) {
  const scale = 144 / Math.max(paper.width, paper.height);
  const preview = canvas(Math.max(1, Math.round(paper.width*scale)), Math.max(1, Math.round(paper.height*scale)));
  const ctx = preview.getContext('2d', {willReadFrequently:true});
  ctx.drawImage(paper, 0, 0, preview.width, preview.height);
  const pixels = ctx.getImageData(0, 0, preview.width, preview.height);
  let left=preview.width, right=-1, top=preview.height, bottom=-1;
  for (let y=0; y<preview.height; y++) {
    for (let x=0; x<preview.width; x++) {
      const i=(y*preview.width+x)*4, data=pixels.data;
      const ink=255-Math.min(data[i],data[i+1],data[i+2]);
      data[i]=data[i+1]=data[i+2]=ink;
      if (ink>24) {
        left=Math.min(left,x); right=Math.max(right,x);
        top=Math.min(top,y); bottom=Math.max(bottom,y);
      }
    }
  }
  const w=right-left+1, h=bottom-top+1;
  if (w<3 || h<3) return null;
  ctx.putImageData(pixels,0,0);
  const small=canvas(side,side), g=small.getContext('2d',{willReadFrequently:true});
  const fit=(side-2)/Math.max(w,h), targetW=Math.max(1,Math.round(w*fit)), targetH=Math.max(1,Math.round(h*fit));
  g.fillStyle='#000'; g.fillRect(0,0,side,side);
  g.imageSmoothingQuality='high';
  g.drawImage(preview,left,top,w,h,Math.floor((side-targetW)/2),Math.floor((side-targetH)/2),targetW,targetH);
  const data=g.getImageData(0,0,side,side).data;
  const ink=Float32Array.from({length:side*side},(_,i)=>data[i*4]);
  const peak=Math.max(...ink);
  if (peak<12) return null;
  return ink.map(v=>Math.min(1,v/peak));
}

export async function recognizeDrawing(paper) {
  const {side,labels,layers}=await loadModel();
  let values=readInk(paper,side);
  if (!values) return null;
  for (let k=0;k<layers.length;k++) {
    const {values:weights,bias}=layers[k];
    const sums=Float32Array.from(bias);
    for (let i=0;i<values.length;i++) {
      for (let j=0;j<sums.length;j++) sums[j]+=values[i]*weights[i*sums.length+j];
    }
    values=k===0?sums.map(x=>Math.max(0,x)):sums;
  }
  const best=Math.max(...values), probabilities=values.map(v=>Math.exp(v-best));
  const total=probabilities.reduce((a,b)=>a+b,0);
  const sorted=probabilities.slice().sort().reverse();
  if (sorted[0]/total < .67 || (sorted[0]-sorted[1])/total < .38) return null;
  return labels[values.indexOf(best)];
}
