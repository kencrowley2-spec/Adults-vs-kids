import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync('app/auth/admin-data/route.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let role='anonymous',calls=0,fail=false,range;
const order={session_id:'cs_live_example',user_id:'family-1',product_ids:['bundle'],amount_total:995,currency:'usd',status:'paid',paid_at:'2026-11-02T18:00:00Z'};
const client={from(table){calls++;const result=table==='pdf_orders'?{data:[order],count:26,error:fail?{message:'database unavailable'}:null}:{data:[{user_id:'family-1',name:'Example Family',email:'family@example.test'}],error:null};const query={select(){return query},order(){return query},range(a,b){range=[a,b];return Promise.resolve(result)},in(){return Promise.resolve(result)}};return query}};
const modules={
 '../../../lib/auth/session':{verifiedMember:async()=>({user:role==='anonymous'?null:{id:'owner'},client:{},isAdmin:role==='admin',headers:new Headers({'Cache-Control':'private, no-store'})}),memberReply:(body,status,headers)=>new Response(JSON.stringify(body),{status,headers})},
 '../../../lib/data':{checked:r=>{if(r.error)throw Error(r.error.message);return r.data}},
 '../../../lib/request-origin':{requestOrigin:()=>''},
 '../../../lib/payments/server':{paymentAdmin:()=>client},
 '../../../config/pdfs':{pdfProducts:[{id:'bundle',title:'All Four Print-and-Play PDFs'}]}
};
const exports={};new Function('require','exports',code)(name=>{assert(name in modules);return modules[name]},exports);
const request=(page='0')=>new Request('https://adultsvskids.com/auth/admin-data?section=purchases&page='+page);
assert.equal((await exports.GET(request())).status,401);assert.equal(calls,0);
role='family';assert.equal((await exports.GET(request())).status,403);assert.equal(calls,0);
role='admin';let response=await exports.GET(request('1'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');let body=await response.json();assert.deepEqual(range,[25,49]);assert.equal(body.count,26);assert.equal(body.rows[0].email,'family@example.test');assert.equal(body.rows[0].items,'All Four Print-and-Play PDFs');assert.equal(body.rows[0].amount_total,995);
order.status='revoked';body=await(await exports.GET(request('-5'))).json();assert.equal(body.rows[0].status,'revoked');assert.deepEqual(range,[0,24]);
fail=true;response=await exports.GET(request());assert.equal(response.status,503);assert(!JSON.stringify(await response.json()).includes('database unavailable'));
console.log('PASS: purchase access denied for anonymous and family accounts before privileged reads; administrator pagination, customer mapping, product labels, amounts, revoked orders, no-store responses, and safe failure.');
