import {accountAnalytics} from '../../../lib/analytics-server';
import {isAdministrator} from '../../../lib/auth/access';
import {arcadeDestination} from '../../../lib/arcade-links';
import { memberClient,memberRedirect } from '../../../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){const auth=memberClient(request);auth.headers.set('Referrer-Policy','no-referrer');if(!auth.client)return memberRedirect('/login?setup=1',auth.headers);try{const url=new URL(request.url),code=url.searchParams.get('code'),hash=url.searchParams.get('token_hash'),type=url.searchParams.get('type');let error;
if(code){({error}=await auth.client.auth.exchangeCodeForSession(code))}else if(hash&&['email','signup','recovery','invite'].includes(type||'')){({error}=await auth.client.auth.verifyOtp({token_hash:hash,type:type as 'email'|'signup'|'recovery'|'invite'}))}else return memberRedirect('/login?verification=invalid',auth.headers);
if(error)return memberRedirect('/login?verification=invalid',auth.headers);
const {data}=await auth.client.auth.getUser();if(!data.user?.email_confirmed_at)return memberRedirect('/login?verification=invalid',auth.headers);
await accountAnalytics(request,auth.headers,data.user,isAdministrator(data.user,process.env.ADMIN_EMAIL),'verified');
return memberRedirect(url.searchParams.get('next')==='/reset-password'?'/reset-password':arcadeDestination(new URL(url.searchParams.get('next')||'/family',url.origin).searchParams.get('game')),auth.headers);
}catch{return memberRedirect('/login?verification=invalid',auth.headers)}}
