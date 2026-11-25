export function gtMusic(ctx) {
 const gain=ctx.createGain();
 gain.gain.value=0;
 gain.connect(ctx.destination);
 const loading=new AbortController();
 let buffer,source,position;
 fetch('/assets/ghostline/redline-run.mp3',{signal:loading.signal}).then(response=>{
  if(!response.ok)throw Error('Race music unavailable');
  return response.arrayBuffer();
 }).then(bytes=>ctx.decodeAudioData(bytes)).then(decoded=>{
  buffer=decoded;
  start();
 }).catch(()=>{});

 function start() {
  if(!buffer||source||!position||loading.signal.aborted)return;
  const now=ctx.currentTime;
  source=ctx.createBufferSource();
  source.buffer=buffer;
  source.loop=true;
  source.connect(gain);
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(.23,now+.45);
  source.start(now,position()%buffer.duration);
 }

 function pause() {
  position=null;
  if(!source)return;
  source.stop();
  source.disconnect();
  source=null;
 }

 return {
  play(racePosition){position=racePosition;start();},
  pause,
  dispose(){loading.abort();pause();gain.disconnect();}
 };
}
