import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {fulfillPdf,stripeClient} from '../../../../lib/payments/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const auth=await verifiedMember(request),reply=(d:object,s=200)=>memberReply(d,s,auth.headers);
 if(request.headers.get('origin')!==requestOrigin(request))return reply({error:'Invalid origin'},403);
 if(!auth.user)return reply({error:'Sign in required.'},401);
 try{const raw=await request.text();if(raw.length>1000)return reply({error:'Invalid request'},400);const {session_id}=JSON.parse(raw);if(typeof session_id!=='string'||!/^cs_[A-Za-z0-9_]{10,200}$/.test(session_id))return reply({error:'Invalid purchase'},400);
 const session=await stripeClient().checkout.sessions.retrieve(session_id);if(session.client_reference_id!==auth.user.id)return reply({error:'Purchase not found.'},404);
 await fulfillPdf(session_id);return reply({paid:true});
 }catch{return reply({error:'We could not confirm this payment yet. Your PDFs will appear after payment is confirmed. Refresh to check again.'},409)}
}
