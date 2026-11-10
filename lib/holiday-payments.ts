import {createHmac,timingSafeEqual} from 'node:crypto';
import {stripeClient,paymentLive} from './payments/server';
export const HOLIDAY_TYPE='holiday-basket-2026';
export const HOLIDAY_COOKIE='avk_holiday_checkout';
export function holidaySign(value:string){return createHmac('sha256',process.env.STRIPE_SECRET_KEY||'unconfigured').update('avk-holiday-v1:'+value).digest('hex');}
export function holidayCookie(id:string){return `${HOLIDAY_COOKIE}=${id}.${holidaySign(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV==='production'?'; Secure':''}`;}
export function holidaySessionId(request:Request){
 const value=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(HOLIDAY_COOKIE+'='))?.slice(HOLIDAY_COOKIE.length+1)||'';
 const [id,sig]=value.split('.');if(!id||!/^cs_[a-zA-Z0-9_]+$/.test(id)||!sig||!/^[a-f0-9]{64}$/.test(sig))return null;
 return timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(holidaySign(id),'hex'))?id:null;
}
export async function previousHolidaySession(request:Request){
 const id=holidaySessionId(request);if(!id)return null;
 const session=await stripeClient().checkout.sessions.retrieve(id);
 if(session.metadata?.avk_type!==HOLIDAY_TYPE||session.livemode!==paymentLive()||Date.now()/1000-session.created>86400)return null;
 return session;
}
export function holidayReply(data:object,status=200,cookie?:string){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});}
