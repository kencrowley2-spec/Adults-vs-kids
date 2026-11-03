import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
let role='anonymous',writes=[];
const modules={
 'node:crypto':{randomUUID:()=>crypto.randomUUID()},
 '../../../lib/auth/session':{verifiedMember:async()=>({isAdmin:role==='admin',user:role==='anonymous'?null:{id:'family-1'}})},
 '../../../lib/payments/server':{paymentAdmin:()=>({from:()=>({upsert:async(row,options)=>{writes.push({row,options});return {error:null}}})})},
 '../../../lib/request-origin':{requestOrigin:()=> 'https://adultsvskids.com'},
 '../../../lib/arcade/results':{ARCADE_GAMES:['memory','tic']}
};
const code=ts.transpileModule(readFileSync('app/api/analytics/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};new Function('require','exports',code)(n=>{assert(n in modules);return modules[n]},exports);
const request=(data={},headers={})=>new Request('https://adultsvskids.com/api/analytics',{method:'POST',headers:{origin:'https://adultsvskids.com','content-type':'application/json','user-agent':'Mozilla/5.0 Mobile',...headers},body:JSON.stringify({id:crypto.randomUUID(),type:'page_view',path:'/',...data})});
assert.equal((await exports.POST(request({}, {origin:'https://evil.example'}))).status,403);assert.equal(writes.length,0);
assert.equal((await exports.POST(request({path:'/admin'}))).status,400);
assert.equal((await exports.POST(request({path:'/?email=private@example.com'}))).status,400);
assert.equal((await exports.POST(request({}, {'user-agent':'Googlebot'}))).status,204);assert.equal(writes.length,0);
role='admin';assert.equal((await exports.POST(request())).status,204);assert.equal(writes.length,0);
role='anonymous';const first=await exports.POST(request({referrer:'example.com'}));assert.equal(first.status,204);assert(first.headers.get('set-cookie').includes('HttpOnly'));assert.equal(writes[0].row.device,'Mobile');assert.equal(writes[0].row.referrer,'example.com');assert.equal(writes[0].row.user_id,null);
const cookie=first.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
await exports.POST(request({}, {cookie}));assert.equal(writes[1].row.visitor_id,writes[0].row.visitor_id);assert.equal(writes[1].row.session_id,writes[0].row.session_id);assert.equal(writes[1].row.dedupe_key,writes[0].row.dedupe_key);
assert.equal((await exports.POST(request({type:'game_start',detail:'memory'}))).status,400);
role='family';assert.equal((await exports.POST(request({type:'game_start',detail:'memory'}))).status,204);assert.equal(writes.at(-1).row.user_id,'family-1');
assert.equal((await exports.POST(request({type:'game_start',detail:'forged'}))).status,400);
const day={day:'2026-11-02',visitors:2,visits:3,views:4,starts:5,matches:1,families:1,waitlist:1,quizzes:1,orders:1,revenue:299,sessions:1,seconds:60,tools:1,amazon:1,checkout_clicks:1,download_clicks:1};
const fixture={metrics:{families:1},analytics:{daily:[day],periods:{7:{visitors:2,visits:3,active_families:1}},totals:{revenue:299},pages:[],games:[{game:'memory',starts:5,completed_games:1}],sources:[],devices:[]}};
const ui=readFileSync('public/admin-ui.js','utf8').split('async function loadSection(){')[0];
const context=vm.createContext({document:{getElementById:()=>({})},fixture});
vm.runInContext(ui+'summary=fixture;this.rendered=platformAnalytics();})();',context);
assert.match(context.rendered,/Memory Match/);assert.match(context.rendered,/\$2\.99/);assert.match(context.rendered,/\$2\.60/);assert.match(context.rendered,/Indiana/);
console.log('PASS: analytics origin and input validation, bot and founder exclusions, persistent visitor/session cookies, deduplication, authenticated game tracking, and populated dashboard rendering.');
