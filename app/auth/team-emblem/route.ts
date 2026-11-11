import {requestOrigin} from '../../../lib/request-origin';
import {verifiedMember,memberReply} from '../../../lib/auth/session';
import {checked} from '../../../lib/data';
import {cleanTeamEmblem} from '../../../lib/team-emblem';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in to save your team emblem.'},401,auth.headers);
 try{
  const profile=checked(await auth.client.from('families').select('team_emblem').eq('user_id',auth.user.id).maybeSingle());
  return memberReply({emblem:profile?.team_emblem||''},200,auth.headers);
 }catch{return memberReply({error:'Could not load your team emblem. Try again.'},503,auth.headers);}
}
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in to save your team emblem.'},401,auth.headers);
 if(request.headers.get('Origin')!==requestOrigin(request))return memberReply({error:'Invalid request origin.'},403,auth.headers);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return memberReply({error:'Invalid request.'},415,auth.headers);
 let emblem:string;
 try{
  const raw=await request.text();if(raw.length>91000)return memberReply({error:'Logo is too large.'},413,auth.headers);
  emblem=cleanTeamEmblem(JSON.parse(raw).emblem);
 }catch(error){return memberReply({error:error instanceof Error?error.message:'Choose your emblem.'},400,auth.headers);}
 try{
  const saved=checked(await auth.client.from('families').update({team_emblem:emblem,updated_at:Date.now()}).eq('user_id',auth.user.id).select('user_id').maybeSingle());
  if(!saved)return memberReply({error:'Create your family profile first.'},409,auth.headers);
  return memberReply({saved:true,emblem},200,auth.headers);
 }catch{return memberReply({error:'Could not save your emblem. Please try again.'},503,auth.headers);}
}
