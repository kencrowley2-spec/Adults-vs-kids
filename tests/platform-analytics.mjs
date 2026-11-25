import * as nodeCrypto from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as policy from '../lib/analytics-policy.ts';
let role='anonymous';
const events=[];
const contexts=[];
const database={rpc:async(name,args)=>{
 if(name==='analytics_context'){
  contexts.push(args.p_input);
  return {data:{id:args.p_input.session||crypto.randomUUID(),visitor_id:args.p_input.visitor}};
 }
 assert.equal(name,'analytics_event');
 events.push(args);
 return {};
}};
function load(path,imports){
 const exports={};
 const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','exports',code)(name=>{assert(name in imports,name);return imports[name]},exports);
 return exports;
}
const origin={requestOrigin:()=> 'https://adultsvskids.com'};
const server=load('lib/analytics-server.ts',{
 'node:crypto':nodeCrypto,'./analytics-policy':policy,'./payments/server':{paymentAdmin:()=>database},'./request-origin':origin
});
const handler=load('app/api/analytics/route.ts',{
 '../../../lib/auth/session':{verifiedMember:async()=>({headers:new Headers(),isAdmin:role==='admin',user:role==='anonymous'?null:{id:'family-1'}})},
 '../../../lib/request-origin':origin,'../../../lib/analytics-policy':policy,'../../../lib/analytics-server':server,
 '../../../lib/arcade/results':{ARCADE_GAMES:['memory','tic']}
});
const request=(data={},headers={})=>new Request('https://adultsvskids.com/api/analytics',{method:'POST',headers:{origin:'https://adultsvskids.com','content-type':'application/json','user-agent':'Mozilla/5.0 Mobile',...headers},body:JSON.stringify({id:crypto.randomUUID(),type:'page_view',path:'/',...data})});
assert.equal((await handler.POST(request({}, {origin:'https://invalid.example'}))).status,403);
assert.equal((await handler.POST(request({path:'/?email=private@example.com'}))).status,400);
assert.equal((await handler.POST(request({type:'purchase'}))).status,400);
assert.equal(contexts.length,0);
await handler.POST(request({}, {'user-agent':'Googlebot'}));
assert.equal(contexts.at(-1).internal,true);
role='admin';await handler.POST(request());assert.equal(contexts.at(-1).internal,true);
role='anonymous';const first=await handler.POST(request({referrer:'example.com'}));
assert.equal(first.status,204);assert.equal(contexts.at(-1).internal,false);assert.equal(contexts.at(-1).referrer,'example.com');
assert.equal(events.at(-1).p_device,'Mobile');assert.equal(events.at(-1).p_user,null);
const cookie=first.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
const id=crypto.randomUUID();
for(const type of ['game_start','game_complete','game_complete']){
 assert.equal((await handler.POST(request({type,detail:'memory',id},{cookie}))).status,204);
 assert.equal(events.at(-1).p_id,id);assert.equal(events.at(-1).p_evidence,'browser');
 assert.equal(events.at(-1).p_session,events[2].p_session);
}
role='family';await handler.POST(request({type:'game_start',detail:'memory'}));assert.equal(events.at(-1).p_user,'family-1');
assert.equal((await handler.POST(request({type:'game_start',detail:'forged'}))).status,400);
const day={day:'2026-11-02',visitors:2,visits:3,views:4,starts:5,matches:1,families:1,waitlist:1,quizzes:1,orders:1,revenue:299,sessions:1,seconds:60,tools:1,amazon:1,checkout_clicks:1,download_clicks:1};
const fixture={search:{periods:{7:{organic_visits:2,ai_visits:1,new_family_profiles:1}},sources:[{channel:'Organic search',source:'www.google.com',visits:2}]},metrics:{families:1},analytics:{daily:[day],periods:{7:{visitors:2,visits:3,active_families:1}},totals:{revenue:299},pages:[],games:[{game:'memory',starts:5,completed_games:1}],sources:[],devices:[]}};
const ui=readFileSync('public/admin-ui.js','utf8').split('async function loadSection(){')[0];
const context=vm.createContext({document:{getElementById:()=>({})},fixture});
vm.runInContext(ui+'summary=fixture;this.rendered=platformAnalytics();})();',context);
assert.match(context.rendered,/Memory Match/);assert.match(context.rendered,/\$2\.99/);assert.match(context.rendered,/Stored USD order amounts/);assert.match(context.rendered,/Indiana/);assert.match(context.rendered,/Organic search visits/);assert.match(context.rendered,/AI referral visits/);assert.match(context.rendered,/www.google.com/);
console.log('PASS: analytics route validation, internal flags, session continuity, guest completion IDs, family identity and dashboard rendering.');
