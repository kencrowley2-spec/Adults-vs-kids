import {verifiedMember,memberReply,memberRedirect} from '../../../lib/auth/session';
import {leaderboardPage} from '../../../lib/arcade/leaderboard-page';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberRedirect('/login',auth.headers);
 return memberReply(leaderboardPage(),200,auth.headers);
}
