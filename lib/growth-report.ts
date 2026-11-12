// Private, read-only report. Business endpoints and Stripe fulfillment are unchanged.
import {paymentAdmin,paymentLive,stripeClient} from './payments/server';
type Row=Record<string,unknown>;
const day=(value:unknown)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Indiana/Indianapolis',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(String(value)));
export function trafficChannel(source:string,medium=''){
 const s=source.toLowerCase(),m=medium.toLowerCase();
 if(/^(cpc|ppc|paid|paid_social|display)$/.test(m))return 'Paid / other campaigns';
 if(/(^|\.)(google\.[a-z.]+|bing\.com|search\.yahoo\.com|duckduckgo\.com)$/.test(s)||m==='organic')return 'Organic search';
 if(/(^|\.)(facebook\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|t\.co|twitter\.com|x\.com)$/.test(s)||/^(facebook|instagram|tiktok|youtube)$/.test(s)||m==='organic_social')return 'Social';
 if(/(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com)$/.test(s))return 'AI referrals';
 return /^(direct \/ unknown|unattributed)?$/i.test(s)?'Direct / unknown':'Other referrals';
}
export function aggregateGrowth(sessions:Row[],events:Row[],orders:Row[],checkouts:Row[],accounts:Row[],now=new Date()){
 const excludedUsers=new Set(accounts.filter(a=>a.is_internal_test).map(a=>String(a.user_id)));
 const validSessions=sessions.filter(s=>!s.is_internal_test),sessionMap=new Map(validSessions.map(s=>[String(s.id),s]));
 const validEvents=events.filter(e=>!e.is_internal_test&&!excludedUsers.has(String(e.user_id))&&sessionMap.has(String(e.analytics_session_id)));
 const liveCheckouts=new Map(checkouts.filter(c=>c.livemode===true&&!excludedUsers.has(String(c.user_id))).map(c=>[String(c.checkout_id),c]));
 const paid=orders.filter(o=>o.status==='paid'&&o.currency==='usd'&&!excludedUsers.has(String(o.user_id))&&liveCheckouts.has(String(o.session_id))&&sessionMap.has(String(liveCheckouts.get(String(o.session_id))?.session_id)));
 const today=day(now),within=(v:unknown,start:string)=>Number.isFinite(new Date(String(v)).getTime())&&day(v)>=start&&day(v)<=today;
 const periods=Object.fromEntries([1,7,30].map(n=>{
  // Calendar date arithmetic avoids treating local midnight as a UTC boundary.
  const startDate=new Date(today+'T12:00:00Z');startDate.setUTCDate(startDate.getUTCDate()-n+1);const start=startDate.toISOString().slice(0,10);
  const se=validSessions.filter(s=>within(s.started_at,start)),ee=validEvents.filter(e=>within(e.created_at,start));
  const oo=paid.filter(o=>within(o.paid_at,start));
  const views=ee.filter(e=>e.event_type==='page_view'),unique=(xs:Row[],k:string)=>new Set(xs.map(x=>String(x[k]))).size;
  const sources=[...new Set(se.map(s=>String(s.source)))].map(source=>{
   const cohort=se.filter(s=>s.source===source),ids=new Set(cohort.map(s=>String(s.id)));
   const all=validEvents.filter(e=>ids.has(String(e.analytics_session_id)));
   const converted=new Set(paid.map(o=>String(liveCheckouts.get(String(o.session_id))?.session_id)).filter(id=>ids.has(id)));
   return {source,channel:trafficChannel(source,String(cohort[0]?.utm_medium||'')),sessions:cohort.length,signups:unique(all.filter(e=>e.event_type==='signup'),'analytics_session_id'),paid_sessions:converted.size,paid_session_rate:cohort.length?converted.size/cohort.length:null};
  });
  const landings=[...new Set(se.map(s=>String(s.landing_path)))].map(path=>({path,sessions:se.filter(s=>s.landing_path===path).length})).sort((a,b)=>b.sessions-a.sessions).slice(0,20);
  const channels=['Organic search','Social','AI referrals','Direct / unknown','Other referrals','Paid / other campaigns'].map(channel=>({channel,sessions:se.filter(s=>trafficChannel(String(s.source),String(s.utm_medium||''))===channel).length}));
  const ids=(o:Row)=>Array.isArray(o.product_ids)?o.product_ids as string[]:[];
  const campaigns=[...new Set(se.filter(s=>s.utm_campaign).map(s=>[s.utm_source,s.utm_campaign,s.utm_content].join('|')))].map(key=>{const cohort=se.filter(s=>[s.utm_source,s.utm_campaign,s.utm_content].join('|')===key);return {source:cohort[0].utm_source,campaign:cohort[0].utm_campaign,content:cohort[0].utm_content,sessions:cohort.length};});
  return [n,{start,end:today,visitors:unique(views,'visitor_id'),sessions:se.length,channels,landings,sources,campaigns,verified_signups:unique(ee.filter(e=>e.event_type==='signup'),'user_id'),game_starts:ee.filter(e=>e.event_type==='game_start').length,game_completions:ee.filter(e=>e.event_type==='game_complete').length,saved_completions:ee.filter(e=>e.event_type==='game_complete'&&e.evidence==='saved_result').length,live_checkouts_created:checkouts.filter(c=>c.livemode===true&&sessionMap.has(String(c.session_id))&&!excludedUsers.has(String(c.user_id))&&within(c.created_at,start)).length,pdf_checkout_clicks:ee.filter(e=>e.event_type==='checkout_click'&&e.detail==='PDF checkout').length,club_checkout_clicks:ee.filter(e=>e.event_type==='checkout_click'&&e.detail==='Club checkout').length,pdf_purchases:oo.filter(o=>!ids(o).some(id=>id.startsWith('club-'))).length,club_initial_purchases:oo.filter(o=>ids(o).some(id=>id.startsWith('club-'))).length,confirmed_initial_revenue_cents:oo.reduce((a,o)=>a+Number(o.amount_total),0),amazon_clicks:ee.filter(e=>e.event_type==='outbound'&&e.detail==='Amazon').length}];
 }));
 return {periods,timezone:'America/Indiana/Indianapolis',attributionSince:validSessions.map(s=>String(s.started_at)).sort()[0]||null,unreconciled_paid_orders:orders.filter(o=>o.status==='paid'&&!excludedUsers.has(String(o.user_id))&&!paid.includes(o)).length};
}
export async function growthReport(){
 const client=paymentAdmin(),since=new Date(Date.now()-32*86400000).toISOString();const truncated:string[]=[];
 async function rows(table:string,fields:string,timeField?:string){
  const all:Row[]=[];
  for(let offset=0;offset<10000;offset+=1000){let q=client.from(table).select(fields).order(timeField||'user_id');if(timeField)q=q.gte(timeField,since);const {data,error}=await q.range(offset,offset+999);if(error)throw Error('Growth report unavailable');all.push(...(data as unknown as Row[]));if(data.length<1000)return all;}
  truncated.push(table);return all;
 }
 const [sessions,events,orders,checkouts,accounts]=await Promise.all([
  rows('analytics_sessions','id,visitor_id,started_at,landing_path,source,utm_source,utm_medium,utm_campaign,utm_content,is_internal_test','started_at'),
  rows('platform_events','visitor_id,analytics_session_id,user_id,event_type,detail,evidence,created_at,is_internal_test','created_at'),
  rows('pdf_orders','session_id,user_id,product_ids,amount_total,currency,status,paid_at','paid_at'),
  rows('analytics_checkouts','checkout_id,user_id,session_id,livemode,created_at','created_at'),
  rows('analytics_accounts','user_id,is_internal_test')
 ]);
 let subscriptions:{status:string;active:number|null;cancelScheduled:number|null;complete:boolean}={status:'unavailable',active:null,cancelScheduled:null,complete:false};
 if(paymentLive())try{
  const stripe=stripeClient();let after:string|undefined,active=0,cancelScheduled=0,complete=false;
  for(let n=0;n<10;n++){
   const page=await stripe.subscriptions.list({status:'all',limit:100,...(after?{starting_after:after}:{})});
   for(const sub of page.data)if(sub.livemode&&sub.metadata.avk_type==='club-subscription-v1'&&!excludedSubscription(sub.metadata.avk_user_id,accounts)){
    if(sub.status==='active'){active++;if(sub.cancel_at_period_end)cancelScheduled++;}
   }
   if(!page.has_more){complete=true;break;}after=page.data.at(-1)?.id;
  }
  subscriptions={status:'live Stripe status snapshot',active,cancelScheduled,complete};
 }catch{/* Do not substitute zero for unavailable live billing. */}
 return {...aggregateGrowth(sessions,events,orders,checkouts,accounts),truncated,subscriptions,searchConsole:{status:'Not connected',impressions:null,clicks:null},limitations:['Only post-attribution sessions are included; older traffic remains in the legacy panels.','Confirmed revenue covers live mapped initial paid checkouts only; recurring renewals, unmapped legacy orders and Amazon sales are not included.','External video reach and retention require connected platform reports.']};
}
function excludedSubscription(user:unknown,accounts:Row[]){return accounts.some(a=>a.user_id===user&&a.is_internal_test);}
