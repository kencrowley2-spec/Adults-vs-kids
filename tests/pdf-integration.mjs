// Isolated integration check: pass test Stripe + Supabase credentials as JSON on stdin.
// Creates two disposable verified Auth fixtures, then deletes them and their records.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import Stripe from 'stripe';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
let input='';for await(const chunk of process.stdin)input+=chunk;
const cfg=JSON.parse(input);input='';
assert.match(cfg.stripeKey,/^sk_test_/);
const stripe=new Stripe(cfg.stripeKey,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:0,timeout:15000}),admin=createClient(cfg.supabaseUrl,cfg.serverKey,{auth:{persistSession:false,autoRefreshToken:false}});
const port=3109,root='http://127.0.0.1:'+port,webhookSecret='whsec_'+randomBytes(24).toString('hex');
const users=[],fixtureProducts=[],priceIds=[];let server;
const sourceFiles=['Adults_vs_Kids_Coloring_Challenge_8.5x11_KDP_Interior.pdf','Family_Showdown_Book2_Adults_vs_Kids_Activity_Challenge.pdf','Official Makeitandplay #4(1).pdf','official book 4 Young Adults_vs_Kids_Book4_Ultimate_Young_Adult_Challenge.pdf'];
function check(result){if(result.error)throw new Error(result.error.message);return result.data;}
async function fixtureUser(){const email='avk-pdf-test-'+randomUUID()+'@example.com',password=randomBytes(24).toString('base64url')+'aA1!';const user=check(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{purpose:'disposable-pdf-integration-test'}})).user;users.push(user.id);const cookies=[];const client=createServerClient(cfg.supabaseUrl,cfg.publishableKey,{cookies:{getAll:()=>cookies,setAll:values=>{for(const c of values){const old=cookies.find(x=>x.name===c.name);if(old)old.value=c.value;else cookies.push({name:c.name,value:c.value});}}}});check(await client.auth.signInWithPassword({email,password}));return {id:user.id,cookie:cookies.map(c=>c.name+'='+c.value).join('; ')};}
async function api(path,user,body){return fetch(root+path,{headers:{Cookie:user?.cookie??'',Origin:root,...(body?{'Content-Type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{}) ,redirect:'manual'});}
async function eventDelivery(event){const payload=JSON.stringify(event),signature=stripe.webhooks.generateTestHeaderString({payload,secret:webhookSecret});return fetch(root+'/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload});}
try{
 for(let i=0;i<5;i++){const p=await stripe.products.create({name:'AVK PDF integration fixture '+(i+1),metadata:{purpose:'pdf-integration-test'},default_price_data:{currency:'usd',unit_amount:i===4?995:299}});fixtureProducts.push(p.id);priceIds.push(p.default_price);}
 const [owner,other]=await Promise.all([fixtureUser(),fixtureUser()]);
 const env={...process.env,SUPABASE_URL:cfg.supabaseUrl,SUPABASE_PUBLISHABLE_KEY:cfg.publishableKey,SUPABASE_SERVICE_ROLE_KEY:cfg.serverKey,STRIPE_SECRET_KEY:cfg.stripeKey,STRIPE_WEBHOOK_SECRET:webhookSecret,STRIPE_MODE:'test',PDF_CHECKOUT_OPEN:'true',PDF_SITE_ORIGIN:'https://adultsvskids.com'};
 for(let i=0;i<4;i++)env['STRIPE_PDF_BOOK_'+(i+1)+'_PRICE']=priceIds[i];env.STRIPE_PDF_BUNDLE_PRICE=priceIds[4];
 server=spawn(process.execPath,['--use-env-proxy','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(new Error('Test server startup timed out')),15000);server.stdout.on('data',d=>{out+=d;if(out.includes('Ready in')){clearTimeout(timer);resolve();}});server.on('exit',code=>{clearTimeout(timer);reject(new Error('Test server exited '+code));});});
 const catalog=await(await api('/api/pdf/catalog')).json();assert(catalog.products.every(p=>p.available));
 const start=await api('/api/pdf/checkout',owner,{products:['bundle']});const checkout=await start.json();assert.equal(start.status,200,JSON.stringify(checkout));
 const sessionId=checkout.url.match(/cs_test_[A-Za-z0-9]+/)?.[0];assert(sessionId);
 console.log('TEST_CHECKOUT_URL='+checkout.url);
 console.log('WAITING_FOR_TEST_PAYMENT',JSON.stringify({session:sessionId}));
 let session;
 const deadline=Date.now()+600000;
 while(Date.now()<deadline){session=await stripe.checkout.sessions.retrieve(sessionId);if(session.payment_status==='paid')break;await new Promise(r=>setTimeout(r,2000));}
 assert.equal(session.payment_status,'paid','Complete the hosted Stripe TEST checkout to continue.');
 console.log('Test payment confirmed. Checking fulfillment.');
 const events=await stripe.events.list({type:'checkout.session.completed',limit:10});const event=events.data.find(e=>e.data.object.id===sessionId);assert(event,'Stripe completed event not found');
 assert.equal((await eventDelivery(event)).status,200,'Signed completion notification failed');
 assert.equal((await eventDelivery(event)).status,200,'Duplicate signed event failed');
 const orders=await(await api('/api/pdf/orders',owner)).json();assert.equal(orders.orders.length,1);assert.equal(orders.orders[0].books.length,4);assert.equal(orders.orders[0].amount_total,995);
 assert.equal((await(await api('/api/pdf/orders',other)).json()).orders.length,0);
 assert.equal((await api('/api/pdf/confirm',other,{session_id:sessionId})).status,404);
 assert.equal((await api('/api/pdf/download?order='+sessionId+'&book=book-1',other)).status,404);
 console.log('Payment notification, replay and account isolation passed.');
 for(let i=0;i<4;i++){console.log('Verifying private PDF '+(i+1));const download=await api('/api/pdf/download?order='+sessionId+'&book=book-'+(i+1),owner);assert.equal(download.status,303);const signed=download.headers.get('location');assert(signed);const bytes=Buffer.from(await(await fetch(signed)).arrayBuffer());const original=await readFile(resolve(dirname(fileURLToPath(import.meta.url)),'../../pdf-source',sourceFiles[i]));assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(original).digest('hex'));}
 assert.equal((await api('/api/pdf/confirm',owner,{session_id:sessionId})).status,200);
 const pending=await(await api('/api/pdf/checkout',owner,{products:['book-1']})).json();const pendingId=pending.url.match(/cs_test_[A-Za-z0-9]+/)[0];assert.equal((await api('/api/pdf/confirm',owner,{session_id:pendingId})).status,409);await stripe.checkout.sessions.expire(pendingId);
 const refund=await stripe.refunds.create({payment_intent:session.payment_intent});assert.equal(refund.status,'succeeded');
 let refundedEvent;for(let attempt=0;attempt<15;attempt++){const refundEvents=await stripe.events.list({type:'charge.refunded',limit:100});refundedEvent=refundEvents.data.find(e=>e.data.object.id===refund.charge);if(refundedEvent)break;await new Promise(r=>setTimeout(r,2000));}assert(refundedEvent,'Stripe refund event did not arrive');assert.equal((await eventDelivery(refundedEvent)).status,200);
 assert.equal((await api('/api/pdf/download?order='+sessionId+'&book=book-1',owner)).status,404);
 const revoked=await(await api('/api/pdf/orders',owner)).json();assert.equal(revoked.orders[0].status,'revoked');
 console.log('PASS: real Stripe test Checkout → signed payment notification → one durable purchase → four byte-matched private downloads; replay idempotency, cross-family denial, unpaid-checkout denial, return confirmation, and refund revocation.');
}catch(e){console.error('INTEGRATION CHECK FAILED:',e.message,e.detail?.cause?.code??e.code??'');process.exitCode=1;}
finally{if(server)server.kill('SIGTERM');for(const id of users){const result=await admin.auth.admin.deleteUser(id);if(result.error)console.error('Fixture cleanup required for user',id);}for(const id of fixtureProducts)await stripe.products.update(id,{active:false}).catch(()=>{});console.log('Disposable Auth fixtures removed; test products archived.');}
