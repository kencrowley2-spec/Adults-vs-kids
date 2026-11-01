const env = process.env;
import { loginPage } from '../../lib/member-pages';
import { verifiedMember,memberReply,memberRedirect } from '../../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){const auth=await verifiedMember(request);if(auth.user)return memberRedirect('/family',auth.headers);return memberReply(loginPage('signup','',env.AUTH_EMAIL_READY==='true'&&env.AUTH_REGISTRATION_OPEN==='true'),200,auth.headers)}
