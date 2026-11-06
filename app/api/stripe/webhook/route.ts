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
   if(['pdf-v1','club-prelaunch-v1'].includes(session.metadata?.avk_type||'')&&session.payment_status==='paid')await fulfillPdf(session.id);
  }
  if(event.type==='charge.refunded'||event.type==='charge.dispute.created'){
   const obj=event.data.object as Stripe.Charge|Stripe.Dispute;const id=typeof obj.payment_intent==='string'?obj.payment_intent:obj.payment_intent?.id;if(id)await revokeIntent(id);
  }
  return Response.json({received:true});
 }catch{return new Response('Please retry delivery',{status:500})}
}
