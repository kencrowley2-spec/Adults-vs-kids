import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import Stripe from 'stripe';

function moduleAt(path,imports={}){
 const code=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const exports={};vm.runInNewContext(code,{exports,require:name=>{if(!(name in imports))throw new Error('Unexpected import '+name);return imports[name];},process,Response,Request,Headers,URL,crypto,console},{filename:path});return exports;
}
const catalog=moduleAt('config/pdfs.ts');
const {paidOrder}=moduleAt('lib/payments/policy.ts',{'../../config/pdfs':catalog});
const owner='11111111-1111-4111-8111-111111111111';
const paid={id:'cs_test_example123',mode:'payment',status:'complete',payment_status:'paid',currency:'usd',amount_total:299,client_reference_id:owner,livemode:false,metadata:{avk_type:'pdf-v1',avk_products:'["book-1"]'}};
assert.equal(paidOrder(paid,false).user_id,owner);
assert.equal(paidOrder({...paid,metadata:{...paid.metadata,avk_products:'["bundle"]'},amount_total:995},false).book_ids.length,4);
for(const change of [
 {payment_status:'unpaid'},{payment_status:'no_payment_required'},{status:'open'},{status:'expired'},{mode:'subscription'},
 {currency:'eur'},{amount_total:199},{amount_total:0},{client_reference_id:null},{client_reference_id:'not-a-user'},
 {livemode:true},{metadata:null},{metadata:{avk_type:'unrelated',avk_products:'["book-1"]'}},
 {metadata:{avk_type:'pdf-v1',avk_products:'["book-99"]'}},
 {metadata:{avk_type:'pdf-v1',avk_products:'["book-1","book-1"]'}},
 {metadata:{avk_type:'pdf-v1',avk_products:'["bundle","book-1"]'}},
 {metadata:{avk_type:'pdf-v1',avk_products:'null'}},
 {metadata:{avk_type:'pdf-v1',avk_products:'broken json'}},
])assert.throws(()=>paidOrder({...paid,...change},false));
assert.throws(()=>paidOrder(paid,true));

// Exercise the real webhook handler with valid, tampered, replayed and mismatched-mode signatures.
const stripe=new Stripe('sk_test_local_fixture'),secret='whsec_local_fixture',oldSecret=process.env.STRIPE_WEBHOOK_SECRET;
process.env.STRIPE_WEBHOOK_SECRET=secret;
let fulfilled=0,revoked=0;
const hook=moduleAt('app/api/stripe/webhook/route.ts',{'../../../../lib/payments/server':{
 stripeClient:()=>stripe,paymentLive:()=>false,fulfillPdf:async()=>{fulfilled++},revokeIntent:async()=>{revoked++},
}});
const event={id:'evt_test_fixture',type:'checkout.session.completed',livemode:false,data:{object:{id:paid.id,payment_status:'paid',metadata:{avk_type:'pdf-v1'}}}};
async function deliver(value,{tamper=false,timestamp=Math.floor(Date.now()/1000)}={}){const payload=JSON.stringify(value),signature=stripe.webhooks.generateTestHeaderString({payload,secret,timestamp});return hook.POST(new Request('https://adultsvskids.com/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':signature},body:tamper?payload+' ':payload}));}
assert.equal((await hook.POST(new Request('https://adultsvskids.com/api/stripe/webhook',{method:'POST',body:'{}'}))).status,400);
assert.equal((await deliver(event,{tamper:true})).status,400);
assert.equal((await deliver(event,{timestamp:1})).status,400);
assert.equal((await deliver({...event,livemode:true})).status,400);
assert.equal(fulfilled,0);
assert.equal((await deliver({...event,data:{object:{...event.data.object,payment_status:'unpaid'}}})).status,200);
assert.equal(fulfilled,0);
assert.equal((await deliver(event)).status,200);assert.equal(fulfilled,1);
assert.equal((await deliver({...event,type:'charge.refunded',data:{object:{payment_intent:'pi_fixture'}}})).status,200);assert.equal(revoked,1);
if(oldSecret===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=oldSecret;

// Session identifiers alone cannot confirm another family's purchase.
let confirms=0;
const confirmation=moduleAt('app/api/pdf/confirm/route.ts',{
 '../../../../lib/auth/session':{verifiedMember:async()=>({user:{id:owner},headers:new Headers()}),memberReply:(data,status)=>Response.json(data,{status})},
 '../../../../lib/request-origin':{requestOrigin:()=> 'https://adultsvskids.com'},
 '../../../../lib/payments/server':{stripeClient:()=>({checkout:{sessions:{retrieve:async()=>({client_reference_id:'22222222-2222-4222-8222-222222222222'})}}}),fulfillPdf:async()=>{confirms++}},
});
const confirmRequest=new Request('https://adultsvskids.com/api/pdf/confirm',{method:'POST',headers:{origin:'https://adultsvskids.com','content-type':'application/json'},body:JSON.stringify({session_id:'cs_test_fixture123'})});
assert.equal((await confirmation.POST(confirmRequest)).status,404);assert.equal(confirms,0);
console.log('PASS: PDF price/identity/mode validation, four-book bundle, unpaid/expired sessions, forged/tampered/stale webhooks, refund revocation, and cross-family confirmation denial.');
