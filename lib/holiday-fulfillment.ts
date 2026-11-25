import type Stripe from 'stripe';
import {holidayShipping,HOLIDAY_PRICE} from './holiday-shipping';
import {paymentAdmin,stripeClient,paymentLive} from './payments/server';

export async function recordHolidayPayment(id:string){
 const stripe=stripeClient();
 const session=await stripe.checkout.sessions.retrieve(id,{expand:['payment_intent.latest_charge']});
 if(session.metadata?.avk_type!=='holiday-basket-2026'||session.livemode!==paymentLive()||session.mode!=='payment'||session.payment_status!=='paid'||session.currency!=='usd')throw Error('Unverified basket');
 const intent=session.payment_intent;
 if(!intent||typeof intent==='string'||!intent.latest_charge||typeof intent.latest_charge==='string')throw Error('Charge verification pending');
 const charge=intent.latest_charge,shipping=session.shipping_cost?.amount_total;
 if(!charge.paid||shipping==null||session.amount_total!==HOLIDAY_PRICE+shipping||charge.amount!==session.amount_total)throw Error('Basket total mismatch');
 const address=session.collected_information?.shipping_details?.address;
 const zip=session.metadata.avk_zip,standard=holidayShipping(zip);
 const matches=address?.country==='US'&&address.postal_code?.slice(0,5)===zip&&shipping===(session.metadata.avk_offer==='holiday-free-shipping'?0:standard.cents);
 const db=paymentAdmin();
 // Older sessions have no reservation and need stock review before dispatch.
 const reservation=session.metadata.avk_reservation;
 let reserved=false;
 if(reservation){
  const attached=await db.from('holiday_inventory').update({checkout_id:id}).eq('live',session.livemode).eq('reservation',reservation).or('checkout_id.is.null,checkout_id.eq.'+id).select('unit');
  if(attached.error)throw attached.error;
  reserved=attached.data.length===1;
 }
 const row={checkout_id:id,payment_intent:intent.id,live:session.livemode,paid_cents:session.amount_total,shipping_cents:shipping,
  paid_at:new Date(charge.created*1000).toISOString(),fulfillment:matches&&reserved&&!charge.disputed&&!charge.amount_refunded?'ready_to_pack':'needs_review'};
 const result=await db.from('holiday_orders').upsert(row,{onConflict:'checkout_id',ignoreDuplicates:true});
 if(result.error)throw result.error;
}
export async function recordHolidayRefund(charge:Stripe.Charge){
 const intent=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
 if(!intent)return;
 // Fetch current state so an older refund notification cannot lower the known refund.
 const current=await stripeClient().charges.retrieve(charge.id);
 const result=await paymentAdmin().from('holiday_refunds').upsert({payment_intent:intent,refunded_cents:current.amount_refunded,disputed:current.disputed});
 if(result.error)throw result.error;
 const held=await paymentAdmin().from('holiday_orders').update({fulfillment:current.refunded?'cancelled':'needs_review'}).eq('payment_intent',intent).in('fulfillment',['ready_to_pack','packed','needs_review']);
 if(held.error)throw held.error;
}
