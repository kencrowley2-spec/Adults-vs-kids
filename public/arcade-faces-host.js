// Recorded game cues, with local speech for player names.
export function createFaceHost(){
 let context=null,buffer=null,metadata=null,loading=null,current=null,token=0,disposed=false,band=null,musicOn=false,ducked=false,nameCue=null;
 function fadeMusic(){if(!band)return;const target=musicOn?(ducked?.045:.19):0;band.volume=target;}
 function stop(){token++;if(nameCue){nameCue=null;window.speechSynthesis?.cancel();}if(current){try{current.stop();}catch{}current=null;}ducked=false;fadeMusic();}
 async function prepare(){if(disposed)return false;if(!context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;context=new AC();}await context.resume();if(!loading)loading=Promise.all([fetch('/arcade-faces-voice.json?v=4').then(r=>{if(!r.ok)throw Error('Voice cues unavailable');return r.json();}),fetch('/assets/faces/aussie-host.mp3').then(r=>{if(!r.ok)throw Error('Voice audio unavailable');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b))]).then(([m,b])=>{metadata=m;buffer=b;return true;}).catch(()=>{loading=null;return false;});return loading;}
 // A sequence uses one live source at a time, avoiding overlapping cues on interruption.
 async function playSequence(ids,enabled=true){stop();if(!enabled||disposed)return;const mine=token;if(!await prepare()||disposed||mine!==token)return;ducked=true;fadeMusic();for(const id of ids){if(mine!==token||disposed)break;const cue=metadata.cues[id];if(!cue)continue;await new Promise(resolve=>{const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.connect(gain);gain.connect(context.destination);gain.gain.value=.92;current=source;source.onended=resolve;try{source.start(context.currentTime+.02,cue[0],cue[1]-cue[0]);}catch{resolve();}});}if(mine===token){current=null;ducked=false;fadeMusic();}}
 function backTo(player){
  stop();
  const speech=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance;
  if(!speech||!Utterance)return playSequence(['pass']);
  const cue=new Utterance(`Back to ${player}!`);
  const voices=speech.getVoices();
  cue.voice=voices.find(v=>v.lang==='en-AU')||voices.find(v=>v.lang.startsWith('en'))||null;
  cue.lang=cue.voice?.lang||'en-AU';
  nameCue=cue;ducked=true;fadeMusic();
  cue.onend=()=>{if(nameCue===cue){nameCue=null;ducked=false;fadeMusic();}};
  cue.onerror=()=>{if(nameCue===cue){nameCue=null;playSequence(['pass']);}};
  try{speech.speak(cue);}catch{cue.onerror();}
 }
 function setMusic(on){musicOn=on;if(disposed)return;if(!band&&on&&typeof window.Audio==='function'){band=new window.Audio('/assets/faces/showtime-jazz.mp3');band.loop=true;band.preload='auto';band.volume=.19;}if(!band)return;fadeMusic();if(on)band.play()?.catch(()=>{});else band.pause();}
 function dispose(){disposed=true;stop();band?.pause();if(band){band.removeAttribute('src');band.load();}context?.close().catch(()=>{});}
 return {backTo,say:id=>playSequence([id]),saySequence:playSequence,stop,setMusic,dispose};
}
