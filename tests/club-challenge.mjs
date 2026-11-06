import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const script=readFileSync('public/club-challenge.js','utf8');
const fixture={profile:{name:'Ken Family'},connections:[{id:'ok',name:'Harper <img src=x>',status:'accepted'},{id:'pending',name:'Pending',status:'pending'},{id:'blocked',name:'Blocked',status:'blocked'}]};
async function run({empty=false,fail=false}={}){
 const w=new JSDOM('<button data-open-challenge>Challenge</button>',{url:'https://adultsvskids.com/admin/app/battles',runScripts:'outside-only'}).window,d=w.document,calls=[];const flush=()=>new Promise(r=>setTimeout(r,0));
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 let finishIntro,players;
 w.avkChallengeIntro=options=>{players=options.players;return new Promise(r=>{finishIntro=r})};
 w.fetch=async(url,opts)=>{const post=opts?.method==='POST';calls.push(post?JSON.parse(opts.body):'read');return {ok:!post||!fail,json:async()=>post?(fail?{error:'Approved friend required'}:{}):empty?{connections:[]}:structuredClone(fixture)}};
 w.eval(script);await w.avkOpenChallenge({friendId:'ok'});
 assert.equal(calls.length,1);assert.equal(d.querySelectorAll('input[name=friend]').length,empty?0:1);assert.equal(d.querySelector('img'),null);assert.doesNotMatch(d.body.textContent,/Pending|Blocked/);
 if(empty){assert.equal(d.querySelector('[type=submit]').disabled,true);assert.match(d.body.textContent,/No approved friends/);w.close();return;}
 assert.equal(d.querySelector('input[name=friend]').checked,true);const form=d.querySelector('form');form.elements.game.value='trivia';
 form.dispatchEvent(new w.Event('submit',{cancelable:true}));form.dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.deepEqual(Array.from(players),['Ken Family','Harper <img src=x>']);assert.equal(calls.length,1,'No instructions or invitation send before intro finishes');assert.equal(d.getElementById('friendChallengeDialog').open,false);
 finishIntro();await flush();await flush();assert.equal(calls.length,2,'Continue sends only one invitation');assert.deepEqual(calls[1],{action:'challenge',data:{id:'ok',mode:'friend',playerOne:'Ken Family',game:'trivia'}});
 assert.match(d.body.textContent,fail?/CHALLENGE NOT SENT/:/INVITATION SENT/);assert.equal(d.querySelector('img'),null);assert.equal(d.getElementById('friendChallengeDialog').open,true);w.close();
}
await run();await run({empty:true});await run({fail:true});console.log('PASS: approved friend picker, escaped names, preselection, intro before next screen, no duplicate sends, empty and failure states.');
