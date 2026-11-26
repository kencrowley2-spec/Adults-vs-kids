import {purchaseAnalytics} from '../../../../lib/analytics-server';
import Stripe from 'stripe';
import {fulfillPdf,paymentLive,revokeIntent,stripeClient} from '../../../../lib/payments/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const signature=request.headers.get('stripe-signature'),secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!secret)return new Response('Webhook unavailable',{status:503});if(!signature)return new Response('Signature required',{status:400});
 let event:Stripe.Event;
 try{const raw=await request.text();if(raw.length>1000000)return new Response('Too large',{status:413});event=stripeClient().webhooks.constructEvent(raw,signature,secret);}catch{return new Response('Invalid signature',{status:400})}
 if(event.livemode!==paymentLive())return new Response('Wrong payment mode',{status:400});
 try{
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
   const session=event.data.object as Stripe.Checkout.Session;
   if(session.metadata?.avk_type==='holiday-basket-2026'&&session.payment_status==='paid'){
    const {recordHolidayPayment}=await import('../../../../lib/holiday-fulfillment');
    await recordHolidayPayment(session.id);
   }
   if(['pdf-v1','pdf-guest-v1','club-prelaunch-v1','club-subscription-v1'].includes(session.metadata?.avk_type||'')&&session.payment_status==='paid'){await fulfillPdf(session.id);await purchaseAnalytics(session.id);}
  }
  if(event.type==='checkout.session.expired'){
   const expired=event.data.object;
   if(expired.metadata?.avk_type==='holiday-basket-2026'&&expired.metadata.avk_reservation&&expired.payment_status==='unpaid'){
    const {paymentAdmin}=await import('../../../../lib/payments/server');
    const released=await paymentAdmin().from('holiday_inventory').update({reservation:null}).eq('live',expired.livemode).eq('reservation',expired.metadata.avk_reservation).is('checkout_id',null);
    if(released.error)throw released.error;
   }
  }
  if(event.type==='charge.refunded'&&event.data.object.metadata?.avk_type==='holiday-basket-2026'){
   const {recordHolidayRefund}=await import('../../../../lib/holiday-fulfillment');
   await recordHolidayRefund(event.data.object);
   return Response.json({received:true});
  }
  if(event.type==='charge.refunded'||event.type==='charge.dispute.created'){
   const obj=event.data.object as Stripe.Charge|Stripe.Dispute;const id=typeof obj.payment_intent==='string'?obj.payment_intent:obj.payment_intent?.id;if(id)await revokeIntent(id);
  }
  return Response.json({received:true});
 }catch{return new Response('Please retry delivery',{status:500})}
}
