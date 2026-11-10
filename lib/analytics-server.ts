import {randomUUID} from 'node:crypto';
import {paymentAdmin} from './payments/server';
import {requestOrigin} from './request-origin';
import {attribution,internalTraffic,safePath,uuid} from './analytics-policy';
type Identity={id:string;app_metadata?:Record<string,unknown>}|null;
export async function analyticsContext(request:Request,headers:Headers,user:Identity=null,isAdmin=false,raw:unknown={}){
 const origin=requestOrigin(request),ua=request.headers.get('user-agent')||'';
 const cookies=Object.fromEntries((request.headers.get('cookie')||'').split(';').map(c=>{const i=c.indexOf('=');return [c.slice(0,i).trim(),c.slice(i+1)];}));
 const d=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const {referrer,utm}=attribution(d,origin);
 const {data,error}=await paymentAdmin().rpc('analytics_context',{p_input:{visitor:uuid(cookies.avk_visitor)?cookies.avk_visitor:randomUUID(),session:uuid(cookies.avk_visit)?cookies.avk_visit:null,path:safePath(d.path??new URL(request.url).pathname),referrer,utm,internal:internalTraffic(user,isAdmin,ua)}});
 if(error||!data)throw new Error('Analytics context unavailable');
 const secure=origin.startsWith('https:')?'; Secure':'';
 headers.append('Set-Cookie',`avk_visitor=${data.visitor_id}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
 headers.append('Set-Cookie',`avk_visit=${data.id}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${secure}`);
 return data as {id:string;visitor_id:string;is_internal_test:boolean;test_run_id:string|null};
}
export async function emitAnalytics(session:string,type:string,id:string,user:string|null,detail='',path='/',device='Desktop',evidence='browser'){
 const r=await paymentAdmin().rpc('analytics_event',{p_session:session,p_type:type,p_id:id,p_user:user,p_detail:detail,p_path:safePath(path),p_device:device,p_evidence:evidence});if(r.error)throw new Error('Analytics event unavailable');
}
// Analytics is best effort on business endpoints: never block account, game or payment delivery.
export async function accountAnalytics(request:Request,headers:Headers,user:NonNullable<Identity>,isAdmin:boolean,stage:'intent'|'verified'){
 try{const c=await analyticsContext(request,headers,user,isAdmin);const r=await paymentAdmin().rpc('analytics_account',{p_user:user.id,p_session:c.id,p_stage:stage});if(r.error)throw r.error;}catch{console.warn('Account attribution unavailable');}
}
export async function completionAnalytics(request:Request,headers:Headers,user:NonNullable<Identity>,isAdmin:boolean,id:string,detail:string){try{const c=await analyticsContext(request,headers,user,isAdmin);await emitAnalytics(c.id,'game_complete',id,user.id,detail,'/arcade','Desktop','saved_result');}catch{console.warn('Game attribution unavailable');}}
export async function checkoutAnalytics(request:Request,headers:Headers,user:NonNullable<Identity>,isAdmin:boolean,checkout:string,live:boolean){try{const c=await analyticsContext(request,headers,user,isAdmin);const r=await paymentAdmin().from('analytics_checkouts').upsert({checkout_id:checkout,session_id:c.id,user_id:user.id,livemode:live},{onConflict:'checkout_id',ignoreDuplicates:true});if(r.error)throw r.error;}catch{console.warn('Checkout attribution unavailable');}}
export async function purchaseAnalytics(checkout:string){const r=await paymentAdmin().rpc('analytics_purchase',{p_checkout:checkout});if(r.error)throw new Error('Purchase attribution unavailable');}
