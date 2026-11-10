import {requestOrigin} from '../../../../lib/request-origin';
import {stripeClient} from '../../../../lib/payments/server';
import {previousHolidaySession,holidayReply} from '../../../../lib/holiday-payments';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(request.headers.get('origin')!==requestOrigin(request))return holidayReply({error:'Please return to the website.'},403);
 try{
  const session=await previousHolidaySession(request);
  if(!session||session.payment_status==='paid'||session.metadata?.avk_offer!=='standard')return holidayReply({eligible:false});
  // Retire the paid-shipping session before offering the replacement, avoiding two payable checkouts.
  if(session.status==='open')await stripeClient().checkout.sessions.expire(session.id);
  else if(session.status!=='expired')return holidayReply({eligible:false});
  return holidayReply({eligible:true,zip:session.metadata.avk_zip});
 }catch{return holidayReply({eligible:false});}
}
