import {verifiedMember,memberReply,memberRedirect} from '../../../lib/auth/session';
import {accessDeniedPage} from '../../../lib/member-pages';
import {privateClubPage} from '../../../lib/private-club';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 auth.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 if(!auth.user)return memberRedirect('/admin/login',auth.headers);
 if(!auth.isAdmin)return memberReply(accessDeniedPage(),403,auth.headers);
 let startedAt:number|null=null;
 if(auth.client){try{const {data}=await auth.client.from('families').select('clock_started_at').eq('user_id',auth.user.id).maybeSingle();const value=Number(data?.clock_started_at);if(Number.isFinite(value)&&value>0)startedAt=value;}catch{}}
 return memberReply(privateClubPage(startedAt),200,auth.headers);
}
