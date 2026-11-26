import {checkoutAnalytics} from '../../../../lib/analytics-server';
import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {pdfCart} from '../../../../config/pdfs';
import {allowGuestPdfCheckout,guestReceiptKey,saveGuestPdfCheckout} from '../../../../lib/payments/guest-pdf';
import {availablePdfs,paymentAdmin,paymentLive,paymentOrigin,stripeClient} from '../../../../lib/payments/server';

export const dynamic='force-dynamic';
const attemptPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function reserveMemberCheckout(userId:string,cart:string){
 const db=paymentAdmin(), since=new Date(Date.now()-3600000).toISOString();
 const {count,error}=await db.from('pdf_checkout_attempts').select('id',{count:'exact',head:true})
  .eq('user_id',userId).gte('created_at',since);
 if(error)throw error;
 if((count??0)>=20)return null;

 const saved=await db.from('pdf_checkout_attempts').insert({id:crypto.randomUUID(),user_id:userId});
 if(saved.error)throw saved.error;
 const {data,error:intentError}=await db.rpc('reserve_pdf_intent',{
  p_user:userId,p_cart:cart,p_live:paymentLive(),
 }).single<{intent_id:string;expires_at:string}>();
 if(intentError||!data)throw new Error('Checkout reservation unavailable');
 return {idempotencyKey:'avk-pdf-'+data.intent_id,expiresAt:Math.floor(Date.parse(data.expires_at)/1000)};
}

export async function POST(request:Request){
 const auth=await verifiedMember(request), reply=(data:object,status=200)=>memberReply(data,status,auth.headers);
 if(request.headers.get('origin')!==requestOrigin(request))return reply({error:'Please purchase from this website.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON required'},415);

 try{
  const raw=await request.text();
  if(raw.length>2000)return reply({error:'Request too large'},413);

  let products, attempt:unknown;
  try{
   const body=JSON.parse(raw);
   products=pdfCart(body.products);
   attempt=body.attempt;
  }catch{return reply({error:'Choose a valid PDF or bundle.'},400)}

  const available=await availablePdfs();
  if(products.some(p=>!available.find(x=>x.id===p.id)?.available))
   return reply({error:'These PDFs are not available for purchase yet. No payment was taken.'},503);

  products.sort((a,b)=>a.id.localeCompare(b.id));
  const ids=products.map(p=>p.id), cart=ids.join(',');
  const user=auth.user;
  let idempotencyKey:string, receiptKey:string|undefined, expiresAt:number|undefined;
  if(user){
   const reservation=await reserveMemberCheckout(user.id,cart);
   if(!reservation)return reply({error:'Please wait before starting another checkout.'},429);
   ({idempotencyKey,expiresAt}=reservation);
  }else{
   if(typeof attempt!=='string'||!attemptPattern.test(attempt))
    return reply({error:'Refresh the PDF store and try again.'},400);
   if(!await allowGuestPdfCheckout(request))return reply({error:'Please wait before starting another checkout.'},429);
   receiptKey=guestReceiptKey(attempt,cart);
   idempotencyKey='avk-pdf-guest-'+receiptKey;
  }

  const stripe=stripeClient(), items=[];
  for(const product of products){
   const price=await stripe.prices.retrieve(process.env[product.priceEnv]!);
   if(!price.active||price.type!=='one_time'||price.currency!=='usd'||price.unit_amount!==product.cents||price.livemode!==paymentLive())
    throw new Error('Price configuration');
   items.push({price:price.id,quantity:1});
  }

  const origin=paymentOrigin(), type=user?'pdf-v1':'pdf-guest-v1';
  const session=await stripe.checkout.sessions.create({
   mode:'payment',
   wallet_options:{link:{display:'never'}},
   ...(user?{client_reference_id:user.id,customer_email:user.email}:{}),
   line_items:items,
   metadata:{avk_type:type,avk_products:JSON.stringify(ids)},
   payment_intent_data:{metadata:{avk_type:type,...(user?{avk_user_id:user.id}:{})}},
   success_url:receiptKey?origin+'/downloads/receipt?key='+receiptKey:origin+'/family/downloads?session_id={CHECKOUT_SESSION_ID}',
   cancel_url:origin+'/downloads?cancelled=1',
   expires_at:expiresAt,
  },{idempotencyKey});
  if(!session.url)throw new Error('Missing checkout');
  if(receiptKey)await saveGuestPdfCheckout(receiptKey,session.id);
  await checkoutAnalytics(request,auth.headers,user,auth.isAdmin,session.id,session.livemode);
  return reply({url:session.url});
 }catch{return reply({error:'Checkout is temporarily unavailable. Please try again.'},503)}
}
