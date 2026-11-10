import {checkoutAnalytics} from '../../../../lib/analytics-server';
import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {pdfCart} from '../../../../config/pdfs';
import {availablePdfs,paymentAdmin,paymentLive,paymentOrigin,stripeClient} from '../../../../lib/payments/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const auth=await verifiedMember(request),reply=(data:object,status=200)=>memberReply(data,status,auth.headers);
 if(request.headers.get('origin')!==requestOrigin(request))return reply({error:'Please purchase from this website.'},403);
 if(!auth.user)return reply({error:'Sign in to save this purchase and its PDFs to your account.',signIn:'/login'},401);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON required'},415);
 try{
  const raw=await request.text();if(raw.length>2000)return reply({error:'Request too large'},413);
  let products;try{products=pdfCart(JSON.parse(raw).products)}catch{return reply({error:'Choose a valid PDF or bundle.'},400)}
  const available=await availablePdfs();if(products.some(p=>!available.find(x=>x.id===p.id)?.available))return reply({error:'These PDFs are not available for purchase yet. No payment was taken.'},503);
  const stripe=stripeClient(),items=[];
  for(const p of products){const price=await stripe.prices.retrieve(process.env[p.priceEnv]!);if(!price.active||price.type!=='one_time'||price.currency!=='usd'||price.unit_amount!==p.cents||price.livemode!==paymentLive())throw new Error('Price configuration');items.push({price:price.id,quantity:1});}
  // A short server-side record limits retries. Only this server may write orders.
  const db=paymentAdmin(),since=new Date(Date.now()-3600000).toISOString();
  const {count,error}=await db.from('pdf_checkout_attempts').select('id',{count:'exact',head:true}).eq('user_id',auth.user.id).gte('created_at',since);
  if(error)throw error;if((count??0)>=20)return reply({error:'Please wait before starting another checkout.'},429);
  const attempt=crypto.randomUUID();const saved=await db.from('pdf_checkout_attempts').insert({id:attempt,user_id:auth.user.id});if(saved.error)throw saved.error;
  const origin=paymentOrigin();
  // Keep the standard payment choices while hiding Link express checkout and enrollment.
  const session=await stripe.checkout.sessions.create({mode:'payment',wallet_options:{link:{display:'never'}},client_reference_id:auth.user.id,customer_email:auth.user.email,line_items:items,metadata:{avk_type:'pdf-v1',avk_products:JSON.stringify(products.map(p=>p.id))},payment_intent_data:{metadata:{avk_type:'pdf-v1',avk_user_id:auth.user.id}},success_url:origin+'/family/downloads?session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/downloads?cancelled=1',expires_at:Math.floor(Date.now()/1000)+1800},{idempotencyKey:'avk-pdf-'+attempt});
  if(!session.url)throw new Error('Missing checkout');await checkoutAnalytics(request,auth.headers,auth.user,auth.isAdmin,session.id,session.livemode);return reply({url:session.url});
 }catch{return reply({error:'Checkout is temporarily unavailable. Please try again.'},503)}
}
