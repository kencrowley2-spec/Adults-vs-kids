import {verifiedMember} from '../../../lib/auth/session';
import {requestOrigin} from '../../../lib/request-origin';
import {analyticsContext,emitAnalytics} from '../../../lib/analytics-server';
import {safePath,uuid} from '../../../lib/analytics-policy';
import {ARCADE_GAMES} from '../../../lib/arcade/results';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const headers=new Headers({'Cache-Control':'no-store'}),reply=(status=204)=>new Response(null,{status,headers});
 if(request.headers.get('origin')!==requestOrigin(request))return reply(403);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply(415);
 try{const raw=await request.text();if(raw.length>2500)return reply(413);let d;try{d=JSON.parse(raw)}catch{return reply(400)}
 if(!d||!uuid(d.id)||!['page_view','game_start','game_complete','tool_start','outbound','checkout_click','download_click','heartbeat'].includes(d.type)||safePath(d.path)!==d.path)return reply(400);
 const detail=typeof d.detail==='string'?d.detail:'';if(detail.length>80)return reply(400);
 if(['game_start','game_complete'].includes(d.type)&&!ARCADE_GAMES.concat(['faces','hexgl','series']).includes(detail))return reply(400);
 const auth=await verifiedMember(request);for(const cookie of auth.headers.getSetCookie())headers.append('Set-Cookie',cookie);
 const c=await analyticsContext(request,headers,auth.user,auth.isAdmin,d);
 if(d.type!=='heartbeat'){const ua=request.headers.get('user-agent')||'',device=/ipad|tablet/i.test(ua)?'Tablet':/mobi|android|iphone/i.test(ua)?'Mobile':'Desktop';await emitAnalytics(c.id,d.type,d.id,auth.user?.id||null,detail,d.path,device);}
 return reply();
 }catch{return reply(503);}
}
