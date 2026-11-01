const env = process.env;
import { loginPage } from '../../lib/member-pages';
import { verifiedMember,memberReply,memberRedirect } from '../../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){const auth=await verifiedMember(request);if(auth.user)return memberRedirect('/family',auth.headers);const q=new URL(request.url).searchParams;const notice=q.has('verification')?'This verification link is invalid or has expired. Request a new email, or sign in if you have already verified.':q.has('updated')?'Your password was updated. Sign in with your new password.':'';return memberReply(loginPage('login',notice,env.AUTH_EMAIL_READY==='true'),200,auth.headers)}
