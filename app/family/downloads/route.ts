import {verifiedMember,memberReply,memberRedirect} from '../../../lib/auth/session';
import {pdfPage} from '../../../lib/pdf-pages';
export const dynamic='force-dynamic';
export async function GET(request:Request){const auth=await verifiedMember(request);if(!auth.user)return memberRedirect('/login',auth.headers);auth.headers.set('Referrer-Policy','no-referrer');return memberReply(pdfPage(true),200,auth.headers);}
