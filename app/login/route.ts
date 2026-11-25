import {accountDestination,purchaseLinks,gameFromRequest,accountGameLinks} from '../../lib/arcade-links';
const env = process.env;
import { loginPage } from '../../lib/member-pages';
import { verifiedMember,memberReply,memberRedirect } from '../../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){const purchase=new URL(request.url).searchParams.get("purchase");const auth=await verifiedMember(request);if(auth.user)return memberRedirect(accountDestination(gameFromRequest(request),purchase),auth.headers);const q=new URL(request.url).searchParams;const notice=q.has('verification')?'This verification link is invalid or has expired. Request a new email, or sign in if you have already verified.':q.has('updated')?'Your password was updated. Sign in with your new password.':'';return memberReply(purchaseLinks(accountGameLinks(loginPage('login',notice,env.AUTH_EMAIL_READY==='true'),gameFromRequest(request)).replace('</form>',q.has('verification')?'</form><p><a href="/verify-email">Request a new verification email</a></p>':'</form>'),purchase),200,auth.headers)}
