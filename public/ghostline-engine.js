// Two offset exhaust banks share a four-stroke cycle. Uneven pulse spacing
// produces the cross-plane V8 burble even through a phone's small speaker.
export function gtEngine(ctx){
 const master=ctx.createGain(),filter=ctx.createBiquadFilter(),exhaust=ctx.createGain();
 master.gain.value=0;filter.type='lowpass';filter.Q.value=.7;
 exhaust.gain.value=.15;exhaust.connect(filter);filter.connect(master);master.connect(ctx.destination);
 const banks=[[0,3,5,6],[1,2,4,7]].map((pulses,bank)=>{
  const real=new Float32Array(49),imag=new Float32Array(49);
  for(let h=1;h<real.length;h++)for(const slot of pulses){
   const phase=2*Math.PI*h*(slot+.035*bank)/8;
   real[h]+=Math.cos(phase)/Math.pow(h,.83);imag[h]+=Math.sin(phase)/Math.pow(h,.83);
  }
  const o=ctx.createOscillator();o.setPeriodicWave(ctx.createPeriodicWave(real,imag));o.connect(exhaust);o.start();return o;
 });
 const buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),samples=buffer.getChannelData(0);
 for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
 const air=ctx.createBufferSource(),wind=ctx.createBiquadFilter(),windGain=ctx.createGain();
 air.buffer=buffer;air.loop=true;wind.type='bandpass';wind.frequency.value=1050;wind.Q.value=.55;
 windGain.gain.value=.012;air.connect(wind);wind.connect(windGain);windGain.connect(master);air.start();
 let gear=0,lastShift=-1;
 return {
  reset(){gear=0;lastShift=-1;},
  volume(on){master.gain.setTargetAtTime(on?.58:0,ctx.currentTime,.035);},
  update(car,wake){
   const t=ctx.currentTime,v=car.speed;
   const next=gear===0&&v>34.4?1:gear===1&&v>38.4?2:gear===2&&v<36.3?1:gear===1&&v<32.8?0:gear;
   if(next!==gear){gear=next;lastShift=t;}
   const rpm=v*[168,144,126][gear],shift=Math.min(1,(t-lastShift)/.15);
   const load=Math.abs(car.x)>5.2?.64:.94;
   for(const bank of banks)bank.frequency.setTargetAtTime(rpm/120, t,.045);
   filter.frequency.setTargetAtTime(620+rpm*.17*load,t,.07);
   exhaust.gain.setTargetAtTime((.09+.095*load)*(.40+.60*shift),t,.025);
   windGain.gain.setTargetAtTime(.008+wake*.065,t,.07);
  }
 };
}
