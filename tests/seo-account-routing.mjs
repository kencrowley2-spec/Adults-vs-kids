import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
import * as passwordPolicy from '../lib/auth/password-policy.ts';
import {GAMES} from '../public/arcade-data.js';
const {PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS} = passwordPolicy;
const env={AUTH_EMAIL_READY:'true',AUTH_REGISTRATION_OPEN:'true',SUPABASE_URL:'https://example.test'};
function compile(path,require){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require,Headers,Request,Response,URL,process:{env},fetch:async()=>({ok:true,json:async()=>({mailer_autoconfirm:false})})});return exports;}
const links=compile('lib/arcade-links.ts',()=>({GAMES}));
for(const value of [null,'https://evil.test','//evil.test','memory&next=https://evil.test','removed-game'])assert.equal(links.arcadeDestination(value),'/family');
let user=null,confirmationUrl='',updatedPassword='',signOutScope='';const accountEvents=[];
const client={auth:{getUser:async()=>({data:{user}}),signInWithPassword:async()=>({data:{user}}),signUp:async options=>{confirmationUrl=options.options.emailRedirectTo;return {data:{user:{id:'fixture',identities:[{}]}}};},exchangeCodeForSession:async()=>({}),updateUser:async({password})=>{updatedPassword=password;return {}},signOut:async({scope})=>{signOutScope=scope;return {}}}};
const session={verifiedMember:async()=>({user,client,headers:new Headers()}),memberClient:()=>({client,headers:new Headers()}),memberReply:(body,status,headers)=>new Response(typeof body==='string'?body:JSON.stringify(body),{status,headers}),memberRedirect:(path,headers)=>{headers.set('Location',path);return new Response(null,{status:303,headers})}};
const require=name=>name.endsWith('auth/password-policy')?passwordPolicy:name.endsWith('analytics-server')?{accountAnalytics:async(...args)=>accountEvents.push(args)}:name.endsWith('arcade-links')?links:name.endsWith('auth/session')?session:name.endsWith('request-origin')?{requestOrigin:()=> 'https://adultsvskids.com'}:name.endsWith('auth/access')?{isAdministrator:()=>false}:name.endsWith('member-pages')?{loginPage:()=>'<form data-auth-form data-action="login"></form><a href="/signup">Sign up</a><a href="/login">Log in</a>'}:assert.fail(name);
for(const route of ['login','signup']){const page=compile('app/'+route+'/route.ts',require);const html=await(await page.GET(new Request('https://adultsvskids.com/'+route+'?game=memory'))).text();assert.match(html,/data-game="memory"/);assert.match(html,/href="\/signup\?game=memory"/);}
user={id:'fixture',email_confirmed_at:'2026-11-01'};
for(const route of ['login','signup']){const r=await compile('app/'+route+'/route.ts',require).GET(new Request('https://adultsvskids.com/'+route+'?game=memory'));assert.equal(r.headers.get('Location'),'/family/arcade?game=memory');}
const flow=compile('app/auth/flow/route.ts',require);
const post=data=>flow.POST(new Request('https://adultsvskids.com/auth/flow',{method:'POST',headers:{Origin:'https://adultsvskids.com','Content-Type':'application/json'},body:JSON.stringify(data)}));
assert.equal((await(await post({action:'login',email:'fixture@example.test',password:'test-only',game:'memory'})).json()).redirect,'/family/arcade?game=memory');
assert.equal((await(await post({action:'login',email:'fixture@example.test',password:'test-only',game:'https://evil.test'})).json()).redirect,'/family');
const signup=await post({action:'signup',email:'fixture@example.test',password:'Violet7!',confirmPassword:'Violet7!',name:'Fixture',displayName:'Test',adult:true,game:'memory'});assert.equal(signup.status,200);assert.equal(new URL(confirmationUrl).searchParams.get('next'),'/family/arcade?game=memory');
assert.ok(accountEvents.some(args=>args[4]==='intent'));
const reset = (password, confirmPassword = password) => post({action:'reset',password,confirmPassword});
for (const password of ['Short7!', 'violet7!', 'VIOLET7!', 'Violets!', 'Violets7']) {
 const response = await reset(password);
 assert.equal(response.status, 400);
 assert.equal((await response.json()).error, PASSWORD_REQUIREMENTS);
}
const mismatch = await reset('Violet7!', 'Violet8!');
assert.equal(mismatch.status, 400);
assert.match((await mismatch.json()).error, /passwords match/);
assert.equal(updatedPassword, '');
assert.equal((await (await reset('Violet7!')).json()).redirect, '/login?updated=1');
assert.equal(updatedPassword, 'Violet7!');
assert.equal(signOutScope, 'global');

const pages = compile('lib/member-pages.ts', name => name.endsWith('password-policy') ? passwordPolicy : {});
const resetPage = compile('app/reset-password/route.ts', name => name.endsWith('member-pages') ? pages : require(name));
const resetRequest = new Request('https://adultsvskids.com/reset-password');
const markup = await (await resetPage.GET(resetRequest)).text();
const dom = new JSDOM(markup, {runScripts:'outside-only'});
dom.window.eval(readFileSync('public/auth-ui.js', 'utf8'));
const {document} = dom.window;
const fields = ['password','confirmPassword'].map(name => document.getElementById(name));
const buttons = [...document.querySelectorAll('[data-show-password]')];
assert.equal(buttons.length, 2);
for (const field of fields) assert.equal(field.minLength, PASSWORD_MIN_LENGTH);
assert.deepEqual(fields.map(field => field.type), ['password', 'password']);
buttons[0].click();
assert.deepEqual(fields.map(field => field.type), ['text', 'password']);
buttons[1].click();
assert.deepEqual(fields.map(field => field.type), ['text', 'text']);
assert.equal(buttons[1].getAttribute('aria-label'), 'Hide confirm password');
buttons[0].click();
assert.deepEqual(fields.map(field => field.type), ['password', 'text']);
dom.window.close();
user = null;
assert.equal((await resetPage.GET(resetRequest)).headers.get('Location'), '/forgot-password');
user = {id:'fixture',email_confirmed_at:'2026-11-01'};

const confirm=compile('app/auth/confirm/route.ts',require);const verified=await confirm.GET(new Request('https://adultsvskids.com/auth/confirm?code=fixture&next='+encodeURIComponent('/family/arcade?game=memory')));assert.equal(verified.headers.get('Location'),'/family/arcade?game=memory');
const books=compile('app/play/[slug]/route.ts',require);for(const slug of ['coloring','family-showdown','make-and-play','young-adult']){const r=await books.GET(null,{params:Promise.resolve({slug})});assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'/explore?book='+slug+'#books');}assert.equal((await books.GET(null,{params:Promise.resolve({slug:'missing'})})).status,404);
console.log('PASS: game links survive login, signup and verified email; unsafe destinations fall back; password requirements, reset access and independent Show controls work; four book sample URLs resolve correctly. No real accounts or emails created.');
