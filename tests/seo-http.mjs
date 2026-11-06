import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {GAMES} from '../public/arcade-data.js';
import {spawn} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
const root=process.env.SEO_TEST_ORIGIN||'http://127.0.0.1:3097';
const server=process.env.SEO_TEST_ORIGIN?null:spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3097'],{stdio:['ignore','pipe','pipe']});
try{
 if(server)await new Promise((resolve,reject)=>{let s='';const t=setTimeout(()=>reject(Error('Startup timeout')),15000);server.stdout.on('data',d=>{s+=d;if(s.includes('Ready in')){clearTimeout(t);resolve();}});server.once('exit',c=>{clearTimeout(t);reject(Error('Server exit '+c));});});
 const sitemap=await fetch(root+'/sitemap.xml');assert.equal(sitemap.status,200);const xml=await sitemap.text();
 const paths=[...xml.matchAll(/<loc>https:\/\/adultsvskids.com([^<]*)<\/loc>/g)].map(x=>x[1]);assert(paths.includes('/all-access-club'));assert(paths.includes('/products'));assert(!paths.includes('/founders'));
 const robots=await fetch(root+'/robots.txt');assert.equal(robots.status,200);const rules=await robots.text();assert.match(rules,/Sitemap: https:\/\/adultsvskids.com\/sitemap.xml/);assert.match(rules,/Disallow: \/family\$/);assert(!rules.includes('Disallow: /family\n'));assert(!xml.includes('/login'));
 const pages=new Map();
 for(const path of paths){const r=await fetch(root+path,{redirect:'manual'});assert.equal(r.status,200,path);const html=await r.text();pages.set(path,html);
  assert.equal((html.match(/<title>/g)||[]).length,1,path);assert.equal((html.match(/name="description"/g)||[]).length,1,path);assert.equal((html.match(/rel="canonical"/g)||[]).length,1,path);assert(html.includes(`href="https://adultsvskids.com${path}"`),path);assert.match(html,/property="og:title"/);if(!['/creator-league'].includes(path))assert.ok(/<h1/.test(html),path+' has a primary heading');assert(!r.headers.get('x-robots-tag')?.includes('noindex'),path);
  for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){const json=JSON.parse(m[1]);assert.equal(json['@context'],'https://schema.org');assert(json['@graph'].some(x=>x['@type']==='Organization'));assert(json['@graph'].some(x=>x['@type']==='WebSite'));}
  assert(!/84\.6%|of parents experience guilt|Unverified figure/.test(html),path);
 }
 const home=pages.get('/');assert.match(home,/<title>Adults vs. Kids \| Free Family Games &amp; Fun Activities<\/title>/);assert.match(home,/<h1[^>]*>Fun Family Games That Bring Parents and Kids Together<\/h1>/);assert.equal((home.match(/<h1/g)||[]).length,1);assert.match(home,/<video autoplay muted playsinline/);
 assert(!/Basketball|13 interactive games/.test(home),'Homepage uses current game promotions');
 const guide=pages.get('/family-games');assert.equal((guide.match(/class="game-guide"/g)||[]).length,GAMES.length);assert(!/Block Showdown|Spot the Difference|Mini Golf|Basketball Showdown|Word Scramble|Quick Tap/.test(guide));assert.match(guide,/href="\/family\/arcade"/);
 const broken=[],checked=new Map(),external=new Set();
 for(const [path,html] of pages){const doc=new JSDOM(html).window.document;
  for(const element of doc.querySelectorAll('a[href],img[src],script[src],link[href],video[src],source[src]')){
   const raw=element.getAttribute('href')||element.getAttribute('src');if(!raw||/^(mailto:|tel:|data:)/.test(raw))continue;
   const url=new URL(raw,'https://adultsvskids.com'+path);if(url.origin!=='https://adultsvskids.com'){external.add(url.href);continue;}
   const key=url.pathname+url.search;
   if(!checked.has(key)){const r=await fetch(root+key);checked.set(key,{status:r.status,html:r.headers.get('content-type')?.includes('text/html')?await r.text():''});}
   const result=checked.get(key);if(result.status!==200)broken.push(`${path} -> ${key}: ${result.status}`);
   // Dialogs opened by script use '#'; real section fragments must exist.
   if(url.hash&&result.html&&!new JSDOM(result.html).window.document.getElementById(decodeURIComponent(url.hash.slice(1))))broken.push(`${path} -> ${key}${url.hash}: missing anchor`);
  }
 }
 assert.deepEqual(broken,[],'Navigation, buttons, assets and section links must resolve');
 console.log(`Checked ${checked.size} unique same-site destinations and anchors; ${external.size} external URLs found.`);
 for(const path of ['/login','/signup','/admin/login','/member-preview']){const r=await fetch(root+path);assert.equal(r.status,200);assert.match(r.headers.get('x-robots-tag')||'',/noindex/);}
 for(const path of ['/family','/family/arcade','/family/downloads','/admin']){const r=await fetch(root+path,{redirect:'manual'});assert.equal(r.status,303,path);assert.match(r.headers.get('location'),/login/);assert.match(r.headers.get('x-robots-tag')||'',/noindex/);}
 assert.equal((await fetch(root+'/not-a-real-guide')).status,404);
 console.log(`PASS: ${paths.length} public pages, metadata uniqueness, canonical URLs, JSON-LD, current game catalog, sitemap, crawler privacy, assets, internal links, and anonymous account/Arcade access.`);
}finally{server?.kill('SIGTERM');}
