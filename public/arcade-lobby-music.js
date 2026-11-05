// Original instrumental: 112 BPM synth bass, analog pads, power chords and drums.
// All audio is synthesized locally; there are no external streams or downloads.
export function createLobbyMusic({getContext,allowed,onState=()=>{},volume=.25}){
 let audio=null,bus=null,timer=null,playing=false,pending=false,epoch=0,next=0,step=0,noiseBuffer=null;
 const nodes=new Set(),connections=new Set(),sixteenth=60/112/4;
 const report=(extra={})=>onState({playing,pending,available:!!audio,...extra});
 function release(node,gain){nodes.delete(node);try{node.disconnect();gain.disconnect();}catch{}}
 function route(source,gain,filterType,frequency){
  source.connect(gain);
  if(filterType&&audio.createBiquadFilter){const filter=audio.createBiquadFilter();filter.type=filterType;filter.frequency.value=frequency;gain.connect(filter);filter.connect(bus);connections.add(filter);return filter;}
  gain.connect(bus);return null;
 }
 function note(midi,at,duration,level,type='sawtooth',detune=0,fall=false){
  const osc=audio.createOscillator(),gain=audio.createGain(),hz=440*2**((midi-69)/12);
  osc.type=type;osc.frequency.setValueAtTime(hz,at);if(osc.detune)osc.detune.value=detune;
  if(fall)osc.frequency.exponentialRampToValueAtTime(42,at+duration);
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(level,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  const filter=route(osc,gain,type==='sawtooth'?'lowpass':null,midi<55?1400:2600);
  nodes.add(osc);osc.onended=()=>{release(osc,gain);if(filter){filter.disconnect();connections.delete(filter);}};osc.start(at);osc.stop(at+duration+.02);
 }
 function noise(at,duration,level,frequency){
  if(!audio.createBufferSource){note(102,at,duration,level*.25,'triangle');return;}
  if(!noiseBuffer){noiseBuffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.3),audio.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=noiseBuffer;
  gain.gain.setValueAtTime(level,at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  const filter=route(source,gain,'highpass',frequency);nodes.add(source);source.onended=()=>{release(source,gain);if(filter){filter.disconnect();connections.delete(filter);}};source.start(at);source.stop(at+duration+.01);
 }
 function arrange(at){
  const beat=step%16,bar=Math.floor(step/16)%4,section=Math.floor(step/64)%4,root=[40,36,43,38][bar];
  // Driving eighth-note bass and a quiet offbeat octave.
  if(beat%2===0)note(root+(beat===10?12:0),at,.19,.11,'sawtooth');
  if(beat===7||beat===15)note(root+12,at,.08,.04,'triangle');
  if(beat===0){
   const third=bar===0?3:4;
   for(const interval of [0,third,7]){note(root+12+interval,at,1.9,.014,'sawtooth',-7);note(root+12+interval,at,1.9,.014,'sawtooth',7);}
  }
  if(section!==0&&[0,6,8,14].includes(beat))for(const interval of [0,7,12])note(root+12+interval,at,.16,.018,'sawtooth',4);
  const hook=[12,null,19,24,null,22,19,null,15,null,17,19,null,12,7,null];
  if(section!==2&&hook[beat]!==null){note(root+hook[beat]+12,at,.2,.035,'triangle');note(root+hook[beat]+12,at+.16,.15,.012,'triangle');}
  if([0,8].includes(beat)||section===3&&beat===14)note(51,at,.18,.24,'sine',0,true);
  if(beat===4||beat===12){noise(at,.19,.12,1300);note(49,at,.1,.08,'triangle');}
  if(beat%2===0)noise(at,.035,.04,6500);
  if(beat===15&&section===3)noise(at,.08,.035,5200);
  step=(step+1)%256;
 }
 function schedule(){
  if(!playing)return;
  if(!allowed()||audio.state!=='running'){stop();return;}
  // Skip over stalled browser time instead of playing a burst of missed notes.
  if(next<audio.currentTime-.2)next=audio.currentTime+.03;
  try{while(next<audio.currentTime+.14){arrange(next);next+=sixteenth;}}
  catch{stop();report({blocked:true});return;}
  timer=setTimeout(schedule,80);
 }
 function begin(token){
  if(token!==epoch||!allowed()){pending=false;report();return;}
  pending=false;if(audio.state!=='running'){report({blocked:true});return;}
  bus=audio.createGain();bus.gain.value=volume;bus.connect(audio.destination);playing=true;next=audio.currentTime+.03;step=0;report();schedule();
 }
 function start(){
  if(playing||!allowed())return;
  if(pending){try{audio?.resume?.()?.catch?.(()=>{});}catch{}return;}
  try{audio=getContext();if(!audio){report({available:false});return;}const token=++epoch;
   if(audio.state==='suspended'){pending=true;report();Promise.resolve(audio.resume()).then(()=>begin(token)).catch(()=>{if(token===epoch){pending=false;report({blocked:true});}});}
   else begin(token);
  }catch{pending=false;report({blocked:true});}
 }
 function stop(){
  epoch++;playing=false;pending=false;clearTimeout(timer);timer=null;
  for(const node of [...nodes])try{node.stop();node.disconnect();}catch{}
  nodes.clear();for(const connection of connections)try{connection.disconnect();}catch{}connections.clear();
  if(bus){try{bus.disconnect();}catch{}bus=null;}report();
 }
 return {start,stop,setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(bus)bus.gain.value=volume;},get playing(){return playing;}};
}
