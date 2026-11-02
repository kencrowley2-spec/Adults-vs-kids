import {verifiedMember,memberReply} from '../../../lib/auth/session';
import {checked} from '../../../lib/data';
import {requestOrigin} from '../../../lib/request-origin';
export const dynamic='force-dynamic';
const sources={families:{table:'families',fields:'user_id,name,email,team_a,team_b,created_at,clock_started_at,marketing',sort:'created_at'},messages:{table:'messages',fields:'id,user_id,kind,body,permission,created_at',sort:'created_at'},waitlist:{table:'app_waitlist',fields:'name,email,created_at,consent_version',sort:'created_at'},interests:{table:'legacy_interests',fields:'user_id,created_at',sort:'created_at'},announcements:{table:'admin_announcements',fields:'id,title,body,status,created_at,updated_at',sort:'updated_at'},audit:{table:'admin_events',fields:'id,action,entity_id,details,created_at',sort:'created_at'}} as const;
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(!auth.isAdmin)return memberReply({error:'Administrator access required.'},403,auth.headers);
 try{
 const url=new URL(request.url),section=url.searchParams.get('section')||'overview';
 if(section==='overview'){
 const metrics=checked(await auth.client.rpc('admin_overview'));
 return memberReply({metrics,emailReady:process.env.AUTH_EMAIL_READY==='true',registrationOpen:process.env.AUTH_REGISTRATION_OPEN==='true',loadedAt:new Date().toISOString()},200,auth.headers);
 }
 if(!(section in sources))return memberReply({error:'Unknown section.'},400,auth.headers);
 const source=sources[section as keyof typeof sources];
 const page=Math.max(0,Math.min(100000,Number.parseInt(url.searchParams.get('page')||'0',10)||0));
 const q=(url.searchParams.get('q')||'').slice(0,80).replace(/[^\p{L}\p{N}@. _-]/gu,'');
 let query=auth.client.from(source.table).select(source.fields,{count:'exact'}).order(source.sort,{ascending:false}).range(page*25,page*25+24);
 if(q&&['families','waitlist'].includes(section))query=query.or(`name.ilike.%${q.replace(/_/g,'\\_')}%,email.ilike.%${q.replace(/_/g,'\\_')}%`);
 if(q&&section==='messages')query=query.ilike('body','%'+q.replace(/_/g,'\\_')+'%');
 if(q&&section==='announcements')query=query.ilike('title','%'+q.replace(/_/g,'\\_')+'%');
 const result=await query;let rows=checked(result) as unknown as Record<string,unknown>[];
 if(['messages','interests'].includes(section)&&rows.length){
 const ids=[...new Set(rows.map(r=>String(r.user_id)))];
 const profiles=checked(await auth.client.from('families').select('user_id,name,email').in('user_id',ids));
 const map=new Map((profiles||[]).map(p=>[p.user_id,p]));
 rows=rows.map(r=>({...r,name:map.get(String(r.user_id))?.name||'Family profile pending',email:map.get(String(r.user_id))?.email||''}));
 }
 if(section==='messages'&&rows.length){
 const reviews=checked(await auth.client.from('admin_message_reviews').select('message_id,status,note,updated_at').in('message_id',rows.map(r=>String(r.id))));
 const map=new Map((reviews||[]).map(r=>[r.message_id,r]));rows=rows.map(r=>({...r,review:map.get(String(r.id))||{status:'new',note:''}}));
 }
 return memberReply({rows,count:result.count||0,page,pageSize:25},200,auth.headers);
 }catch{return memberReply({error:'Could not load this section. Refresh to try again.'},503,auth.headers)}
}
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(!auth.isAdmin)return memberReply({error:'Administrator access required.'},403,auth.headers);
 const fail=(error:string,status=400)=>memberReply({error},status,auth.headers);
 if(request.headers.get('Origin')!==requestOrigin(request))return fail('Submit from this website.',403);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return fail('Use JSON.',415);
 try{
 const text=await request.text();if(text.length>10000)return fail('Request too large.',413);const data=JSON.parse(text);
 const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
 if(data.action==='review'){
 if(!uuid(data.id)||!['new','reviewed','archived'].includes(data.status)||typeof data.note!=='string'||data.note.length>1000)return fail('Check the review details.');
 checked(await auth.client.from('admin_message_reviews').upsert({message_id:data.id,status:data.status,note:data.note.trim(),updated_by:auth.user.id,updated_at:new Date().toISOString()}));
 return memberReply({message:'Review saved.'},200,auth.headers);
 }
 if(data.action==='announcement'){
 if(typeof data.title!=='string'||!data.title.trim()||data.title.length>100||typeof data.body!=='string'||!data.body.trim()||data.body.length>2000||!['draft','published','archived'].includes(data.status)||(data.id&&!uuid(data.id)))return fail('Enter a title and message within the limits.');
 const record={title:data.title.trim(),body:data.body.trim(),status:data.status,updated_at:new Date().toISOString(),created_by:auth.user.id};
 if(data.id)checked(await auth.client.from('admin_announcements').update(record).eq('id',data.id).select('id').single());
 else checked(await auth.client.from('admin_announcements').insert(record));
 return memberReply({message:data.status==='published'?'Announcement published to member dashboards.':'Announcement saved.'},200,auth.headers);
 }
 return fail('Unknown action.');
 }catch{return fail('Could not save. Refresh and try again.',400)}
}
