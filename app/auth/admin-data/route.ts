import {verifiedMember,memberReply} from '../../../lib/auth/session';
import {checked} from '../../../lib/data';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(!auth.isAdmin)return memberReply({error:'Administrator access required.'},403,auth.headers);
 try{
 const client=auth.client;
 const tables=['families','messages','legacy_interests','sessions','app_waitlist'];
 const counts=await Promise.all(tables.map(t=>client.from(t).select('*',{count:'exact',head:true})));
 for(const result of counts)checked(result);
 const [families,messages,interests,waitlist]=await Promise.all([
 client.from('families').select('user_id,name,email'),
 client.from('messages').select('user_id,kind,body,permission,created_at').order('created_at',{ascending:false}).limit(100),
 client.from('legacy_interests').select('user_id,created_at').order('created_at',{ascending:false}).limit(100),
 client.from('app_waitlist').select('name,email,created_at').order('created_at',{ascending:false}).limit(200)]);
 const profiles=new Map((checked(families)??[]).map(f=>[f.user_id,f]));
 const attach=(row:{user_id:string})=>({...row,name:profiles.get(row.user_id)?.name,email:profiles.get(row.user_id)?.email});
 return memberReply({waitlist:checked(waitlist),counts:counts.map(c=>c.count??0),messages:(checked(messages)??[]).map(attach),interests:(checked(interests)??[]).map(attach),emailReady:process.env.AUTH_EMAIL_READY==='true',registrationOpen:process.env.AUTH_REGISTRATION_OPEN==='true'},200,auth.headers);
 }catch{return memberReply({error:'Could not load administration data.'},503,auth.headers)}
}
