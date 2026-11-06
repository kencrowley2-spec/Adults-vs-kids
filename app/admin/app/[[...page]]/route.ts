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
 auth.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 return memberReply(clubPage(section),200,auth.headers);
}
