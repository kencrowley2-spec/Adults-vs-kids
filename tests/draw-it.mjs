import assert from 'node:assert/strict';
import {DrawMatch} from '../public/arcade-draw-core.js';
import {drawingImage,visionRequest,visionAnswer} from '../lib/arcade/draw-vision.ts';
import {completedResult} from '../lib/arcade/results.ts';
for(const rounds of [3,5])for(const first of [0,1]){
 const m=new DrawMatch(rounds,first),chances=[0,0];
 for(let n=0;n<rounds*2;n++){assert.equal(m.round,Math.floor(n/2)+1);chances[m.guesser]++;m.settle(m.guesser===1);assert.equal(m.finished,n===rounds*2-1);}
 assert.deepEqual(chances,[rounds,rounds]);assert.deepEqual(m.scores,[0,rounds]);assert.equal(m.winner,1);assert.throws(()=>m.settle(true));
}
const u=new DrawMatch(0,0);assert.throws(()=>u.end());u.settle(true);assert.throws(()=>u.end());u.settle(true);u.end();assert.equal(u.winner,null);
const png=Buffer.alloc(25);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(1000,16);png.writeUInt32BE(1000,20);const image='data:image/png;base64,'+png.toString('base64');assert.equal(drawingImage({image}),image);assert.throws(()=>drawingImage({image,human:'dinosaur'}));assert.throws(()=>drawingImage({image,actual:'dinosaur'}));assert.throws(()=>drawingImage({image:'https://example.org/picture.png'}));assert.throws(()=>drawingImage({image:'data:image/png;base64,AAAA'}));
const request=visionRequest(image);assert.equal(request.store,false);assert.equal(request.input[0].content[1].image_url,image);assert.equal(JSON.stringify(request).includes('dinosaur'),false);
assert.deepEqual(visionAnswer({status:'completed',output:[{content:[{type:'output_text',text:'{"guess":"Maybe a dragon","comment":"Those wings deserve a high five!","uncertain":true}'}]}]}),{guess:'Maybe a dragon',comment:'Those wings deserve a high five!',uncertain:true});assert.throws(()=>visionAnswer({status:'incomplete'}));assert.throws(()=>visionAnswer({status:'completed',output:[{content:[{type:'output_text',text:'not json'}]}]}));
const id='c47ff1fc-85a9-40b4-812e-d7c3e147b11a';assert.equal(completedResult({id,mode:'single',gameIds:['draw'],roundWinners:[1]}).gameIds[0],'draw');assert.throws(()=>completedResult({id,mode:'single',gameIds:['draw'],roundWinners:[]}));
console.log('DRAW IT: balanced turns, 3/5/unlimited matches, ties, image validation, blind vision payload, honest service errors, and result schema passed.');

// Controller integration uses explicit service stubs, never a claimed real AI result.
const {JSDOM}=await import('jsdom');const vm=(await import('node:vm')).default;const fs=await import('node:fs');
async function fixture(rounds=3,success=true){
 const dom=new JSDOM('<body></body>',{url:'https://example.test',pretendToBeVisual:true});const {window}=dom;const context=new Proxy({},{get:(t,k)=>k==='getImageData'?()=>({data:[]}):()=>{}});
 window.HTMLCanvasElement.prototype.getContext=()=>context;window.HTMLCanvasElement.prototype.toDataURL=()=>image;window.HTMLCanvasElement.prototype.setPointerCapture=()=>{};
 window.HTMLElement.prototype.getBoundingClientRect=()=>({width:380,height:390,left:0,top:0});
 const requests=[],complete=[];let nextSuccess=success;
 const c=vm.createContext({window,document:window.document,DrawMatch,ResizeObserver:class{observe(){}disconnect(){}},AbortController,setTimeout,clearTimeout,setInterval,clearInterval,confirm:()=>true,fetch:async(url,opts)=>{requests.push(JSON.parse(opts.body));return {ok:nextSuccess,json:async()=>nextSuccess?{guess:'TEST SERVICE dragon',comment:'Test response only.',uncertain:true}:{error:'TEST SERVICE unavailable'}};}});
 vm.runInContext(fs.readFileSync(new URL('../public/arcade-draw.js',import.meta.url),'utf8').replace(/^import .*;\n/,'').replace('export function mountDraw','function mountDraw'),c);c.complete=r=>complete.push(r);vm.runInContext('this.cleanup=mountDraw({players:["Adults","Kids"],onComplete:complete})',c);
 const $=s=>window.document.querySelector(s);const click=s=>{assert.ok($(s),'Missing '+s);$(s).click();};
 click(`[data-rounds="${rounds}"]`);click('[data-action=start]');
 function draw(){const canvas=$('canvas');for(const type of ['pointerdown','pointermove','pointerup'])canvas.dispatchEvent(new window.MouseEvent(type,{bubbles:true,clientX:50,clientY:50,button:0}));}
 async function turn(correct=true){draw();click('[data-action=done]');$('#draw-answer').value='<dragon>';click('[data-action=lock]');click('[data-action=generate]');await new Promise(r=>setTimeout(r,0));if(nextSuccess){assert.match($('.draw-ai-answer').textContent,/TEST SERVICE/);click('[data-action=reveal]');}else{assert.match($('.draw-error').textContent,/unavailable/);assert.equal($('.draw-ai-answer'),null);click('[data-action=skip]');}$('#draw-answer').value='Dragon';click('[data-action=actual]');assert.equal($('.draw-comparison script'),null);click('[data-action='+ (correct?'correct':'incorrect')+']');}
 return {$,click,draw,turn,requests,complete,cleanup:c.cleanup,service:value=>nextSuccess=value};
}
const f=await fixture();assert.equal(f.$('#draw-done').disabled,true);f.draw();assert.equal(f.$('#draw-done').disabled,false);f.click('[data-action=undo]');assert.equal(f.$('#draw-done').disabled,true);f.click('[data-action=redo]');assert.equal(f.$('#draw-done').disabled,false);f.click('[data-action=clear]');assert.equal(f.$('#draw-done').disabled,true);f.click('[data-action=undo]');assert.equal(f.$('#draw-done').disabled,false);
for(let i=0;i<6;i++){await f.turn(i%2===0);assert.equal(f.requests.length,i+1);assert.deepEqual(Object.keys(f.requests[i]),['image']);if(i<5)f.click('[data-action=next]');}
f.click('[data-action=finish]');assert.equal(f.complete.length,1);assert.equal(f.complete[0].scores.reduce((a,b)=>a+b),3);f.click('[data-action=rematch]');assert.equal(f.$('#draw-done').disabled,true);assert.match(f.$('.draw-eyebrow').textContent,/ROUND 1/);f.cleanup();
const fail=await fixture(0,false);await fail.turn();fail.click('[data-action=next]');await fail.turn();fail.click('[data-action=end]');assert.equal(fail.complete[0].winner,null);fail.cleanup();
console.log('DRAW IT controller: draw/undo/redo/clear, locked guess escaping, image-only submission, test AI reveal, failure/skip, alternating turns, scoring, completion, ties and rematch passed.');
