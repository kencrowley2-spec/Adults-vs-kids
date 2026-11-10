import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {availablePdfs,paymentAdmin,paymentOrigin,paymentLive,stripeClient} from '../../../../lib/payments/server';
import {clubSubscriptions} from '../../../../lib/payments/subscriptions';
import {clubPlan,clubTerms} from '../../../../lib/payments/club';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const auth=await verifiedMember(request),reply=(body:object,status=200)=>memberReply(body,status,auth.headers);
 if(request.headers.get('origin')!==requestOrigin(request))return reply({error:'Please purchase from this website.'},403);
 if(!auth.user?.email)return reply({error:'Sign in or create your free family account first. Then return here to start your Club membership.'},401);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON required'},415);
 try{
  const raw=await request.text();if(raw.length>1000)return reply({error:'Invalid request.'},400);
  const data=JSON.parse(raw),plan=clubPlan(data.plan);if(!plan||data.accepted!==true)return reply({error:'Choose a plan and accept automatic renewal terms.'},400);
  const products=await availablePdfs();if(!paymentLive()||!products.find(p=>p.id==='bundle')?.available)return reply({error:'Club checkout is being connected. No payment has been taken.'},503);
  const db=paymentAdmin();
  const existing=await db.from('pdf_orders').select('session_id').eq('user_id',auth.user.id).eq('status','paid').overlaps('product_ids',['club-month','club-year']).limit(1);
  if(existing.error)throw existing.error;
  if(existing.data?.length){
   const subscriptions=await clubSubscriptions(auth.user.id);
   if(subscriptions.legacy||subscriptions.active.length)return reply({error:'Your Club membership is already saved. Use Manage membership for billing or contact Ken about an earlier prelaunch purchase.',library:'/family/downloads'},409);
  }
  const since=new Date(Date.now()-3600000).toISOString(),attempts=await db.from('pdf_checkout_attempts').select('id',{count:'exact',head:true}).eq('user_id',auth.user.id).gte('created_at',since);
  if(attempts.error)throw attempts.error;if((attempts.count??0)>=20)return reply({error:'Please wait before starting another checkout.'},429);
  const attempt=crypto.randomUUID();const saved=await db.from('pdf_checkout_attempts').insert({id:attempt,user_id:auth.user.id});if(saved.error)throw saved.error;
  const origin=paymentOrigin(),setup=origin+'/clubhouse-setup/download';
  const metadata={avk_type:'club-subscription-v1',avk_plan:data.plan,avk_terms:'recurring-v1',avk_user_id:auth.user.id};
  const session=await stripeClient().checkout.sessions.create({mode:'subscription',wallet_options:{link:{display:'never'}},customer_email:auth.user.email,client_reference_id:auth.user.id,
   line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:plan.cents,recurring:{interval:plan.interval},product_data:{name:plan.title,description:clubTerms,metadata:{avk_type:'club-subscription-v1',avk_plan:data.plan}}}}],metadata,
   subscription_data:{metadata,description:plan.title+'. Clubhouse setup: '+setup},
   custom_text:{submit:{message:clubTerms+' Your books and Clubhouse setup are available in your family account after payment.'}},
   success_url:origin+'/family/downloads?session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/club-checkout?plan='+data.plan+'&cancelled=1',expires_at:Math.floor(Date.now()/1000)+1800},{idempotencyKey:'avk-club-'+attempt});
  if(!session.url)throw new Error('Missing checkout URL');return reply({url:session.url});
 }catch(error){const e=error as {type?:string;code?:string};console.error('Club checkout unavailable',{type:e.type||'service',code:e.code||'configuration'});return reply({error:'Club checkout is temporarily unavailable. No payment was taken. Please try again shortly.'},503);}
}
