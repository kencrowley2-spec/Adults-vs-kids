import html from '../site-html';
import {verifiedMember,memberReply} from '../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 return memberReply(html,200,auth.headers);
}
