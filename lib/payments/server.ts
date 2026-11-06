import Stripe from 'stripe';
import {createClient} from '@supabase/supabase-js';
import {pdfCart,pdfProducts} from '../../config/pdfs';
import {paidOrder} from './policy';
import {paidClubOrder,clubPlan} from './club';
export function stripeClient(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error('Payments are being connected.');return new Stripe(key,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2,timeout:15000});}
export function paymentAdmin(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Download delivery is being connected.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export const paymentLive=()=>process.env.STRIPE_MODE==='live';
export const paymentsConfigured=()=>process.env.PDF_CHECKOUT_OPEN==='true'&&!!process.env.STRIPE_SECRET_KEY&&!!process.env.STRIPE_WEBHOOK_SECRET&&!!process.env.SUPABASE_SERVICE_ROLE_KEY;
export function paymentOrigin(){const value=process.env.PDF_SITE_ORIGIN||'https://adultsvskids.com';const u=new URL(value);if(u.protocol!=='https:'&&process.env.NODE_ENV==='production')throw new Error('Invalid payment origin');return u.origin;}
export async function availablePdfs(){
 const assets=new Set<string>();
 try{const {data,error}=await paymentAdmin().from('pdf_assets').select('book_id').eq('ready',true);if(error)throw error;for(const a of data??[])assets.add(a.book_id);}catch{/* Stay closed until private delivery is configured. */}
 return pdfProducts.map(p=>({...p,available:paymentsConfigured()&&!!process.env[p.priceEnv]&&p.books.every(b=>assets.has(b))}));
}
export async function fulfillPdf(sessionId:string){
 if(!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId))throw new Error('Invalid checkout session');
 const stripe=stripeClient(),session=await stripe.checkout.sessions.retrieve(sessionId,{expand:['payment_intent.latest_charge']});
 const isClub=session.metadata?.avk_type==='club-prelaunch-v1';
 const order=isClub?paidClubOrder(session,paymentLive()):paidOrder(session,paymentLive());
 const lines=await stripe.checkout.sessions.listLineItems(sessionId,{limit:10});
 if(isClub){
  const plan=clubPlan(session.metadata?.avk_plan),line=lines.data[0];
  if(!plan||lines.has_more||lines.data.length!==1||line.quantity!==1||line.price?.currency!=='usd'||line.price?.type!=='one_time'||line.price?.unit_amount!==plan.cents||line.amount_total!==plan.cents)throw new Error('Unexpected Club checkout items');
 }else{
  const expected=pdfCart(order.product_ids),prices=expected.map(p=>process.env[p.priceEnv]);
  if(lines.has_more||lines.data.length!==expected.length||lines.data.some(l=>l.quantity!==1||!l.price||!prices.includes(l.price.id)))throw new Error('Unexpected checkout items');
 }
 const intent=session.payment_intent;
 if(!intent||typeof intent==='string'||!intent.latest_charge||typeof intent.latest_charge==='string')throw new Error('Payment has not settled');
 const charge=intent.latest_charge;
 if(!charge.paid||charge.disputed||charge.amount_refunded>0||charge.refunded){
  const {error}=await paymentAdmin().from('pdf_orders').update({status:'revoked'}).eq('session_id',sessionId);if(error)throw error;
  throw new Error('This purchase has been refunded or disputed.');
 }
 const {error}=await paymentAdmin().from('pdf_orders').upsert({...order,status:'paid',payment_intent_id:intent.id,paid_at:new Date(session.created*1000).toISOString()},{onConflict:'session_id'});
 if(error)throw error;return order;
}
export async function revokeIntent(intent:string){const {error}=await paymentAdmin().from('pdf_orders').update({status:'revoked'}).eq('payment_intent_id',intent);if(error)throw error;}
