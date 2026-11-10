import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,imports={}){const exports={};const code=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:name=>{if(!(name in imports))throw Error(name);return imports[name];},Response,Request,Headers,URL,crypto,console,process},{filename:path});return exports;}
const catalog=load('config/pdfs.ts'),club=load('lib/payments/club.ts',{'../../config/pdfs':catalog});
const owner='11111111-1111-4111-8111-111111111111';
const paid={id:'cs_live_approved12345',mode:'payment',status:'complete',payment_status:'paid',currency:'usd',amount_total:2495,client_reference_id:owner,livemode:true,metadata:{avk_type:'club-prelaunch-v1',avk_plan:'year',avk_terms:'delivery-start-v1'}};
assert.equal(club.paidClubOrder(paid,true).book_ids.length,4);
assert.equal(club.paidClubOrder({...paid,amount_total:299,metadata:{...paid.metadata,avk_plan:'month'}},true).product_ids[0],'club-month');
for(const delta of [{amount_total:1},{livemode:false},{payment_status:'unpaid'},{status:'open'},{mode:'subscription'},{currency:'eur'},{client_reference_id:'other'},{metadata:{...paid.metadata,avk_plan:'free'}},{metadata:{...paid.metadata,avk_terms:'starts-now'}}])assert.throws(()=>club.paidClubOrder({...paid,...delta},true));
let signed=true,duplicate=false,captured=null,available=true;
const query={select(){return this;},eq(){return this;},overlaps(){return this;},limit(){return Promise.resolve({data:duplicate?[{session_id:'existing'}]:[],error:null});},gte(){return Promise.resolve({count:0,error:null});},insert(){return Promise.resolve({error:null});}};
const route=load('app/api/club/checkout/route.ts',{
 '../../../../lib/auth/session':{verifiedMember:async()=>({user:signed?{id:owner,email:'family@example.com'}:null,headers:new Headers()}),memberReply:(b,s,h)=>new Response(JSON.stringify(b),{status:s,headers:h})},
 '../../../../lib/request-origin':{requestOrigin:()=> 'https://adultsvskids.com'},
 '../../../../lib/payments/club':club,
 '../../../../lib/payments/subscriptions':{clubSubscriptions:async()=>({legacy:duplicate,active:[]})},
 '../../../../lib/payments/server':{availablePdfs:async()=>[{id:'bundle',available}],paymentAdmin:()=>({from:()=>query}),paymentOrigin:()=> 'https://adultsvskids.com',paymentLive:()=>true,stripeClient:()=>({checkout:{sessions:{create:async params=>{captured=params;return {url:'https://checkout.stripe.com/c/pay/testfixture'};}}}})}
});
const request=(body,origin='https://adultsvskids.com')=>new Request(origin+'/api/club/checkout',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
assert.equal((await route.POST(request({plan:'year',accepted:true},'https://attacker.example'))).status,403);
signed=false;assert.equal((await route.POST(request({plan:'year',accepted:true}))).status,401);signed=true;
for(const input of [{plan:'year',accepted:false},{plan:'unlimited',accepted:true}])assert.equal((await route.POST(request(input))).status,400);
available=false;assert.equal((await route.POST(request({plan:'year',accepted:true}))).status,503);available=true;
duplicate=true;assert.equal((await route.POST(request({plan:'year',accepted:true}))).status,409);duplicate=false;
for(const [plan,amount] of [['month',299],['year',2495]]){const r=await route.POST(request({plan,accepted:true,cents:1,user_id:'attacker'}));assert.equal(r.status,200);assert.equal(captured.mode,'subscription');assert.equal(captured.line_items[0].price_data.recurring.interval,plan);assert.equal(captured.customer_creation,undefined);assert.equal(captured.payment_intent_data,undefined);assert.equal(captured.invoice_creation,undefined);assert.equal(captured.line_items[0].price_data.unit_amount,amount);assert.equal(captured.client_reference_id,owner);assert.equal(captured.customer_email,'family@example.com');assert.equal(captured.subscription_data.metadata.avk_user_id,owner);assert.match(captured.custom_text.submit.message,/automatically every month/);assert.match(captured.success_url,/family\/downloads\?session_id=/);assert.equal(captured.metadata.avk_terms,'recurring-v1');}

const recurring={...paid,mode:'subscription',metadata:{...paid.metadata,avk_type:'club-subscription-v1',avk_terms:'recurring-v1'}};
assert.equal(club.paidClubOrder(recurring,true).product_ids[0],'club-year');
for(const delta of [{mode:'payment'},{amount_total:299},{payment_status:'unpaid'},{livemode:false},{metadata:{...recurring.metadata,avk_terms:'delivery-start-v1'}}])assert.throws(()=>club.paidClubOrder({...recurring,...delta},true));
console.log('PASS: Monthly/yearly recurring checkout, explicit renewal consent, legacy purchase delivery, amount/ownership checks, authentication, origin protection, duplicate orders and subscription metadata.');
// Subscription checkout has no session.payment_intent: resolve its initial paid invoice.
let savedOrder=null,refunded=false,interval='year',invoicePaid=true;
const fakeStripe={checkout:{sessions:{retrieve:async()=>({...recurring,invoice:'in_initial',payment_intent:null,created:1000}),listLineItems:async()=>({has_more:false,data:[{quantity:1,price:{currency:'usd',type:'recurring',unit_amount:2495,recurring:{interval,interval_count:1}},amount_total:2495}]})}},invoices:{retrieve:async()=>({status:invoicePaid?'paid':'open',amount_paid:2495,currency:'usd'})},invoicePayments:{list:async()=>({data:[{status:'paid',payment:{type:'payment_intent',payment_intent:'pi_initial'}}]})},paymentIntents:{retrieve:async()=>({id:'pi_initial',latest_charge:{paid:true,disputed:false,amount_refunded:refunded?2495:0,refunded}})}};
const oldEnv={...process.env};process.env.STRIPE_SECRET_KEY='fixture';process.env.SUPABASE_URL='fixture';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture';process.env.STRIPE_MODE='live';
const FakeStripe=Object.assign(function(){return fakeStripe;},{createFetchHttpClient:()=>({})});
const paymentServer=load('lib/payments/server.ts',{'stripe':{default:FakeStripe},'@supabase/supabase-js':{createClient:()=>({from:()=>({upsert:async order=>{savedOrder=order;return {error:null};},update:()=>({eq:async()=>({error:null})})})})},'../../config/pdfs':catalog,'./policy':{},'./club':club});
await paymentServer.fulfillPdf(recurring.id);assert.equal(savedOrder.payment_intent_id,'pi_initial');assert.equal(savedOrder.book_ids.length,4);
interval='month';await assert.rejects(()=>paymentServer.fulfillPdf(recurring.id));interval='year';
invoicePaid=false;await assert.rejects(()=>paymentServer.fulfillPdf(recurring.id));invoicePaid=true;
refunded=true;await assert.rejects(()=>paymentServer.fulfillPdf(recurring.id));
process.env=oldEnv;
let billingOwner=true,billingActive=true,portalConfig=null;
const billingRoute=load('app/api/club/billing/route.ts',{
 '../../../../lib/auth/session':{verifiedMember:async()=>({user:billingOwner?{id:owner}:null,headers:new Headers()}),memberReply:(b,s,h)=>new Response(JSON.stringify(b),{status:s,headers:h})},
 '../../../../lib/request-origin':{requestOrigin:()=> 'https://adultsvskids.com'},
 '../../../../lib/payments/subscriptions':{clubSubscriptions:async id=>{assert.equal(id,owner);return {active:billingActive?[{customer:'cus_owned'}]:[]};}},
 '../../../../lib/payments/server':{paymentOrigin:()=> 'https://adultsvskids.com',stripeClient:()=>({billingPortal:{configurations:{create:async config=>{portalConfig=config;return {id:'bpc_config'};}},sessions:{create:async params=>{assert.equal(params.customer,'cus_owned');return {url:'https://billing.stripe.com/p/session/fixture'};}}}})}
});
assert.equal((await billingRoute.POST(request({}))).status,200);assert.equal(portalConfig.features.subscription_cancel.mode,'at_period_end');
assert.equal((await billingRoute.POST(request({},'https://attacker.example'))).status,403);
billingOwner=false;assert.equal((await billingRoute.POST(request({}))).status,401);billingOwner=true;
billingActive=false;assert.equal((await billingRoute.POST(request({}))).status,404);
console.log('PASS: Initial subscription invoice fulfillment, wrong intervals, unpaid invoices, refunds, owned billing portal and end-of-period cancellation.');
