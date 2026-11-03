import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {isAdministrator} from '../lib/auth/access.ts';
function compile(path,require){
 const exports={};
 const source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,require,Headers,Request,Response,URL,process:{env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-public-key'}}});
 return exports;
}
let verifiedUser=null,error=null,rotate=false,checks=0;
const session=compile('../lib/auth/session.ts',name=>{
 if(name==='../analytics')return {trackedHtml:html=>html};
 if(name==='./access')return {isAdministrator};
 if(name==='@supabase/ssr')return {
  parseCookieHeader:()=>[],serializeCookieHeader:(name,value)=>`${name}=${value}; Path=/; HttpOnly`,
  createServerClient:(_url,_key,options)=>({auth:{getUser:async()=>{
   checks++;if(rotate)options.cookies.setAll([{name:'session',value:'refreshed',options:{}}]);
   return {data:{user:verifiedUser},error};
  }}})
 };
 throw Error(`Unexpected dependency: ${name}`);
});
const home=compile('../app/route.ts',name=>name==='../site-html'?{default:'<html>Public landing page</html>'}:name==='../lib/auth/session'?session:assert.fail(name));
const request=()=>new Request('https://adultsvskids.com/',{headers:{'oai-authenticated-user-email':'spoof@example.test'}});
for(const state of ['guest','expired','unverified']){
 verifiedUser=state==='unverified'?{id:'user',email_confirmed_at:null}:null;error=state==='expired'?new Error('Expired session'):null;
 const response=await home.GET(request());assert.equal(response.status,200);assert.match(await response.text(),/Public landing page/);
 assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('cache-control'),'private, no-store');
}
verifiedUser={id:'user',email_confirmed_at:'2026-11-01T00:00:00Z'};error=null;rotate=true;
const response=await home.GET(request());
assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/family');
assert.equal(response.headers.get('cache-control'),'private, no-store');
assert.match(response.headers.get('set-cookie'),/session=refreshed/);assert.equal(await response.text(),'');
assert.equal(checks,4,'Every visit must verify the session server-side');
const website=compile('../app/website/route.ts',name=>name==='../../site-html'?{default:'<html>Public landing page</html>'}:name==='../../lib/analytics'?{trackedHtml:html=>html}:assert.fail(name));
assert.match(await website.GET().text(),/Public landing page/);
console.log('PASS: verified users redirect to /family, refreshed cookies survive, guest/expired/unverified sessions see the landing page, spoofed identity headers are ignored, and the public website stays accessible.');
