import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {stripeClient,paymentOrigin} from '../../../../lib/payments/server';
import {clubSubscriptions} from '../../../../lib/payments/subscriptions';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const auth=await verifiedMember(request),reply=(body:object,status=200)=>memberReply(body,status,auth.headers);
 if(request.headers.get('origin')!==requestOrigin(request))return reply({error:'Invalid origin'},403);
 if(!auth.user)return reply({error:'Sign in to manage your membership.'},401);
 try{
  const {active}=await clubSubscriptions(auth.user.id),sub=active[0];
  if(!sub)return reply({error:'No recurring Club membership found. For an earlier one-time purchase, contact kencrowley2@gmail.com.'},404);
  const stripe=stripeClient();
  const configuration=await stripe.billingPortal.configurations.create({business_profile:{headline:'Manage your Adults vs. Kids Club membership'},features:{customer_update:{enabled:true,allowed_updates:['email']},invoice_history:{enabled:true},payment_method_update:{enabled:true},subscription_cancel:{enabled:true,mode:'at_period_end',proration_behavior:'none'}}},{idempotencyKey:'avk-club-portal-recurring-v1'});
  const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
  const portal=await stripe.billingPortal.sessions.create({customer,configuration:configuration.id,return_url:paymentOrigin()+'/family/downloads'});
  return reply({url:portal.url});
 }catch{return reply({error:'Billing management is temporarily unavailable. Please try again or contact kencrowley2@gmail.com.'},503);}
}
