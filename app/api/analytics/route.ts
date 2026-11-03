import {randomUUID} from 'node:crypto';
import {verifiedMember} from '../../../lib/auth/session';
import {paymentAdmin} from '../../../lib/payments/server';
import {requestOrigin} from '../../../lib/request-origin';
import {ARCADE_GAMES} from '../../../lib/arcade/results';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const headers=new Headers({'Cache-Control':'no-store'}),reply=(status=204)=>new Response(null,{status,headers});
 if(request.headers.get('origin')!==requestOrigin(request))return reply(403);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply(415);
 if(/bot|crawler|spider|headless|preview/i.test(request.headers.get('user-agent')||''))return reply();
 try{
  const raw=await request.text();if(raw.length>1200)return reply(413);const d=JSON.parse(raw);
  const uuid=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
  if(!uuid(d.id)||!['page_view','game_start','tool_start','outbound','checkout_click','download_click'].includes(d.type)||typeof d.path!=='string'||!/^\/[a-zA-Z0-9/_-]{0,180}$/.test(d.path)||d.path.startsWith('/admin'))return reply(400);
  const detail=typeof d.detail==='string'?d.detail:'';
  if(detail.length>80)return reply(400);
  const auth=await verifiedMember(request);if(auth.isAdmin)return reply();
  if(d.type==='game_start'&&(!auth.user||!ARCADE_GAMES.includes(detail)))return reply(400);
  const cookies=Object.fromEntries((request.headers.get('cookie')||'').split(';').map(c=>{const i=c.indexOf('=');return [c.slice(0,i).trim(),c.slice(i+1)];}));
  const visitor=uuid(cookies.avk_visitor)?cookies.avk_visitor:randomUUID();
  const session=uuid(cookies.avk_visit)?cookies.avk_visit:randomUUID();
  const secure=requestOrigin(request).startsWith('https:')?'; Secure':'';
  headers.append('Set-Cookie',`avk_visitor=${visitor}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
  headers.append('Set-Cookie',`avk_visit=${session}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${secure}`);
  // Limit repeated refresh/click inflation to one event of each kind per minute.
  let referrer='Direct / unknown';try{if(typeof d.referrer==='string'&&d.referrer!=='Direct / unknown'){referrer=new URL('https://'+d.referrer).hostname.slice(0,253);if(referrer===new URL(requestOrigin(request)).hostname)referrer='Internal';}}catch{}
  const ua=request.headers.get('user-agent')||'';const device=/ipad|tablet/i.test(ua)?'Tablet':/mobi|android|iphone/i.test(ua)?'Mobile':'Desktop';
  const bucket=Math.floor(Date.now()/60000);
  const dedupe=d.type==='game_start'?d.id:[visitor,d.type,d.path,detail,bucket].join(':');
  const result=await paymentAdmin().from('platform_events').upsert({id:d.id,visitor_id:visitor,session_id:session,user_id:auth.user?.id||null,event_type:d.type,path:d.path,detail,referrer,device,dedupe_key:dedupe},{onConflict:'dedupe_key',ignoreDuplicates:true});
  if(result.error)return reply(503);return reply();
 }catch{return reply(503);}
}
