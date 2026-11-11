// Recorded Australian male host. Never fall back to the device's default voice.
export function createFaceHost(){
 let context=null,buffer=null,metadata=null,loading=null,current=null,token=0,disposed=false,band=null,musicOn=false,ducked=false;
 function fadeMusic(){if(!band)return;const target=musicOn?(ducked?.045:.19):0;band.volume=target;}
 function stop(){token++;if(current){try{current.stop();}catch{}current=null;}ducked=false;fadeMusic();}
 async function prepare(){if(disposed)return false;if(!context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;context=new AC();}await context.resume();if(!loading)loading=Promise.all([fetch('/arcade-faces-voice.json?v=4').then(r=>{if(!r.ok)throw Error('Voice cues unavailable');return r.json();}),fetch('/assets/faces/aussie-host.mp3').then(r=>{if(!r.ok)throw Error('Voice audio unavailable');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b))]).then(([m,b])=>{metadata=m;buffer=b;return true;}).catch(()=>{loading=null;return false;});return loading;}
 // A sequence uses one live source at a time, avoiding overlapping cues on interruption.
 async function playSequence(ids,enabled=true){stop();if(!enabled||disposed)return;const mine=token;if(!await prepare()||disposed||mine!==token)return;ducked=true;fadeMusic();for(const id of ids){if(mine!==token||disposed)break;const cue=metadata.cues[id];if(!cue)continue;await new Promise(resolve=>{const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.connect(gain);gain.connect(context.destination);gain.gain.value=.92;current=source;source.onended=resolve;try{source.start(context.currentTime+.02,cue[0],cue[1]-cue[0]);}catch{resolve();}});}if(mine===token){current=null;ducked=false;fadeMusic();}}
 function setMusic(on){musicOn=on;if(disposed)return;if(!band&&on&&typeof window.Audio==='function'){band=new window.Audio('/assets/faces/showtime-jazz.mp3');band.loop=true;band.preload='auto';band.volume=.19;}if(!band)return;fadeMusic();if(on)band.play()?.catch(()=>{});else band.pause();}
 function dispose(){disposed=true;stop();band?.pause();if(band){band.removeAttribute('src');band.load();}context?.close().catch(()=>{});}
 return {say:id=>playSequence([id]),saySequence:playSequence,stop,setMusic,dispose};
}
