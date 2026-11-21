import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const elements=new Map(),listeners=new Map(),intervals=new Map();let tickId=0,now=0;
function element(id){if(!elements.has(id)){const classes=new Set();elements.set(id,{value:'',checked:true,disabled:false,innerHTML:'',textContent:'',dataset:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)},setAttribute(){},removeAttribute(){},addEventListener:(n,f)=>listeners.set(id+':'+n,f),showModal(){this.open=true},close(){this.open=false;listeners.get(id+':close')?.()},querySelectorAll:()=>scoreButtons})}return elements.get(id)}
const scoreButtons=[0,1].flatMap(i=>[-1,1].map(delta=>({dataset:{showdownTeam:String(i),delta:String(delta)}})));
const context={URLSearchParams,location:{search:''},document:{getElementById:element,addEventListener:(n,f)=>listeners.set(n,f)},window:{addEventListener:(n,f)=>listeners.set(n,f)},performance:{now:()=>now},setInterval:(f,ms)=>{const id=++tickId;intervals.set(id,{f,ms});return id},clearInterval:id=>intervals.delete(id),console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/timer-announcer.js','utf8'),context);
vm.runInContext(fs.readFileSync('public/family-tools.js','utf8'),context);
const click=id=>element(id).onclick(),round=()=>element('showdownRound').textContent;
context.window.openFamilyTools();assert.equal(round(),'ROUND 1 OF 12');assert.equal(element('showdownPrev').disabled,true);
scoreButtons[0].onclick();assert.equal(element('showdownScore0').textContent,0);scoreButtons[1].onclick();assert.equal(element('showdownScore0').textContent,1);
await click('showdownStart');assert.equal(element('showdownStart').disabled,true);assert.match(element('showdownStatus').textContent,/Audio is unavailable/);
now=15000;click('showdownStop');assert.equal(element('showdownStop').disabled,true);assert.equal(intervals.size,0);
await click('showdownStart');now=61000;for(const {f} of [...intervals.values()])f();assert.match(element('showdownStatus').textContent,/TIME!/);assert.equal(intervals.size,0);
const tracks=new Set([element('showdownTrack').textContent]);for(let i=2;i<=12;i++){click('showdownNext');assert.equal(round(),`ROUND ${i} OF 12`);tracks.add(element('showdownTrack').textContent)}assert.equal(tracks.size,12);
click('showdownNext');assert.equal(round(),'ROUND 12 OF 12');assert.match(element('showdownStatus').textContent,/wins/);assert.equal(element('showdownStart').disabled,true);
click('showdownNew');assert.equal(round(),'ROUND 1 OF 12');assert.equal(element('showdownScore0').textContent,0);
await click('showdownStart');element('memberDialog').close();assert.equal(intervals.size,0);assert.equal(element('memberDialog').classList.contains('showdown-tools'),false);
context.window.openFamilyTools();assert.equal(round(),'ROUND 1 OF 12');assert.equal(element('showdownStart').disabled,false);
console.log('PASS: timer start/pause/resume/expiry, audio-unavailable fallback, 12 distinct rounds, nonnegative scores, final winner, full reset, and close cleanup.');

const cues=[];
let cancellations=0;
context.window.speechSynthesis={
  getVoices:()=>[],
  speak:cue=>{if(cue.volume>0)cues.push(cue.text)},
  cancel:()=>cancellations++,
};
context.window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
vm.runInContext(fs.readFileSync('public/family-tools.js','utf8'),context);
context.window.openFamilyTools();
element('showdownDuration').onchange({target:{value:'180'}});
const advance=ms=>{
  now+=ms;
  for(const {f} of [...intervals.values()])f();
};
await click('showdownStart');
advance(60000);
advance(100);
assert.deepEqual(cues,['3 minutes to go','2 minutes to go']);
advance(59900);
advance(50000);
assert.deepEqual(cues.slice(-2),['1 minute to go','10']);
const beforePause=cancellations;
click('showdownStop');
assert.equal(cancellations,beforePause+1);
await click('showdownStart');
assert.equal(cues.at(-1),'10');
for(let second=9;second>=0;second--)advance(1000);
assert.deepEqual(cues,['3 minutes to go','2 minutes to go','1 minute to go',...Array.from({length:10},(_,i)=>String(10-i))]);
assert.match(element('showdownStatus').textContent,/TIME!/);
element('showdownDuration').onchange({target:{value:'5'}});
await click('showdownStart');
assert.equal(cues.at(-1),'5');
click('showdownReset');
await click('showdownStart');
assert.deepEqual(cues.slice(-2),['5','5']);
console.log('PASS: spoken minute reminders, final ten seconds, no repeats after pause, short timers, and replay after reset.');
