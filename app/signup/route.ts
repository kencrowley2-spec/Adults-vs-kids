import {accountDestination,purchaseLinks,gameFromRequest,accountGameLinks} from '../../lib/arcade-links';
const env = process.env;
import { loginPage } from '../../lib/member-pages';
import { verifiedMember,memberReply,memberRedirect } from '../../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){const purchase=new URL(request.url).searchParams.get("purchase");const auth=await verifiedMember(request);if(auth.user)return memberRedirect(accountDestination(gameFromRequest(request),purchase),auth.headers);return memberReply(purchaseLinks(accountGameLinks(loginPage('signup','',env.AUTH_EMAIL_READY==='true'&&env.AUTH_REGISTRATION_OPEN==='true'),gameFromRequest(request)),purchase),200,auth.headers)}
