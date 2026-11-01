import {loginPage} from '../../lib/member-pages';import {verifiedMember,memberReply,memberRedirect} from '../../lib/auth/session';
export const dynamic='force-dynamic';export async function GET(request:Request){const auth=await verifiedMember(request);if(!auth.user)return memberRedirect('/forgot-password',auth.headers);return memberReply(loginPage('reset','',true),200,auth.headers)}
