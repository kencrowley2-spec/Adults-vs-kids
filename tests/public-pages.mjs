import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
const root=new URL('../',import.meta.url).pathname,cache=new Map();
function load(file){
 const path=resolve(root,file);if(cache.has(path))return cache.get(path);
 const exports={};cache.set(path,exports);
 const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,process:{env:{}},Response,Request,Headers,require:name=>{
  const p=resolve(dirname(path),name);return load(existsSync(p)?p:p+'.ts');
 }},{filename:path});return exports;
}
const {gameGuide,activityPage,paperbackPage}=load('lib/public-pages.ts');
const {GAMES}=load('public/arcade-data.js');const {guides}=load('lib/activity-content.ts');const {publicPages}=load('lib/seo.ts');
function inspect(html,path,requireHeading=true){const d=new JSDOM(html).window.document;if(requireHeading)assert.equal(d.querySelectorAll('h1').length,1,path);assert.equal(d.querySelector('meta[name="robots"]').content,'index, follow',path);assert.equal(d.querySelector('link[rel="canonical"]').href,'https://adultsvskids.com'+path,path);assert.ok(d.querySelector('meta[name="description"]').content.length>30);for(const script of d.querySelectorAll('script[type="application/ld+json"]'))assert.ok(JSON.parse(script.textContent)['@graph'].length>0);for(const a of d.querySelectorAll('a[href]')){const u=new URL(a.href,'https://adultsvskids.com');if(u.origin==='https://adultsvskids.com'&&!u.pathname.startsWith('/assets/')&&!['/family/arcade','/signup','/login','/website'].includes(u.pathname))assert.ok(publicPages[u.pathname],`Unknown public link ${a.href}`);}return d;}
const doc=inspect(gameGuide(),'/family-games');assert.equal(doc.querySelectorAll('.game-guide').length,GAMES.length);for(const g of GAMES){assert.ok(doc.getElementById(g.id),g.id);assert.ok(doc.getElementById(g.id).textContent.includes(g.name));}
// A future catalog addition must never take the public guide offline again.
GAMES.push({id:'future-game',name:'Future Game',description:'A new family game.'});assert.doesNotThrow(()=>gameGuide());GAMES.pop();
for(const g of guides)inspect(activityPage(g.slug),'/'+g.slug);inspect(paperbackPage(),'/paperback-books');assert.equal(activityPage('unknown-page'),null);
const route=load('app/family-games/route.ts');const response=route.GET();assert.equal(response.status,200);assert.match(await response.text(),/Mystery Face Showdown/);
const dynamic=load('app/[publicSlug]/route.ts');for(const g of guides){const r=await dynamic.GET(new Request('https://adultsvskids.com/'+g.slug),{params:Promise.resolve({publicSlug:g.slug})});assert.equal(r.status,200,g.slug);assert.match(await r.text(),/index, follow/);}
const missing=await dynamic.GET(new Request('https://adultsvskids.com/missing'),{params:Promise.resolve({publicSlug:'missing'})});assert.equal(missing.status,404);assert.equal(missing.headers.get('x-robots-tag'),'noindex');
console.log('PASS: all catalog games, future-game fallback, eight public guide routes, canonical URLs, indexable metadata, JSON-LD, related links, paperback page and unknown-page 404.');

for(const slug of ['about','about-the-founder','digital-philosophy','shop','next-chapter','creator-league','creators','explore']){const r=load('app/'+slug+'/route.ts').GET();assert.equal(r.status,200,slug);const html=await r.text();inspect(html,'/'+slug,false);assert.doesNotMatch(html,/href="\/website#/,'Stale homepage section link on '+slug);assert.doesNotMatch(html,/href="(?:\/explore)?#app-waitlist"/);}
console.log('PASS: public navigation links reach existing Explore sections; stale app-waitlist links are replaced.');
