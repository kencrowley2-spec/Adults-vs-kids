import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {GAMES} from '../public/arcade-data.js';
const env={AUTH_EMAIL_READY:'true',AUTH_REGISTRATION_OPEN:'true',SUPABASE_URL:'https://example.test'};
function compile(path,require){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require,Headers,Request,Response,URL,process:{env},fetch:async()=>({ok:true,json:async()=>({mailer_autoconfirm:false})})});return exports;}
const links=compile('lib/arcade-links.ts',()=>({GAMES}));
for(const value of [null,'https://evil.test','//evil.test','memory&next=https://evil.test','removed-game'])assert.equal(links.arcadeDestination(value),'/family');
let user=null,confirmationUrl='';
const client={auth:{getUser:async()=>({data:{user}}),signInWithPassword:async()=>({data:{user}}),signUp:async options=>{confirmationUrl=options.options.emailRedirectTo;return {};},exchangeCodeForSession:async()=>({})}};
const session={verifiedMember:async()=>({user,client,headers:new Headers()}),memberClient:()=>({client,headers:new Headers()}),memberReply:(body,status,headers)=>new Response(typeof body==='string'?body:JSON.stringify(body),{status,headers}),memberRedirect:(path,headers)=>{headers.set('Location',path);return new Response(null,{status:303,headers})}};
const require=name=>name.endsWith('arcade-links')?links:name.endsWith('auth/session')?session:name.endsWith('request-origin')?{requestOrigin:()=> 'https://adultsvskids.com'}:name.endsWith('auth/access')?{isAdministrator:()=>false}:name.endsWith('member-pages')?{loginPage:()=>'<form data-auth-form data-action="login"></form><a href="/signup">Sign up</a><a href="/login">Log in</a>'}:assert.fail(name);
for(const route of ['login','signup']){const page=compile('app/'+route+'/route.ts',require);const html=await(await page.GET(new Request('https://adultsvskids.com/'+route+'?game=memory'))).text();assert.match(html,/data-game="memory"/);assert.match(html,/href="\/signup\?game=memory"/);}
user={id:'fixture',email_confirmed_at:'2026-11-01'};
for(const route of ['login','signup']){const r=await compile('app/'+route+'/route.ts',require).GET(new Request('https://adultsvskids.com/'+route+'?game=memory'));assert.equal(r.headers.get('Location'),'/family/arcade?game=memory');}
const flow=compile('app/auth/flow/route.ts',require);
const post=data=>flow.POST(new Request('https://adultsvskids.com/auth/flow',{method:'POST',headers:{Origin:'https://adultsvskids.com','Content-Type':'application/json'},body:JSON.stringify(data)}));
assert.equal((await(await post({action:'login',email:'fixture@example.test',password:'test-only',game:'memory'})).json()).redirect,'/family/arcade?game=memory');
assert.equal((await(await post({action:'login',email:'fixture@example.test',password:'test-only',game:'https://evil.test'})).json()).redirect,'/family');
const signup=await post({action:'signup',email:'fixture@example.test',password:'test-only-long',confirmPassword:'test-only-long',name:'Fixture',displayName:'Test',adult:true,game:'memory'});assert.equal(signup.status,200);assert.equal(new URL(confirmationUrl).searchParams.get('next'),'/family/arcade?game=memory');
const confirm=compile('app/auth/confirm/route.ts',require);const verified=await confirm.GET(new Request('https://adultsvskids.com/auth/confirm?code=fixture&next='+encodeURIComponent('/family/arcade?game=memory')));assert.equal(verified.headers.get('Location'),'/family/arcade?game=memory');
const books=compile('app/play/[slug]/route.ts',require);for(const slug of ['coloring','family-showdown','make-and-play','young-adult']){const r=await books.GET(null,{params:Promise.resolve({slug})});assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'/explore?book='+slug+'#books');}assert.equal((await books.GET(null,{params:Promise.resolve({slug:'missing'})})).status,404);
console.log('PASS: game links survive login, signup and verified email; unsafe destinations fall back; four book sample URLs resolve correctly. No real accounts or emails created.');
