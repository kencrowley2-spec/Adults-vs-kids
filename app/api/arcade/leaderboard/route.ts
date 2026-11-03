import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {TIMED_GAMES,timedResult} from '../../../../lib/arcade/leaderboard';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 const game=new URL(request.url).searchParams.get('game')||'maze';
 if(!Object.hasOwn(TIMED_GAMES,game))return memberReply({error:'Unknown game.'},400,auth.headers);
 try{
  const [board,state,best]=await Promise.all([
   auth.client.from('arcade_leaderboard').select('place,user_id,family_name,elapsed_ms,achieved_at').eq('game',game).order('place').limit(100),
   auth.client.from('arcade_leaderboard_state').select('updated_at,next_update_at').eq('id',1).single(),
   auth.client.from('arcade_timed_results').select('elapsed_ms').eq('user_id',auth.user.id).eq('game',game).order('elapsed_ms').limit(1).maybeSingle(),
  ]);
  if(board.error||state.error||best.error)throw new Error('Unavailable');
  return memberReply({game,rows:board.data.map(({user_id,...row})=>({...row,yours:user_id===auth.user!.id})),...state.data,bestMs:best.data?.elapsed_ms??null},200,auth.headers);
 }catch{return memberReply({error:'Rankings are temporarily unavailable. Please retry.'},503,auth.headers);}
}
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(request.headers.get('Origin')!==requestOrigin(request))return memberReply({error:'Invalid request origin.'},403,auth.headers);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return memberReply({error:'JSON required.'},415,auth.headers);
 let result;
 try{
  const text=await request.text();if(text.length>1000)throw new Error('Too large');
  const raw=JSON.parse(text);if(raw.accountId!==auth.user.id)return memberReply({error:'Account mismatch.'},403,auth.headers);
  result=timedResult(raw);
 }catch{return memberReply({error:'Only successful completed timed runs qualify.'},400,auth.headers);}
 try{
  const saved=await auth.client.from('arcade_timed_results').upsert({id:result.id,user_id:auth.user.id,game:result.game,score:result.score,elapsed_ms:result.elapsedMs},{onConflict:'id',ignoreDuplicates:true});
  if(saved.error)throw new Error('Save failed');
  const existing=await auth.client.from('arcade_timed_results').select('game,score,elapsed_ms').eq('id',result.id).eq('user_id',auth.user.id).maybeSingle();
  if(existing.error)throw new Error('Read failed');
  if(!existing.data||existing.data.game!==result.game||existing.data.score!==result.score||existing.data.elapsed_ms!==result.elapsedMs)return memberReply({error:'Conflicting result.'},409,auth.headers);
  return memberReply({saved:true},200,auth.headers);
 }catch{return memberReply({error:'Timed record is waiting to save. Please retry.'},503,auth.headers);}
}
