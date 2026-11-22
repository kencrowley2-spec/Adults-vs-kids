import {requestOrigin} from '../../../lib/request-origin';
import {verifiedMember,memberReply} from '../../../lib/auth/session';
import {checked} from '../../../lib/data';
import {cleanRoster} from '../../../lib/family-roster';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 try{
  const roster=checked(await auth.client.from('family_rosters').select('adults,kids,playing_adults,playing_kids,updated_at').eq('user_id',auth.user.id).maybeSingle());
  return memberReply({version:roster?.updated_at??null,roster:roster?{adults:roster.adults,kids:roster.kids,playingAdults:roster.playing_adults,playingKids:roster.playing_kids}:{adults:[],kids:[],playingAdults:[],playingKids:[]}},200,auth.headers);
 }catch{return memberReply({error:'Your roster is temporarily unavailable. Try again.'},503,auth.headers);}
}
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(request.headers.get('Origin')!==requestOrigin(request))return memberReply({error:'Invalid request origin.'},403,auth.headers);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return memberReply({error:'Invalid request.'},415,auth.headers);
 let roster, version;
 try{
  const body=await request.json();
  roster=cleanRoster(body);version=body.version;
  if(version!==undefined&&typeof version!=='string')throw new Error('Reload your roster.');
 }catch(error){return memberReply({error:error instanceof Error?error.message:'Check your roster names.'},400,auth.headers);}
 try{
  if(version!==undefined){
   const updated=checked(await auth.client.from('family_rosters').update({playing_adults:roster.playingAdults,playing_kids:roster.playingKids,updated_at:new Date().toISOString()}).eq('user_id',auth.user.id).eq('updated_at',version).select('user_id'));
   if(!updated?.length)return memberReply({error:'The roster changed. Reopen Choose Players to load the latest names.'},409,auth.headers);
  }else checked(await auth.client.from('family_rosters').upsert({user_id:auth.user.id,adults:roster.adults,kids:roster.kids,playing_adults:roster.playingAdults,playing_kids:roster.playingKids,updated_at:new Date().toISOString()},{onConflict:'user_id'}));
  return memberReply({saved:true,roster},200,auth.headers);
 }catch{return memberReply({error:'Could not save your roster. Please try again.'},503,auth.headers);}
}
