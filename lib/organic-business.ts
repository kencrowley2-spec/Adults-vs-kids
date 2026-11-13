import {paymentAdmin,paymentLive,stripeClient} from './payments/server';
import {reportWindows,dateInZone} from './google-reporting';
type Row=Record<string,unknown>;
type Receipt={kind:'pdf'|'club-month'|'club-year';cents:number;paidAt:string};
export function isGoogleOrganic(session:Row){
 const source=String(session.source||'').toLowerCase(),medium=String(session.utm_medium||'').toLowerCase();
 if(medium&&medium!=='organic')return false;
 return source==='google'&&medium==='organic'||/(^|\.)google\.(?:com|ca|co\.uk|com\.au|de|fr|es|it|co\.in|co\.jp|co\.nz|com\.br|com\.mx)$/.test(source);
}
const unique=(rows:Row[],field:string)=>new Set(rows.map(r=>String(r[field]))).size;
export function aggregateOrganicBusiness(sessions:Row[],accounts:Row[],orders:Row[],checkouts:Row[],events:Row[],receipts:Map<string,Receipt>,days:number,now=new Date()){
 const windows=reportWindows(days,now,'America/Indiana/Indianapolis');
 const excluded=new Set(accounts.filter(a=>a.is_internal_test).map(a=>String(a.user_id)));
 const linkedExcluded=new Set(events.filter(e=>excluded.has(String(e.user_id))).map(e=>String(e.analytics_session_id)));
 const sessionMap=new Map(sessions.filter(s=>!s.is_internal_test&&!linkedExcluded.has(String(s.id))).map(s=>[String(s.id),s]));
 const mapped=new Map(checkouts.filter(c=>c.livemode===true&&!excluded.has(String(c.user_id))&&sessionMap.has(String(c.session_id))).map(c=>[String(c.checkout_id),c]));
 const revoked=new Set(orders.filter(o=>o.status!=='paid').map(o=>String(o.session_id)));
 const paid=[...new Map(orders.filter(o=>o.status==='paid'&&!revoked.has(String(o.session_id))&&o.currency==='usd'&&Number.isSafeInteger(o.amount_total)&&Number(o.amount_total)>0&&!excluded.has(String(o.user_id))&&mapped.get(String(o.session_id))?.user_id===o.user_id&&receipts.has(String(o.session_id))).map(o=>[String(o.session_id),o])).values()];
 const date=(v:unknown)=>{try{return dateInZone(new Date(String(v)),windows.timezone);}catch{return '';}};
 function period(range:{start:string;end:string}){
  const within=(v:unknown)=>{const d=date(v);return !!d&&d>=range.start&&d<=range.end;};
  const organic=[...sessionMap.values()].filter(isGoogleOrganic),cohort=organic.filter(s=>within(s.started_at)),ids=new Set(cohort.map(s=>String(s.id)));
  const organicIds=new Set(organic.map(s=>String(s.id)));
  const registrations=accounts.filter(a=>!a.is_internal_test&&organicIds.has(String(a.signup_session_id))&&within(a.signup_verified_at));
  const cohortRegistrations=new Set(accounts.filter(a=>!a.is_internal_test&&ids.has(String(a.signup_session_id))&&date(a.signup_verified_at)&&date(a.signup_verified_at)<=range.end).map(a=>String(a.signup_session_id)));
  const sales=paid.filter(o=>organicIds.has(String(mapped.get(String(o.session_id))?.session_id))&&within(receipts.get(String(o.session_id))!.paidAt));
  const cohortSales=paid.filter(o=>ids.has(String(mapped.get(String(o.session_id))?.session_id))&&date(receipts.get(String(o.session_id))!.paidAt)<=range.end);
  const paidSessions=new Set(cohortSales.map(o=>String(mapped.get(String(o.session_id))?.session_id)));
  const converted=new Set([...paidSessions,...cohortRegistrations]);
  const count=(kind:Receipt['kind'])=>sales.filter(o=>receipts.get(String(o.session_id))?.kind===kind).length;
  const landings=[...new Set(cohort.map(s=>String(s.landing_path)))].map(path=>({path,sessions:cohort.filter(s=>s.landing_path===path).length})).sort((a,b)=>b.sessions-a.sessions).slice(0,20);
  return {range,sessions:cohort.length,browsers:unique(cohort,'visitor_id'),verifiedRegistrations:unique(registrations,'user_id'),initialMonthly:count('club-month'),initialAnnual:count('club-year'),pdfPurchases:count('pdf'),revenueCents:sales.reduce((sum,o)=>sum+receipts.get(String(o.session_id))!.cents,0),amazonOutbound:events.filter(e=>!e.is_internal_test&&!excluded.has(String(e.user_id))&&organicIds.has(String(e.analytics_session_id))&&e.event_type==='outbound'&&e.detail==='Amazon'&&within(e.created_at)).length,registrationSessionRate:cohort.length?cohortRegistrations.size/cohort.length:null,paidSessionRate:cohort.length?paidSessions.size/cohort.length:null,conversionSessionRate:cohort.length?converted.size/cohort.length:null,landings,daily:[...new Set(cohort.map(s=>date(s.started_at)))].sort().map(d=>({date:d,sessions:cohort.filter(s=>date(s.started_at)===d).length}))};
 }
 return {current:period(windows.current),previous:period(windows.previous),windows,earliestSession:sessions.map(s=>String(s.started_at)).sort()[0]||null};
}
// A reporting read never calls fulfillment, changes access, or writes a payment record.
export async function reconcileOrder(order:Row,stripe=stripeClient()):Promise<Receipt|null>{
 const session=await stripe.checkout.sessions.retrieve(String(order.session_id),{expand:['payment_intent.latest_charge']});
 if(session.status!=='complete'||!session.livemode||session.payment_status!=='paid'||session.currency!=='usd'||session.amount_total!==order.amount_total||session.client_reference_id!==order.user_id)return null;
 let kind:Receipt['kind'];
 if(session.metadata?.avk_type==='pdf-v1'&&session.mode==='payment')kind='pdf';
 else if(session.metadata?.avk_type==='club-subscription-v1'&&session.mode==='subscription'&&['month','year'].includes(session.metadata.avk_plan||''))kind=session.metadata.avk_plan==='month'?'club-month':'club-year';
 else return null;
 const ids=Array.isArray(order.product_ids)?order.product_ids as string[]:[];
 if(kind==='pdf'&&(!ids.length||ids.some(id=>!['book-1','book-2','book-3','book-4','bundle'].includes(id))))return null;
 if(kind!=='pdf'&&(ids.length!==1||ids[0]!==kind))return null;
 let intent=session.payment_intent;
 if(kind!=='pdf'){
  const invoiceId=typeof session.invoice==='string'?session.invoice:session.invoice?.id;if(!invoiceId)return null;
  const invoice=await stripe.invoices.retrieve(invoiceId);if(invoice.status!=='paid'||invoice.amount_paid!==order.amount_total||invoice.currency!=='usd')return null;
  const payments=await stripe.invoicePayments.list({invoice:invoiceId,limit:10});
  const ref=payments.data.find(p=>p.status==='paid'&&p.payment.type==='payment_intent')?.payment.payment_intent;if(!ref)return null;
  intent=await stripe.paymentIntents.retrieve(typeof ref==='string'?ref:ref.id,{expand:['latest_charge']});
 }
 if(!intent||typeof intent==='string'||!intent.latest_charge||typeof intent.latest_charge==='string')return null;
 const charge=intent.latest_charge;
 if(!charge.paid||charge.disputed||charge.refunded||charge.amount_refunded>0||charge.currency!=='usd'||charge.amount<Number(order.amount_total))return null;
 return {kind,cents:Number(order.amount_total),paidAt:new Date(charge.created*1000).toISOString()};
}
export async function organicBusinessReport(days:number,now=new Date()){
 const windows=reportWindows(days,now,'America/Indiana/Indianapolis'),since=windows.previous.start+'T00:00:00Z',truncated:string[]=[];
 try{
  const client=paymentAdmin();
  async function rows(table:string,fields:string,time?:string){const result:Row[]=[];for(let offset=0;offset<20000;offset+=1000){let q=client.from(table).select(fields).order(time||'user_id');if(time)q=q.order(table==='analytics_checkouts'?'checkout_id':table==='pdf_orders'?'session_id':'id');if(time)q=q.gte(time,since);const r=await q.range(offset,offset+999);if(r.error)throw Error('Private reporting unavailable');result.push(...r.data as unknown as Row[]);if(r.data.length<1000)return result;}truncated.push(table);return result;}
  const [sessions,accounts,orders,checkouts,events]=await Promise.all([
   rows('analytics_sessions','id,visitor_id,started_at,landing_path,source,utm_medium,is_internal_test','started_at'),
   rows('analytics_accounts','user_id,signup_session_id,signup_verified_at,is_internal_test'),
   rows('pdf_orders','session_id,user_id,product_ids,amount_total,currency,status,paid_at','paid_at'),
   rows('analytics_checkouts','checkout_id,session_id,user_id,livemode','created_at'),
   rows('platform_events','id,event_type,detail,analytics_session_id,user_id,is_internal_test,created_at','created_at')
  ]);
  const receipts=new Map<string,Receipt>();let purchaseStatus='Not Yet Available',rejected=0;
  if(process.env.ORGANIC_STRIPE_RECONCILIATION==='true'&&paymentLive()){
   const eligible=[...new Map(orders.filter(o=>o.status==='paid'&&checkouts.some(c=>c.checkout_id===o.session_id&&c.user_id===o.user_id&&c.livemode===true)&&!accounts.some(a=>a.user_id===o.user_id&&a.is_internal_test)).map(o=>[String(o.session_id),o])).values()];
   purchaseStatus='Verified';if(eligible.length>50){truncated.push('Stripe receipt reconciliation (50-order cap)');purchaseStatus='Partial';}
   // Bounded parallel reads avoid long sequential requests and never change Stripe state.
   for(let n=0;n<Math.min(50,eligible.length);n+=5)await Promise.all(eligible.slice(n,n+5).map(async order=>{try{const receipt=await reconcileOrder(order);if(receipt)receipts.set(String(order.session_id),receipt);else rejected++;}catch{purchaseStatus='Partial';rejected++;}}));
  }
  const result=aggregateOrganicBusiness(sessions,accounts,orders,checkouts,events,receipts,days,now);
  if(purchaseStatus==='Not Yet Available')for(const period of [result.current,result.previous])Object.assign(period,{initialMonthly:null,initialAnnual:null,pdfPurchases:null,revenueCents:null,paidSessionRate:null,conversionSessionRate:null});
  return {status:'Connected' as const,...result,purchaseStatus,truncated,rejectedReceipts:rejected,giftBasket:{status:'Not Yet Available',reason:'Anonymous basket checkout has no durable organic-session mapping. No orders or revenue inferred.'},renewals:{status:'Not Yet Available',reason:'No complete renewal/refund/cancellation event ledger connected.'},note:'First-party Google referrer/campaign attribution, Indiana dates, excluding today. Verified registrations use original signup intent plus confirmation. Paid receipts are read-only live Stripe reconciliation, exclude any refund/dispute, and are deduplicated by checkout ID. Rates use eligible first-party session cohorts and conversions through the period end; GA4 sessions are a different denominator. Older sessions outside retrieved coverage, cross-device visits and missing cookies remain unattributed.'};
 }catch{return {status:'Not Yet Available' as const,reason:'Private first-party reporting could not be loaded. No figures inferred.',windows};}
}
