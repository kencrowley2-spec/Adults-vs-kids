import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let user=null,isAdmin=false,reportCalls=0;
const env={};
const auth=()=>({user,isAdmin,client:{},headers:new Headers({'Cache-Control':'private, no-store'})});
const reply=(body,status,headers)=>new Response(JSON.stringify(body),{status,headers});
function route(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env},URL,Response,Request,Headers,require:name=>{
 if(name.includes('auth/session'))return {verifiedMember:async()=>auth(),memberReply:reply};
 if(name.includes('google-organic-report'))return {googleOrganicReport:async days=>{reportCalls++;return {days,status:'testfixture'}}};
 if(name.includes('google-measurement'))return {googleMeasurementId:()=>env.GA4_COLLECTION_ENABLED==='true'?'G-TEST1234':null};
 if(name.includes('analytics-policy'))return {internalTraffic:(_u,a,ua)=>a||/bot/i.test(ua)};
 if(name.includes('payments/server'))return {paymentAdmin:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{is_internal_test:true}})})})})})};
 if(name.includes('pdfs'))return {pdfProducts:[]};return {};
 }});return exports;}
const admin=route('app/auth/admin-data/route.ts');
let r=await admin.GET(new Request('https://adultsvskids.com/auth/admin-data?section=google-organic'));assert.equal(r.status,401);assert.equal(reportCalls,0);
user={id:'normal'};r=await admin.GET(new Request('https://adultsvskids.com/auth/admin-data?section=google-organic'));assert.equal(r.status,403);assert.equal(reportCalls,0);
isAdmin=true;r=await admin.GET(new Request('https://adultsvskids.com/auth/admin-data?section=google-organic&days=30'));assert.equal(r.status,400);assert.equal(reportCalls,0);
r=await admin.GET(new Request('https://adultsvskids.com/auth/admin-data?section=google-organic&days=90'));assert.equal(r.status,200);assert.equal(reportCalls,1);assert.match(r.headers.get('Cache-Control'),/no-store/);
const config=route('app/api/measurement/config/route.ts');
assert.equal((await(await config.GET(new Request('https://adultsvskids.com/api/measurement/config'))).json()).enabled,false);
env.GA4_COLLECTION_ENABLED='true';env.VERCEL_ENV='preview';assert.equal((await(await config.GET(new Request('https://adultsvskids.com/api/measurement/config'))).json()).enabled,false);
env.VERCEL_ENV='production';assert.equal((await(await config.GET(new Request('https://adultsvskids.com/api/measurement/config'))).json()).enabled,false);
user=null;isAdmin=false;const data=await(await config.GET(new Request('https://adultsvskids.com/api/measurement/config'))).json();assert.equal(data.enabled,true);assert.deepEqual(Object.keys(data).sort(),['enabled','measurementId']);
r=await config.GET(new Request('https://adultsvskids.com/api/measurement/config',{headers:{cookie:'avk_visit=550e8400-e29b-41d4-a716-446655440000'}}));assert.equal((await r.json()).enabled,false);
console.log('PASS: anonymous and non-admin report denial, exact period validation, private no-store responses, disabled preview/member/internal collection, and no credentials in public config. Mocked authority fixtures; no authentication behavior changed.');
