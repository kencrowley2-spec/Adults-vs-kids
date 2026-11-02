import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {completedResult,sameResult} from '../../../../lib/arcade/results';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 try{
  const [score,recent]=await Promise.all([
   auth.client.rpc('arcade_lifetime_score'),
   auth.client.from('arcade_results').select('id,mode,game_ids,adult_wins,kid_wins,winner,completed_at').eq('user_id',auth.user.id).order('completed_at',{ascending:false}).limit(5)
  ]);
  if(score.error||recent.error)throw new Error('Score unavailable');
  return memberReply({accountId:auth.user.id,score:score.data,recent:recent.data},200,auth.headers);
 }catch{return memberReply({error:'Your lifetime score is temporarily unavailable. Please retry.'},503,auth.headers);}
}
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(request.headers.get('Origin')!==requestOrigin(request))return memberReply({error:'Invalid request origin.'},403,auth.headers);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return memberReply({error:'JSON required.'},415,auth.headers);
 let result;
 try{
  const raw=await request.text();if(raw.length>2000)return memberReply({error:'Request too large.'},413,auth.headers);
  const data=JSON.parse(raw);
  if(data?.accountId!==auth.user.id)return memberReply({error:'This result belongs to a different signed-in account.'},403,auth.headers);
  result=completedResult(data);
 }catch{return memberReply({error:'Only completed Arcade matches and three-game series can be recorded.'},400,auth.headers);}
 try{
  const inserted=await auth.client.from('arcade_results').upsert({id:result.id,user_id:auth.user.id,mode:result.mode,game_ids:result.gameIds,round_winners:result.roundWinners},{onConflict:'id',ignoreDuplicates:true});
  if(inserted.error)throw new Error('Save failed');
  const existing=await auth.client.from('arcade_results').select('mode,game_ids,round_winners').eq('id',result.id).eq('user_id',auth.user.id).maybeSingle();
  if(existing.error)throw new Error('Read failed');
  if(!existing.data||!sameResult(existing.data,result))return memberReply({error:'This match ID already belongs to a different result.'},409,auth.headers);
  return memberReply({saved:true,id:result.id},200,auth.headers);
 }catch{return memberReply({error:'Result not saved yet. Please retry.'},503,auth.headers);}
}
