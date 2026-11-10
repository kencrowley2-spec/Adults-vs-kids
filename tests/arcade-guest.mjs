import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
import {createGuestAllowance,mountGuestGate} from '../public/arcade-guest.js';
import {GAMES} from '../public/arcade-data.js';
const data=new Map();let cookie='';
const options={storage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},readCookie:()=>cookie,writeCookie:v=>{cookie=v.split(';')[0];}};
let a=createGuestAllowance(options);
assert.equal(a.remaining(),2);assert.equal(a.take(),true);assert.equal(a.remaining(),1);
a=createGuestAllowance(options);assert.equal(a.take(),true);assert.equal(a.take(),false);
assert.equal(createGuestAllowance(options).remaining(),0);
data.clear();assert.equal(createGuestAllowance(options).remaining(),0,'cookie retains allowance if localStorage is unavailable');
cookie='';data.clear();
const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
a=createGuestAllowance({storage:blocked,readCookie(){throw Error('blocked');},writeCookie(){throw Error('blocked');}});
assert.equal(a.take(),true);assert.equal(a.take(),true);assert.equal(a.take(),false,'in-memory fallback still stops a third play');
const dom=new JSDOM('<p id="arcade-guest-status"></p><div class="arcade-saving"></div>',{url:'https://adultsvskids.com/family/arcade'});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
const gate=mountGuestGate({document:dom.window.document});
assert.equal(dom.window.document.querySelector('.arcade-saving').hidden,true);
assert.equal(gate.allow('memory'),true);assert.equal(gate.allow('claw'),true);
assert.equal(gate.allow('faces'),false);assert.equal(gate.remaining(),0);
assert.equal(dom.window.document.querySelector('dialog').open,true);
assert.equal(dom.window.document.querySelector('[data-guest-signup]').getAttribute('href'),'/signup?game=faces');
assert.equal(dom.window.document.querySelector('[data-guest-login]').getAttribute('href'),'/login?game=faces');
assert.equal(mountGuestGate({document:dom.window.document}).allow('memory'),false,'reload does not restore free plays');
const member=mountGuestGate({signedIn:true,document:dom.window.document});
for(let i=0;i<5;i++)assert.equal(member.allow('memory'),true,'members bypass trial limit');
let user=null,queries=0;
const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync('app/family/arcade/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
 exports,Request,Response,Headers,URL,require:name=>{
  if(name.includes('arcade-data'))return {GAMES};
  if(name.includes('family-roster'))return {cleanRoster:r=>({...r,playingAdults:[],playingKids:[]})};
  if(name.includes('auth/session'))return {
   verifiedMember:async()=>({user,client:{from(){queries++;return {select(){return {eq(){return {maybeSingle:async()=>({data:null})};}}};}}},headers:new Headers()}),
   memberReply:(body,status,headers)=>new Response(body,{status,headers})
  };
  throw Error(name);
 }
});
let response=await exports.GET(new Request('https://adultsvskids.com/family/arcade?game=memory'));
let html=await response.text();
assert.equal(response.status,200);assert.equal(queries,0,'guest never reads a family roster');
assert.match(html,/data-account-id=""/);assert.match(html,/id="arcade-guest-status"/);
user={id:'verified-fixture'};
response=await exports.GET(new Request('https://adultsvskids.com/family/arcade'));
html=await response.text();assert.equal(response.status,200);assert.equal(queries,1);
assert.match(html,/data-account-id="verified-fixture"/);assert.doesNotMatch(html,/id="arcade-guest-status"/);
for(const file of ['public/arcade.js','public/arcade-faces.js','public/arcade-draw.js','public/arcade-lava.js','public/arcade-pinball.js','public/games/hexgl/avk.js']){
 const source=readFileSync(file,'utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,'');
 new vm.Script(source,{filename:file});
}
dom.window.close();
console.log('PASS: two guest starts, third blocked, persistence, blocked storage fallback, free signup/login links, verified-member bypass, guest/member route access, no guest roster query, and edited game syntax.');
