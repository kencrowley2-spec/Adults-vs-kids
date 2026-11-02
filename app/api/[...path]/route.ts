import {requestOrigin} from '../../../lib/request-origin';
import {verifiedMember,memberReply} from '../../../lib/auth/session';
import {checked} from '../../../lib/data';
import brand from '../../../config/brand.json';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const clean=(v:unknown,max=120)=>typeof v==='string'?v.trim().slice(0,max):'';
const grades=(score:number)=>score>=85?'A':score>=70?'B':score>=55?'C':score>=40?'D':'F';
export async function GET(request:Request){
 const path=new URL(request.url).pathname;
 if(path==='/api/impact')return json({connected:false,recordedBookUnits:null,estimatedSeconds:null,minutesPerBook:45});
 if(path==='/api/status')return json({clockStartedAt:brand.clockStartedAt,checkoutOpen:process.env.PDF_CHECKOUT_OPEN==='true',membershipsOpen:false,emailDelivery:process.env.AUTH_EMAIL_READY==='true'});
 if(path==='/api/legacy')return json({active:false,claimed:0,total:2000,note:'Enrollment is not open. No membership numbers have been issued.'});
 const auth=await verifiedMember(request),reply=(body:object,status=200)=>memberReply(body,status,auth.headers);
 try{
 if(path==='/api/me'){
 if(!auth.user||!auth.client)return reply({user:null});
 const d=auth.client,id=auth.user.id;
 const [family,quiz,play,track,interest]=await Promise.all([
 d.from('families').select('name,team_a,team_b,clock_started_at,marketing,created_at').eq('user_id',id).maybeSingle(),
 d.from('quizzes').select('id,answers,score,grade,age,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(30),
 d.rpc('family_play_totals'),
 d.from('progress').select('rounds').eq('user_id',id).maybeSingle(),
 d.from('legacy_interests').select('created_at').eq('user_id',id).maybeSingle()]);
 return reply({user:{email:auth.user.email},family:checked(family),quizzes:checked(quiz),play:checked(play),progress:checked(track)?.rounds??'[]',legacyInterest:!!checked(interest)});
 }
 if(path==='/api/founder-inbox'){
 if(!auth.isAdmin||!auth.client)return reply({error:'Founder access only.'},403);
 const d=auth.client;
 const [families,messages,interests,followups]=await Promise.all([
 d.from('families').select('user_id,name,email,marketing'),d.from('messages').select('*').order('created_at',{ascending:false}).limit(200),d.from('legacy_interests').select('*').order('created_at').limit(200),d.from('followups').select('*').order('due_at').limit(200)]);
 const profiles=new Map((checked(families)??[]).map(f=>[f.user_id,f]));
 const attach=(row:{user_id:string})=>({...row,name:profiles.get(row.user_id)?.name,email:profiles.get(row.user_id)?.email,marketing:profiles.get(row.user_id)?.marketing});
 return reply({messages:(checked(messages)??[]).map(attach),interests:(checked(interests)??[]).map(attach),followups:(checked(followups)??[]).map(attach)});
 }
 return reply({error:'Not found'},404);
 }catch{return reply({error:'We could not load your saved information. Please try again.'},503)}
}
export async function POST(request:Request){
 const url=new URL(request.url);
 if(request.headers.get('Origin')!==requestOrigin(request))return json({error:'Please submit from this website.'},403);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'JSON required'},415);
 const auth=await verifiedMember(request),reply=(body:object,status=200)=>memberReply(body,status,auth.headers);
 try{
 const raw=await request.text();if(raw.length>16000)return reply({error:'Request too large'},413);
 let data;try{data=JSON.parse(raw)}catch{return reply({error:'Invalid request'},400)}
 if(!data||typeof data!=='object'||Array.isArray(data))return reply({error:'Invalid request'},400);
 if(!auth.user||!auth.client)return reply({error:'Sign in to save this to your family account.'},401);
 const d=auth.client,user_id=auth.user.id,now=Date.now(),path=url.pathname;
 if(path==='/api/profile'){
 const name=clean(data.name,60);if(!name)return reply({error:'Enter a family display name.'},400);
 checked(await d.from('families').upsert({user_id,email:auth.user.email,name,team_a:clean(data.teamA,24)||'Team Adults',team_b:clean(data.teamB,24)||'Team Kids',marketing:data.marketing===true?1:0,updated_at:now}));return reply({saved:true});
 }
 const profile=checked(await d.from('families').select('user_id').eq('user_id',user_id).maybeSingle());
 if(!profile)return reply({error:'Create your free family profile first.'},409);
 if(path==='/api/clock'){
 checked(await d.from('families').update({clock_started_at:now,updated_at:now}).eq('user_id',user_id).is('clock_started_at',null));
 return reply(checked(await d.from('families').select('clock_started_at').eq('user_id',user_id).single())??{});
 }
 if(path==='/api/quiz'){
 if(!Array.isArray(data.answers)||data.answers.length!==6||!data.answers.every((a:unknown)=>Number.isInteger(a)&&Number(a)>=0&&Number(a)<=3)||!['4-7','8-12','13+'].includes(data.age))return reply({error:'Answer all six questions and choose an age group.'},400);
 const score=Math.round(data.answers.reduce((s:number,a:number)=>s+a,0)/18*100),grade=grades(score),id=crypto.randomUUID();
 const result=await d.from('quizzes').insert({id,user_id,answers:JSON.stringify(data.answers),score,grade,age:data.age,created_at:now});
 if(result.error?.code==='P0001')return reply({error:'You can take the Family Reality Check once every 30 days.'},429);
 checked(result);return reply({saved:true,id,score,grade});
 }
 if(path==='/api/session'){
 const seconds=Number(data.seconds),rounds=Number(data.rounds);
 if(!Number.isInteger(seconds)||seconds<1||seconds>28800||!Number.isInteger(rounds)||rounds<1||rounds>60||typeof data.id!=='string'||!/^[-\w]{10,80}$/.test(data.id))return reply({error:'Enter a valid game session.'},400);
 checked(await d.from('sessions').upsert({id:user_id+':'+data.id,user_id,seconds,rounds,created_at:now},{onConflict:'id',ignoreDuplicates:true}));return reply({saved:true});
 }
 if(path==='/api/progress'){
 if(!Array.isArray(data.rounds)||data.rounds.length>48||!data.rounds.every((x:unknown)=>typeof x==='string'&&/^[0-3]:(?:[1-9]|1[0-2])$/.test(x)))return reply({error:'Invalid progress'},400);
 checked(await d.from('progress').upsert({user_id,rounds:JSON.stringify([...new Set(data.rounds)]),updated_at:now}));return reply({saved:true});
 }
 if(path==='/api/legacy-interest'){checked(await d.from('legacy_interests').upsert({user_id,created_at:now},{onConflict:'user_id',ignoreDuplicates:true}));return reply({saved:true,message:'Interest saved. This does not reserve a spot or issue a membership number.'})}
 if(path==='/api/message'){
 const kind=clean(data.kind,20),body=clean(data.body,5000);
 if(!['founder','assistance','challenge','feedback'].includes(kind)||body.length<10)return reply({error:'Please write at least 10 characters.'},400);
 if(kind==='challenge'&&data.permission!==true)return reply({error:'Please confirm permission to review your challenge.'},400);
 const result=await d.from('messages').insert({id:crypto.randomUUID(),user_id,kind,body,permission:data.permission===true?1:0,created_at:now});
 if(result.error?.code==='P0001')return reply({error:'Please wait before submitting another message.'},429);
 checked(result);return reply({saved:true,message:'Your private message is saved for the founder to review.'});
 }
 if(path==='/api/checkout')return reply({error:'Checkout is not open yet. No payment was taken.'},503);
 return reply({error:'Not found'},404);
 }catch{return reply({error:'We could not save that. Please try again.'},503)}
}
export async function DELETE(request:Request){
 const auth=await verifiedMember(request),reply=(body:object,status=200)=>memberReply(body,status,auth.headers);
 try{
 if(new URL(request.url).pathname!=='/api/profile')return reply({error:'Not found'},404);
 if(request.headers.get('Origin')!==requestOrigin(request))return reply({error:'Invalid origin'},403);
 if(!auth.user||!auth.client)return reply({error:'Sign in first'},401);
 checked(await auth.client.from('families').delete().eq('user_id',auth.user.id));return reply({deleted:true});
 }catch{return reply({error:'Could not delete profile'},503)}
}
