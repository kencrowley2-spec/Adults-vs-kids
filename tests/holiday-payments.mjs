import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(path,imports={}){const exports={};const code=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:name=>{if(!(name in imports))throw Error(name);return imports[name];},Response,Request,Headers,URL,crypto,Buffer,console,process},{filename:path});return exports;}
const shipping=load('lib/holiday-shipping.ts');
for(const [zip,cents]of [['46038',1495],['60601',1995],['10001',1995],['90210',2495],['96815',3995],['99501',3995]])assert.equal(shipping.holidayShipping(zip).cents,cents);
for(const zip of ['',46038,'123','abcde','00000','00901','09012','96201'])assert.throws(()=>shipping.holidayShipping(zip));
let previous=null,captured,options,expired=0,configured=true;
const stripe={checkout:{sessions:{create:async(p,o)=>{captured=p;options=o;return {id:'cs_live_fixture',livemode:true,url:'https://checkout.stripe.com/c/pay/fixture'};},retrieve:async()=>previous,expire:async()=>{expired++;return {};}}}};
const server={stripeClient:()=>stripe,paymentLive:()=>true,paymentOrigin:()=> 'https://adultsvskids.com',paymentsConfigured:()=>configured};
const helper=load('lib/holiday-payments.ts',{'node:crypto':crypto,'./payments/server':server});
const cookie=helper.holidayCookie('cs_live_fixture').split(';')[0];
assert.equal(helper.holidaySessionId(new Request('https://adultsvskids.com',{headers:{cookie}})),'cs_live_fixture');
assert.equal(helper.holidaySessionId(new Request('https://adultsvskids.com',{headers:{cookie:cookie.replace('fixture','forged')}})),null);
const helpers={...helper,previousHolidaySession:async()=>previous};
const imports={'../../../../lib/request-origin':{requestOrigin:()=> 'https://adultsvskids.com'},'../../../../lib/payments/server':server,'../../../../lib/holiday-shipping':shipping,'../../../../lib/holiday-payments':helpers};
const route=load('app/api/holiday/checkout/route.ts',imports);
const request=(body,origin='https://adultsvskids.com')=>new Request('https://adultsvskids.com/api/holiday/checkout',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
assert.equal((await route.POST(request({zip:'46038'},'https://attacker.example'))).status,403);
assert.equal((await route.POST(request({zip:'no'}))).status,400);
configured=false;assert.equal((await route.POST(request({zip:'46038'}))).status,503);configured=true;
assert.equal((await route.POST(request({zip:'46038',recovery:true}))).status,409);
for(const [zip,cents]of [['46038',1495],['90210',2495],['99501',3995]]){
 const response=await route.POST(request({zip,cents:1,total:1,freeShipping:true}));assert.equal(response.status,200);assert.equal(captured.line_items[0].price_data.unit_amount,9900);assert.equal(captured.shipping_options[0].shipping_rate_data.fixed_amount.amount,cents);assert.equal(captured.mode,'payment');assert.equal(captured.line_items[0].quantity,1);assert.equal(captured.shipping_address_collection.allowed_countries[0],'US');assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
}
previous={id:'cs_live_original',status:'expired',payment_status:'unpaid',metadata:{avk_type:helper.HOLIDAY_TYPE,avk_offer:'standard',avk_zip:'46038'}};
assert.equal((await route.POST(request({zip:'46038',recovery:true}))).status,200);assert.equal(captured.shipping_options[0].shipping_rate_data.fixed_amount.amount,0);assert.equal(captured.line_items[0].price_data.unit_amount,9900);assert.equal(options.idempotencyKey,'avk-holiday-recovery-cs_live_original');assert.equal(captured.expires_at,undefined);
assert.equal((await route.POST(request({zip:'90210',recovery:true}))).status,409);
previous.payment_status='paid';assert.equal((await route.POST(request({zip:'46038',recovery:true}))).status,409);
previous.payment_status='unpaid';previous.status='open';assert.equal((await route.POST(request({zip:'46038',recovery:true}))).status,409);
const recovery=load('app/api/holiday/recovery/route.ts',imports);let response=await recovery.POST(request({}));assert.equal((await response.json()).eligible,true);assert.equal(expired,1);
previous.payment_status='paid';response=await recovery.POST(request({}));assert.equal((await response.json()).eligible,false);assert.equal(expired,1);
previous=null;response=await recovery.POST(request({}));assert.equal((await response.json()).eligible,false);
console.log('PASS: ZIP estimates, server-owned $99 price and shipping, forged-cookie denial, same-origin checks, authenticated recovery eligibility, unpaid-session expiry, paid-session denial and stable recovery idempotency.');
