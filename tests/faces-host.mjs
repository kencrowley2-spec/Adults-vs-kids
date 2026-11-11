import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFaceHost} from '../public/arcade-faces-host.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../public/arcade-faces-voice.json',import.meta.url)));
const spoken=JSON.parse(fs.readFileSync(new URL('../scripts/faces-audio/spoken-cues.json',import.meta.url)));
for(const cue of spoken.cues){assert.ok(manifest.cues[cue.id],cue.id);const [start,end]=manifest.cues[cue.id];assert.ok(start>=0&&end>start&&end<342,cue.id);}
let sources=[],band,fetches=0,closed=false;
class Source {connect(){}start(...args){this.args=args;sources.push(this);}stop(){this.onended?.();}}
class Context {currentTime=0;destination={};async resume(){}async decodeAudioData(){return {};}createBufferSource(){return new Source();}createGain(){return {connect(){},gain:{value:1}};}async close(){closed=true;}}
globalThis.window={AudioContext:Context,Audio:class{constructor(){band=this;}play(){this.playing=true;return Promise.resolve();}pause(){this.playing=false;}load(){}removeAttribute(){}}};
globalThis.fetch=async url=>{fetches++;return {ok:true,json:async()=>manifest,arrayBuffer:async()=>new ArrayBuffer(2)};};
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const host=createFaceHost();host.setMusic(true);assert.ok(band.playing);const first=host.saySequence(['q-eyes-0','a-eyes-0-true']);await flush();assert.equal(sources.length,1);assert.equal(band.volume,.045);assert.equal(sources[0].args[1],manifest.cues['q-eyes-0'][0]);host.stop();await first;assert.equal(sources.length,1,'Cancelled question must not start answer');assert.equal(band.volume,.19);
const second=host.say('section-eyes');await flush();assert.equal(sources.length,2);sources.at(-1).onended();await second;assert.equal(band.volume,.19);assert.equal(fetches,2,'Reuse the loaded voice and cue map');host.setMusic(false);assert.equal(band.playing,false);host.dispose();assert.equal(closed,true);
console.log('Australian host: all 83 timed cues, interruption, audio cache, jazz ducking/mute and cleanup passed.');
