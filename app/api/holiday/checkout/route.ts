import {requestOrigin} from '../../../../lib/request-origin';
import {stripeClient,paymentLive,paymentOrigin,paymentsConfigured} from '../../../../lib/payments/server';
import {holidayShipping,HOLIDAY_PRICE} from '../../../../lib/holiday-shipping';
import {HOLIDAY_TYPE,holidayCookie,holidayReply,previousHolidaySession} from '../../../../lib/holiday-payments';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(request.headers.get('origin')!==requestOrigin(request))return holidayReply({error:'Please purchase from this website.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return holidayReply({error:'JSON required.'},415);
 try{
  const raw=await request.text();if(raw.length>1000)return holidayReply({error:'Request too large.'},413);
  const data=JSON.parse(raw);let quote;try{quote=holidayShipping(data.zip);}catch(e){return holidayReply({error:(e as Error).message},400);}
  if(!paymentsConfigured())return holidayReply({error:'Checkout is temporarily unavailable. No payment was taken. Please try again shortly.'},503);
  const stripe=stripeClient();let recoveryId='';
  if(data.recovery===true){
   const original=await previousHolidaySession(request);
   if(!original||original.payment_status==='paid'||original.metadata?.avk_offer!=='standard'||original.metadata?.avk_zip!==quote.zip||original.status!=='expired')return holidayReply({error:'This holiday offer is no longer available. Please start a new checkout.'},409);
   recoveryId=original.id;
  }else{
   const previous=await previousHolidaySession(request);
   if(previous?.status==='open'&&previous.metadata?.avk_zip===quote.zip&&previous.metadata?.avk_offer==='standard'&&previous.url)return holidayReply({url:previous.url},200,holidayCookie(previous.id));
   if(previous?.status==='open')await stripe.checkout.sessions.expire(previous.id);
  }
  const shipping=recoveryId?0:quote.cents;
  const metadata={avk_type:HOLIDAY_TYPE,avk_offer:recoveryId?'holiday-free-shipping':'standard',avk_zip:quote.zip,avk_shipping_cents:String(shipping),...(recoveryId?{avk_original_session:recoveryId}:{})};
  const origin=paymentOrigin();
  const session=await stripe.checkout.sessions.create({mode:'payment',wallet_options:{link:{display:'never'}},
   line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:HOLIDAY_PRICE,product_data:{name:'ADULTS vs. KIDS Holiday Championship Gift Basket',description:'All four paperback books, trophy, championship certificate, reusable scoreboard, champion stickers and printable holiday pack.',images:[origin+'/assets/holiday-gift-basket-960.webp'],metadata:{avk_type:HOLIDAY_TYPE}}}}],
   shipping_address_collection:{allowed_countries:['US']},
   shipping_options:[{shipping_rate_data:{type:'fixed_amount',fixed_amount:{amount:shipping,currency:'usd'},display_name:recoveryId?'Happy Holidays — shipping on us!':'Estimated shipping • ZIP '+quote.zip}}],
   custom_text:{shipping_address:{message:'Please use delivery ZIP '+quote.zip+'. Shipping is a merchant estimate based on that ZIP, charged as shown. Gift basket appearance may vary.'},submit:{message:'One-time gift basket purchase. No subscription. Your shipping address and order will be saved securely in Stripe.'}},
   metadata,payment_intent_data:{metadata},success_url:origin+'/holiday-gift-basket?success=1',cancel_url:origin+'/holiday-gift-basket?cancelled=1',...(recoveryId?{}:{expires_at:Math.floor(Date.now()/1000)+1800}),
  },{idempotencyKey:recoveryId?'avk-holiday-recovery-'+recoveryId:'avk-holiday-'+crypto.randomUUID()});
  if(!session.url||session.livemode!==paymentLive())throw new Error('Checkout configuration');
  return holidayReply({url:session.url},200,holidayCookie(session.id));
 }catch(e){const error=e as {type?:string;code?:string};console.error('Holiday checkout unavailable',{type:error.type||'service',code:error.code||'configuration'});return holidayReply({error:'Checkout is temporarily unavailable. No payment was taken. Please try again shortly.'},503);}
}
