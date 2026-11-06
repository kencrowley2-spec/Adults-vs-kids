// Original instrumental: Family Night Groove — 104 BPM, swung electric piano,
// round finger-style bass, mellow mallets and light pocket drums.
// All audio is synthesized locally; there are no external streams or downloads.
export function createLobbyMusic({getContext,allowed,onState=()=>{},volume=.25}){
 let audio=null,bus=null,timer=null,playing=false,pending=false,epoch=0,next=0,step=0,noiseBuffer=null;
 const nodes=new Set(),connections=new Set(),sixteenth=60/104/4;
 const report=(extra={})=>onState({playing,pending,available:!!audio,...extra});
 function release(node,gain){nodes.delete(node);try{node.disconnect();gain.disconnect();}catch{}}
 function route(source,gain,filterType,frequency){
  source.connect(gain);
  if(filterType&&audio.createBiquadFilter){const filter=audio.createBiquadFilter();filter.type=filterType;filter.frequency.value=frequency;gain.connect(filter);filter.connect(bus);connections.add(filter);return filter;}
  gain.connect(bus);return null;
 }
 function note(midi,at,duration,level,type='sine',detune=0,fall=false){
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
 function piano(midi,at,duration,level){
  // A rounded tine tone: a warm fundamental with a short, quiet bell overtone.
  note(midi,at,duration,level,'sine');
  note(midi+12,at,duration*.45,level*.19,'sine');
  note(midi+19,at,.09,level*.055,'sine');
 }
 function arrange(at){
  const beat=step%16,bar=Math.floor(step/16)%8,section=Math.floor(step/128)%4;
  const root=[36,36,45,45,41,41,43,43][bar];
  const chords=[[60,64,67,71],[60,64,67,69],[57,60,64,67],[57,60,64,71],
   [57,60,64,67],[57,60,65,69],[55,59,62,69],[55,59,64,67]];
  // Delay every other sixteenth slightly for a relaxed human swing.
  at+=beat%2?sixteenth*.16:0;
  const bass={0:0,3:12,6:7,8:0,11:7,14:bar%2?11:12};
  if(bass[beat]!==undefined){
   const midi=root+bass[beat];
   note(midi,at,beat===0?.32:.19,.16,'sine');
   note(midi+12,at,.12,.022,'sine');
  }
  if([0,6,10].includes(beat)&&!(section===2&&beat===10)){
   chords[bar].forEach((midi,i)=>piano(midi,at+i*.009,beat===0?.8:.38,.025));
  }
  // An eight-bar call and response, with space between phrases.
  const phrases=[
   {2:76,5:79,7:81,10:79,14:76}, {3:74,6:72,10:71},
   {2:76,5:79,8:83,11:81,14:79}, {2:76,6:74,10:72},
   {3:69,6:72,9:76,14:79}, {2:76,5:74,10:72},
   {2:71,5:74,8:79,11:81}, {2:79,6:76,10:74,14:71}
  ];
  const melody=phrases[bar][beat];
  if(section!==2&&melody!==undefined){
   piano(melody+(section===3&&bar>5?12:0),at,.36,.036);
   note(melody,at+.22,.25,.006,'sine');
  }
  // A short breakdown and small fills keep the loop from becoming a siren.
  if([0,8].includes(beat)||(section!==2&&beat===11&&bar%2))note(48,at,.16,.21,'sine',0,true);
  if(beat===4||beat===12){noise(at,.085,.052,1800);note(50,at,.07,.025,'triangle');}
  if(beat%2===0)noise(at,.027,beat%4===2?.018:.010,7200);
  if(section!==2&&beat===15&&bar%2)noise(at,.055,.013,6000);
  if(section===3&&bar===7&&[13,14,15].includes(beat))piano(67+(beat-13)*2,at,.12,.018);
  step=(step+1)%512;
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
