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
 '../../../../lib/payments/server':{availablePdfs:async()=>[{id:'bundle',available}],paymentAdmin:()=>({from:()=>query}),paymentOrigin:()=> 'https://adultsvskids.com',paymentLive:()=>true,stripeClient:()=>({checkout:{sessions:{create:async params=>{captured=params;return {url:'https://checkout.stripe.com/c/pay/testfixture'};}}}})}
});
const request=(body,origin='https://adultsvskids.com')=>new Request(origin+'/api/club/checkout',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
assert.equal((await route.POST(request({plan:'year',accepted:true},'https://attacker.example'))).status,403);
signed=false;assert.equal((await route.POST(request({plan:'year',accepted:true}))).status,401);signed=true;
for(const input of [{plan:'year',accepted:false},{plan:'unlimited',accepted:true}])assert.equal((await route.POST(request(input))).status,400);
available=false;assert.equal((await route.POST(request({plan:'year',accepted:true}))).status,503);available=true;
duplicate=true;assert.equal((await route.POST(request({plan:'year',accepted:true}))).status,409);duplicate=false;
for(const [plan,amount] of [['month',299],['year',2495]]){const r=await route.POST(request({plan,accepted:true,cents:1,user_id:'attacker'}));assert.equal(r.status,200);assert.equal(captured.mode,'payment');assert.equal(captured.line_items[0].price_data.unit_amount,amount);assert.equal(captured.client_reference_id,owner);assert.equal(captured.payment_intent_data.receipt_email,'family@example.com');assert.equal(captured.invoice_creation.enabled,true);assert.match(captured.invoice_creation.invoice_data.footer,/clubhouse-setup\/download/);assert.match(captured.custom_text.submit.message,/No automatic renewal/);assert.match(captured.success_url,/family\/downloads\?session_id=/);assert.equal(captured.metadata.avk_terms,'delivery-start-v1');}
console.log('PASS: Club payment amounts, four-book grant, paid/mode/ownership checks, authentication, origin protection, duplicate orders, no client price override, receipt email and setup link, one-time delivery-start terms.');
