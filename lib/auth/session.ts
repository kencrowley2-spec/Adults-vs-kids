import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
const env = process.env;
import { isAdministrator } from './access';
export function memberClient(request:Request){
 const baseUrl=env.SUPABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY;
 const headers=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
 if(!baseUrl||!key)return {client:null,headers};
 const incoming=parseCookieHeader(request.headers.get('Cookie')||'');
 const client=createServerClient(baseUrl,key,{cookieOptions:{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/'},cookies:{getAll:()=>incoming.map(c=>({name:c.name,value:c.value??''})),setAll:(cookies)=>{for(const c of cookies){headers.append('Set-Cookie',serializeCookieHeader(c.name,c.value,c.options));const old=incoming.find(x=>x.name===c.name);if(old)old.value=c.value;else incoming.push({name:c.name,value:c.value})}}}});
 return {client,headers};
}
export async function verifiedMember(request:Request){const auth=memberClient(request);if(!auth.client)return {...auth,user:null,isAdmin:false};const {data,error}=await auth.client.auth.getUser();const user=!error&&data.user?.email_confirmed_at?data.user:null;const isAdmin=isAdministrator(user,env.ADMIN_EMAIL);return {...auth,user,isAdmin};}
export function memberReply(body:string|object,status:number,headers:Headers){headers.set('Content-Type',typeof body==='string'?'text/html; charset=utf-8':'application/json');return new Response(typeof body==='string'?body:JSON.stringify(body),{status,headers})}
export function memberRedirect(path:string,headers:Headers){headers.set('Location',path);return new Response(null,{status:303,headers})}
