import {memberPage} from '../../lib/member-pages';
import {verifiedMember,memberReply,memberRedirect} from '../../lib/auth/session';
import {isFoundingMember} from '../../lib/auth/founding';
import {checked} from '../../lib/data';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberRedirect('/login',auth.headers);
 try{
 let profile=checked(await auth.client.from('families').select('name,clock_started_at').eq('user_id',auth.user.id).maybeSingle());
 if(!profile){
 const name=typeof auth.user.user_metadata?.family_name==='string'?auth.user.user_metadata.family_name.trim().slice(0,60):'Your family';
 checked(await auth.client.from('families').upsert({user_id:auth.user.id,email:auth.user.email,name:name||'Your family',team_a:'Team Adults',team_b:'Team Kids',clock_started_at:Date.now()},{onConflict:'user_id',ignoreDuplicates:true}));
 profile=checked(await auth.client.from('families').select('name,clock_started_at').eq('user_id',auth.user.id).single());
 }
 if(profile?.clock_started_at==null){
 checked(await auth.client.from('families').update({clock_started_at:Date.now()}).eq('user_id',auth.user.id).is('clock_started_at',null));
 profile=checked(await auth.client.from('families').select('name,clock_started_at').eq('user_id',auth.user.id).single());
 }
 return memberReply(memberPage(profile?.name??'Your family',false,typeof auth.user.user_metadata?.display_name==='string'?auth.user.user_metadata.display_name.trim().slice(0,40):'',profile?.clock_started_at??null,isFoundingMember(auth.user)),200,auth.headers);
 }catch{return memberReply('Your family profile is temporarily unavailable. Please try again.',503,auth.headers)}
}
