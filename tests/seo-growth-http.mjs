import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {JSDOM} from 'jsdom';
const origin=process.env.SEO_TEST_ORIGIN||'http://127.0.0.1:34127';
const server=process.env.SEO_TEST_ORIGIN?null:spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','34127'],{stdio:['ignore','pipe','pipe']});
try{
if(server)await new Promise((resolve,reject)=>{let text='';const timeout=setTimeout(()=>reject(Error('Startup timeout')),15000);server.stdout.on('data',x=>{text+=x;if(text.includes('Ready in')){clearTimeout(timeout);resolve();}});server.once('exit',code=>{clearTimeout(timeout);reject(Error('Server exit '+code));});});
const xml=await(await fetch(origin+'/sitemap.xml')).text(),urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]));assert.equal(urls.length,32);
const titles=new Set(),descriptions=new Set();
for(const url of urls){const r=await fetch(origin+url.pathname,{redirect:'manual'});assert.equal(r.status,200,url.pathname);const d=new JSDOM(await r.text()).window.document;assert.equal(d.querySelectorAll('h1').length,1,url.pathname);assert.equal(d.querySelectorAll('title').length,1);assert.equal(d.querySelector('link[rel=canonical]').href,url.href);assert.equal(d.querySelector('meta[name=robots]').content,'index, follow');assert(!r.headers.get('x-robots-tag')?.includes('noindex'));titles.add(d.title);descriptions.add(d.querySelector('meta[name=description]').content);for(const x of d.querySelectorAll('script[type="application/ld+json"]'))JSON.parse(x.textContent);for(const a of d.querySelectorAll('a[href]'))assert.notEqual(new URL(a.href,origin).pathname,'/website',url.pathname+' stale alias');}
assert.equal(titles.size,urls.length);assert.equal(descriptions.size,urls.length);
const redirect=await fetch(origin+'/website?utm_source=youtube&utm_content=002_track',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(new URL(redirect.headers.get('location')).pathname,'/');assert.equal(new URL(redirect.headers.get('location')).searchParams.get('utm_content'),'002_track');
for(const path of ['/login','/signup','/family/arcade','/admin','/auth/admin-data?section=growth','/club-checkout']){const r=await fetch(origin+path,{redirect:'manual'});assert.match(r.headers.get('x-robots-tag')||'',/noindex/,path);if(path.includes('admin-data'))assert.equal(r.status,401);}
const pdf=await fetch(origin+'/printables/family-championship-scorecard.pdf');assert.equal(pdf.status,200);assert.match(pdf.headers.get('content-type'),/pdf/);
assert.equal((await fetch(origin+'/books/unknown')).status,404);
console.log('PASS: 32 HTTP public pages, distinct metadata, JSON-LD, no stale homepage links, 308 campaign-preserving redirect, protected private routes, printable PDF and unknown-book 404.');

}finally{server?.kill('SIGTERM')}
