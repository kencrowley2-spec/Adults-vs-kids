import {verifiedMember} from '../../../../lib/auth/session';
import {internalTraffic} from '../../../../lib/analytics-policy';
import {googleMeasurementId} from '../../../../lib/google-measurement';
import {paymentAdmin} from '../../../../lib/payments/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const reply=(enabled:boolean,id:string|null=null)=>Response.json({enabled,measurementId:id},{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 const id=googleMeasurementId();if(!id||process.env.VERCEL_ENV!=='production')return reply(false);
 try{
  const auth=await verifiedMember(request);
  // Only consented, signed-out acquisition pages. Member/child activity remains first-party.
  if(!auth.client||auth.user||internalTraffic(auth.user,auth.isAdmin,request.headers.get('user-agent')||''))return reply(false);
  const cookie=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('avk_visit='))?.slice(10);
  if(cookie&&/^[a-f0-9-]{36}$/i.test(cookie)){
   const r=await paymentAdmin().from('analytics_sessions').select('is_internal_test').eq('id',cookie).maybeSingle();
   if(r.error||r.data?.is_internal_test)return reply(false);
  }
  return reply(true,id);
 }catch{return reply(false);}
}
