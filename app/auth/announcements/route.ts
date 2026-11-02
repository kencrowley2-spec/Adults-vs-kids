import {verifiedMember,memberReply} from '../../../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){const auth=await verifiedMember(request);if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);const result=await auth.client.from('admin_announcements').select('id,title,body').eq('status','published').order('updated_at',{ascending:false}).limit(1);if(result.error)return memberReply({error:'Announcements unavailable.'},503,auth.headers);return memberReply({announcements:result.data},200,auth.headers)}
