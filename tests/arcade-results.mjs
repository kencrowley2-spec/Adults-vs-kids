import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {completedResult,sameResult} from '../lib/arcade/results.ts';
import {createResultRecorder} from '../public/arcade-results.js';
const id='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const single={id,mode:'single',gameIds:['memory'],roundWinners:[0,1,0,1,0]},series={id,mode:'series',gameIds:['maze','rps','golf'],roundWinners:[1,0,1]};
assert.equal(completedResult({...single,gameIds:['basketball'],roundWinners:[1]}).roundWinners.length,1);
assert.throws(()=>completedResult({...single,gameIds:['basketball'],roundWinners:[1,1,1]}));
assert.equal(completedResult({...single,gameIds:['blocks'],roundWinners:[0]}).roundWinners.length,1);
assert.throws(()=>completedResult({...single,gameIds:['blocks'],roundWinners:[]}));
assert.throws(()=>completedResult({...single,gameIds:['blocks'],roundWinners:[0,0,0]}));
assert.equal(completedResult({...single,gameIds:['treasure'],roundWinners:[0]}).roundWinners.length,1);
assert.throws(()=>completedResult({...single,gameIds:['treasure'],roundWinners:[0,0,0]}));
assert.equal(completedResult(single).roundWinners.length,5);assert.equal(completedResult(series).mode,'series');
for(const patch of [{roundWinners:[0,0]},{roundWinners:[0,0,0,1]},{roundWinners:[0,1,0,1]},{roundWinners:[0,1,null]},{roundWinners:[2,2,2]},{id:'bad'},{gameIds:['made-up']},{gameIds:['tic','tic']},{mode:'edited'}])assert.throws(()=>completedResult({...single,...patch}));
for(const patch of [{roundWinners:[1,1]},{gameIds:['maze','maze','golf']},{gameIds:['maze','rps','bad']}])assert.throws(()=>completedResult({...series,...patch}));
assert.equal(sameResult({mode:'single',game_ids:['memory'],round_winners:[0,1,0,1,0]},single),true);
const storageMap=new Map(),storage={getItem:k=>storageMap.get(k)||null,setItem:(k,v)=>storageMap.set(k,v)};
let online=false,sent=[];
const recorder=createResultRecorder({accountId:owner,storage,send:async result=>{sent.push(result);if(!online)throw Error('Offline');return {ok:true};}});
await recorder.capture(single);assert.equal(recorder.pendingCount(),1);
const otherRecorder=createResultRecorder({accountId:other,storage,send:async()=>assert.fail('Another family must not upload this queue')});assert.equal(otherRecorder.pendingCount(),0);await otherRecorder.drain();
online=true;
const resumed=createResultRecorder({accountId:owner,storage,send:async result=>{sent.push(result);return {ok:true};}});await resumed.drain();assert.equal(resumed.pendingCount(),0);assert.equal(sent[0].id,sent[1].id);
// Capture during an in-flight save remains queued rather than losing the new result.
let release,sendCount=0;
const delayed=createResultRecorder({accountId:owner,storage,send:()=>++sendCount===1?new Promise(resolve=>{release=resolve;}):Promise.resolve({ok:true})});
const first=delayed.capture(single);await Promise.resolve();const second=delayed.capture({...series,id:other});release({ok:true});await first;await second;assert.equal(delayed.pendingCount(),0);assert.equal(sendCount,2);

// Exercise real HTTP handlers with verified-member and database fixtures.
let user={id:owner},writes=0,fail=false;const rows=new Map();
const client={rpc:async()=>({data:{adults:1,kids:0,total:1},error:fail?{}:null}),from:()=>{
 const filters={};let read=false,limit=0;
 const query={
  upsert:async row=>{writes++;if(fail)return {error:{}};if(!rows.has(row.id))rows.set(row.id,row);return {error:null};},
  select:()=>{read=true;return query;},eq:(k,v)=>{filters[k]=v;return query;},order:()=>query,limit:n=>{limit=n;return query;},
  maybeSingle:async()=>({data:[...rows.values()].find(r=>Object.entries(filters).every(([k,v])=>r[k]===v))??null,error:null}),
  then:resolve=>Promise.resolve({data:[...rows.values()].filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v)).slice(0,limit||5),error:fail?{}:null}).then(resolve)
 };return query;
}};
const exports={};
const code=ts.transpileModule(readFileSync(new URL('../app/api/arcade/results/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{exports,require:name=>name.endsWith('/auth/session')?{verifiedMember:async()=>({user,client,headers:new Headers()}),memberReply:(body,status,headers)=>new Response(JSON.stringify(body),{status,headers})}:name.endsWith('/request-origin')?{requestOrigin:r=>new URL(r.url).origin}:name.endsWith('/arcade/results')?{completedResult,sameResult}:assert.fail(name),Request,Response,Headers,URL,console});
const post=(body,headers={})=>exports.POST(new Request('https://adultsvskids.com/api/arcade/results',{method:'POST',headers:{Origin:'https://adultsvskids.com','Content-Type':'application/json',...headers},body:JSON.stringify(body)}));
user=null;assert.equal((await post(single)).status,401);assert.equal((await exports.GET(new Request('https://adultsvskids.com/api/arcade/results'))).status,401);user={id:owner};
assert.equal((await post({...single,accountId:owner},{Origin:'https://elsewhere.test'})).status,403);
assert.equal((await post({...single,accountId:other})).status,403);
assert.equal((await post({...single,accountId:owner},{'Content-Type':'text/plain'})).status,415);
assert.equal((await post({...single,roundWinners:[0],accountId:owner})).status,400);assert.equal(writes,0);
assert.equal((await post({...single,accountId:owner})).status,200);assert.equal((await post({...single,accountId:owner})).status,200);assert.equal(rows.size,1);
assert.equal((await post({...series,accountId:owner})).status,409);assert.equal(rows.size,1);
assert.equal(rows.get(id).user_id,owner);
const response=await exports.GET(new Request('https://adultsvskids.com/api/arcade/results'));assert.equal(response.status,200);assert.deepEqual((await response.json()).score,{adults:1,kids:0,total:1});
fail=true;assert.equal((await post({...series,id:other,accountId:owner})).status,503);assert.equal((await exports.GET(new Request('https://adultsvskids.com/api/arcade/results'))).status,503);
console.log('PASS: completed-only validation, account isolation, durable retry queue, immutable UUID deduplication, origin/auth checks, totals API and database failures.');

for(const outcomes of [[0,0],[0,1,0],[1,1]])assert.equal(completedResult({...single,gameIds:['frog'],roundWinners:outcomes}).roundWinners.length,outcomes.length);
for(const outcomes of [[0],[0,1],[0,0,1],[0,1,0,1,0]])assert.throws(()=>completedResult({...single,gameIds:['frog'],roundWinners:outcomes}));

assert.equal(completedResult({...single,gameIds:['mole'],roundWinners:[1]}).roundWinners.length,1);
assert.throws(()=>completedResult({...single,gameIds:['mole'],roundWinners:[1,1,1]}));

assert.equal(completedResult({...single,gameIds:['claw'],roundWinners:[0]}).roundWinners.length,1);
assert.throws(()=>completedResult({...single,gameIds:['claw'],roundWinners:[0,0,0]}));

assert.equal(completedResult({...single,gameIds:['lava'],roundWinners:[1]}).roundWinners.length,1);
assert.throws(()=>completedResult({...single,gameIds:['lava'],roundWinners:[0,0,0]}));
