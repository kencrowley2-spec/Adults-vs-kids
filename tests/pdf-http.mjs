import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const root='http://127.0.0.1:3098';
// Run this against the production build without any payment credentials.
const env={...process.env};for(const name of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'])delete env[name];
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3098'],{env,stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(new Error('Server did not start')),15000);server.stdout.on('data',d=>{output+=d;if(output.includes('Ready in')){clearTimeout(timer);resolve();}});server.on('exit',code=>{clearTimeout(timer);reject(new Error('Server exited: '+code));});});
 const page=await fetch(root+'/downloads');assert.equal(page.status,200);assert.match(await page.text(),/Secure checkout with Stripe/);
 const catalog=await(await fetch(root+'/api/pdf/catalog')).json();assert.equal(catalog.products.length,5);assert(catalog.products.every(p=>!p.available));assert.equal(catalog.products[0].cents,299);assert.equal(catalog.products[4].cents,995);
 for(const path of ['/api/pdf/orders','/api/pdf/download?order=cs_test_fake123&book=book-1'])assert.equal((await fetch(root+path)).status,401);
 assert.equal((await fetch(root+'/api/pdf/checkout',{method:'POST',headers:{origin:root,'content-type':'application/json'},body:JSON.stringify({products:['book-1'],cents:1})})).status,401);
 assert.equal((await fetch(root+'/api/stripe/webhook',{method:'POST',body:'{}'})).status,503);
 const redirect=await fetch(root+'/family/downloads',{redirect:'manual'});assert.equal(redirect.status,303);assert.equal(redirect.headers.get('location'),'/login');
 assert.equal((await fetch(root+'/api/pdf/checkout',{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json'},body:'{}'})).status,403);
 console.log('PASS: production HTTP PDF store, real catalog shape/prices, closed checkout, sign-in requirements, origin checks, unsigned webhook, and dashboard library redirect.');
}finally{server.kill('SIGTERM');}
