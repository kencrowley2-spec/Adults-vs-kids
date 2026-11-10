import {paymentAdmin,paymentLive,stripeClient} from './server';
export async function clubSubscriptions(userId:string){
 const {data,error}=await paymentAdmin().from('pdf_orders').select('session_id').eq('user_id',userId).overlaps('product_ids',['club-month','club-year']);
 if(error)throw error;
 const stripe=stripeClient(),active=[];let legacy=false;
 for(const row of data??[]){
  const session=await stripe.checkout.sessions.retrieve(row.session_id);
  if(session.client_reference_id!==userId||session.livemode!==paymentLive())throw new Error('Invalid membership owner');
  if(session.metadata?.avk_type==='club-prelaunch-v1'){legacy=true;continue;}
  if(session.metadata?.avk_type!=='club-subscription-v1'||!session.subscription)continue;
  const sub=await stripe.subscriptions.retrieve(typeof session.subscription==='string'?session.subscription:session.subscription.id);
  if(sub.metadata.avk_user_id!==userId)throw new Error('Invalid subscription owner');
  if(!['canceled','incomplete_expired'].includes(sub.status))active.push(sub);
 }
 return {legacy,active};
}
