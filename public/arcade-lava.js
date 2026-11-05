import {RULES,TRAPS,course,reachable,flight,danger,placeTrap,LavaMatch,platformAppearance} from './arcade-lava-core.js?v=4';
const COLORS={safe:'#2bd8ff',start:'#3ee4ff',finish:'#ffe14f',crack:'#ff5058'};
const LABELS={crack:'Breaking Block'};
const SYMBOLS={crack:'ϟ'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountLava({players=['Adults','Kids'],onExit,onComplete=()=>{}}){
 let match=new LavaMatch(Math.random()<.5?0:1),tiles=course(),phase='welcome',phaseTime=0,elapsed=0,current=0,landed=0,jump=null,paused=false,disposed=false,raf=0,last=0,particles=[],toastUntil=0,transition=null,music=true,sfx=true,audio=null,musicStep=0,musicClock=0,lastTick=-1,completed=false,tutorial=false,cameraX=0,fallEffect=null;
 const host=document.createElement('section');host.className='lava-game';host.setAttribute('aria-label','Floor Is Lava: Trap Master');
 host.innerHTML=`<div class="lava-hud"><div class="lava-brand"><small>ADULTS vs. KIDS™</small><strong>FLOOR IS LAVA</strong><small>TRAP MASTER</small></div><div class="lava-score" aria-label="Running match score"></div><div class="lava-sound"><button data-action="music" aria-pressed="true">♫ Music</button><button data-action="sfx" aria-pressed="true">♪ Effects</button></div><button data-action="pause" aria-label="Pause game">Ⅱ</button><button class="lava-exit" data-action="exit" aria-label="Return to Arcade">×</button></div><div class="lava-playfield"><canvas tabindex="0" role="application" aria-label="Lava obstacle course. Tap glowing reachable platforms to jump. Keyboard: arrow keys select a target, Enter jumps; P pauses."></canvas><div class="lava-phase"><strong></strong><b></b></div><div class="lava-round"></div><div class="lava-toast" role="status" aria-live="polite"></div><div class="lava-overlay"></div></div><div class="lava-bottom"><div class="lava-tools"></div><div class="lava-hint"></div></div><div class="lava-rotate"><span style="font-size:60px">↻</span><b>Turn your phone sideways</b><p>Landscape gives your lava room more space.</p><button data-action="exit">Return to Arcade</button></div>`;
 document.body.appendChild(host);const bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),overlay=host.querySelector('.lava-overlay'),score=host.querySelector('.lava-score'),tools=host.querySelector('.lava-tools'),hint=host.querySelector('.lava-hint'),title=host.querySelector('.lava-phase strong'),timer=host.querySelector('.lava-phase b'),roundLabel=host.querySelector('.lava-round'),toast=host.querySelector('.lava-toast');
 const background=new Image();background.src='/assets/lava-room.webp';const atlas=new Image();atlas.src='/assets/lava-sprites.webp';let cw=1000,ch=500,scale=1,ox=0,oy=0,targetId=1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function tone(freq,dur=.15,type='triangle',level=.05,end=freq){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+dur);g.gain.setValueAtTime(level,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+dur+.01);o.onended=()=>{o.disconnect();g.disconnect();};}
 function sound(kind){if(!sfx||paused)return;if(kind==='jump')tone(330,.2,'sine',.065,700);else if(kind==='fall'){tone(450,.5,'sawtooth',.06,45);noise(.4,.12);}else if(kind==='land')tone(120,.09,'sine',.1,70);else if(kind==='crack'){noise(.12,.07);tone(100,.12,'sawtooth',.04,40);}else if(kind==='win'){[523,659,784,1046].forEach((f,i)=>{if(audio){const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.13;o.frequency.value=f;g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.26);o.onended=()=>{o.disconnect();g.disconnect();};}});noise(.8,.05);}else tone(650,.08,'triangle',.04);}
 function noise(duration,level){if(!audio)return;const b=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const n=audio.createBufferSource(),g=audio.createGain();n.buffer=b;g.gain.value=level;n.connect(g);g.connect(audio.destination);n.start();n.onended=()=>{n.disconnect();g.disconnect();};}
 function unlock(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(!paused)audio.resume().catch(()=>{});}catch{}}
 function notify(text,seconds=2.5){toast.textContent=text;toastUntil=phaseTime+seconds;}
 function updateScore(){score.innerHTML=players.map((p,i)=>`<span><em>${esc(p)}</em><b>${match.scores[i]}</b></span>`).join('');roundLabel.innerHTML=match.sudden?'SUDDEN DEATH<small>Identical preset · fastest escape</small>':`ROUND ${Math.min(3,match.round+1)} of 3<small>${esc(players[match.builder])}’s course</small>`;}
 function show(html){overlay.innerHTML=html;overlay.querySelector('button')?.focus({preventScroll:true});}
 function screen(titleText,detail,actionLabel,action){show(`<p class="lava-eyebrow">ADULTS vs. KIDS™ · FLOOR IS LAVA</p><h1>${titleText}</h1><p>${detail}</p>${actionLabel?`<button class="lava-primary" data-action="continue">${actionLabel}</button>`:''}`);if(action)overlay.querySelector('[data-action=continue]').onclick=action;}
 function welcome(){phase='welcome';phaseTime=0;updateScore();title.textContent='TRAP MASTER';timer.textContent='3 COMPLETE ROUNDS';tools.innerHTML='';hint.textContent='Build clever traps. Then survive theirs. One phone. Two rivals.';
 show(`<p class="lava-eyebrow">ADULTS vs. KIDS™ PRESENTS</p><h1>FLOOR IS LAVA</h1><h2>TRAP MASTER</h2><p>${esc(players[0])} <b style="color:#ffdc43">VS.</b> ${esc(players[1])}</p><p>20 seconds to build. 30 seconds to escape.<br>Tap glowing platforms to jump. Watch the traps!</p><div class="lava-actions"><button class="lava-primary" data-action="start">LET’S PLAY!</button><button data-action="tutorial">Try a practice jump</button></div>`);
 }
 function intro(){unlock();phase='intro';phaseTime=0;screen('WHO WILL SURVIVE THE LAVA?!',`${esc(players[match.builder])} builds first! Get ready…`);transition={at:3,fn:beginBuild};}
 function beginBuild(){phase='build';phaseTime=0;elapsed=0;fallEffect=null;tiles=course(match.round,match.easy);current=0;landed=0;jump=null;overlay.innerHTML='';updateScore();title.textContent=`${players[match.builder]} · BUILD YOUR TRAP!`;tools.innerHTML='<span style="color:#ffdc43">ϟ BREAKING BLOCKS</span>';hint.textContent='RUNNER: look away! Builder: tap up to 6 blocks. Leave a safe block between traps. Tap again to remove.';}
 function lockBuild(){phase='handoff';phaseTime=0;tools.innerHTML='';toast.textContent='';toastUntil=0;screen('PASS THE PHONE!',`${esc(players[match.runner])}, your turn!<br>All blocks look blue. Hidden breaking blocks turn red when you land. Jump away before they collapse!`);transition={at:4,fn:()=>{phase='countdown';phaseTime=0;screen('3','Get ready to jump!');lastTick=-1;}};}
 function beginEscape(){phase='escape';phaseTime=0;elapsed=0;overlay.innerHTML='';current=0;landed=0;jump=null;title.textContent=`${players[match.runner]} · ESCAPE THE LAVA!`;hint.textContent='Tap glowing blocks to jump. If one turns red, jump again quickly!';sound('jump');}
 function tutorialStart(){unlock();tutorial=true;phase='practice';phaseTime=0;elapsed=0;fallEffect=null;tiles=course();current=0;landed=0;jump=null;overlay.innerHTML='';title.textContent='PRACTICE · TAP A GLOWING PLATFORM';timer.textContent='NO TIMER';hint.textContent='Tap a glowing ring. You only need one finger. Practice is not scored.';notify('Tap the next blue platform with a glowing ring.',30);}
 function startJump(id){if(!['escape','practice'].includes(phase)||jump||paused||!reachable(tiles,current,id))return;const duration=flight(tiles[current]);jump={from:current,to:id,start:elapsed,duration};sound('jump');}
 function splash(x,y,color='#ffc22f',n=24){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=50+Math.random()*130;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-100,life:1+Math.random(),color,size:3+Math.random()*5});}}
 function endAttempt(success,reason){
  if(phase!=='escape')return;
  if(success){settleAttempt(true,reason);return;}
  const at=tiles[jump?.to??current];jump=null;phase='falling';phaseTime=0;
  fallEffect={x:at.x,y:at.y,splashed:false};overlay.innerHTML='';toast.textContent='';
  title.textContent='OH NO! INTO THE LAVA!';hint.textContent='SPLAAASH! The lava claims another pair of sneakers!';
  sound('fall');
  transition={at:1.8,fn:()=>settleAttempt(false,reason)};
 }
 function settleAttempt(success,reason){const runner=match.runner,builder=match.builder;if(success){sound('win');}const oldRound=match.round,oldSudden=match.sudden;match.finishAttempt(success,elapsed);phase='result';phaseTime=0;updateScore();let detail=success?`${esc(players[runner])}: +${100+2*Math.floor(Math.max(0,30-elapsed))} escape points · ${elapsed.toFixed(2)} seconds`:`${esc(players[builder])}: +50 trap points · ${esc(reason)}`;
 if(oldSudden)detail=`${esc(players[runner])}: ${success?`escaped in ${elapsed.toFixed(3)}s`:'did not escape'} · Sudden death adds no points.`;
 const lead=match.scores[0]===match.scores[1]?'The scores are tied!':`${esc(players[match.scores[0]>match.scores[1]?0:1])} leads!`;
 screen(success?'THEY MADE IT!':'LAVA GOT YOU!',`${detail}<br>${oldRound!==match.round&&!oldSudden?`ROUND COMPLETE · ${lead}<br>`:''}${match.complete?'Meet your lava champion…':match.sudden?'SUDDEN DEATH · Both players run the same preset.':'SWITCH SIDES! Now it’s your turn to build!'}`);
 transition={at:4.5,fn:()=>match.complete?finish():match.sudden?beginSudden():beginBuild()};}
 function beginSudden(){tiles=course(0,match.easy);if(!match.easy){tiles[4].type='crack';tiles[8].type='crack';}fallEffect=null;jump=null;current=0;elapsed=0;landed=0;phase='handoff';phaseTime=0;updateScore();screen('SUDDEN DEATH',`${esc(players[match.runner])}, your turn!<br>Identical course. Fastest successful escape wins.${match.easy?' Easier course this time!':''}`);transition={at:4,fn:()=>{phase='countdown';phaseTime=0;lastTick=-1;}};}
 function finish(){phase='final';phaseTime=0;title.textContent='LAVA CHAMPION!';timer.textContent='SHOWDOWN COMPLETE';show(`<p class="lava-eyebrow">THREE ROUNDS · ONE LAVA LEGEND</p><h1>🏆 ${esc(players[match.winner])}!</h1><h2>YOUR LAVA CHAMPION</h2><div class="lava-recap">${players.map((p,i)=>`<div>${esc(p)}<b>${match.scores[i]}</b></div>`).join('')}</div><p>Escape = 100 + 2 per whole second left · Failed escape = 50 to Trap Master</p><div class="lava-actions"><button class="lava-primary" data-action="rematch">PLAY AGAIN!</button><button data-action="exit">Return to Arcade</button></div>`);sound('win');if(!completed){completed=true;onComplete({winner:match.winner,scores:[...match.scores],attempts:[...match.attempts]});}splash(500,120,'#ffdd34',90);}
 function pause(value=true){if(paused===value||disposed)return;paused=value;host.querySelector('[data-action=pause]').textContent=paused?'▶':'Ⅱ';if(paused){audio?.suspend().catch(()=>{});window.speechSynthesis?.cancel();const p=document.createElement('div');p.className='lava-pause lava-overlay';p.innerHTML='<h1>PAUSED</h1><p>Your clock is stopped. Ready when you are.</p><div class="lava-actions"><button class="lava-primary" data-action="resume">RESUME</button><button data-action="exit">Return to Arcade</button></div>';host.querySelector('.lava-playfield').appendChild(p);}else{host.querySelector('.lava-pause')?.remove();unlock();last=performance.now();}}
 function action(e){const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;if(a==='exit')return exit();if(a==='resume')return pause(false);if(a==='pause')return pause(!paused);if(paused)return;if(a==='music'){music=!music;b.setAttribute('aria-pressed',String(music));b.textContent=music?'♫ Music':'♫ Off';unlock();}if(a==='sfx'){sfx=!sfx;b.setAttribute('aria-pressed',String(sfx));b.textContent=sfx?'♪ Effects':'♪ Off';if(!sfx)window.speechSynthesis?.cancel();}if(a==='start')intro();if(a==='tutorial')tutorialStart();if(a==='rematch'){match=new LavaMatch(Math.random()<.5?0:1);completed=false;transition=null;intro();}}
 host.addEventListener('click',action);
 function world(e){const r=canvas.getBoundingClientRect();return {x:((e.clientX-r.left)*cw/r.width-ox)/scale-cameraX,y:((e.clientY-r.top)*ch/r.height-oy)/scale};}
 function tileAt(p){return tiles.filter(t=>Math.abs(t.x-p.x)<49&&Math.abs(t.y-p.y)<37).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];}
 function buildAt(id,type='crack'){if(phase!=='build'||paused)return;if(tiles[id]?.locked){notify('Start and finish stay safe. Choose any other platform.');return;}if(TRAPS.includes(tiles[id]?.type)&&tiles[id].type===type){tiles[id].type='safe';sound('land');notify('Trap removed. Choose another platform.');return;}const result=placeTrap(tiles,id,type);if(result.ok){tiles=result.tiles;sound('land');notify(`${LABELS[type]} placed · ${tiles.filter(t=>TRAPS.includes(t.type)).length}/${RULES.maxTraps} traps`);}else notify(result.reason);}
 host.addEventListener('pointerdown',unlock);
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(paused)return;const t=tileAt(world(e));if(!t)return;if(phase==='build')buildAt(t.id);else startJump(t.id);});
 function key(e){if(e.key.toLowerCase()==='p'){pause(!paused);return;}if(paused)return;if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Enter',' '].includes(e.key))return;if(e.target.tagName==='BUTTON')return;e.preventDefault();const options=tiles.filter(t=>reachable(tiles,current,t.id));if(!options.length)return;if(e.key==='Enter'||e.key===' ')startJump(targetId);else{let i=options.findIndex(t=>t.id===targetId);i=(i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+options.length)%options.length;targetId=options[i].id;}}
 host.addEventListener('keydown',key);
 function hidden(){if(document.hidden&&!['welcome','final'].includes(phase))pause();}
 function resized(){const r=canvas.getBoundingClientRect();cw=Math.max(1,r.width);ch=Math.max(1,r.height);const dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=Math.min(cw/1030,ch/360);ox=(cw-1030*scale)/2;oy=(ch-360*scale)/2;if(innerHeight>innerWidth&&!['welcome','final'].includes(phase))pause();}
 const resizeObserver=new ResizeObserver(resized);resizeObserver.observe(canvas);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',hidden);resized();
 function exit(){cleanup();onExit();}
 function cleanup(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',hidden);window.speechSynthesis?.cancel();audio?.close().catch(()=>{});host.remove();document.body.style.overflow=bodyOverflow;}
 function tick(dt){
  phaseTime+=dt;
  if(transition&&phaseTime>=transition.at){const fn=transition.fn;transition=null;fn();return;}
  if(phase==='build'){timer.textContent=`0:${String(Math.max(0,Math.ceil(RULES.build-phaseTime))).padStart(2,'0')} · ${tiles.filter(t=>TRAPS.includes(t.type)).length}/${RULES.maxTraps} TRAPS`;if(phaseTime>=RULES.build)lockBuild();}
  if(phase==='countdown'){const n=3-Math.floor(phaseTime);if(n>0&&n!==lastTick){lastTick=n;screen(String(n),'Tap glowing platforms to jump.');sound('tick');}if(phaseTime>=3)beginEscape();}
  if(['escape','practice'].includes(phase)){
   elapsed+=dt;if(phase==='escape'){timer.textContent=`0:${String(Math.max(0,Math.ceil(30-elapsed))).padStart(2,'0')}`;const n=Math.ceil(30-elapsed);if(n<=5&&n!==lastTick){lastTick=n;sound('tick');}if(elapsed>=30){endAttempt(false,'Time expired');return;}}
   if(jump&&elapsed-jump.start>=jump.duration){current=jump.to;jump=null;landed=elapsed;sound('land');if(tiles[current].type==='crack'){tiles[current].revealed=true;tiles[current].triggeredAt??=elapsed;}splash(tiles[current].x,tiles[current].y,COLORS[tiles[current].type],6);targetId=tiles.find(t=>t.x>tiles[current].x&&reachable(tiles,current,t.id))?.id??0;
    if(phase==='practice'){if(current!==0){tutorial=false;phase='practiceDone';phaseTime=0;screen('NICE JUMP!','Blue rings show where you can land.<br>Hidden breaking blocks turn red only when you land. Jump again before they collapse!<br>Escape: 100 + time bonus. Catch the runner: 50.','START SHOWDOWN',intro);}return;}
    if(tiles[current].type==='finish'){endAttempt(true);return;}
    if(tiles[current].type==='crack'){sound('crack');notify('CRACKING! Jump again quickly!',1);}
   }
   if(!jump){const hit=danger(tiles[current],elapsed,landed);if(hit&&phase==='escape'){endAttempt(false,'Breaking block collapsed');return;}}
  }
  if(phase==='falling'&&fallEffect&&!fallEffect.splashed&&phaseTime>=.4){fallEffect.splashed=true;splash(fallEffect.x,fallEffect.y+46,'#ffb428',65);sound('fall');}
  if(phase==='final'&&Math.floor(phaseTime*2)!==Math.floor((phaseTime-dt)*2))splash(150+Math.random()*700,80+Math.random()*150,['#ffe34e','#55dcff','#ff7cd5'][Math.floor(Math.random()*3)],20);
  if(toastUntil<phaseTime)toast.textContent='';
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;}particles=particles.filter(p=>p.life>0).slice(-200);
  musicClock+=dt;if(musicClock>=.22&&audio?.state==='running'&&phase!=='welcome'){musicClock=0;if(music){const notes=[262,330,392,440,392,330,294,392];tone(notes[musicStep%8],.13,'triangle',.014);if(musicStep%4===0)tone([65,87,73,98][Math.floor(musicStep/8)%4],.22,'sine',.035);}if(sfx&&musicStep%8===0)tone(55+Math.random()*40,.3,'sine',.012,30);musicStep++;}
 }
 function path(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
 function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
 function text(s,x,y,size=16,color='#fff'){ctx.font=`900 ${size}px system-ui`;ctx.textAlign='center';ctx.fillStyle=color;ctx.strokeStyle='#241531';ctx.lineWidth=3;ctx.strokeText(s,x,y);ctx.fillText(s,x,y);}
 function sprite(index,x,y,w,h){const sw=atlas.naturalWidth/3,sh=atlas.naturalHeight/2;ctx.drawImage(atlas,index%3*sw,Math.floor(index/3)*sh,sw,sh,x,y,w,h);}
 function platform(tile){
  const {x,y}=tile,type=platformAppearance(tile,phase),broken=tile.revealed&&danger(tile,elapsed,landed),active=['escape','practice'].includes(phase),can=active&&!jump&&!broken&&reachable(tiles,current,tile.id),color=COLORS[type];
  if(broken){ellipse(x,y+45,43,16,'#ffb42366');return;}
  ctx.save();ellipse(x,y+37,48,14,'#5c160b66');ctx.shadowColor=color;ctx.shadowBlur=12;
  if(!(atlas.complete&&atlas.naturalWidth)){const g=ctx.createLinearGradient(x,y-25,x,y+38);g.addColorStop(0,color);g.addColorStop(1,'#29254f');ctx.fillStyle=g;
  path([[x-44,y],[x,y+22],[x+44,y],[x+44,y+25],[x,y+48],[x-44,y+25]]);ctx.fill();ctx.shadowBlur=0;
  const top=ctx.createLinearGradient(x-35,y-24,x+30,y+22);top.addColorStop(0,type==='safe'||tile.locked?'#67e8ff':color);top.addColorStop(1,type==='crack'?'#932937':'#3c439f');path([[x,y-24],[x+44,y],[x,y+24],[x-44,y]]);ctx.fillStyle=top;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#b7faff';ctx.stroke();
  }
  if(atlas.complete&&atlas.naturalWidth){
   // Atlas replaces the primitive surface with dimensional artwork; collision and rings retain their shared geometry.
   
   sprite({safe:0,start:0,finish:0,crack:1}[type],x-58,y-49,116,116);
  }
  if(type==='safe'&&!tile.locked&&phase==='build'){ctx.setLineDash([5,4]);ctx.strokeStyle='#e5b4ff';ctx.lineWidth=3;path([[x,y-32],[x+52,y],[x,y+32],[x-52,y]]);ctx.stroke();ctx.setLineDash([]);text('+',x,y+6,20,'#fff');}
  if(type==='crack'){ctx.strokeStyle='#ffdb6c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-28,y-8);ctx.lineTo(x-8,y-2);ctx.lineTo(x-2,y-15);ctx.lineTo(x+3,y);ctx.lineTo(x+27,y+10);ctx.moveTo(x+3,y);ctx.lineTo(x-5,y+16);ctx.stroke();if(current===tile.id&&!jump){ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,32,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,1-(elapsed-landed)/RULES.crack));ctx.stroke();}}
  if(type==='finish'){text('★',x,y+5,25,'#fffac2');ctx.fillStyle='#fff';ctx.fillRect(x+17,y-60,3,47);path([[x+20,y-61],[x+46,y-52],[x+20,y-42]]);ctx.fillStyle='#ffd737';ctx.fill();}
  if(type==='start')text('GO',x,y+4,12,'#fff');
  if(can){ctx.shadowBlur=15;ctx.shadowColor='#98ffee';ctx.strokeStyle=targetId===tile.id?'#fff':'#82fff6';ctx.lineWidth=targetId===tile.id?5:3;ctx.beginPath();ctx.ellipse(x,y+1,50+Math.sin(phaseTime*5)*2,30,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;text('TAP',x,y+66,11,'#e1ffff');}
  ctx.restore();
 }
 function character(x,y,z=0){
  if(atlas.complete&&atlas.naturalWidth){ellipse(x,y+12,19,8,'#21123377');ctx.save();ctx.translate(x,y-z);const squash=jump?1:1-Math.max(0,.12-(elapsed-landed)*.4);ctx.scale(1+(1-squash)*.4,squash);ctx.rotate(jump?Math.sin((elapsed-jump.start)/jump.duration*Math.PI)*.08:Math.sin(phaseTime*4)*.025);ctx.shadowColor=match.runner===1?'#ffa0ef':'#a0efff';ctx.shadowBlur=8;sprite(5,-48,-94+Math.sin(phaseTime*5)*1.5,96,96);ctx.restore();return;}

  const bob=jump?0:Math.sin(phaseTime*7)*1.6;ellipse(x,y+8,15,7,'#21123366');ctx.save();ctx.translate(x,y-z+bob-17);const running=jump?Math.sin((elapsed-jump.start)*18):Math.sin(phaseTime*3)*.1;
  ctx.lineCap='round';ctx.lineWidth=10;ctx.strokeStyle='#234e9a';ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(-10-running*6,15);ctx.lineTo(-16-running*7,19);ctx.moveTo(5,0);ctx.lineTo(10+running*6,14);ctx.lineTo(17+running*7,17);ctx.stroke();ctx.lineWidth=7;ctx.strokeStyle='#f7f2da';ctx.beginPath();ctx.moveTo(-18-running*7,20);ctx.lineTo(-10-running*7,20);ctx.moveTo(13+running*7,19);ctx.lineTo(21+running*7,19);ctx.stroke();
  const shirt=ctx.createLinearGradient(-10,-28,10,0);shirt.addColorStop(0,'#ffe370');shirt.addColorStop(1,'#ee9828');ctx.fillStyle=shirt;ctx.beginPath();ctx.roundRect(-12,-30,24,34,9);ctx.fill();ctx.strokeStyle='#713c28';ctx.lineWidth=2;ctx.stroke();
  ctx.strokeStyle='#ffd39c';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-9,-24);ctx.lineTo(-21,-14-running*5);ctx.moveTo(10,-24);ctx.lineTo(23,-24+running*5);ctx.stroke();
  const face=ctx.createRadialGradient(-4,-47,1,0,-42,19);face.addColorStop(0,'#ffe6bc');face.addColorStop(1,'#d98b4a');ellipse(0,-45,17,19,face);ellipse(16,-42,5,6,'#f6bb7c');ellipse(8,-47,3,4,'#24213b');ellipse(9,-48,1,1,'#fff');ctx.strokeStyle='#6a3025';ctx.lineWidth=2;ctx.beginPath();ctx.arc(8,-39,6,0,Math.PI*.65);ctx.stroke();
  ctx.fillStyle=match.runner===1?'#5866eb':'#218bdf';ctx.beginPath();ctx.arc(-1,-51,18,Math.PI,0);ctx.lineTo(17,-49);ctx.lineTo(-19,-49);ctx.fill();ctx.strokeStyle='#a8d8ff';ctx.lineWidth=2;ctx.stroke();ellipse(10,-51,20,4,'#3a63c8');ctx.restore();
 }
 function draw(){
  const cameraTarget=reduced?0:(500-tiles[jump?.to??current].x)*.025;cameraX+=(cameraTarget-cameraX)*.08;
  ctx.clearRect(0,0,cw,ch);if(background.complete&&background.naturalWidth)ctx.drawImage(background,0,0,cw,ch);else{const bg=ctx.createLinearGradient(0,0,0,ch);bg.addColorStop(0,'#5c2745');bg.addColorStop(.4,'#da4c11');bg.addColorStop(1,'#ff971b');ctx.fillStyle=bg;ctx.fillRect(0,0,cw,ch);}
  ctx.save();ctx.translate(ox+cameraX*scale,oy);ctx.scale(scale,scale);
  // Camera tracking uses the same inverse transform as pointer hit testing.
  for(let i=0;i<28;i++){const bx=(i*173.3)%1020,by=160+(i*51.7)%190,rad=2+(Math.sin(phaseTime*1.8+i)+1)*3;ellipse(bx,by,rad*1.6,rad*.6,`rgba(255,244,116,${.1+.15*Math.sin(phaseTime+i)**2})`);}
  if(['escape','practice'].includes(phase)&&!jump){ctx.strokeStyle='#9affef44';ctx.setLineDash([5,8]);ctx.lineWidth=2;tiles.filter(t=>reachable(tiles,current,t.id)&&t.x>tiles[current].x).forEach(t=>{ctx.beginPath();ctx.moveTo(tiles[current].x,tiles[current].y);ctx.quadraticCurveTo((t.x+tiles[current].x)/2,Math.min(t.y,tiles[current].y)-50,t.x,t.y);ctx.stroke();});ctx.setLineDash([]);}
  [...tiles].sort((a,b)=>a.y-b.y).forEach(platform);
  let p=tiles[current],x=p.x,y=p.y,z=0;if(jump){const raw=Math.min(1,(elapsed-jump.start)/jump.duration),t=reduced?raw:raw+Math.sin(raw*Math.PI*2)*.09,a=tiles[jump.from],b=tiles[jump.to];x=a.x+(b.x-a.x)*t;y=a.y+(b.y-a.y)*t;z=Math.sin(t*Math.PI)*75;ctx.strokeStyle='#fff9';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(a.x,a.y-30);ctx.quadraticCurveTo((a.x+b.x)/2,Math.min(a.y,b.y)-140,x,y-z-25);ctx.stroke();}
  if(phase==='falling'&&fallEffect){
   const t=Math.min(1,phaseTime/1.5),surface=fallEffect.y+48;
   // Clip the sinking character behind the lava surface, then squash and spread
   // the silhouette into a glowing puddle. Keep the playfield uncovered.
   ctx.save();ctx.beginPath();ctx.rect(-2000,-2000,5000,surface+2000);ctx.clip();
   ctx.translate(fallEffect.x,fallEffect.y+t*135);ctx.scale(1+t*.35,Math.max(.12,1-t*.65));
   ctx.globalAlpha=Math.max(0,1-t*.85);ctx.shadowColor='#ff7c17';ctx.shadowBlur=25;character(0,0,0);ctx.restore();
   ellipse(fallEffect.x,surface,18+Math.sin(t*Math.PI)*30,6+Math.sin(t*Math.PI)*8,`rgba(255,181,40,${(1-t)*.85})`);
   for(let i=0;i<5;i++){const a=phaseTime*3+i*1.26;ellipse(fallEffect.x+Math.cos(a)*30,surface+Math.sin(a)*8,3,2,'#fff19a');}
  }else if(!['result','final'].includes(phase))character(x,y,z);
  for(const p of particles){ctx.globalAlpha=Math.min(1,p.life);ellipse(p.x,p.y,p.size,p.size*.6,p.color);}ctx.globalAlpha=1;

  ctx.restore();
 }
 function frame(now){if(disposed)return;const dt=last?(now-last)/1000:0;last=now;if(!paused){if(dt>5&&!['welcome','final','practice'].includes(phase))pause();else{let remaining=Math.min(dt,5);while(remaining>0){const step=Math.min(.01,remaining);tick(step);remaining-=step;}}}draw();raf=requestAnimationFrame(frame);}
 welcome();raf=requestAnimationFrame(frame);return cleanup;
}
