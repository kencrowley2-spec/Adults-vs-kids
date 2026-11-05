import {mountLava} from './arcade-lava.js?v=6';
import {createLobbyMusic} from './arcade-lobby-music.js?v=1';
import {mountClaw,clawPrizes,clawFireworks} from './arcade-claw.js?v=1';
import {mountMole,molePlan,createMoleAudio} from './arcade-mole.js?v=4';
import {mountFrog,frogCourses,frogRoundWinner} from './arcade-frog.js?v=3';
import {mountTreasure,treasurePlan} from './arcade-treasure.js?v=1';
import {mountBlocks} from './arcade-blocks.js?v=1';
import {mountBasketball} from './arcade-basketball.js?v=1';
import {coverMarkup,recentGames} from './arcade-library.js?v=12';
import {GAMES, ANIMALS, TRIVIA, PICTURES, CHALLENGES} from './arcade-data.js?v=27';
import {shuffle, roundWinner, awardRound, lineWinner} from './arcade-core.js';

import {makeMaze, codeClues, rpsWinner, GOLF_COURSES, golfStep} from './arcade-new-core.js?v=5';

import {createResultRecorder} from './arcade-results.js?v=2';

const $ = id => document.getElementById(id);
const lobby=$('arcade-lobby'), arena=$('arcade-game'), stage=$('game-stage');
let game, wins=[0,0], round=1, attempt=0, starter=0, turn=0, results=[], champion=-1;
let series=null,recording=null;
let kidsOnly=false;
const arcadeAccountId=$('arcade-game').getAttribute('data-account-id');
const recorder=createResultRecorder({
 accountId:arcadeAccountId,
 storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},
 send:result=>fetch('/api/arcade/results',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...result,accountId:arcadeAccountId})}),
 changed:({pending,storageFailed})=>{const el=$('arcade-save-status');if(el)el.textContent=pending?`A completed result is waiting to save. ${storageFailed?'Keep this page open and retry.':'It will retry when you’re connected.'}`:(kidsOnly?'Kids vs. Kids · scores count for this match.':'Completed matches update your family’s lifetime score.');}
});
const timeRecorder=createResultRecorder({
 accountId:arcadeAccountId,namespace:'times',
 storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},
 send:result=>fetch('/api/arcade/leaderboard',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...result,accountId:arcadeAccountId})}),
 changed:({pending})=>{const el=$('arcade-timed-save');if(el)el.textContent=pending?'Your timed record is waiting to save. Retry saving when connected.':'Successful timed runs enter the next daily Top 100 update.';}
});
timeRecorder.drain();
window.addEventListener('online',()=>timeRecorder.drain());
$('arcade-save-retry').addEventListener('click',()=>timeRecorder.drain());
recorder.drain();
window.addEventListener('online',()=>recorder.drain());
$('arcade-save-retry').addEventListener('click',()=>recorder.drain());
function startRecording(mode,gameIds){recording={id:crypto.randomUUID(),mode,gameIds,roundWinners:[],complete:false};}
function saveCompleted(){
 if(!recording||recording.complete)return;
 recording.complete=true;
 if(kidsOnly)return;
 const {id,mode,gameIds,roundWinners}=recording;
 recorder.capture({id,mode,gameIds:[...gameIds],roundWinners:[...roundWinners]});
}
let stopFrog=null,stopMole=null,stopClaw=null,moleAudio=null,moleVolume=.65,moleIntroDone=null,memoryClock=null;
let timers=[], generation=0, timed=false, used={};
const names=['Adults','Kids'];
const selectedPlayers=[[],[]];
const lineup=$('arcade-roster-lineup');
if(lineup){for(const [team,key] of [[0,'data-adults'],[1,'data-kids']]){try{const list=JSON.parse(lineup.getAttribute(key)||'[]');if(Array.isArray(list)&&list.length<=10&&list.every(name=>typeof name==='string'&&name.length<=30))selectedPlayers[team]=list;}catch{}}}
kidsOnly=selectedPlayers[0].length===0&&selectedPlayers[1].length>=2;
if(kidsOnly){
 const kids=[...selectedPlayers[1]];
 selectedPlayers[0]=kids.filter((_,i)=>i%2===0);
 selectedPlayers[1]=kids.filter((_,i)=>i%2===1);
 names[0]=selectedPlayers[0].join(' & ');names[1]=selectedPlayers[1].join(' & ');
}
function teamName(team){return names[team];}
if(kidsOnly)$('arcade-save-status').textContent='Kids vs. Kids · scores count for this match.';
function teamLabel(team,uppercase=false){return escapePlayer(uppercase?teamName(team).toUpperCase():teamName(team));}
const escapePlayer=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// One shared rivalry layer; scoring and result recording stay with each game.
const defendingCrowns=new Map();
let liveProgress=[null,null],competitionCue='',competitionPhase='play';
function contender(team){return selectedPlayers[team].join(' & ')||teamName(team);}
function contenderLabel(team){return escapePlayer(contender(team));}
function matchupMarkup(){
 return `<div class="competition-matchup">${[0,1].map(i=>`${i?'<b class="competition-vs">VS</b>':''}<div><span class="competitor-avatar" aria-hidden="true">${i?'⚡':'🔥'}</span><strong>${contenderLabel(i)}</strong>${defendingCrowns.get(series?'series':game.id)===i?'<small>👑 DEFENDING CHAMPION</small>':''}</div>`).join('')}</div>`;
}
function competitiveScore(team){
 if(Number.isFinite(liveProgress[team]?.score))return liveProgress[team].score;
 const pointsKey={claw:'clawPoints',mole:'molePoints',treasure:'treasurePoints',blocks:'blockPoints',basketball:'basketballPoints',code:'safePoints'}[game.id];
 return pointsKey?game[pointsKey]?.[team]??0:liveProgress[team]?.score??0;
}
function competitionUpdate(progress){
 if(progress)liveProgress[turn]={...liveProgress[turn],...progress};
 const el=$('competition-call');if(!el||!game)return;
 const opponent=1-turn,target=results[opponent],score=competitiveScore(turn),name=contender(turn),rival=contender(opponent);
 let call,detail,cue='';
 if(champion>=0){call=`👑 ${contender(champion)} TAKES THE CROWN!`;detail=`${contender(1-champion)} gets the next shot. Rematch?`;}
 else if(competitionPhase==='result'){call='ROUND SETTLED!';detail=`Match score: ${contender(0)} ${wins[0]} · ${contender(1)} ${wins[1]}`;}
 else if(game.id==='golf'&&target){call=`BEAT ${rival}'S ${target.score} STROKES!`;detail=`${score} strokes so far · Lower score wins · All 3 holes count.`;}
 else if(game.id==='maze'&&target){call=target.score?`ESCAPE FASTER THAN ${rival}: ${target.elapsed.toFixed(1)}s!`:`ESCAPE TO BEAT ${rival}!`;detail=target.score?'Reach the flag before their time. Equal times share the round.':'They did not escape. Reach the flag to take the round!';}
 else if(game.id==='frog'&&target){
  const distance=liveProgress[turn]?.distance??0;
  call=score>target.score?'AHEAD ON CROSSINGS!':score===target.score&&distance>target.distance?'AHEAD ON DISTANCE!':`${rival}'S TARGET: ${target.score} CROSSINGS`;
  detail=`You: ${score} crossings · ${Math.round(distance)}% best. Target: ${Math.round(target.distance)}% · ${target.flies} flies. Crossings, then distance, then flies decide.`;
  cue=score>target.score?'lead':score===target.score&&distance>target.distance?'distance':'';
 }
 else if(target){
  const gap=target.score-score,step=game.id==='basketball'?2:1,timeBreak=['spot','picture','number','maze'].includes(game.id),maxScore={trivia:5,picture:3,number:5,spot:3,treasure:5,claw:9}[game.id];
  call=gap<0?`${name} TAKES THE LEAD!`:gap===0?(timeBreak?'SCORE TIED — TIME DECIDES!':score===maxScore?'TIED AT THE MAXIMUM!':'TIED! ONE MORE TO LEAD!'):gap<=step?'ONE SCORE AWAY FROM A TIE!':`${gap} MORE TO TIE ${rival}!`;
  detail=`BEAT ${rival}'S ${target.score} · You have ${score}${timeBreak?` · Their time: ${target.elapsed.toFixed(1)}s`:''}`;
  if(competitionPhase==='handoff')call=target.score===maxScore&&!timeBreak?`MATCH ${rival}'S ${target.score} TO FORCE A REPLAY!`:`BEAT ${rival}'S ${target.score}!`;
  cue=gap<0?'lead':gap===0?'tie':gap<=step?'close':'';
 }
 else if(['memory','code'].includes(game.id)){
  const other=competitiveScore(opponent),gap=score-other;
  call=gap>0?`${name} LEADS ${score}–${other}!`:gap===0?`TIED ${score}–${other}!`:`CATCH ${rival}: ${other}–${score}!`;
  detail=game.id==='memory'?'One pair = one point. Most pairs wins the round.':'One safe = one point. First to 3 wins the round.';
  cue=gap>0?'lead':gap===0?'tie':'';
 }
 else {
  call=`${name}, YOU'RE UP!`;
  detail=game.id==='tic'?'Connect three before your opponent.':game.id==='rps'?'Secret moves. One winner. Take the round!':`Set the score for ${rival} to beat!`;
 }
 const matchPoint=game.id==='frog'&&!series?1:2;
 if(champion<0&&wins.some(n=>n===matchPoint))detail+=wins.every(n=>n===matchPoint)?' DECIDING ROUND — NEXT WIN TAKES THE CROWN!':` MATCH POINT: ${contender(wins[0]===matchPoint?0:1)}!`;
 el.textContent=call;el.setAttribute('data-state',champion>=0?'champion':cue);
 $('competition-detail').textContent=detail;
 if(progress&&cue&&cue!==competitionCue&&competitionPhase==='play'){
  react(cue==='lead'||cue==='distance'?'match':'turn',call);
  // Keep quiz narration uninterrupted; visual callouts and chimes still react.
  if(game.id==='mole')moleAudio?.announce(call);else if(!['trivia','picture','number','code'].includes(game.id))readArcade(call,1);
 }
 if(progress)competitionCue=cue;
}
function competitionResult(){
 if(champion<0)return '';
 defendingCrowns.set(series?'series':game.id,champion);
 const singleRound=['claw','mole','treasure','blocks','basketball'].includes(game.id)&&!series;
 const scores=singleRound&&results[0]&&results[1]?results.map(r=>r.score):wins;
 return `<div class="competition-victory ${effectsOn?'with-effects':''}"><p class="competition-crown">👑</p><strong>${contenderLabel(champion)} HAS THE CROWN!</strong>${matchupMarkup()}<small>${series?'SERIES GAME WINS':singleRound?'FINAL POINTS':'ROUND WINS'}</small><div class="competition-result-scores">${[0,1].map(i=>`<span>${contenderLabel(i)}<b>${scores[i]}</b></span>`).join('')}</div><p>${contenderLabel(1-champion)}, the scoreboard checked twice! Your comeback starts with a rematch!</p><small>Winner gets bragging rights. Everyone gets a high five.</small></div>`;
}

let soundOn=true, effectsOn=!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, audioContext, feedbackSequence=0;
// Speech uses the device's built-in voice; the slider controls narration,
// while the device volume buttons still control speaker loudness.
let triviaVolume=1, triviaSpeech=null, triviaSpeechToken=0;
const canReadTrivia=()=>!!(window.speechSynthesis&&window.SpeechSynthesisUtterance);
function triviaVoiceStatus(text,speaking=false){
  const panel=$('trivia-audio');if(!panel)return;
  panel.setAttribute('data-speaking',String(speaking));
  $('trivia-voice-status').textContent=text;
  const level=soundOn?Math.round(triviaVolume*100):0;
  $('trivia-level').setAttribute('aria-valuenow',String(level));
  $('trivia-level').querySelectorAll('i').forEach((bar,i)=>bar.setAttribute('class',i<Math.ceil(level/20)?'filled':''));
}
function stopTriviaVoice(){
  triviaSpeechToken++;
  if(triviaSpeech){try{window.speechSynthesis.cancel();}catch{}triviaSpeech=null;}
  triviaVoiceStatus(soundOn?'Ready to read aloud':'Voice muted');
}
function readArcade(text,volume=triviaVolume,style={}){
  stopTriviaVoice();
  if(!canReadTrivia()){triviaVoiceStatus('Read-aloud unavailable on this browser. Read the question below.');return;}
  if(!soundOn){triviaVoiceStatus('Sound is off. Turn Sound on to hear questions and answers.');return;}
  if(document.hidden)return;
  const token=triviaSpeechToken;
  try{
    const utterance=new window.SpeechSynthesisUtterance(text);triviaSpeech=utterance;
    utterance.lang='en-US';utterance.rate=style.rate??.95;utterance.pitch=style.pitch??1;utterance.volume=volume;
    const voices=window.speechSynthesis.getVoices();
    const voice=voices.find(v=>v.lang==='en-US'&&v.localService)||voices.find(v=>v.lang?.startsWith('en'));
    if(voice)utterance.voice=voice;
    triviaVoiceStatus('Voice ready · tap Hear question & answers if needed');
    utterance.onstart=()=>{if(token===triviaSpeechToken){triviaVoiceStatus('Reading aloud…',true);style.onStart?.();}};
    utterance.onend=()=>{if(token===triviaSpeechToken){triviaSpeech=null;triviaVoiceStatus('Ready · hear it again anytime');style.onDone?.();}};
    utterance.onerror=()=>{if(token===triviaSpeechToken){triviaSpeech=null;triviaVoiceStatus('Tap Hear question & answers to start the voice.');style.onDone?.();}};
    window.speechSynthesis.speak(utterance);return utterance;
  }catch{triviaSpeech=null;triviaVoiceStatus('Tap Hear question & answers to try the voice again.');}
}
function ticStarterVoice(parent=stage,announce=true){
  const announcement=`${teamName(starter)} are up first!`;
  const replay=button('Hear starting team 🔊',()=>readArcade(announcement,1),parent,'text-button');
  replay.setAttribute('aria-label',`Hear announcement: ${announcement}`);
  replay.disabled=!canReadTrivia();
  if(announce)readArcade(announcement,1);
}
function triviaAudioPanel(parent,text,starterReminder=false){
  const panel=document.createElement('div');panel.id='trivia-audio';panel.className='trivia-audio';
  panel.innerHTML=`<p class="trivia-volume-reminder"><span aria-hidden="true">🔊</span> ${starterReminder?'Turn your volume up for this one!':'Listen up! Questions and answer choices are read aloud.'}</p><div class="trivia-voice-controls"><span id="trivia-level" class="trivia-level" role="meter" aria-label="Narration volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i></i><i></i><i></i><i></i><i></i></span><label for="trivia-volume">Voice volume <span id="trivia-volume-value">${Math.round(triviaVolume*100)}%</span></label><input id="trivia-volume" type="range" min="0" max="100" step="10" value="${Math.round(triviaVolume*100)}" aria-label="Question and answer voice volume"></div><small>Use your device’s volume buttons to turn the speaker up.</small><p id="trivia-voice-status" class="trivia-voice-status" role="status" aria-live="polite"></p>`;
  parent.appendChild(panel);
  const replay=button(starterReminder?'Test voice 🔊':'Hear question & answers 🔊',()=>readArcade(text),panel,'text-button');
  if(!canReadTrivia()){replay.disabled=true;triviaVoiceStatus('Read-aloud unavailable on this browser. You can still play.');}
  else triviaVoiceStatus(soundOn?'Ready to read aloud':'Sound is off. Turn Sound on to hear questions and answers.');
  $('trivia-volume').addEventListener('input',()=>{
    triviaVolume=Number($('trivia-volume').value)/100;
    $('trivia-volume-value').textContent=`${Math.round(triviaVolume*100)}%`;
    // Replay at the new level; native speech volume is fixed when speaking begins.
    readArcade(text);
  });
}
window.addEventListener('pagehide',stopTriviaVoice);
function unlockAudio(){
  if(!soundOn)return;
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioContext??=new Audio();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{}
}
document.addEventListener('pointerdown',unlockAudio);
document.addEventListener('keydown',unlockAudio);
const chimeNodes=new Set();
function stopChimes(){for(const node of chimeNodes){try{node.stop();node.disconnect();}catch{}}chimeNodes.clear();}
function chime(kind){
  if(!soundOn)return;
  if(game?.id==='mole'&&moleAudio){moleAudio.cue(kind);return;}unlockAudio();if(!audioContext||audioContext.state!=='running')return;
  try{
    const notes=kind==='buzzer'?[130,100]:kind==='win'?[523,659,784]:kind==='match'?[660,880]:kind==='tap'?[440]:[330,440];
    notes.forEach((frequency,i)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),at=audioContext.currentTime+i*.075;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.045,at+.008);gain.gain.exponentialRampToValueAtTime(.001,at+.12);oscillator.connect(gain);gain.connect(audioContext.destination);chimeNodes.add(oscillator);oscillator.onended=()=>{chimeNodes.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+.14);});
  }catch{}
}
// Arcade FM belongs only to browsing; games keep their own soundtracks.
let lobbyMusicWanted=true,lobbyMusicVolume=.25;
try{const preference=JSON.parse(localStorage.getItem('avk:arcade-fm')||'null');if(preference&&typeof preference.enabled==='boolean')lobbyMusicWanted=preference.enabled;if(Number.isFinite(preference?.volume))lobbyMusicVolume=Math.max(0,Math.min(1,preference.volume));}catch{}
function saveLobbyMusic(){try{localStorage.setItem('avk:arcade-fm',JSON.stringify({enabled:lobbyMusicWanted,volume:lobbyMusicVolume}));}catch{}}
const lobbyMusic=createLobbyMusic({
 getContext:()=>{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;audioContext??=new Audio();return audioContext;},
 allowed:()=>lobbyMusicWanted&&arena.hidden&&!lobby.hidden&&!document.hidden,
 volume:lobbyMusicVolume,
 onState:({playing,available,blocked})=>{
  const toggle=$('lobby-music-toggle');if(!toggle)return;
  toggle.textContent=playing?'Pause music':'Play music';toggle.setAttribute('aria-pressed',String(playing));
  $('lobby-soundbar').setAttribute('data-playing',String(playing));
  $('lobby-music-status').textContent=playing?'Now playing · Neon Family Nights':!lobbyMusicWanted?'Music paused':!available?'Tap Play music to start':blocked?'Tap Play music to start':'Music starts with your first tap';
 }
});
$('lobby-music-volume').value=String(Math.round(lobbyMusicVolume*100));
$('lobby-music-volume-value').textContent=`${Math.round(lobbyMusicVolume*100)}%`;
$('lobby-music-toggle').addEventListener('click',()=>{
 if(lobbyMusic.playing){lobbyMusicWanted=false;lobbyMusic.stop();}else {lobbyMusicWanted=true;lobbyMusic.start();}saveLobbyMusic();
});
$('lobby-music-volume').addEventListener('input',()=>{lobbyMusicVolume=Number($('lobby-music-volume').value)/100;lobbyMusic.setVolume(lobbyMusicVolume);$('lobby-music-volume-value').textContent=`${Math.round(lobbyMusicVolume*100)}%`;saveLobbyMusic();});
function startLobbyOnGesture(event){if(!event.target?.closest?.('#lobby-soundbar'))lobbyMusic.start();}
document.addEventListener('pointerdown',startLobbyOnGesture);
document.addEventListener('keydown',startLobbyOnGesture);
window.addEventListener('pagehide',()=>lobbyMusic.stop());
window.addEventListener('pageshow',()=>lobbyMusic.start());
// Original, looping arcade groove: melody, bass, kick and hi-hat at 120 BPM.
let mazeMusicOn=true, mazeMusicVolume=.35, mazeMusicActive=false, mazeMusicTimer=null, mazeMusicBus=null;
const mazeMusicNodes=new Set();
function updateMazeMusicUI(){
  const panel=$('maze-soundbar');if(!panel)return;
  panel.setAttribute('data-playing',String(mazeMusicActive));
  $('maze-music-toggle').textContent=mazeMusicActive?'Pause music':'Play music';
  $('maze-music-toggle').setAttribute('aria-pressed',String(mazeMusicActive));
  $('maze-music-status').textContent=!soundOn?'Sound is muted':mazeMusicActive?'Now playing · Maze Groove':mazeMusicOn?'Tap Play music to start the beat':'Music paused · movement sounds stay on';
}
function stopMazeMusic(){
  clearTimeout(mazeMusicTimer);mazeMusicTimer=null;mazeMusicActive=false;
  for(const node of mazeMusicNodes){try{node.stop();node.disconnect();}catch{}}
  mazeMusicNodes.clear();
  if(mazeMusicBus){try{mazeMusicBus.disconnect();}catch{}mazeMusicBus=null;}
  updateMazeMusicUI();
}
function startMazeMusic(){
  stopMazeMusic();
  if(!mazeMusicOn||!soundOn||!$('maze-soundbar')||document.hidden)return;
  unlockAudio();
  if(!audioContext||audioContext.state!=='running'){updateMazeMusicUI();return;}
  mazeMusicActive=true;mazeMusicBus=audioContext.createGain();mazeMusicBus.gain.value=mazeMusicVolume;mazeMusicBus.connect(audioContext.destination);
  const melody=[72,null,76,79,81,79,76,null,74,null,77,81,79,77,74,null,72,76,79,null,84,81,79,76,74,77,79,null,76,74,72,null];
  const bass=[48,48,53,55];let step=0;
  function tone(midi,duration,volume,type='square',fall=false){
    const osc=audioContext.createOscillator(),gain=audioContext.createGain(),at=audioContext.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(440*2**((midi-69)/12),at);
    if(fall)osc.frequency.exponentialRampToValueAtTime(45,at+duration);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.001,at+duration);
    osc.connect(gain);gain.connect(mazeMusicBus);mazeMusicNodes.add(osc);
    osc.onended=()=>{mazeMusicNodes.delete(osc);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+.02);
  }
  function beat(){
    if(!mazeMusicActive||document.hidden||!$('maze-soundbar')){stopMazeMusic();return;}
    try{
      const note=melody[step%melody.length];if(note!==null)tone(note,.16,.06,'triangle');
      if(step%4===0){tone(bass[Math.floor(step/8)%4],.3,.1,'triangle');tone(43,.13,.16,'sine',true);}
      if(step%4===2)tone(88,.045,.028,'triangle');
      tone(110,.025,step%2===0?.01:.018,'square');
    }catch{stopMazeMusic();return;}
    step++;mazeMusicTimer=setTimeout(beat,125);
  }
  updateMazeMusicUI();beat();
}
function mazeSoundbar(){
  const panel=document.createElement('div');panel.id='maze-soundbar';panel.className='maze-soundbar';
  panel.innerHTML=`<span class="maze-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="maze-music-copy"><strong>MAZE GROOVE</strong><small id="maze-music-status" role="status" aria-live="polite"></small></div><button type="button" id="maze-music-toggle" aria-pressed="false">Play music</button><label for="maze-music-volume">Music <span id="maze-music-volume-value">${Math.round(mazeMusicVolume*100)}%</span></label><input id="maze-music-volume" type="range" min="0" max="100" step="5" value="${Math.round(mazeMusicVolume*100)}" aria-label="Maze background music volume">`;
  stage.appendChild(panel);
  $('maze-music-toggle').addEventListener('click',()=>{if(mazeMusicActive){mazeMusicOn=false;stopMazeMusic();}else{mazeMusicOn=true;startMazeMusic();}});
  $('maze-music-volume').addEventListener('input',()=>{mazeMusicVolume=Number($('maze-music-volume').value)/100;$('maze-music-volume-value').textContent=`${Math.round(mazeMusicVolume*100)}%`;if(mazeMusicBus)mazeMusicBus.gain.value=mazeMusicVolume;});
  startMazeMusic();
}
window.addEventListener('pagehide',stopMazeMusic);
function react(kind,label){
  chime(kind);const sequence=++feedbackSequence;
  $('feedback-caption').textContent=label;
  $('arcade-feedback').setAttribute('data-kind',effectsOn?kind:'quiet');
  later(()=>{if(sequence!==feedbackSequence)return;$('arcade-feedback').setAttribute('data-kind','');$('feedback-caption').textContent='';},650);
}
$('arcade-sound').addEventListener('click',()=>{soundOn=!soundOn;$('arcade-sound').textContent=`Sound: ${soundOn?'on':'off'}`;$('arcade-sound').setAttribute('aria-pressed',String(soundOn));stopTriviaVoice();if(!soundOn)moleIntroDone?.();if(soundOn){chime('match');if($('maze-soundbar'))startMazeMusic();}else {moleAudio?.silence();stopChimes();stopMazeMusic();}});
$('arcade-game').setAttribute('data-effects',String(effectsOn));
$('arcade-effects').setAttribute('aria-pressed',String(effectsOn));
$('arcade-effects').textContent=`Lights: ${effectsOn?'on':'off'}`;
$('arcade-effects').addEventListener('click',()=>{effectsOn=!effectsOn;$('arcade-game').setAttribute('data-effects',String(effectsOn));$('arcade-effects').textContent=`Lights: ${effectsOn?'on':'off'}`;$('arcade-effects').setAttribute('aria-pressed',String(effectsOn));$('arcade-feedback').setAttribute('data-kind','');});
function clearTimers(){ memoryClock?.stop();memoryClock=null;moleIntroDone=null;moleAudio?.stop();moleAudio=null;stopChimes(); stopClaw?.();stopClaw=null; stopMole?.();stopMole=null; stopFrog?.();stopFrog=null; stopMazeMusic(); stopTriviaVoice(); generation++; timers.forEach(clearTimeout); timers=[]; timed=false; }
function later(fn,delay){ const token=generation; const timer=setTimeout(()=>{if(token===generation)fn();},delay); timers.push(timer); }
function screen(html){ clearTimers();competitionPhase=html.includes('class="handoff"')?'handoff':html.includes('class="result')?'result':'play'; $('arcade-feedback').setAttribute('data-kind','');$('feedback-caption').textContent='';stage.innerHTML=(champion>=0&&game?.id!=='mole'?competitionResult():'')+html;competitionUpdate();if(champion>=0&&game?.id!=='mole')readArcade(`${contender(champion)} takes the crown! ${contender(1-champion)}, time for a comeback!`,1); scheduleGameFit(); }
function button(label,action,parent=stage,className='primary'){
  const b=document.createElement('button'); b.type='button'; b.className=className; b.textContent=champion>=0&&/^(Rematch|New random)/.test(label)?'👑 Defend your crown · Rematch →':label; b.addEventListener('click',action); parent.appendChild(b); return b;
}

function fitGameViewport(){
  const viewport=$('game-viewport');
  if(arena.hidden||!stage.style||!viewport?.clientHeight)return;
  // Measure the natural compact layout, then fit every control inside the arena.
  // A transform preserves the same hit targets and game state across resizes.
  const height=viewport.clientHeight,width=viewport.clientWidth;
  stage.style.setProperty('--play-height',height+'px');
  const scale=Math.min(1,height/Math.max(stage.scrollHeight,1),width/Math.max(stage.scrollWidth,1));
  stage.style.setProperty('--game-scale',String(Math.max(.1,scale)));
}
let fitPending=false;
function scheduleGameFit(){
  if(fitPending||typeof requestAnimationFrame!=='function')return;
  fitPending=true;requestAnimationFrame(()=>{fitPending=false;fitGameViewport();});
}
if(typeof ResizeObserver!=='undefined'){
 const observer=new ResizeObserver(scheduleGameFit);observer.observe($('game-viewport'));observer.observe(stage);
}
if(typeof MutationObserver!=='undefined')new MutationObserver(scheduleGameFit).observe(stage,{childList:true,subtree:true,characterData:true});
function updateArenaHeight(){
 if(arena.style)arena.style.setProperty('--arena-height',(window.visualViewport?.height||window.innerHeight)+'px');
 scheduleGameFit();
}
window.addEventListener('resize',updateArenaHeight);
window.visualViewport?.addEventListener('resize',updateArenaHeight);
updateArenaHeight();

function focusFirst(){ stage.querySelector('button,input')?.focus({preventScroll:true}); }
function status(text){$('arcade-message').textContent=text;}
function scoreboard(){
 if($('mole-volume-control'))$('mole-volume-control').hidden=game?.id!=='mole';
  $('match-format').textContent=series?'3-GAME SERIES':game?.id==='claw'?'3 GRABS EACH · ONE ROUND':game?.id==='mole'?'20 SECONDS EACH · ONE ROUND':game?.id==='frog'?'BEST OF THREE · 3 TRIES EACH':game?.id==='treasure'?'5 GUESSES EACH · ONE ROUND':game?.id==='blocks'?'60 SECONDS EACH · ONE ROUND':game?.id==='basketball'?'30 SECONDS EACH':'BEST OF FIVE';
  $('arcade-reset').textContent=series?'Restart series ↻':'Restart match ↻';
  $('series-lineup').hidden=!series;
  if(series) $('series-lineup').innerHTML=series.games.map((g,i)=>`<div class="series-pick ${i===series.index?'active':''}"><small>GAME ${i+1}${series.winners[i]!==undefined?` · ${teamLabel(series.winners[i])} win`:''}</small><b>${g.icon} ${g.name}</b></div>`).join('');
  $('arcade-score').innerHTML=names.map((name,i)=>`<div id="arcade-team-${i}" class="team-score ${turn===i&&champion<0?'current':''}" aria-current="${turn===i&&champion<0}" aria-label="${escapePlayer(name)}${turn===i&&champion<0?', current turn':''}"><span><span class="score-avatar" aria-hidden="true">${i===0?'🔥':'⚡'}</span> ${i===0?'★':'✦'} ${kidsOnly?'':'TEAM '}${escapePlayer(name.toUpperCase())}</span>${!kidsOnly&&selectedPlayers[i].length?`<small class="arcade-player-names">${selectedPlayers[i].map(escapePlayer).join(' · ')}</small>`:''}<strong>${game?.id==='claw'&&!series?(game.clawPoints?.[i]??0):game?.id==='mole'&&!series?(game.molePoints?.[i]??0):game?.id==='treasure'&&!series?(game.treasurePoints?.[i]??0):game?.id==='blocks'&&!series?(game.blockPoints?.[i]??0):game?.id==='basketball'&&!series?(game.basketballPoints?.[i]??0):game?.id==='code'&&champion<0?(game.safePoints?.[i]??0):wins[i]}</strong><div class="win-dots" ${['claw','mole','treasure'].includes(game?.id)&&!series?'hidden':''} aria-label="${wins[i]} ${series?'game':'round'} wins">${Array.from({length:game?.id==='frog'&&!series?2:3},(_,n)=>n).map(n=>`<i class="${n<wins[i]?'won':''}"></i>`).join('')}</div></div>`).join('');
  const rivalry=document.createElement('div');rivalry.className='competition-hud';rivalry.innerHTML='<strong id="competition-call" role="status" aria-live="polite"></strong><small id="competition-detail"></small>';$('arcade-score').appendChild(rivalry);competitionUpdate();
  $('round-label').textContent=game?.id==='claw'&&!series?(results[0]&&results[1]?'SHOWDOWN COMPLETE':'SMALL = 1 POINT · LARGE = 3 POINTS'):game?.id==='mole'&&!series?(results[0]&&results[1]?'SHOWDOWN COMPLETE':'1 HIT = 1 POINT · MOST HITS WINS'):game?.id==='treasure'&&!series?(results[0]&&results[1]?'SHOWDOWN COMPLETE':'1 TREASURE = 1 POINT · MOST POINTS WINS'):game?.id==='blocks'&&!series?(results[0]&&results[1]?'MATCH COMPLETE':'1 PIECE = 1 POINT · MOST POINTS WINS'):game?.id==='basketball'&&!series?(champion>=0?'MATCH COMPLETE':'2 POINTS PER BASKET · MOST POINTS WINS'):series?`${champion>=0?'SERIES COMPLETE':`GAME ${series.index+1} OF 3${attempt?' · TIE REPLAY':''}`} · SERIES SCORE` : champion>=0?'MATCH COMPLETE':`ROUND ${round} OF ${game?.id==='frog'?3:5}${attempt?' · TIE REPLAY':''} · FIRST TO ${game?.id==='frog'?2:3} WINS`;
}
function pick(key,source,n){
  if(!used[key] || used[key].length<n) used[key]=shuffle(source);
  return used[key].splice(0,n);
}
let stopLava=null;
function openLava(){
 lobbyMusic.stop();clearTimeout(featuredTimer);clearTimers();stopLava?.();
 const lineupPlayers=selectedPlayers.map(list=>list.join(' & '));
 const adultsOnly=selectedPlayers[1].length===0&&selectedPlayers[0].length>=2;
 const lavaNames=adultsOnly?[selectedPlayers[0].filter((_,i)=>i%2===0).join(' & '),selectedPlayers[0].filter((_,i)=>i%2===1).join(' & ')]:lineupPlayers.map((name,i)=>name||names[i]);
 let matchId=crypto.randomUUID();
 rememberGame('lava');arena.hidden=false;lobby.hidden=true;
 window.dispatchEvent(new CustomEvent('avk:game-start',{detail:{game:'lava',id:matchId}}));
 stopLava=mountLava({players:lavaNames,onExit:()=>{stopLava=null;arena.hidden=true;lobby.hidden=false;game=null;scheduleFeatured();lobbyMusic.start();document.querySelector('[data-game="lava"]')?.focus();},onComplete:result=>{
  if(!kidsOnly&&!adultsOnly)recorder.capture({id:matchId,mode:'single',gameIds:['lava'],roundWinners:[result.winner]});
  window.dispatchEvent(new CustomEvent('avk:game-complete',{detail:{game:'lava',winner:result.winner,scores:result.scores,id:matchId}}));
  matchId=crypto.randomUUID();
 }});
}
function openGame(id){
  if(id==='lava')return openLava();
  if(GAMES.find(g=>g.id===id)?.comingSoon)return;
  lobbyMusic.stop();clearTimeout(featuredTimer);
  startRecording('single',[id]);
  window.dispatchEvent(new CustomEvent('avk:game-start',{detail:{game:id,id:recording.id}}));
  series=null;
  game=GAMES.find(g=>g.id===id); rememberGame(id); lobby.hidden=true; arena.hidden=false;
  $('game-title').textContent=`${game.icon} ${game.name}`; used={}; wins=[0,0]; round=1; attempt=0; starter=0; turn=0; champion=-1; results=[];
  starter=Math.random()<.5?0:1;turn=starter;beginRound();
}
function startSeries(){
  lobbyMusic.stop();clearTimeout(featuredTimer);
  clearTimers();
  series={games:shuffle(GAMES.filter(g=>!g.comingSoon&&g.id!=='lava')).slice(0,3),index:0,winners:[],first:0};
  startRecording('series',series.games.map(g=>g.id));
  wins=[0,0]; round=1; attempt=0; starter=0; turn=0; champion=-1; results=[]; used={};
  game=series.games[0]; lobby.hidden=true; arena.hidden=false;
  series.first=Math.random()<.5?0:1;startSeriesGame();
}
function startSeriesGame(){
  clearTimers(); game=series.games[series.index];
  window.dispatchEvent(new CustomEvent('avk:game-start',{detail:{game:game.id,id:crypto.randomUUID()}})); round=series.index+1; attempt=0;
  starter=(series.first+series.index)%2; turn=starter;
  $('game-title').textContent=`${game.icon} ${game.name}`; beginRound();
}
function finishSeriesGame(winner,detail){
  if(winner!==null){wins[winner]++;series.winners.push(winner);}
  const complete=series.winners.length===3;
  champion=complete?(wins[0]>wins[1]?0:1):-1; scoreboard();
  if(complete)saveCompleted();
  screen(`<div class="result"><span class="giant-icon">${winner===null?'🤝':complete?'🏆':'🎉'}</span><p class="eyebrow">${complete?'SERIES COMPLETE':winner===null?'TIE · SAME GAME':'GAME COMPLETE'}</p><h3>${complete?`${teamLabel(champion)} win the series!`:winner===null?'It’s a tie!':`${teamLabel(winner)} win game ${series.index+1}!`}</h3><p>${escapePlayer(detail)}</p><div class="final-score">${wins[0]} <span>–</span> ${wins[1]}</div><p>${complete?'Three games. One great time together. High fives all around.':winner===null?'No point awarded. Replay this game to settle it.':`Up next: ${series.games[series.index+1].icon} ${series.games[series.index+1].name}. Starting in <strong id="next-game-countdown">2</strong> seconds…`}</p></div>`);
  if(complete){button('New random challenge →',startSeries);button('Return to Arcade',()=>{$('arcade-return').click();},stage,'text-button');}
  else if(winner===null){later(()=>{attempt++;starter=1-starter;beginRound();},2200);}
  else {
    // Both countdown and button use one guarded transition; screen changes cancel timers.
    let moved=false,remaining=2;
    const next=()=>{if(moved)return;moved=true;series.index++;startSeriesGame();};
    const tick=()=>{remaining--;if(remaining===0)return next();$('next-game-countdown').textContent=remaining;later(tick,1000);};
    later(tick,1000);
  }
  react(winner===null?'turn':'win',winner===null?'Tie — rematch!':`${teamName(winner)} win!`);
  status(complete?`${teamName(champion)} win the series ${wins[champion]}–${wins[1-champion]}.`:winner===null?'Tie! Replay this game.':`${teamName(winner)} earn one series point.`);focusFirst();
}
// Finish the roster introduction before starting the gameplay countdown.
function moleHandoff(team,detail,action){
 turn=team;competitionPhase='handoff';scoreboard();
 const spokenNames=i=>selectedPlayers[i].join(', ').replace(/, ([^,]+)$/, ' and $1');
 const first=!results[1-team];
 const introduction=first
  ? `Today's challenge is ${spokenNames(0)||teamName(0)} versus ${spokenNames(1)||teamName(1)}. Match starts in.`
  : `${spokenNames(team)||teamName(team)}, match starts in.`;
 screen(`<div class="handoff">${matchupMarkup()}<h3>${contenderLabel(team)}</h3><p id="mole-introduction">${escapePlayer(introduction)}</p><p id="handoff-countdown" class="handoff-countdown" style="font-size:42px;font-weight:900;color:#111">…</p></div>`);
 timed=true; // A hidden page interrupts this round rather than skipping an introduction.
 const token=generation;let settled=false,started=false;
 moleAudio=createMoleAudio({enabled:()=>soundOn,getContext:()=>{unlockAudio();return audioContext;},volume:()=>moleVolume,speak:(line,volume)=>readArcade(line,volume,{rate:.9,pitch:.9}),later});
 if(!first)moleAudio.cue('buzzer');
 status(`${contender(team)} is being introduced. The countdown starts afterward.`);
 function countdown(number){
  if(token!==generation||document.hidden)return;
  if(number===0){action();chime('match');focusFirst();return;}
  $('handoff-countdown').textContent=String(number);status(`${contender(team)} starts in ${number}.`);
  moleAudio?.announce(String(number),true);moleAudio?.cue('tick');later(()=>countdown(number-1),1000);
 }
 function ready(){
  if(settled||token!==generation)return;settled=true;moleIntroDone=null;
  // Clear stalled or blocked speech before the countdown; normal speech has ended.
  stopTriviaVoice();countdown(3);
 }
 moleIntroDone=ready;
 const utterance=soundOn&&moleVolume>0?readArcade(introduction,moleVolume,{rate:.9,pitch:.9,onStart:()=>{started=true;},onDone:ready}):null;
 if(!utterance)later(ready,1000);
 else {
  // Native speech can be blocked or omit completion events. Allow a generous
  // full reading window once started; blocked audio falls back to visual play.
  later(()=>{if(!started)ready();},6000);
  later(ready,Math.max(20000,introduction.split(/\s+/).length*1000));
 }
}
function handoff(team,detail,action){
  if(game.id==='mole')return moleHandoff(team,detail,action);
  turn=team;competitionPhase='handoff';scoreboard();
  screen(`<div class="handoff">${matchupMarkup()}<span class="giant-icon" aria-hidden="true">${team===0?'🙌':'✌️'}</span><p class="eyebrow">PASS THE DEVICE · STARTING AUTOMATICALLY</p><h3>${teamLabel(team)}, you’re up!</h3><p>${escapePlayer(detail)}</p><p id="handoff-countdown" class="handoff-countdown" style="font-size:42px;font-weight:900;color:#111">4</p><small>Get ready. No button needed.</small></div>`);

  if(!['tic','trivia','mole'].includes(game.id))readArcade(`${contender(team)}, you're up! ${results[1-team]?`Can you beat ${contender(1-team)}?`: `${contender(0)} versus ${contender(1)}. Who is taking the crown?`}`,1);
  if(game.id==='tic')ticStarterVoice();
  if(game.id==='trivia'){triviaAudioPanel(stage,'Turn your volume up for this one! Trivia Showdown reads each question and all answer choices out loud.',true);readArcade('Turn your volume up for this one!');}
  status(`${teamName(team)} start in four seconds. Pass the device.`);
  let remaining=4;
  function tick(){
    if(document.hidden){later(tick,250);return;}
    remaining--;if(remaining===0){action();chime('match');focusFirst();return;}
    chime('tap');$('handoff-countdown').textContent=remaining;later(tick,1000);
  }
  later(tick,1000);
}
function beginRound(){
  liveProgress=[null,null];competitionCue='';competitionPhase='play';
  results=[]; if(game.id==='claw'){game.clawPoints=[0,0];game.clawLayout=clawPrizes(1+Math.floor(Math.random()*2147483645));} if(game.id==='mole'){game.molePoints=[0,0];game.molePlan=molePlan(1+Math.floor(Math.random()*2147483645));} if(game.id==='treasure'){game.treasurePoints=[0,0];game.treasurePlan=[treasurePlan(),treasurePlan()];} if(game.id==='blocks'){game.blockPoints=[0,0];game.blockSeed=1+Math.floor(Math.random()*2147483645);} if(game.id==='basketball')game.basketballPoints=[0,0]; if(game.id==='code')game.safePoints=[0,0]; turn=starter; scoreboard(); status('');
  if(game.id==='memory') return memory();
  if(game.id==='tic') return handoff(turn,`${teamName(turn)} makes the first move. ${teamName(0)} use X; ${teamName(1)} use O.`,tic);
  if(game.id==='rps')return handoff(turn,'Keep your move secret. The other team should look away until you pass the device.',rockPaperScissors);
  if(game.id==='basketball')return teamReady(starter);
  if(game.id==='maze')game.maze=makeMaze();
  if(game.id==='code'){game.codes=[0,1].map(()=>Array.from({length:3},()=>1+Math.floor(Math.random()*4)));}
  if(game.id==='golf')game.course=shuffle(GOLF_COURSES).slice(0,3);
  if(game.id==='challenge') game.challenge=pick('challenge',CHALLENGES,1)[0];
  if(game.id==='trivia') game.questions=pick('trivia',TRIVIA,10);
  if(game.id==='frog')game.frogCourses=frogCourses();
  if(game.id==='picture') game.pictures=pick('picture',PICTURES,6);
  teamReady(starter);
}
function teamReady(team,previous=''){
  competitionCue='';
  let detail=`Your turn starts after the countdown. ${game.description}`;
  if(game.id==='mole')detail='20 seconds. One mole hit earns one point. Same pattern for both teams. Pass the device now!';
  if(game.id==='challenge') detail=`Pick ONE player per team. Same challenge, same 20 seconds. ${game.challenge[0]}: ${game.challenge[1]} The other team counts. You can play seated.`;
  handoff(team,(previous?previous+' ':'')+detail,()=>({claw:clawMachine,mole:whackAMole,blocks,basketball,spot, trivia:quiz,frog:frogHop,treasure:treasureShuffle,picture:quiz,number:quiz,challenge,maze:mazeDash,code:codeBreaker,golf:miniGolf}[game.id])());
}
function finishRound(winner,detail){
  if(game.id==='claw'&&!series)return finishClawMatch(winner,detail);
  if(game.id==='mole'&&!series)return finishMoleMatch(winner,detail);
  if(game.id==='treasure'&&!series)return finishTreasureMatch(winner,detail);
  if(game.id==='blocks'&&!series)return finishBlockMatch(winner,detail);
  if(game.id==='basketball'&&!series)return finishBasketballMatch(winner,detail);
  if(recording&&winner!==null&&!recording.complete)recording.roundWinners.push(winner);
  if(series)return finishSeriesGame(winner,detail);
  const awarded=game.id==='frog'?(()=>{const next=[...wins];if(winner!==null)next[winner]++;return {wins:next,champion:next.findIndex(v=>v>=2)};})():awardRound(wins,winner); wins=awarded.wins; champion=awarded.champion; scoreboard();
  if(champion>=0)saveCompleted();
  screen(`<div class="result"><span class="giant-icon">${winner===null?'🤝':champion>=0?'🏆':'🎉'}</span><p class="eyebrow">${champion>=0?'BRAGGING RIGHTS EARNED':winner===null?'EVEN STEVEN':'ROUND COMPLETE'}</p><h3>${winner===null?'It’s a tie!':`${teamLabel(winner)} ${champion>=0?'win the match!':'win this round!'}`}</h3><p>${escapePlayer(detail)}</p><div class="final-score">${wins[0]} <span>–</span> ${wins[1]}</div><p>${champion>=0?'High fives all around. The best win is playing together.':winner===null?'No round awarded. Let’s replay with a fresh challenge.':'Pass it back. The next round is waiting.'}</p></div>`);
  let moved=false;
  const nextRound=()=>{
    if(moved)return;
    if(document.hidden){later(nextRound,250);return;}
    moved=true;
    if(champion>=0) return openGame(game.id);
    if(winner!==null){round++; attempt=0;}else attempt++;
    starter=1-starter; beginRound();
  };
  if(champion>=0)button('Rematch →',nextRound);
  if(champion<0){
    const note=document.createElement('p');note.className='auto-note';note.textContent='Next round starts automatically in 2 seconds…';stage.appendChild(note);later(nextRound,2200);
  }
  react(winner===null?'turn':'win',winner===null?'Tie — rematch!':`${teamName(winner)} win!`);
  status(champion>=0?`${teamName(winner)} win ${wins[winner]}–${wins[1-winner]}.`:winner===null?'Tie! Replay this round.':`${teamName(winner)} earn one round win.`); focusFirst();
}
function finishTurn(result){
  const target={maze:1,spot:3,picture:3,number:5}[game.id];
  if(target&&result.score===target&&Number.isFinite(result.elapsed)&&result.elapsed>=.1&&result.elapsed<=({maze:45,spot:45,picture:30,number:30}[game.id])){
    timeRecorder.capture({id:crypto.randomUUID(),game:game.id,score:result.score,elapsedMs:Math.round(result.elapsed*1000)});
  }
  results[turn]=result;
  if(!results[1-turn]){
    const previous=`${teamName(turn)}: ${result.label}.`;
    teamReady(1-turn,previous);
  }else{
    const lower=['golf'].includes(game.id); const timeBreak=['spot','picture','number','maze'].includes(game.id);
    const winner=game.id==='frog'?frogRoundWinner(results[0],results[1]):roundWinner(results[0],results[1],lower,timeBreak);
    const detail=names.map((n,i)=>`${n}: ${results[i].label}`).join(' · ');
    finishRound(winner,detail);
  }
}
function finishBasketballMatch(winner,detail){
 if(winner!==null){wins[winner]=1;champion=winner;if(recording)recording.roundWinners.push(winner);saveCompleted();}
 scoreboard();
 screen(`<div class="result"><span class="giant-icon">${winner===null?'🤝':'🏆'}</span><p class="eyebrow">BASKETBALL SHOWDOWN</p><h3>${winner===null?'It’s a tie!':`${teamLabel(winner)} win!`}</h3><p>${escapePlayer(detail)}</p><div class="final-score">${results[0].score} <span>–</span> ${results[1].score}</div><p>30 seconds each. Every basket counts for two.</p></div>`);
 button(winner===null?'Play again →':'Rematch →',()=>openGame('basketball'));
 button('Return to Arcade',()=>$('arcade-return').click(),stage,'text-button');
 react(winner===null?'turn':'win',winner===null?'Even score!':`${teamName(winner)} win!`);
 status(winner===null?'Tie game. Share a high five and play again!':`${teamName(winner)} win the basketball showdown!`);focusFirst();
}
function finishBlockMatch(winner,detail){
 if(winner!==null){wins[winner]=1;champion=winner;if(recording)recording.roundWinners.push(winner);saveCompleted();}
 scoreboard();
 screen(`<div class="result"><span class="giant-icon">${winner===null?'🤝':'🏆'}</span><p class="eyebrow">BLOCK SHOWDOWN · MATCH COMPLETE</p><h3>${winner===null?'It’s a tie!':`${teamLabel(winner)} win!`}</h3><p>${escapePlayer(detail)}</p><div class="final-score">${results[0].score} <span>–</span> ${results[1].score}</div><p>One round. 60 seconds each. Every placed piece earns one point.</p></div>`);
 button('Rematch →',()=>openGame('blocks'));button('Return to Arcade',()=>$('arcade-return').click(),stage,'text-button');
 react(winner===null?'turn':'win',winner===null?'Even score!':`${teamName(winner)} win!`);
 status(winner===null?'Tie game! Share a high five.':`${teamName(winner)} win Block Showdown!`);focusFirst();
}
function blocks(){
 screen('<div class="block-cabinet"><canvas id="block-board" tabindex="0" role="application" aria-label="Block puzzle. Drag pieces onto the grid. Or tap a piece then its top-left grid square. Keyboard: 1, 2, 3 select a piece; arrows move; Enter places it."></canvas><p class="block-help">Drag & drop · Green = fits · Full lines clear<br>Or tap a piece, then an empty square.</p></div>');
 timed=true;
 mountBlocks({canvas:$('block-board'),team:teamName(turn),later,sound:chime,onStatus:status,effects:effectsOn,seed:game.blockSeed,
  onScore:points=>{game.blockPoints[turn]=points;scoreboard();competitionUpdate({score:points});},
  onEnd:result=>{timed=false;chime('buzzer');finishTurn(result);}});
}
function basketball(){
 screen(`<div class="basketball-cabinet"><canvas id="basketball-court" tabindex="0" role="application" aria-label="Basketball court. Flick upward from the ball to shoot. Keyboard: arrows adjust aim and power, Space or Enter shoots."></canvas><div class="basketball-accessible" role="status" aria-live="polite"><span id="basketball-points">${teamLabel(turn)}: 0 points</span></div></div>`);
 timed=true;
 mountBasketball({canvas:$('basketball-court'),team:teamName(turn),later,sound:chime,onStatus:status,
  onScore:points=>{game.basketballPoints[turn]=points;scoreboard();competitionUpdate({score:points});$('basketball-points').textContent=`${teamName(turn)}: ${points} points`;},
  onEnd:result=>{timed=false;chime('buzzer');finishTurn(result);}});
}
function startClock(seconds,onEnd){
  const deadline=performance.now()+seconds*1000; timed=true;
  const tick=()=>{const left=Math.max(0,deadline-performance.now()); const el=$('game-clock'); if(el)el.textContent=`${Math.ceil(left/1000)}s`; if(left<=0){onEnd();}else later(tick,100);}; tick(); return deadline;
}
function memory(){
  const SYMBOLS=['♠','♥','♦','♣','★','☺','⚛','✺'];
  const deck=shuffle([...SYMBOLS,...SYMBOLS]);let revealed=[],matched=new Set(),points=[0,0],locked=true,preview=true,moves=0,best=null,elapsed=0,runningSince=null,clockStopped=false,complete=false;
  const bestKey=`avk:memory:best:${arcadeAccountId}`;
  try{const raw=localStorage.getItem(bestKey),value=Number(raw);if(raw!==null&&Number.isInteger(value)&&value>=8)best=value;}catch{}
  screen(`<section id="memory-game" class="source-memory-game" aria-label="Memory Match"><h3>Memory Match</h3><div class="source-memory-hud"><span>Moves: <b id="memory-moves">0</b></span><span>Time: <b id="memory-time">0:00</b></span><span>Best: <b id="memory-best">${best===null?'--':best+' moves'}</b></span></div><div class="turn-strip memory-turn-strip" id="turn-strip"></div><div class="memory-round-score"><div role="status" aria-live="polite" aria-atomic="true"><span id="memory-team-0">${teamLabel(0,true)} <strong id="memory-adult-points">0</strong><em id="memory-team-0-turn"></em></span><span id="memory-team-1">${teamLabel(1,true)} <strong id="memory-kid-points">0</strong><em id="memory-team-1-turn"></em></span></div></div><p id="memory-rules" class="memory-quick-rules">Match = 1 point + go again. Miss = switch teams. Yellow team plays.</p><div id="memory-cards" class="source-memory-board" role="group" aria-label="Sixteen cards, eight matching pairs"></div><button type="button" class="source-memory-restart" id="memory-restart">Restart round</button><div id="memory-action"></div></section>`);
  function clockText(){
    const seconds=Math.floor((elapsed+(runningSince===null?0:performance.now()-runningSince))/1000);
    return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  }
  function pauseClock(){if(runningSince!==null){elapsed+=performance.now()-runningSince;runningSince=null;}}
  memoryClock={stop(){pauseClock();clockStopped=true;},setPaused(paused){if(paused)pauseClock();else if(!preview&&!complete&&!clockStopped)runningSince=performance.now();}};
  function tickClock(){if(clockStopped||complete)return;const text=clockText();if($('memory-time').textContent!==text)$('memory-time').textContent=text;later(tickClock,250);}
  function draw(){
    $('memory-game').setAttribute('data-preview',String(preview));
    $('turn-strip').textContent=preview?`${teamName(turn)} go first! Look closely — cards hide in five seconds.`:`${teamName(turn)}’ TURN · Highlighted yellow · Match a pair to go again!`;
    $('memory-adult-points').textContent=String(points[0]);$('memory-kid-points').textContent=String(points[1]);
    [0,1].forEach(team=>{$('memory-team-'+team).setAttribute('data-current',String(team===turn));$('memory-team-'+team).setAttribute('aria-current',String(team===turn));$('memory-team-'+team+'-turn').textContent=team===turn?'YOUR TURN':'WAITING';});
    liveProgress=points.map(score=>({score}));competitionUpdate();
    const holder=$('memory-cards');
    if(!holder.children.length)deck.forEach((symbol,i)=>{
      const card=button('',()=>flip(i),holder,'source-memory-card');card.innerHTML=`<span class="source-memory-front" aria-hidden="true">${symbol}</span><span class="source-memory-back" aria-hidden="true">?</span>`;
    });
    deck.forEach((symbol,i)=>{
      const visible=preview||revealed.includes(i)||matched.has(i),card=holder.children[i];
      card.className=`source-memory-card${visible?' flipped':''}${matched.has(i)?' matched':''}`;
      card.disabled=locked||visible;card.setAttribute('aria-label',visible?`Card ${i+1}: ${symbol}${matched.has(i)?', matched':''}`:`Hidden card ${i+1}`);
    });
  }
  function finishBoard(){
    complete=true;pauseClock();$('memory-time').textContent=clockText();
    if(best===null||moves<best){best=moves;$('memory-best').textContent=`${best} moves`;try{localStorage.setItem(bestKey,String(best));}catch{}}
    react('win',`${teamName(turn)} +1 POINT!`);
    later(()=>finishRound(roundWinner({score:points[0]},{score:points[1]}),`Round points — ${teamName(0)} ${points[0]} · ${teamName(1)} ${points[1]}. Cleared in ${moves} moves (${clockText()}). One matching pair = one point. Most points wins the round.`),800);
  }
  function flip(i){
    if(locked||document.hidden||complete||revealed.includes(i)||matched.has(i))return;
    revealed.push(i);chime('tap');
    if(revealed.length<2){draw();return;}
    locked=true;moves++;$('memory-moves').textContent=String(moves);draw();
    // Preserve the supplied game's 650ms reveal and extra 450ms miss delay.
    later(function resolvePair(){
      if(document.hidden){later(resolvePair,250);return;}
      const match=deck[revealed[0]]===deck[revealed[1]];
      if(match){revealed.forEach(id=>matched.add(id));points[turn]++;competitionUpdate({score:points[turn]});}
      draw();if(matched.size===deck.length){finishBoard();return;}
      status(match?`${teamName(turn)} earn 1 point and go again!`:'No match. Remember those cards — next team coming up…');
      react(match?'match':'turn',match?`${teamName(turn)} +1 POINT!`:'Next team…');
      const next=()=>{if(document.hidden){later(next,250);return;}revealed=[];if(!match)turn=1-turn;locked=false;scoreboard();draw();status(`${teamName(turn)}: find a pair.`);};
      if(match)next();else later(next,450);
    },650);
  }
  $('memory-restart').addEventListener('click',beginRound);
  draw();status('Five-second preview — both teams can look! Match = 1 point + go again. Miss = switch teams.');
  readArcade('Match a pair: one point, go again. Miss: switch teams. Yellow team plays.',1);
  function hidePreview(){if(!preview)return;if(document.hidden){later(hidePreview,250);return;}preview=false;locked=false;runningSince=performance.now();draw();$('memory-action').replaceChildren();status(`${teamName(turn)}: find a pair.`);tickClock();}
  later(hidePreview,5000);
}
function tic(){
  let board=Array(9).fill(null),locked=false;
  screen('<p class="turn-strip" id="turn-strip"></p><div class="tic-grid" id="tic-board"></div><div id="tic-action"></div>');
  function draw(){
    $('turn-strip').textContent=`${teamName(turn)} play ${turn===0?'X':'O'}`;
    const holder=$('tic-board');holder.replaceChildren();
    board.forEach((v,i)=>{const b=button(v===null?'':v===0?'X':'O',()=>move(i),holder,`tic-cell ${v===1?'kids-mark':''}`);b.disabled=locked||v!==null;b.setAttribute('aria-label',`Square ${i+1}, ${v===null?'empty':v===0?teamName(0)+' X':teamName(1)+' O'}`);});
  }
  function move(i){
    if(locked||board[i]!==null)return; board[i]=turn; const winner=lineWinner(board);
    if(winner!==null||board.every(v=>v!==null)){locked=true;draw();later(()=>finishRound(winner,winner===null?'Full board. Nobody connected three.':`${teamName(winner)} connected three!`),500);return;}
    locked=true;draw();react('tap','Nice move!');later(()=>{turn=1-turn;locked=false;scoreboard();draw();status(`${teamName(turn)}: choose a square.`);},300);status('Next team…');
  }
  draw();ticStarterVoice($('tic-action'),false);status(`${teamName(turn)}: choose a square.`);
}
// Small answer pictures help younger players connect the spoken choice to its tile.
function triviaAnswerIcon(value){
 const picture=PICTURES.find(([,label])=>label.toLowerCase()===value.toLowerCase());if(picture)return picture[0];
 if(/^\d+$/.test(value))return '🔢';
 const icons={'Earth':'🌍','Mars':'🔴','Venus':'🪐','Saturn':'🪐','Butterflies':'🦋','Butterfly':'🦋','Beetles':'🪲','Bees':'🐝','Spiders':'🕷️','Spider':'🕷️','Ant':'🐜','Worm':'🪱','Ice':'🧊','Steam':'♨️','Sand':'🏖️','Cloud':'☁️','Clouds':'☁️','Triangle':'🔺','Square':'🟩','Circle':'⚪','Rectangle':'▰','Pentagon':'⬠','Hexagon':'⬡','Octagon':'🛑','Green':'🟢','Orange':'🟠','Purple':'🟣','Pink':'🩷','Red':'🔴','Blue':'🔵','Yellow':'🟡','Shark':'🦈','Trout':'🐟','Bear':'🐻','Potato':'🥔','Lettuce':'🥬','Honey':'🍯','Milk':'🥛','Flour':'🌾','Butter':'🧈','The Sun':'☀️','Sirius':'⭐','Polaris':'⭐','Vega':'⭐','Water':'💧','Sunlight':'☀️','Sound':'🔊','Piano':'🎹','Drum':'🥁','Flute':'🪈','Violin':'🎻','Summer':'☀️','Winter':'❄️','Autumn':'🍂','Spring again':'🌷','Robin':'🐦','Eagle':'🦅','Sparrow':'🐦','Pacific':'🌊','Atlantic':'🌊','Indian':'🌊','Arctic':'🧊','Snail':'🐌','Mouse':'🐭','Duck':'🦆','Broccoli':'🥦','Celery':'🥬','Spinach':'🥬','Thursday':'📅','Tuesday':'📅','Friday':'📅','Sunday':'📅','Basketball':'🏀','Soccer':'⚽','Tennis':'🎾','Baseball':'⚾','Gills':'🐟','Wings':'🪽','Fur':'🐻','Paws':'🐾','Thermometer':'🌡️','Ruler':'📏','Compass':'🧭','Scale':'⚖️','Hippo':'🦛','South':'⬇️','East':'➡️','West':'⬅️','Up':'⬆️','Puppy':'🐶','Kitten':'🐱','Calf':'🐮','Cub':'🐻','Roots':'🌱','Flower':'🌸','Leaves':'🍃','Fruit':'🍎','January':'📅','June':'📅','March':'📅','December':'📅','Hearing':'👂','Taste':'👅','Sight':'👁️','Smell':'👃','Clock':'🕒','Globe':'🌐','Magnet':'🧲','Oak tree':'🌳','Daisy':'🌼','Grass':'🌱','Tulip':'🌷','Constellation':'✨','Continent':'🌍','Volcano':'🌋','Island':'🏝️','Kangaroo':'🦘','Wolf':'🐺','Light':'💡','A bicycle':'🚲','A walking person':'🚶','Cheese':'🧀','Bread':'🍞','Rice':'🍚','Pasta':'🍝','Rain':'🌧️','Lava':'🌋','Smoke':'💨','Owl':'🦉','Timer':'⏱️'};
 return icons[value]||'💬';
}
function quiz(){
  const count=game.id==='trivia'||game.id==='number'?5:3;
  const seconds=game.id==='trivia'?45:30;
  let index=0,points=0,settled=false,locked=false;
  const started=performance.now();
  screen('<div class="turn-strip"><span id="question-progress"></span><strong id="game-clock"></strong></div><div id="quiz-body"></div>');
  function finish(){if(settled)return;settled=true;finishTurn({score:points,elapsed:(performance.now()-started)/1000,label:`${points}/${count} correct in ${((performance.now()-started)/1000).toFixed(1)}s`});}
  const deadline=startClock(seconds,finish);
  function nextQuestion(){
    if(settled)return; stopTriviaVoice(); locked=false;
    $('question-progress').textContent=`${teamName(turn)} · ${index+1} / ${count} · ${points} correct`;
    const body=$('quiz-body');body.replaceChildren(); const offset=turn===starter?0:count;
    let answer,choices,prompt;
    if(game.id==='trivia') {const q=game.questions[offset+index];[prompt,answer]=q;choices=shuffle(q.slice(1));}
    if(game.id==='number'){
      const a=2+Math.floor(Math.random()*18),b=1+Math.floor(Math.random()*10),add=Math.random()<0.5;
      answer=String(add?a+b:Math.max(a,b)-Math.min(a,b)); prompt=add?`${a} + ${b} = ?`:`${Math.max(a,b)} − ${Math.min(a,b)} = ?`;
      const value=Number(answer);choices=shuffle([answer,String(value+1),String(value+3),String(value===0?2:value-1)]);
    }
    if(game.id==='picture'){
      const [symbol,label]=game.pictures[offset+index];answer=label;prompt='What’s behind the tiles?';
      choices=shuffle([label,...shuffle(PICTURES.filter(p=>p[1]!==label)).slice(0,3).map(p=>p[1])]);
      const h=document.createElement('h3');h.textContent=prompt;body.appendChild(h);
      const mystery=document.createElement('div');mystery.className='mystery';
      const art=document.createElement('span');art.textContent=symbol;art.setAttribute('aria-hidden','true');mystery.appendChild(art);
      const cover=document.createElement('div');cover.className='picture-cover';cover.setAttribute('aria-hidden','true');
      for(let i=0;i<9;i++){const tile=document.createElement('i');cover.appendChild(tile);}
      mystery.appendChild(cover);mystery.setAttribute('role','img');mystery.setAttribute('aria-label','A covered mystery picture is revealing. A text clue appears after four seconds.');body.appendChild(mystery);
      const order=shuffle([...cover.children]);order[0].classList.add('uncovered');const qi=index;
      order.slice(1).forEach((tile,i)=>later(()=>{if(!settled&&!locked&&index===qi)tile.classList.add('uncovered');},(i+1)*750));
      const hint=document.createElement('p');hint.className='clue';hint.textContent='Watch the picture reveal…';body.appendChild(hint);
      later(()=>{if(!settled&&!locked&&index===qi)hint.textContent=`Clue: starts with ${label[0]}, ${label.replace(/ /g,'').length} letters.`;},4000);
    }else {const h=document.createElement('h3');h.className=game.id==='number'?'math-question':'';h.textContent=prompt;body.appendChild(h);}
    const options=document.createElement('div');options.className='answer-grid';body.appendChild(options);
    choices.forEach((value,i)=>{
      const option=button(value,()=>choose(value===answer,answer),options,'answer');
      if(game.id!=='trivia')return;
      option.setAttribute('data-answer',value);option.setAttribute('data-trivia-option',String(i+1));
      option.setAttribute('aria-label',`Option ${i+1}: ${value}`);option.replaceChildren();
      const number=document.createElement('span');number.className='trivia-option-number';number.textContent=String(i+1);number.setAttribute('aria-hidden','true');
      const icon=document.createElement('span');icon.className='trivia-option-icon';icon.textContent=triviaAnswerIcon(value);icon.setAttribute('aria-hidden','true');
      const label=document.createElement('span');label.className='trivia-option-text';label.textContent=value;
      option.appendChild(number);option.appendChild(icon);option.appendChild(label);
    });
    if(game.id==='trivia'){
      const narration=`${prompt} ${choices.map((value,i)=>`Option ${i+1}: ${value}.`).join(' ')}`;
      triviaAudioPanel(body,narration);readArcade(narration);
    }
  }
  function choose(correct,answer){
    if(settled||locked||performance.now()>=deadline)return;locked=true;stopTriviaVoice();
    if(correct)points++;competitionUpdate({score:points});stage.querySelectorAll('button,input').forEach(el=>el.disabled=true);
    const feedback=document.createElement('p');feedback.className=`answer-feedback ${correct?'correct':''}`;feedback.textContent=correct?'Correct! ✦':`Good try! Answer: ${answer}`;$('quiz-body').appendChild(feedback);
    react(correct?'match':'turn',correct?'Correct!':'Keep going!');status(correct?'Correct!':'Keep going!');
    later(()=>{index++;if(index===count)finish();else nextQuestion();},650);
  }
  nextQuestion();status(`${teamName(turn)}’ turn. The clock is running!`);
}
function spot(){
  let index=0,points=0,mistakes=0,settled=false; const started=performance.now();
  screen('<div class="turn-strip"><span id="spot-progress"></span><strong id="game-clock"></strong></div><p>Compare both grids. Tap the changed tile in the lower grid.</p><div id="spot-body"></div>');
  function finish(){if(settled)return;settled=true;const elapsed=(performance.now()-started)/1000+mistakes;finishTurn({score:points,elapsed,label:`${points}/3 found · ${elapsed.toFixed(1)}s including ${mistakes}s penalties`});}
  const deadline=startClock(30,finish);
  function puzzle(){
    const icons=shuffle(['🌻','🌵','🍄','🌴','🌷','🍀','🌼','🌹','🌲','🌺','🪻','🌿']);
    const original=shuffle([...icons.slice(0,4),...icons.slice(0,4)]).slice(0,6);const changed=Math.floor(Math.random()*6);
    const body=$('spot-body');body.replaceChildren();$('spot-progress').textContent=`${teamName(turn)} · Grid ${index+1} / 3`;
    const reference=document.createElement('div');reference.className='spot-grid reference';reference.setAttribute('aria-label','Original grid');
    original.forEach((icon,i)=>{const s=document.createElement('span');s.textContent=icon;s.setAttribute('role','img');s.setAttribute('aria-label',`Original tile ${i+1}: ${icon}`);reference.appendChild(s);});body.appendChild(reference);
    const label=document.createElement('p');label.className='eyebrow';label.textContent='TAP THE DIFFERENCE BELOW';body.appendChild(label);
    const target=document.createElement('div');target.className='spot-grid';body.appendChild(target);
    original.forEach((icon,i)=>{const value=i===changed?icons[5]:icon; const b=button(value,()=>{
      if(settled||performance.now()>=deadline)return;
      if(i!==changed){mistakes++;b.disabled=true;b.classList.add('wrong');status('Try another tile. One second added to your time.');return;}
      points++;competitionUpdate({score:points});index++;if(index===3)finish();else {puzzle();react('match','Found it!');}
    },target,'spot-tile');b.setAttribute('aria-label',`Changed grid tile ${i+1}: ${value}`);});
  }
  puzzle();status('Find three differences. Wrong taps add one second to your result.');
}
function frogHop(){
 screen('<div class="frog-cabinet"><p id="frog-progress" class="frog-progress"></p><canvas id="frog-pond" tabindex="0" role="application" aria-label="Frog crossing a pond with moving lily pads. Hold the jump button to charge; release to jump."></canvas><div class="frog-charge"><button id="frog-jump" type="button">HOLD TO CHARGE · RELEASE TO HOP</button></div><div class="frog-audio"><button id="frog-music" type="button" aria-pressed="true">🐸 Background ribbits: on</button><label for="frog-volume">Ribbit volume</label><input id="frog-volume" type="range" min="0" max="100" value="30"></div><small>1 crossing = 1 point · 3 tries each · Distance breaks ties, then bonus flies.<br>Hold Space or Enter to charge on a keyboard. Hold the frog or the jump button. Turn your volume up for ribbits!</small></div>');
 timed=true;unlockAudio();
 stopFrog=mountFrog({canvas:$('frog-pond'),chargeButton:$('frog-jump'),musicButton:$('frog-music'),volumeInput:$('frog-volume'),progress:$('frog-progress'),later,team:teamName(turn),courses:game.frogCourses,onStatus:status,opponent:results[1-turn]?{name:contender(1-turn),...results[1-turn]}:null,onProgress:progress=>competitionUpdate(progress),onScore:points=>{game.frogPoints??=[0,0];game.frogPoints[turn]=points;competitionUpdate({score:points});},getAudioContext:()=>audioContext,isSoundOn:()=>soundOn,onEnd:result=>{timed=false;finishTurn(result);}});
}
function finishTreasureMatch(winner,detail){
 if(winner!==null){wins[winner]=1;champion=winner;if(recording)recording.roundWinners.push(winner);saveCompleted();}
 scoreboard();
 screen(`<div class="result"><span class="giant-icon">${winner===null?'🤝':'🏆'}</span><p class="eyebrow">TREASURE SHUFFLE · SHOWDOWN COMPLETE</p><h3>${winner===null?'It’s a draw!':`${teamLabel(winner)} win the Showdown!`}</h3><p>${escapePlayer(detail)}</p><div class="final-score">${results[0].score} <span>–</span> ${results[1].score}</div><p>Five guesses each. One point per treasure. High fives all around!</p></div>`);
 button('Rematch →',()=>openGame('treasure'));button('Return to Arcade',()=>$('arcade-return').click(),stage,'text-button');
 react(winner===null?'turn':'win',winner===null?'Equal treasure!':`${teamName(winner)} win!`);
 status(winner===null?'Draw! Equal treasures found.':`${teamName(winner)} win Treasure Shuffle!`);focusFirst();
}
function treasureShuffle(){
 screen('<div id="treasure-stage"></div>');timed=true;
 mountTreasure({parent:$('treasure-stage'),plan:game.treasurePlan[turn],team:teamName(turn),later,sound:chime,onStatus:status,
  onScore:points=>{game.treasurePoints[turn]=points;scoreboard();competitionUpdate({score:points});},
  onEnd:result=>{timed=false;finishTurn(result);}});
}
function challenge(){
  let finished=false; screen(`<p class="eyebrow">${teamLabel(turn,true)} · REAL-WORLD ROUND</p><h3>${game.challenge[0]}</h3><p>${game.challenge[1]}</p><div id="game-clock" class="challenge-clock">20s</div><p>Other team: count complete repetitions out loud.</p>`);
  startClock(20,()=>{
    if(finished)return;finished=true;screen(`<div class="result"><span class="giant-icon">⏱</span><h3>Stop! How many?</h3><p>Other team: enter the repetitions you counted for ${teamLabel(turn)}.</p><form id="challenge-form"><label for="challenge-score">Repetitions completed</label><input id="challenge-score" type="number" min="0" max="999" step="1" inputmode="numeric" required><button class="primary" type="submit">Confirm score →</button></form><p class="clue">Scores are counted by your family. Be fair. Have fun.</p></div>`);
    $('challenge-form').addEventListener('submit',e=>{e.preventDefault();const value=Number($('challenge-score').value);if(Number.isInteger(value)&&value>=0&&value<=999)finishTurn({score:value,elapsed:20,label:`${value} repetitions`});});status('Time! Enter the score together.');focusFirst();
  });status('Go! Twenty seconds. Count each complete repetition.');
}

function rockPaperScissors(){
  const choices=[null,null],labels=['Rock','Paper','Scissors'],hands=['✊','✋','✌️'],moves=labels.map((label,i)=>`${label} ${hands[i]}`);
  const first=starter;
  function reveal(){
    const winner=rpsWinner(choices);
    const rule=winner===null?'Same move — it’s a tie!':choices[winner]===0?'Rock beats scissors!':choices[winner]===1?'Paper covers rock!':'Scissors cut paper!';
    screen(`<div class="rps-battle"><p class="eyebrow">BOTH MOVES ARE LOCKED IN</p><h3>SHOW YOUR HANDS!</h3><div class="rps-battle-board"><div class="rps-battle-team"><b>★ ${teamLabel(0,true)}</b><span class="rps-battle-hand" role="img" aria-label="${labels[choices[0]]}">${hands[choices[0]]}</span><strong>${labels[choices[0]]}</strong></div><span class="rps-battle-vs">VS.</span><div class="rps-battle-team kids"><b>✦ ${teamLabel(1,true)}</b><span class="rps-battle-hand" role="img" aria-label="${labels[choices[1]]}">${hands[choices[1]]}</span><strong>${labels[choices[1]]}</strong></div></div><p id="rps-battle-call" role="status">Rock… Paper… Scissors… SHOWDOWN!</p></div>`);
    react('tap','SHOWDOWN!');status('Both teams: watch the showdown!');
    later(()=>{$('rps-battle-call').textContent=rule;react(winner===null?'turn':'match',winner===null?'TIE!':`${teamName(winner)} take the round!`);},1100);
    later(()=>finishRound(winner,`${teamName(0)}: ${moves[choices[0]]} · ${teamName(1)}: ${moves[choices[1]]}. ${rule}`),2600);
  }
  function choose(){
    screen(`<p class="eyebrow">${teamLabel(turn,true)} · SECRET MOVE</p><h3>What’s your move?</h3><p>Other team: look away. Your choice stays hidden until both teams have picked.</p><div id="rps-options" class="rps-options"></div>`);
    moves.forEach((move,i)=>{
      const pick=button(move,()=>{
        if(choices[turn]!==null)return;choices[turn]=i;
        if(choices[1-turn]===null){
          turn=1-first;scoreboard();
          screen(`<div class="handoff"><span class="giant-icon" aria-hidden="true">🙌</span><p class="eyebrow">PASS THE DEVICE</p><h3>${teamLabel(turn)}, you’re next!</h3><p>The first move is hidden. Pass the device without looking back.</p><p class="rps-pass-count" style="font-size:48px;font-weight:900;color:#111" id="rps-pass-count">4</p><small>Your choices appear automatically.</small></div>`);
          status(`Pass to ${teamName(turn)}. Their choices open in four seconds.`);
          let remaining=4;
          const tick=()=>{remaining--;if(remaining===0){choose();focusFirst();return;}$('rps-pass-count').textContent=remaining;later(tick,1000);};
          later(tick,1000);
        }else reveal();
      },$('rps-options'),'answer rps-choice');
      pick.innerHTML=`<span class="rps-choice-label">${labels[i]}</span> <span class="rps-choice-hand" aria-hidden="true">${hands[i]}</span>`;
      pick.setAttribute('aria-label',labels[i]);
    });
    status(`${teamName(turn)}: pick a secret move.`);focusFirst();
  }
  choose();
}
function mazeDash(){
  const {size,cells}=game.maze;let position=0,settled=false,steps=0;
  const started=performance.now(),delta=[-size,1,size,-1];
  screen('<div class="turn-strip"><span id="maze-progress"></span><strong id="game-clock"></strong></div><p>Use the arrows to reach the flag. Solid black lines are walls.</p><div id="maze-board" class="maze-board" role="img" aria-label="Maze"></div><div id="maze-controls" class="maze-controls"></div>');
  function finish(escaped){
    if(settled)return;settled=true;
    const elapsed=escaped?(performance.now()-started)/1000:45;
    const result={score:escaped?1:0,elapsed,label:escaped?`Escaped in ${elapsed.toFixed(1)}s · ${steps} moves`:'No escape in 45 seconds'};
    if(escaped&&turn===1){
      screen('<div class="result maze-celebration"><div class="maze-confetti" aria-hidden="true"><i>★</i><i>✦</i><i>★</i><i>✦</i><i>★</i><i>✦</i></div><span class="giant-icon" role="img" aria-label="Celebration">🎉</span><p class="eyebrow">MAZE COMPLETE!</p><h3>WAY TO GO, '+teamLabel(turn,true)+'!</h3><p>You found the way out!</p><p>'+result.label+'</p></div>');
      react('win','MAZE COMPLETE!');status(`Way to go, ${teamName(turn)}! You completed the maze!`);
      later(()=>finishTurn(result),2000);
    }else finishTurn(result);
  }
  function draw(){
    $('maze-progress').textContent=`${teamName(turn)} · ${steps} moves`;
    $('maze-board').innerHTML=cells.map((walls,i)=>`<span class="maze-cell ${i===position?'player':''}" style="border-top:${walls[0]?3:0}px solid #111;border-right:${walls[1]?3:0}px solid #111;border-bottom:${walls[2]?3:0}px solid #111;border-left:${walls[3]?3:0}px solid #111">${i===position?'●':i===cells.length-1?'⚑':''}</span>`).join('');
    $('maze-board').setAttribute('aria-label',`Player row ${Math.floor(position/size)+1}, column ${position%size+1}. Goal row ${size}, column ${size}.`);
    $('maze-controls').replaceChildren();
    ['↑ Up','→ Right','↓ Down','← Left'].forEach((label,d)=>{
      const b=button(label,()=>{
        if(settled||cells[position][d])return;
        chime('tap');
        position+=delta[d];steps++;if(position===cells.length-1)return finish(true);draw();
      },$('maze-controls'),'answer');b.innerHTML=`<span class="maze-direction-arrow" aria-hidden="true">${label[0]}</span> <span class="maze-direction-label">${label.slice(2)}</span>`;b.setAttribute('aria-label',label.slice(2));b.disabled=cells[position][d];
    });
  }
  mazeSoundbar();
  draw();startClock(45,()=>finish(false));status('Find the flag. You can only move through open paths.');
}
function safeScoreMarkup(){
  return `<div class="safe-point-score" aria-label="Safe points this round"><span>${teamLabel(0,true)} <b>${game.safePoints[0]}</b></span><small>FIRST TO 3<br>1 SAFE = 1 POINT</small><span>${teamLabel(1,true)} <b>${game.safePoints[1]}</b></span></div>`;
}
function codeBreaker(){
  let guesses=0,settled=false,guess=[1,1,1],matched=[false,false,false];
  const secret=game.codes[turn];
  screen(safeScoreMarkup()+'<div class="turn-strip"><span id="code-progress"></span><strong id="game-clock"></strong></div><h3>Can you unlock the safe?</h3><p class="safe-instructions">Tap each number box to change it: <b>1 → 2 → 3 → 4 → 1</b>.<br>Then press <b>Unlock Safe</b>. Correct boxes glow green and stay locked in!</p><div class="code-safe" id="code-safe" data-open="false"><div class="safe-door"><span class="safe-hinge top" aria-hidden="true"></span><span class="safe-hinge bottom" aria-hidden="true"></span><div class="safe-brand">ADULTS vs. KIDS™ <span>FAMILY VAULT</span></div><div class="safe-lock-panel"><p class="safe-screen-label" id="safe-screen-label">PRESS NUMBER BOX TO CHANGE THE NUMBERS</p><div id="code-digits" class="code-digits" role="group" aria-label="Three safe code number boxes"></div><div class="safe-screen-feedback" id="safe-feedback" role="status" aria-live="polite">Set all 3 numbers, then try the lock.</div></div><div class="safe-handle" aria-hidden="true"><i></i><i></i><i></i></div><div id="code-action"></div><p class="safe-footnote">6 tries · 60 seconds · Unlock for 1 point</p></div></div>');
  function finish(solved){
    if(settled)return;settled=true;timed=false;
    const scoringTeam=turn;
    function nextSafe(){
      if(game.safePoints[scoringTeam]>=3){
        finishRound(scoringTeam,`Safe points: ${teamName(0)} ${game.safePoints[0]} · ${teamName(1)} ${game.safePoints[1]}. Each unlocked safe earned 1 point. First to 3 wins the round!`);
        return;
      }
      const next=1-scoringTeam;
      game.codes[next]=Array.from({length:3},()=>1+Math.floor(Math.random()*4));
      teamReady(next,solved?`${teamName(scoringTeam)} earned 1 point!`:'The safe stayed locked. No point this turn.');
    }
    if(!solved){nextSafe();return;}
    game.safePoints[scoringTeam]++;scoreboard();competitionUpdate({score:game.safePoints[scoringTeam]});
    $('code-safe').setAttribute('data-open','true');
    $('safe-screen-label').textContent='ACCESS GRANTED';
    $('safe-feedback').textContent='SAFE UNLOCKED! +1 POINT';
    unlock.disabled=true;unlock.textContent='Safe Unlocked! ✓';
    replay.disabled=true;
    react('win','SAFE UNLOCKED! +1 POINT');status(`${teamName(scoringTeam)} unlocked the safe and earned 1 point!`);
    later(()=>{
      const prizes=[['💎','Rainbow Diamond','A sparkling treasure for an expert safe cracker!'],['🗝️','Golden Key','The key to your next family adventure!'],['🏆','Safe Cracker Trophy','A little treasure. A lot of bragging rights!'],['⭐','Lucky Star','A shining reward for your clever code cracking!'],['🥚','Dragon Egg','What could be waiting inside this mysterious treasure?']];
      const [icon,name,description]=prizes[Math.floor(Math.random()*prizes.length)];
      const won=game.safePoints[scoringTeam]>=3;
      screen(`<div class="safe-prize-page"><p class="eyebrow">THE SAFE IS OPEN!</p><h3>CONGRATULATIONS, ${teamLabel(scoringTeam,true)}!</h3><div class="safe-prize-vault" aria-hidden="true"><div class="safe-prize-rays"></div><span class="safe-prize-icon">${icon}</span><span class="safe-prize-door"></span></div><p class="safe-prize-found">YOUR SURPRISE TREASURE</p><h4>${name}</h4><p>${description}</p><strong class="safe-prize-point">+1 POINT</strong>${safeScoreMarkup()}<p class="safe-prize-note">Virtual treasure · just for fun!</p><p class="auto-note">${won?`${teamLabel(scoringTeam)} reached 3 points and win the round!`:`Pass to ${teamLabel(1-scoringTeam)}. Their safe is up next!`}</p></div>`);
      react('win',`${teamName(scoringTeam)} +1 POINT!`);
      readArcade(`Congratulations, ${teamName(scoringTeam)}! You found the ${name}! You earned one point. ${won?'Three points! You win the round!':`You have ${game.safePoints[scoringTeam]} ${game.safePoints[scoringTeam]===1?'point':'points'}. First to three wins the round!`}`,1);
      status(`${teamName(scoringTeam)} found the ${name}! +1 point. ${won?'Round won!':'Next team starts automatically.'}`);
      later(nextSafe,4500);
    },900);
  }

  function draw(){
    $('code-progress').textContent=`${teamName(turn)} · ${guesses} / 6 tries used`;
    $('code-digits').replaceChildren();
    guess.forEach((v,i)=>{
      const b=button(String(v),()=>{
        if(settled||matched[i])return;
        guess[i]=guess[i]%4+1;chime('tap');
        b.textContent=String(guess[i]);b.setAttribute('data-check','unchecked');
        b.setAttribute('aria-label',`Box ${i+1}: ${guess[i]}. Tap to change the number.`);
        $('safe-feedback').textContent='Press Unlock Safe to check your numbers.';
      },$('code-digits'),'code-digit');
      b.setAttribute('data-check',matched[i]?'correct':'unchecked');b.disabled=matched[i];
      b.setAttribute('aria-label',matched[i]?`Box ${i+1}: ${v}. Correct number, locked in.`:`Box ${i+1}: ${v}. Tap to change the number.`);
    });
  }
  const unlock=button('Unlock Safe 🔓',()=>{
    if(settled)return;guesses++;
    matched=guess.map((v,i)=>v===secret[i]);draw();
    Array.from($('code-digits').children).forEach((b,i)=>b.setAttribute('data-check',matched[i]?'correct':'wrong'));
    if(matched.every(Boolean))return finish(true);
    if(guesses===6)return finish(false);
    const correct=matched.filter(Boolean).length;
    const feedback=correct===0?'No green lights yet. Change the numbers and try again.':`${correct} of 3 boxes correct! Keep the green numbers. Change the others.`;
    $('safe-feedback').textContent=feedback;react('tap',`${correct} / 3 CORRECT`);status(feedback);
  },$('code-action'),'safe-unlock');
  const instructions='Press number box to change the numbers. Tap each number button to change it, then press Unlock Safe. Correct numbers glow green and stay locked in. Each unlocked safe earns one point. First to three points wins the round.';
  const replay=button('Hear instructions 🔊',()=>readArcade(instructions,1),$('code-action'),'safe-voice');
  replay.disabled=!canReadTrivia();
  draw();startClock(60,()=>{if(!settled)finish(false);});status('Tap the number boxes, then press Unlock Safe. Green means the number is correct and locked in.');
  readArcade(instructions,1);
}
function miniGolf(){
  let hole=0,shots=0,total=0,moving=false,finished=false,ball;
  screen('<div class="turn-strip"><span id="golf-progress"></span><strong id="golf-strokes"></strong></div><div id="golf-course" class="golf-course"></div><div id="golf-controls"><label for="golf-angle">Aim: <span id="golf-angle-value"></span>° (0° right · 90° down · 180° left · 270° up)</label><input id="golf-angle" type="range" min="0" max="355" step="5" value="340"><label for="golf-power">Power: <span id="golf-power-value"></span>%</label><input id="golf-power" type="range" min="10" max="100" step="5" value="55"><div id="golf-action"></div></div><div id="golf-hole-result"></div>');
  const angle=$('golf-angle'),power=$('golf-power');angle.value='340';power.value='55';
  function draw(){
    const c=game.course[hole],[wx,wy,ww,wh]=c.wall;
    const rad=Number(angle.value)*Math.PI/180;
    $('golf-progress').textContent=`${teamName(turn)} · Hole ${hole+1} of 3`;
    $('golf-strokes').textContent=`Shot ${Math.min(shots+1,4)} / 4 · Total ${total}`;
    $('golf-angle-value').textContent=angle.value;$('golf-power-value').textContent=power.value;
    $('golf-course').innerHTML=`<svg viewBox="0 0 360 200" role="img" aria-label="Mini golf hole ${hole+1}. Ball at ${Math.round(ball.x)}, ${Math.round(ball.y)}. Cup at ${c.hole[0]}, ${c.hole[1]}. Wall in the middle."><rect width="360" height="200" rx="8" fill="#ffd522" stroke="#111" stroke-width="6"></rect><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#111"></rect><circle cx="${c.hole[0]}" cy="${c.hole[1]}" r="10" fill="#111"></circle><text x="${c.hole[0]+12}" y="${c.hole[1]+4}" font-size="16">⚑</text>${moving?'':`<line x1="${ball.x}" y1="${ball.y}" x2="${ball.x+Math.cos(rad)*40}" y2="${ball.y+Math.sin(rad)*40}" stroke="#111" stroke-width="2" stroke-dasharray="4 3"></line>`}<circle cx="${ball.x}" cy="${ball.y}" r="4" fill="#fff" stroke="#111" stroke-width="1.5"></circle></svg>`;
  }
  function startHole(){
    shots=0;moving=false;ball={x:game.course[hole].ball[0],y:game.course[hole].ball[1],vx:0,vy:0};
    $('golf-hole-result').replaceChildren();$('golf-controls').hidden=false;
    angle.disabled=false;power.disabled=false;shoot.disabled=false;draw();status('Line up the dashed aim guide. Bank around the black wall. A gentle ball can drop into the cup.');
  }
  function endHole(sunk){
    total+=sunk?shots:5;competitionUpdate({score:total});$('golf-controls').hidden=true;
    const note=document.createElement('p');note.textContent=sunk?`In the cup! ${shots} ${shots===1?'stroke':'strokes'}.`:'Four shots used. This hole counts as five strokes.';$('golf-hole-result').appendChild(note);
    draw();later(()=>{
      if(finished)return;
      if(hole===2){finished=true;finishTurn({score:total,elapsed:0,label:`${total} strokes across 3 holes`});}
      else {hole++;startHole();}
    },1200);
    status(sunk?'Nice putt!':'Keep going! A new hole is waiting.');focusFirst();
  }
  const shoot=button('Putt →',()=>{
    if(moving||finished||$('golf-controls').hidden)return;
    moving=true;timed=true;shots++;angle.disabled=true;power.disabled=true;shoot.disabled=true;
    const rad=Number(angle.value)*Math.PI/180,speed=Number(power.value)*0.09;
    ball.vx=Math.cos(rad)*speed;ball.vy=Math.sin(rad)*speed;
    let frames=0;
    function frame(){
      ball=golfStep(ball,game.course[hole]);frames++;draw();
      if(ball.sunk||Math.hypot(ball.vx,ball.vy)<0.12||frames>=240){
        moving=false;timed=false;
        if(ball.sunk||shots===4)return endHole(ball.sunk);
        angle.disabled=false;power.disabled=false;shoot.disabled=false;draw();status('Ball stopped. Adjust your aim and power for the next putt.');
      }else later(frame,16);
    }
    frame();
  },$('golf-action'));
  angle.addEventListener('input',()=>{if(!moving)draw();});power.addEventListener('input',()=>{if(!moving)draw();});
  startHole();
}

const recentKey=`avk-arcade-recent:${arcadeAccountId}`;
function gameTile(g,parent){
 const tile=button('',()=>openGame(g.id),parent,'game-tile cover-tile'+(g.id==='lava'?' cover-lava':''));
 tile.setAttribute('data-game',g.id);tile.disabled=!!g.comingSoon;tile.setAttribute('data-coming-soon',String(!!g.comingSoon));tile.setAttribute('aria-label',g.comingSoon?`${g.name} — Coming Soon`:`Play ${g.name}`);tile.innerHTML=coverMarkup(g);return tile;
}
function renderRecent(){
 let ids=[];try{ids=recentGames(localStorage,recentKey,GAMES);}catch{}
 $('arcade-recent-section').hidden=!ids.length;$('arcade-recent').replaceChildren();
 ids.forEach(id=>gameTile(GAMES.find(g=>g.id===id),$('arcade-recent')));
}
function rememberGame(id){
 try{const ids=recentGames(localStorage,recentKey,GAMES);localStorage.setItem(recentKey,JSON.stringify([id,...ids.filter(x=>x!==id)].slice(0,8)));}catch{}
 renderRecent();
}
GAMES.forEach(g=>gameTile(g,$('arcade-grid')));
['lava','memory','maze','treasure','tic','trivia','rps'].forEach(id=>gameTile(GAMES.find(g=>g.id===id),$('arcade-favorites')));
renderRecent();
for(const shelf of ['favorites','recent','all']){
 const track=$(shelf==='all'?'arcade-grid':`arcade-${shelf}`);
 for(const [direction,sign] of [['prev',-1],['next',1]])$(`shelf-${shelf}-${direction}`).addEventListener('click',()=>track.scrollBy({left:sign*track.clientWidth*.8,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
}
let featuredIndex=0,featuredPaused=false,featuredTimer=null;
function renderFeatured(){
 const g=GAMES[featuredIndex];
 $('arcade-feature-title').textContent=g.name;
 $('feature-description').textContent=g.tag;
 $('feature-play-label').textContent=g.comingSoon?'COMING SOON':'▶ PLAY '+g.name.toUpperCase();
 $('arcade-featured-play').disabled=!!g.comingSoon;
 $('arcade-featured-play').setAttribute('aria-label',g.comingSoon?g.name+' — Coming Soon':'Play '+g.name);
 $('feature-art').innerHTML=`<div class="feature-poster" data-game="${g.id}">${coverMarkup(g)}</div><span class="feature-stamp">LESS SUPERVISING.<br><b>MORE PLAYING.</b></span>`;
 $('feature-position').textContent=(featuredIndex+1)+' / '+GAMES.length;
}
function scheduleFeatured(){
 clearTimeout(featuredTimer);
 if(featuredPaused||!arena.hidden||document.hidden)return;
 featuredTimer=setTimeout(()=>{featuredIndex=(featuredIndex+1)%GAMES.length;renderFeatured();scheduleFeatured();},6500);
}
$('arcade-featured-play').addEventListener('click',()=>openGame(GAMES[featuredIndex].id));
$('feature-prev').addEventListener('click',()=>{featuredIndex=(featuredIndex+GAMES.length-1)%GAMES.length;renderFeatured();scheduleFeatured();});
$('feature-next').addEventListener('click',()=>{featuredIndex=(featuredIndex+1)%GAMES.length;renderFeatured();scheduleFeatured();});
$('feature-pause').addEventListener('click',()=>{featuredPaused=!featuredPaused;$('feature-pause').textContent=featuredPaused?'Resume slides':'Pause slides';$('feature-pause').setAttribute('aria-pressed',String(featuredPaused));scheduleFeatured();});
renderFeatured();scheduleFeatured();

$('arcade-random').addEventListener('click',startSeries);
$('arcade-return').addEventListener('click',()=>{clearTimers();series=null;arena.hidden=true;lobby.hidden=false;game=null;scheduleFeatured();lobbyMusic.start();$('arcade-grid').querySelector('button')?.focus();});
$('arcade-reset').addEventListener('click',()=>{
  if(!game)return;const saved=game.id;const wasSeries=!!series;screen('<div class="result"><h3>Start over?</h3><p>The current game and all points in this match or series will reset.</p></div>');
  button(wasSeries?'Restart series':'Restart match',()=>wasSeries?startSeries():openGame(saved));button('Return to Arcade',()=>{$('arcade-return').click();},stage,'text-button');status('Match paused. Choose restart or return to the Arcade.');
});
document.addEventListener('visibilitychange',()=>{
  memoryClock?.setPaused(document.hidden);
  if(document.hidden){lobbyMusic.stop();clearTimeout(featuredTimer);stopTriviaVoice();moleAudio?.stop();}else {scheduleFeatured();lobbyMusic.start();}
  if(document.hidden&&timed&&game){clearTimers();screen('<div class="result"><h3>Let’s give both teams a fair turn.</h3><p>The timed game was interrupted. Replay this round with no round win awarded.</p></div>');button('Replay this round →',beginRound);status('Round interrupted. Match score is unchanged.');}
});

function whackAMole(){
 screen('<section class="source-mole-game" aria-label="Whack-a-Mole"><h3>Whack-a-Mole</h3><div class="source-mole-hud"><span>Score: <b id="mole-score">0</b></span><span>Time: <b id="mole-time">20</b></span><span>Best: <b id="mole-best">0</b></span></div><div class="source-mole-grid" id="mole-board" role="group" aria-label="Nine mole holes. Tap a mole or use keys 1 through 9."></div><p class="source-mole-hint">Whack the moles before they hide. 20 seconds!<br>One hit = one point · Keyboard: 1–9</p></section>');
 timed=true;status(`${teamName(turn)}: 20 seconds. GO! One hit = one point.`);
 moleAudio=createMoleAudio({enabled:()=>soundOn,getContext:()=>{unlockAudio();return audioContext;},volume:()=>moleVolume,speak:(line,volume)=>readArcade(line,volume,{rate:1.08,pitch:.85}),later});moleAudio.music();moleAudio.announce('GO!',true);
 stopMole=mountMole({root:$('mole-board'),accountId:arcadeAccountId,team:teamName(turn),plan:game.molePlan,later,sound:kind=>moleAudio?.cue(kind),onCue:line=>moleAudio?.announce(line),onStatus:status,
  onScore:points=>{game.molePoints[turn]=points;scoreboard();competitionUpdate({score:points});},
  onEnd:result=>{timed=false;chime('buzzer');finishTurn(result);}});
}
function finishMoleMatch(winner,detail){
 if(winner!==null)defendingCrowns.set('mole',winner);
 if(winner!==null){wins[winner]=1;champion=winner;if(recording)recording.roundWinners.push(winner);saveCompleted();}
 scoreboard();
 screen(`<div class="result mole-victory"><span class="mole-fireworks" aria-hidden="true"></span><div class="mole-confetti" aria-hidden="true">✦ · ★ · ✧ · ★ · ✦</div><span class="giant-icon mole-trophy">${winner===null?'🤝':'🏆'}</span><p class="eyebrow">WHACK-A-MOLE · SHOWDOWN COMPLETE</p><h3>${winner===null?'It’s a tie!':`${teamLabel(winner)} win!`}</h3><p>${winner===null?'HIGH FIVES ALL ROUND':`${contenderLabel(winner)} HAS THE CROWN!`}</p><p>${escapePlayer(detail)}</p><div class="final-score">${results[0].score} <span>–</span> ${results[1].score}</div><p>One hit = one point · 20 seconds each.</p><p>${winner===null?'Two teams. Two legends. The mole kingdom belongs to everyone!':kidsOnly?`${contenderLabel(winner)} rules the mole kingdom! ${contenderLabel(1-winner)}, your comeback awaits!`:winner===1?'BREAKING NEWS! The Kids have taken over the mole kingdom! Adults, your comeback awaits!':'UNBELIEVABLE! Adults rule the mole kingdom! Kids, demand a rematch!'}</p><span class="mole-dancer" aria-hidden="true">${winner===null?'🐹 🐹':'🐹'}</span></div>`);
 button('REMATCH!',()=>openGame('mole'));if(winner===null)button('Optional tiebreaker · 20 seconds each',()=>openGame('mole'),stage,'text-button');button('Return to Arcade',()=>$('arcade-return').click(),stage,'text-button');
 react(winner===null?'turn':'win',winner===null?'Even score!':`${teamName(winner)} win!`);
 moleAudio=createMoleAudio({enabled:()=>soundOn,getContext:()=>{unlockAudio();return audioContext;},volume:()=>moleVolume,speak:(line,volume)=>readArcade(line,volume,{rate:1.08,pitch:.85}),later});moleAudio.cue('buzzer');later(()=>moleAudio?.cue('victory'),380);moleAudio.announce(winner===null?'Two teams! Two champions!':`${contender(winner)}! The new Whack-a-Mole champions! Ready for a rematch?`,true);
 status(winner===null?'Tie game! Share a high five.':`${teamName(winner)} win Whack-a-Mole!`);focusFirst();
}

function clawMachine(){
 screen('<div class="claw-cabinet"><canvas id="claw-board" tabindex="0" role="application" aria-label="Claw machine. Drag to aim, or use left and right arrows. Press Drop Claw or Space when the grip marker is green; large prizes need gold. Three attempts."></canvas><div class="claw-controls"><button id="claw-left" type="button" aria-label="Move claw left">◀ LEFT</button><button id="claw-grab" type="button">DROP CLAW</button><button id="claw-right" type="button" aria-label="Move claw right">RIGHT ▶</button></div><p class="mole-help">Drag to aim · Green grabs small · Gold grabs large</p></div>');
 timed=true;
 stopClaw=mountClaw({canvas:$('claw-board'),left:$('claw-left'),right:$('claw-right'),grab:$('claw-grab'),team:teamName(turn),prizes:game.clawLayout,later,sound:chime,onStatus:status,effects:effectsOn,
  onScore:points=>{game.clawPoints[turn]=points;scoreboard();competitionUpdate({score:points});},onEnd:result=>{timed=false;chime('buzzer');finishTurn(result);}});
}
function finishClawMatch(winner,detail){
 if(winner!==null){wins[winner]=1;champion=winner;if(recording)recording.roundWinners.push(winner);saveCompleted();}
 scoreboard();
 screen(`<div class="result claw-result"><canvas id="claw-fireworks" aria-hidden="true"></canvas><span class="giant-icon">${winner===null?'🤝':'🏆'}</span><p class="eyebrow">CLAW MACHINE · SHOWDOWN COMPLETE</p><h3>${winner===null?'A tie! Congratulations to both players!':`Congratulations, ${teamLabel(winner)}!`}</h3><p>${winner===null?'Matching prize hauls!':'You win the Showdown!'}</p><p>${escapePlayer(detail)}</p><div class="final-score">${results[0].score} <span>–</span> ${results[1].score}</div><p>Three grabs each. Small prizes: 1 point. Large prizes: 3.</p></div>`);
 clawFireworks($('claw-fireworks'),later,effectsOn);
 button('Rematch →',()=>openGame('claw'));button('Return to Arcade',()=>$('arcade-return').click(),stage,'text-button');
 react(winner===null?'turn':'win',winner===null?'Congratulations to both players!':`Congratulations, ${teamName(winner)}!`);
 status(winner===null?'Tie game! Congratulations to both players!':`Congratulations, ${teamName(winner)}! You win Harper’s Claw Machine Showdown!`);focusFirst();
}

const requestedGame=new URLSearchParams(location.search).get('game');
if(GAMES.some(g=>g.id===requestedGame&&!g.comingSoon))openGame(requestedGame);

$('mole-volume')?.addEventListener('input',()=>{moleVolume=Number($('mole-volume').value)/100;moleAudio?.silence();if(moleVolume===0){stopTriviaVoice();moleIntroDone?.();}else if(!moleIntroDone)stopTriviaVoice();});
window.addEventListener('pagehide',()=>{if(game?.id==='mole')clearTimers();});

lobbyMusic.stop();lobbyMusic.start();
