import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {checked} from '../../../../lib/data';
import {clubPlayers,cleanClubProfile} from '../../../../lib/club-profile';
export const dynamic='force-dynamic';
async function playersFor(auth:Awaited<ReturnType<typeof verifiedMember>>){
 const roster=checked(await auth.client!.from('family_rosters').select('adults,kids').eq('user_id',auth.user!.id).maybeSingle());
 const name=auth.user!.user_metadata?.full_name||auth.user!.user_metadata?.name||'Family Captain';
 return clubPlayers(typeof name==='string'?name:'Family Captain',roster);
}
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(!auth.isAdmin)return memberReply({error:'Private app preview access required.'},403,auth.headers);
 try{
  const players=await playersFor(auth);
  const profiles=checked(await auth.client.from('club_dashboard_profiles').select('profile_key,display_name,scene,headshot,backdrop').eq('user_id',auth.user.id));
  return memberReply({players,profiles:(profiles||[]).filter(p=>players.some(player=>player.key===p.profile_key))},200,auth.headers);
 }catch{return memberReply({error:'Your profiles are temporarily unavailable. Please try again.'},503,auth.headers);}
}
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(!auth.isAdmin)return memberReply({error:'Private app preview access required.'},403,auth.headers);
 if(request.headers.get('Origin')!==requestOrigin(request))return memberReply({error:'Invalid request origin.'},403,auth.headers);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return memberReply({error:'JSON required.'},415,auth.headers);
 let raw;try{const text=await request.text();if(text.length>430000)return memberReply({error:'Those photos are too large. Choose smaller images.'},413,auth.headers);raw=JSON.parse(text);}catch{return memberReply({error:'Check your profile.'},400,auth.headers);}
 try{
  const players=await playersFor(auth);let profile;
  try{profile=cleanClubProfile(raw,players);}catch(e){return memberReply({error:(e as Error).message},400,auth.headers);}
  checked(await auth.client.from('club_dashboard_profiles').upsert({...profile,user_id:auth.user.id,updated_at:new Date().toISOString()},{onConflict:'user_id,profile_key'}));
  return memberReply({saved:true,profile},200,auth.headers);
 }catch{return memberReply({error:'Your profile could not be saved. Please try again.'},503,auth.headers);}
}
