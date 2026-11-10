import {verifiedMember,memberReply,memberRedirect} from '../../../../lib/auth/session';
import {accessDeniedPage} from '../../../../lib/member-pages';
import {clubSections} from '../../../../lib/club-app';
import {privateClubPage} from '../../../../lib/private-club';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{page?:string[]}>}){
 const auth=await verifiedMember(request);
 auth.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 if(!auth.user)return memberRedirect('/admin/login',auth.headers);
 if(!auth.isAdmin)return memberReply(accessDeniedPage(),403,auth.headers);
 const {page=[]}=await context.params;const section=page[0]||'home';
 if(page.length>1||!clubSections.includes(section))return memberReply('Page not found',404,auth.headers);
 let startedAt:number|null=null;
 if(section==='home'&&auth.client){try{const {data}=await auth.client.from('families').select('clock_started_at').eq('user_id',auth.user.id).maybeSingle();const value=Number(data?.clock_started_at);if(Number.isFinite(value)&&value>0)startedAt=value;}catch{}}
 return memberReply(privateClubPage(startedAt,section),200,auth.headers);
}
