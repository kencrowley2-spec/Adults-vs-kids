import assert from 'node:assert/strict';
import {attribution,campaignText,internalTraffic,safePath} from '../lib/analytics-policy.ts';
import fs from 'node:fs';
import vm from 'node:vm';
const origin='https://adultsvskids.com';
assert.deepEqual(attribution({referrer:'www.adultsvskids.com',utm_source:'Facebook',utm_campaign:'fall launch'},origin),{referrer:'',utm:{source:'Facebook',medium:'',campaign:'fall launch',content:'',term:''}});
assert.equal(attribution({referrer:'https://example.com/?email=secret'},origin).referrer,'');
assert.equal(attribution({referrer:'chatgpt.com'},origin).referrer,'chatgpt.com');
for(const bad of ['person@example.com','https://site.test','token:abc','a'.repeat(101),'secret-value','<script>','hello\nworld'])assert.equal(campaignText(bad),'');
assert.equal(safePath('/auth/confirm?token=private'),'/');
assert.equal(internalTraffic({app_metadata:{analytics_internal:true}},false,''),true);
assert.equal(internalTraffic({user_metadata:{analytics_internal:true}},false,''),false);
assert.equal(internalTraffic(null,false,'Chrome Lighthouse'),true);
// First request must establish cookies before a simultaneous game event. Retry preserves its event ID.
const handlers={},clickHandlers={},calls=[];let release;let number=0;
const context={location:{href:'https://adultsvskids.com/family-games',pathname:'/family-games',search:'?utm_source=qa&utm_campaign=avk_funnel_check'},document:{referrer:'https://chatgpt.com/?private=ignored',addEventListener:(name,f)=>clickHandlers[name]=f,visibilityState:'visible'},window:{avkPendingGameEvents:[{type:'avk:game-start',detail:{game:'claw',id:'early-match'}}],dispatchEvent:e=>handlers[e.type]?.(e),addEventListener:(name,f)=>handlers[name]=f},crypto:{randomUUID:()=>`id-${++number}`},URL,URLSearchParams,Date,Promise,setInterval(){},fetch:async(url,options)=>{calls.push(JSON.parse(options.body));if(calls.length===1)await new Promise(r=>release=r);return {ok:true,status:204};}};
vm.runInNewContext(fs.readFileSync('public/platform-analytics.js','utf8'),context);
handlers['avk:game-start']({detail:{game:'memory',id:'match-id'}});
await new Promise(r=>setImmediate(r));assert.equal(calls.length,1);release();await new Promise(r=>setImmediate(r));assert.equal(calls.length,3);assert.equal(calls[1].id,'early-match');assert.equal(calls[2].id,'match-id');assert.equal(calls[2].utm_source,'qa');assert.equal(calls[0].referrer,'chatgpt.com');assert.equal(JSON.stringify(calls).includes('private=ignored'),false);
console.log('PASS: campaign privacy bounds, internal-host handling, trusted account exclusions, automation exclusion and serialized initial session. Database session/funnel/replay checks: tests/analytics.sql.');

for(const href of ['https://link.amazon/B05l1li7L','https://www.amazon.com/dp/EXAMPLE','https://amzn.to/example']){clickHandlers.click({target:{closest:()=>({getAttribute:k=>k==='href'?href:'',id:'',closest:()=>null})}});}
await new Promise(r=>setImmediate(r));assert.equal(calls.filter(c=>c.type==='outbound'&&c.detail==='Amazon').length,3);
console.log('PASS: Amazon short links and retailer destinations emit outbound events.');
