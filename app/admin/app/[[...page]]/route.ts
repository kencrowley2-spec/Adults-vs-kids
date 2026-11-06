import {verifiedMember,memberReply,memberRedirect} from '../../../../lib/auth/session';
import {accessDeniedPage} from '../../../../lib/member-pages';
import {clubPage,clubSections} from '../../../../lib/club-app';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{page?:string[]}>}){
 const auth=await verifiedMember(request);
 if(!auth.user)return memberRedirect('/admin/login',auth.headers);
 if(!auth.isAdmin)return memberReply(accessDeniedPage(),403,auth.headers);
 const {page=[]}=await context.params;const section=page[0]||'home';
 if(page.length>1||!clubSections.includes(section))return memberReply('Page not found',404,auth.headers);
 let clockStartedAt:number|null=null;
 if(section==='home'&&auth.client){
  try{
   const result=await auth.client.from('families').select('clock_started_at').eq('user_id',auth.user.id).maybeSingle();
   const started=Number(result.data?.clock_started_at);
   if(!result.error&&Number.isFinite(started)&&started>0)clockStartedAt=started;
  }catch{/* Keep the dashboard available if the clock cannot be loaded. */}
 }
 auth.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 return memberReply(clubPage(section,clockStartedAt),200,auth.headers);
}
