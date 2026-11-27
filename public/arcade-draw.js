import {DrawMatch} from './arcade-draw-core.js';
import {recognizeDrawing} from './arcade-draw-recognition.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const drawingIdeas=['a melting ice cream','a shark fin','a sailboat','a birthday cake','a sleepy cat','a snowman','a slice of watermelon','a smiling sun','an umbrella','a butterfly','a crown','a bicycle','a pair of glasses','a treehouse','a pizza slice','a spider'];
const colors=[['Ink','#172033'],['Red','#f04452'],['Orange','#ff8a28'],['Yellow','#ffd522'],['Green','#31be75'],['Blue','#249af4'],['Purple','#9060df'],['Pink','#f06db4'],['Brown','#996344'],['White','#ffffff']];
export function mountDraw({players=['Adults','Kids'],onExit=()=>{},onComplete=()=>{},beforeRematch=()=>true,signedIn=false,cloudVision=false,allowVoice=()=>true}={}){
 const host=document.createElement('section');host.className='draw-game';host.setAttribute('aria-label','Draw It drawing and guessing game');
 host.innerHTML=`<header class="draw-top"><button data-action="exit" aria-label="Return to Arcade Rolodex">←</button><div><small>ADULTS vs. KIDS™</small><b>DRAW IT<span>!</span></b></div><button data-action="sound" aria-pressed="true">♫ On</button></header><div class="draw-scores"></div><div class="draw-body"></div>`;
 document.body.append(host);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
 const body=host.querySelector('.draw-body');let match,phase='setup',strokes=[],redo=[],active=null,tool='marker',color=colors[0][1],size=8,human='',ai=null,actual='',disposed=false,abort=null,speech=null,audio=null,sound=true,musicTimer=null,musicStep=0,done=false,resize=null;
 let scanId=0,cloudTried=false,ideaIndex=-1;
 const paper=document.createElement('canvas');paper.width=1000;paper.height=1000;paper.setAttribute('aria-label','Blank drawing canvas. Draw with your finger, mouse or pen.');paper.tabIndex=0;const ctx=paper.getContext('2d');
 const get=id=>host.querySelector('#'+id);
 function tone(f=523,d=.12,v=.045){if(!sound||!audio||document.hidden)return;const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(t+d+.01);o.onended=()=>{o.disconnect();g.disconnect();};}
 function unlock(){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});if(!musicTimer)musicTimer=setInterval(()=>{if(phase==='setup'||document.hidden)return;const notes=phase==='scan'?[220,233,247,262]:[262,330,392,330,294,349,440,349];tone(notes[musicStep++%notes.length],.22,.012);},phase==='scan'?190:360);}catch{}}
 function cheer(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>{if(!disposed)tone(f,.22);},i*110));}
 function score(){host.querySelector('.draw-scores').innerHTML=match?players.map((p,i)=>`<div class="${match.guesser===i&&!match.finished?'draw-current':''}"><span>${esc(p)}</span><b>${match.scores[i]}</b></div>`).join(''):players.map(p=>`<div><span>${esc(p)}</span><b>0</b></div>`).join('');}
 function show(html){resize?.disconnect();resize=null;speech?.abort();speech=null;body.innerHTML=html;body.scrollTop=0;score();}
 function badge(text){return `<p class="draw-eyebrow">${text}</p>`;}
 function button(text,action,secondary=false){return `<button class="${secondary?'draw-secondary':'draw-primary'}" data-action="${action}">${text}</button>`;}
 function roundBadge(){return badge(`ROUND ${match.round}${match.rounds?' / '+match.rounds:' · KEEP PLAYING'} · ${esc(players[match.artist])} DRAWS`);}
 function setup(){
  phase='setup';
  show(`<div class="draw-welcome"><div class="draw-cover"><img src="/assets/featured/draw-480.webp" srcset="/assets/featured/draw-480.webp 480w, /assets/featured/draw-960.webp 960w" sizes="(max-width:510px) 95vw, 480px" alt="" width="960" height="720">${badge('DRAW IT!')}<h1>Visual <em>Charades</em></h1><p>Give a clue with a picture. Can your partner guess what you drew?</p></div>
  <p class="draw-rules">Take turns drawing in silence. Your partner locks one guess, then the sketch AI takes a look. The artist awards one point for a close-enough guess.</p>
  <div class="draw-round-choices" role="group" aria-label="Match length">${[3,5,0].map(n=>`<button data-rounds="${n}" aria-pressed="${n===3}">${n||'∞'}<small>${n?'ROUNDS':'FREE PLAY'}</small></button>`).join('')}</div>
  ${button('Start drawing →','start')}<p class="draw-fine">Both players draw once per round.</p>
  <details><summary>About sketch recognition and voice</summary><p>The sketch reader runs on this device and knows 88 everyday doodles. When it’s unsure, play continues with your partner’s guess. ${cloudVision?'You can also choose to send just the picture to the online AI for a second opinion. Provider safety retention may apply. ':''}${signedIn?'Completed drawings are saved to your private Clubhouse Gallery. ':''}Optional dictation uses your browser’s speech service.</p>
  <p>Sketch reader trained with Google, Inc.’s <a href="https://quickdraw.withgoogle.com/data" target="_blank" rel="noopener noreferrer">Quick, Draw! dataset</a>, adapted under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.</p></details></div>`);
 }
 function redraw(){ctx.fillStyle='#fff';ctx.globalAlpha=1;ctx.fillRect(0,0,paper.width,paper.height);for(const s of strokes)paint(s);if(active)paint(active);}
 function paint(s){if(s.tool==='clear'){ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.fillRect(0,0,paper.width,paper.height);return;}ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=s.tool==='eraser'?'#fff':s.color;ctx.fillStyle=ctx.strokeStyle;const pts=s.points;
 const pencil=['pencil','colored'].includes(s.tool),brush=s.tool==='brush';ctx.globalAlpha=s.tool==='marker'?.82:brush?.26:pencil?.66:1;ctx.lineWidth=s.size*(s.tool==='eraser'?3:brush?2:pencil?.65:1);
 if(pts.length===1){ctx.beginPath();ctx.arc(pts[0].x,pts[0].y,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}
 else{ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++){const prev=pts[i-1],p=pts[i];ctx.quadraticCurveTo(prev.x,prev.y,(prev.x+p.x)/2,(prev.y+p.y)/2);}const p=pts.at(-1);ctx.lineTo(p.x,p.y);ctx.stroke();}
 if(pencil){ctx.globalAlpha=.18;ctx.lineWidth=Math.max(.6,s.size*.08);for(let k=-2;k<=2;k++){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x+k*1.1,p.y+k*.6):ctx.moveTo(p.x+k*1.1,p.y+k*.6));ctx.stroke();}}
 if(brush){ctx.globalAlpha=.13;ctx.lineWidth=s.size*.4;for(let k=-2;k<=2;k++){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x+k*s.size*.3,p.y):ctx.moveTo(p.x+k*s.size*.3,p.y));ctx.stroke();}}ctx.restore();}
 function position(e){const r=paper.getBoundingClientRect();return {x:Math.max(0,Math.min(paper.width,(e.clientX-r.left)*paper.width/r.width)),y:Math.max(0,Math.min(paper.height,(e.clientY-r.top)*paper.height/r.height))};}
 paper.onpointerdown=e=>{if(phase!=='draw'||active||e.button>0)return;e.preventDefault();paper.setPointerCapture(e.pointerId);active={tool,color,size,points:[position(e)],pointer:e.pointerId};redraw();};
 paper.onpointermove=e=>{if(!active||e.pointerId!==active.pointer)return;e.preventDefault();const samples=e.getCoalescedEvents?.();for(const point of samples?.length?samples:[e])active.points.push(position(point));redraw();};
 function endStroke(e){if(!active||e.pointerId!==active.pointer)return;strokes.push(active);active=null;redo=[];redraw();syncTools();}
 paper.onpointerup=endStroke;paper.onpointercancel=endStroke;paper.onlostpointercapture=endStroke;
 function syncTools(){const undo=get('draw-undo'),red=get('draw-redo'),done=get('draw-done');if(undo)undo.disabled=!strokes.length;if(red)red.disabled=!redo.length;if(done)done.disabled=!strokes.slice(strokes.findLastIndex(s=>s.tool==='clear')+1).some(s=>s.tool!=='eraser');host.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));host.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===color)));}
 function drawing(){phase='draw';show(`<div class="draw-drawing">${roundBadge()}<div class="draw-title-row"><h1>${esc(players[match.artist])}, draw it!</h1><button class="draw-idea-toggle" data-action="idea" aria-haspopup="dialog">✦ Need an idea?</button></div><dialog class="draw-idea"><p class="draw-eyebrow">FOR THE ARTIST’S EYES</p><h2>Try drawing…</h2><strong></strong><p>Use this idea or draw your own. Hide the card before you pass the screen.</p>${button('Hide card & draw','hide-idea')}${button('Another idea','idea',true)}</dialog><div class="draw-paper"></div><div class="draw-toolbar"><div class="draw-tools" role="group" aria-label="Drawing tools">${[['pencil','✎','Pencil'],['colored','✐','Color pencil'],['marker','▰','Marker'],['brush','🖌','Paintbrush'],['eraser','▱','Eraser']].map(([id,icon,label])=>`<button data-tool="${id}" aria-label="${label}" aria-pressed="${id===tool}"><span aria-hidden="true">${icon}</span><small>${label}</small></button>`).join('')}</div><div class="draw-colors" role="group" aria-label="Ink color">${colors.map(([name,c])=>`<button data-color="${c}" style="--ink:${c}" aria-label="${name}" aria-pressed="${c===color}"></button>`).join('')}</div><div class="draw-edit"><label>Size <input id="draw-size" aria-label="Line thickness" type="range" min="3" max="36" value="${size}"></label><button id="draw-undo" data-action="undo" aria-label="Undo stroke">↶</button><button id="draw-redo" data-action="redo" aria-label="Redo stroke">↷</button><button data-action="clear">Clear</button></div></div><button id="draw-done" class="draw-primary" data-action="done">Pass to the guesser →</button></div>`);const holder=body.querySelector('.draw-paper');holder.append(paper);const r=holder.getBoundingClientRect(),ratio=Math.max(.25,Math.min(3,r.height/r.width));paper.width=Math.min(1000,Math.floor(1500/ratio));paper.height=Math.round(paper.width*ratio);
 function fit(){const box=holder.getBoundingClientRect(),k=Math.min((box.width-6)/paper.width,(box.height-6)/paper.height);paper.style.width=(paper.width*k)+'px';paper.style.height=(paper.height*k)+'px';}fit();resize=new ResizeObserver(fit);resize.observe(holder);redraw();syncTools();get('draw-size').oninput=e=>size=Number(e.target.value);}
 function picture(){return '<div class="draw-preview"></div>';}
 function putPicture(){const img=document.createElement('img');img.src=paper.toDataURL('image/png');img.alt='The artist’s drawing for this turn';body.querySelector('.draw-preview')?.append(img);}
 function input(label,action,text){return `<label class="draw-answer-label" for="draw-answer">${label}</label><div class="draw-input"><input id="draw-answer" maxlength="80" autocomplete="off" placeholder="Type your answer…"><button type="button" data-action="mic" aria-label="Speak your answer">🎙</button></div><p class="draw-voice-status" role="status"></p>${button(text,action)}`;}
 function enableVoice(){get('draw-answer').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing)host.querySelector('[data-action="'+(phase==='guess'?'lock':'actual')+'"]').click();});}
 function guessing(){phase='guess';show(`<div class="draw-card">${roundBadge()}<h1>${esc(players[match.guesser])}, guess it!</h1>${picture()}${input('What do you think it is?','lock','Lock my guess →')}</div>`);putPicture();enableVoice();}
 async function readDrawing(online=false){
  const id=++scanId;
  phase='scan';
  show(`<div class="draw-card draw-scanning">${badge(online?'ONLINE SECOND OPINION':'SKETCH READER')}<h1>Reading the drawing…</h1>
  <div class="draw-scan-wrap">${picture()}<div class="draw-scan-line"></div></div>
  ${button('Use our guess now','skip',true)}</div>`);
  putPicture();
  const controller=new AbortController();
  abort=controller;
  const timeout=setTimeout(()=>controller.abort(),8000);
  let guess=null;
  try{
   if(online){
    cloudTried=true;
    const response=await fetch('/api/arcade/draw-it',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:paper.toDataURL('image/png')}),signal:controller.signal});
    if(response.ok){
     const result=await response.json();
     if(result.uncertain===false && typeof result.guess==='string' && result.guess.trim() && result.guess.length<=100)guess=result.guess.trim();
    }
   }else{
    guess=await recognizeDrawing(paper);
   }
  }catch{ /* An unreadable picture or an unavailable reader leaves the human guess in play. */ }
  finally{clearTimeout(timeout);if(abort===controller)abort=null;}
  if(disposed || id!==scanId)return;
  ai=guess;
  reveal();
 }
 function reveal(){
  phase='reveal';
  const attribution=ai?'Sketch AI guessed':esc(players[match.guesser])+' guessed';
  show(`<div class="draw-card">${badge('ARTIST REVEAL')}<h1>${esc(players[match.artist])}, what did you draw?</h1>
  ${picture()}<div class="draw-answer-tile draw-reader"><small>${attribution}</small><b class="draw-ai-answer">${esc(ai||human)}</b></div>
  <p class="draw-fine">${ai?'Your partner locked in “'+esc(human)+'”.':'Using your partner’s guess. Keep it or enter what you meant.'}</p>
  ${input('Artist’s answer','actual','Reveal the answer →')}
  ${cloudVision&&!ai&&!cloudTried?button('Send sketch to online AI for a second opinion','online',true):''}</div>`);
  putPicture();get('draw-answer').value=ai?'':human;enableVoice();
 }
 function compare(){phase='judge';show(`<div class="draw-card">${badge('SCORE THE SKETCH')}<h1>Did they get it?</h1>${picture()}<div class="draw-comparison ${ai?'':'draw-human-reveal'}">${[[players[match.guesser]+' GUESSED',human],...(ai?[['SKETCH AI',ai]]:[]),['ACTUAL DRAWING',actual]].map(([l,v])=>`<div class="draw-answer-tile"><small>${esc(l)}</small><b>${esc(v)}</b></div>`).join('')}</div><h2>${esc(players[match.artist])}, did the human get it?</h2><p>Close enough counts if you say so.</p><div class="draw-judge">${button('YES! +1 POINT','correct')}${button('GOOD TRY! NO POINT','incorrect',true)}</div></div>`);putPicture();}
 async function saveDrawing(payload,status){
  try{
   const response=await fetch('/api/club/gallery',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
   if(!response.ok||(await response.json()).saved!==true)throw Error();
   status.textContent='Saved to your private Clubhouse Gallery.';
  }catch{
   if(disposed||!status.isConnected)return;
   status.textContent='Gallery save unconfirmed. ';
   const retry=document.createElement('button');retry.type='button';retry.textContent='Retry save';
   retry.onclick=()=>{status.textContent='Saving drawing…';saveDrawing(payload,status);};
   status.append(retry);
  }
 }
 function settle(correct){
  if(phase!=='judge')return;
  const payload=signedIn?{image:paper.toDataURL('image/jpeg',.85),title:(actual+' · '+players[match.artist]).slice(0,100),source:'draw'}:null;
  const guesser=match.guesser;match.settle(correct);phase='handoff';if(correct)cheer();show(`<div class="draw-card ${correct?'draw-party':''}">${correct?'<div class="draw-fireworks" aria-hidden="true"><span>✺</span><span>✺</span><span>✺</span></div><div class="draw-confetti" aria-hidden="true">'+Array.from({length:24},(_,i)=>`<i style="--i:${i};--ink:${colors[i%9][1]}"></i>`).join('')+'</div>':''}${badge(correct?'NAILED IT!':'THAT’S ONE ORIGINAL MASTERPIECE!')}<div class="draw-big-emoji">${correct?'🎉':'🎨'}</div><h1>${correct?esc(players[guesser])+' earns 1 point!':'Keep those imaginations going!'}</h1><p>${match.finished?'Let’s see the final scoreboard.':esc(players[match.artist])+', you’re the next artist!'}</p>${payload?'<p class="draw-fine draw-gallery-status" role="status">Saving drawing…</p>':''}${button(match.finished?'MEET THE WINNER 🏆':'SWITCH PLAYERS →',match.finished?'finish':'next')}${!match.finished&&match.rounds===0&&match.turn%2===0?button('FINISH MATCH','end',true):''}</div>`);if(payload)saveDrawing(payload,body.querySelector('.draw-gallery-status'));strokes=[];redo=[];active=null;human='';ai=null;actual='';cloudTried=false;redraw();}
 function finish(){if(done)return;done=true;phase='finish';const w=match.winner;show(`<div class="draw-card draw-party">${badge('DRAW IT! · MATCH COMPLETE')}<div class="draw-big-emoji">${w===null?'🤝':'🏆'}</div><h1>${w===null?'A masterpiece of a tie!':esc(players[w])+' wins!'}</h1><p>${players.map((p,i)=>esc(p)+' <strong>'+match.scores[i]+'</strong>').join(' &nbsp; vs. &nbsp; ')}</p><p>Big imaginations. Bigger laughs.<br>Everyone gets a high five.</p>${button('REMATCH! ↻','rematch')}${button('RETURN TO ARCADE ROLODEX','exit',true)}</div>`);cheer();onComplete({winner:w,scores:[...match.scores]});}
 function mic(){if(!allowVoice('RETURN TO GAME'))return;const inputAtStart=get('draw-answer');const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;const status=body.querySelector('.draw-voice-status');if(!Recognition){status.textContent='Voice is unavailable in this browser. You can type your answer.';return;}speech?.abort();const rec=speech=new Recognition();rec.lang='en-US';rec.interimResults=false;status.textContent='Listening… say your answer.';rec.onresult=e=>{if(!disposed&&get('draw-answer')===inputAtStart)inputAtStart.value=e.results[0][0].transcript.slice(0,80);};rec.onerror=()=>{status.textContent='Voice unavailable. You can type your answer.';};rec.onend=()=>{if(status.textContent.startsWith('Listening'))status.textContent='Check your answer before locking it.';};try{rec.start();}catch{status.textContent='Voice unavailable. You can type your answer.';}}
 function value(){const el=get('draw-answer');const v=el.value.trim();if(!v){el.setCustomValidity('Enter your answer first.');el.reportValidity();el.oninput=()=>el.setCustomValidity('');return null;}return v;}
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.rounds!==undefined){host.querySelectorAll('[data-rounds]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return;}
 if(b.dataset.tool){tool=b.dataset.tool;syncTools();return;}if(b.dataset.color){color=b.dataset.color;syncTools();return;}
 const a=b.dataset.action;if(a==='exit'){if(phase!=='setup'&&phase!=='finish'&&!confirm('Leave this match? Your drawing and points will be cleared.'))return;cleanup();onExit();return;}
 if(a==='sound'){sound=!sound;b.textContent=sound?'♫ On':'♫ Off';b.setAttribute('aria-pressed',String(sound));if(!sound)audio?.suspend();else unlock();return;}unlock();tone();
 if(a==='start'||a==='rematch'){if(a==='rematch'&&!beforeRematch())return;const rounds=a==='start'?Number(host.querySelector('[data-rounds][aria-pressed="true"]').dataset.rounds):match.rounds;match=new DrawMatch(rounds,Math.random()<.5?0:1);done=false;strokes=[];redo=[];drawing();}
 if(a==='idea'&&phase==='draw'){
  ideaIndex=(ideaIndex+1+Math.floor(Math.random()*(drawingIdeas.length-1)))%drawingIdeas.length;
  const card=body.querySelector('.draw-idea');card.querySelector('strong').textContent=drawingIdeas[ideaIndex];if(!card.open)card.showModal();
 }
 if(a==='hide-idea'&&phase==='draw')body.querySelector('.draw-idea').close();
 if(a==='undo'&&phase==='draw'&&strokes.length){redo.push(strokes.pop());redraw();syncTools();}if(a==='redo'&&phase==='draw'&&redo.length){strokes.push(redo.pop());redraw();syncTools();}
 if(a==='clear'&&phase==='draw'&&confirm('Clear this drawing? You can undo this.')){if(strokes.length){strokes.push({tool:'clear'});redo=[];redraw();syncTools();}}
 if(a==='done'&&phase==='draw'&&strokes.length)guessing();
 if(a==='lock'&&phase==='guess'){const v=value();if(v){human=v;readDrawing();}}
 if(a==='online'&&phase==='reveal'&&cloudVision&&!cloudTried)readDrawing(true);
 if(a==='skip'&&phase==='scan'){scanId++;abort?.abort();ai=null;reveal();}
 if(a==='actual'&&phase==='reveal'){const v=value();if(v){actual=v;compare();}}
 if(a==='mic')mic();if(a==='correct')settle(true);if(a==='incorrect')settle(false);if(a==='next'&&phase==='handoff')drawing();if(a==='finish'&&phase==='handoff')finish();if(a==='end'&&phase==='handoff'){match.end();finish();}
 });
 // Drawing survives orientation changes because strokes use fixed paper coordinates.
 function visibility(){if(document.hidden){audio?.suspend();speech?.abort();}else if(sound&&audio)audio.resume().catch(()=>{});}
 document.addEventListener('visibilitychange',visibility);
 function cleanup(){if(disposed)return;disposed=true;resize?.disconnect();abort?.abort();speech?.abort();clearInterval(musicTimer);audio?.close().catch(()=>{});document.removeEventListener('visibilitychange',visibility);strokes=[];redo=[];paper.width=1;paper.height=1;host.remove();document.body.style.overflow=overflow;}
 setup();return cleanup;
}
