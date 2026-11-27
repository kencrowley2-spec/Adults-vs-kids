import {orderOptions,delivery} from '../../../../lib/merch';
import {requestOrigin} from '../../../../lib/request-origin';
import {stripeClient,paymentLive,paymentOrigin} from '../../../../lib/payments/server';

export async function POST(request:Request) {
 if(request.headers.get('origin')!==requestOrigin(request)) return Response.json({error:'Return to the shop to check out.'},{status:403});
 if(!request.headers.get('content-type')?.includes('application/json')) return Response.json({error:'JSON required.'},{status:415});
 let order, email, intent;
 try {
  const body=await request.text();
  if(body.length>1800) throw new Error('Order too large.');
  const data=JSON.parse(body);
  order=orderOptions(data);
  email=String(data.email||'').trim();
  intent=String(data.intent||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200) throw new Error('Enter your receipt email.');
  if(!/^[a-f0-9-]{36}$/i.test(intent)) throw new Error('Please reopen the item.');
 } catch(e) {return Response.json({error:e instanceof SyntaxError?'Check your order.':(e as Error).message},{status:400});}
 try {
  const {item,size,front,back,amount}=order;
  const origin=paymentOrigin();
  const metadata={avk_type:'merch-v1',sku:item.id,color:item.color,size,front:front||(item.kind==='Team Tees'?item.name:'Original AVK logo'),back:back||'No back print'};
  const details=[item.color,size,item.kind==='Bundles'?'Stadium Stripe Tee + Two-Tone Patch Trucker':'',front?'Front: '+front:'',back?'Back: '+back:''].filter(Boolean).join(' • ');
  const stripe=stripeClient();
  const session=await stripe.checkout.sessions.create({
   mode:'payment',customer_email:email,
   shipping_address_collection:{allowed_countries:['US']},
   line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:Math.round(amount*100),product_data:{name:'AVK • '+item.name,description:details,metadata,images:[origin+'/assets/merch/'+(item.kind==='Bundles'?'stadium':item.id)+'.webp']}}}],
   metadata,payment_intent_data:{metadata,description:item.name+' • '+details+' • '+delivery,receipt_email:email},
   custom_text:{submit:{message:delivery}},success_url:origin+'/merch/confirmation?session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/merch?item='+item.id,
  },{idempotencyKey:'merch-'+intent});
  if(!session.url||session.livemode!==paymentLive())throw new Error('Payment mode mismatch');
  return Response.json({url:session.url});
 } catch { return Response.json({error:'Checkout is temporarily unavailable. Please try again.'},{status:503});}
}
