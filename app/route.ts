import html from '../site-html';
import {verifiedMember,memberReply} from '../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 const page=auth.user?html.replace('href="/signup" data-family-dashboard','href="/family" data-family-dashboard'):html;
 return memberReply(page,200,auth.headers);
}
