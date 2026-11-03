import html from '../site-html';
import {verifiedMember,memberReply,memberRedirect} from '../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(auth.user)return memberRedirect('/family',auth.headers);
 return memberReply(html,200,auth.headers);
}
