import {randomUUID} from 'node:crypto';
import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {paymentAdmin} from '../../../../lib/payments/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const auth=await verifiedMember(request),reply=(d:object,s=200)=>memberReply(d,s,auth.headers);
 if(!auth.user)return reply({error:'Sign in required.'},401);if(!auth.isAdmin)return reply({error:'Administrator access required.'},403);
 if(request.headers.get('origin')!==requestOrigin(request))return reply({error:'Invalid origin.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON required.'},415);
 try{const raw=await request.text();if(raw.length>100)return reply({error:'Too large.'},413);const {action}=JSON.parse(raw);if(!['start','end'].includes(action))return reply({error:'Invalid action.'},400);
 const secure=requestOrigin(request).startsWith('https:')?'; Secure':'';
 if(action==='end'){for(const name of ['avk_visitor','avk_visit'])auth.headers.append('Set-Cookie',`${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`);return reply({ended:true});}
 const run=randomUUID(),visitor=randomUUID();const {data,error}=await paymentAdmin().rpc('analytics_context',{p_input:{visitor,path:'/admin',utm:{source:'qa',medium:'internal',campaign:'avk_funnel_check'},internal:true,test_run:run}});if(error)throw error;
 auth.headers.append('Set-Cookie',`avk_visitor=${visitor}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
 auth.headers.append('Set-Cookie',`avk_visit=${data.id}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${secure}`);
 return reply({testRun:run});
 }catch{return reply({error:'QA setup temporarily unavailable.'},503);}
}
export async function GET(request:Request){
 const auth=await verifiedMember(request);if(!auth.isAdmin)return memberReply({error:'Administrator access required.'},403,auth.headers);
 try{const run=new URL(request.url).searchParams.get('run');if(!run||! /^[0-9a-f-]{36}$/i.test(run))return memberReply({error:'Valid test run required.'},400,auth.headers);
 const {data,error}=await paymentAdmin().from('platform_events').select('event_type,path,detail,evidence,is_internal_test,test_run_id,created_at').eq('test_run_id',run).order('created_at').limit(100);if(error)throw error;return memberReply({events:data},200,auth.headers);
 }catch{return memberReply({error:'QA records unavailable.'},503,auth.headers);}
}
