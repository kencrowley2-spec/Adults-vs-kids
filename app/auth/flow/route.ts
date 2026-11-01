import {requestOrigin} from '../../../lib/request-origin';
const env = process.env;
import { isAdministrator } from '../../../lib/auth/access';
import { memberClient,memberReply } from '../../../lib/auth/session';
export const dynamic='force-dynamic';
export async function POST(request:Request){const auth=memberClient(request);const fail=(message:string,status=400)=>memberReply({error:message},status,auth.headers);try{
 const origin=requestOrigin(request);if(request.headers.get('Origin')!==origin)return fail('Please submit from this website.',403);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return fail('Invalid request.',415);
 const text=await request.text();if(text.length>5000)return fail('Request too large.',413);let data;try{data=JSON.parse(text)}catch{return fail('Invalid request.')}
 if(!auth.client)return fail('Account setup is not complete yet. Please try again later.',503);
 const action=data.action,email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
 const password=typeof data.password==='string'?data.password:'';
 if(!['login','admin-login','signup','recover','resend','reset'].includes(action))return fail('Invalid account action.');
 if(action!=='reset'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254))return fail('Enter a valid email address.');
 if(['login','admin-login','signup','reset'].includes(action)&&(password.length<1||password.length>128))return fail('Enter your password.');
 if(['signup','reset'].includes(action)&&(password.length<12||password!==data.confirmPassword))return fail('Use at least 12 characters and make sure the passwords match.');
 if(['signup','recover','resend'].includes(action)&&env.AUTH_EMAIL_READY!=='true')return fail('Verification email delivery is still being connected. No account or email was created by this request.',503);
 if(action==='signup'){
  if(env.AUTH_REGISTRATION_OPEN!=='true')return fail('New family registration is not open yet.',503);
  if(data.adult!==true)return fail('An adult needs to manage the family account.');
  const settings=await fetch(env.SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY!}});const config=await settings.json() as {mailer_autoconfirm?:boolean};
  if(!settings.ok||config.mailer_autoconfirm!==false)return fail('Email confirmation must be configured before registration can open.',503);
  const {error}=await auth.client.auth.signUp({email,password,options:{emailRedirectTo:origin+'/auth/confirm?next=/family',data:{family_name:typeof data.name==='string'?data.name.trim().slice(0,60):''}}});
  if(error)return fail(error.code==='over_email_send_rate_limit'?'Please wait before requesting another email.':'We could not complete registration. Email delivery may not be ready; please try again later.',error.status===429?429:400);
  return memberReply({redirect:'/verify-email',message:'If this address is eligible for a new account, a verification email will be sent. Check your inbox before signing in.'},200,auth.headers);
 }
 if(action==='login'||action==='admin-login'){
  const {data:session,error}=await auth.client.auth.signInWithPassword({email,password});
  if(error||!session.user?.email_confirmed_at){if(session.session)await auth.client.auth.signOut({scope:'local'});return fail(error?.code==='email_not_confirmed'?'Please verify your email before signing in.':'Unable to sign in. Check your email and password.',401)}
  const isAdmin=isAdministrator(session.user,env.ADMIN_EMAIL);
  if(action==='admin-login'&&!isAdmin){await auth.client.auth.signOut({scope:'local'});return fail('This account is not authorized for administration.',403)}
  return memberReply({redirect:action==='admin-login'?'/admin':'/family'},200,auth.headers);
 }
 if(action==='resend'){
  const {error}=await auth.client.auth.resend({type:'signup',email,options:{emailRedirectTo:origin+'/auth/confirm?next=/family'}});if(error)return fail('Please wait and try again. We could not send the confirmation email.',error.status===429?429:400);
  return memberReply({message:'If this account needs verification, a confirmation email will be sent. Please check your inbox.'},200,auth.headers);
 }
 if(action==='recover'){
  const {error}=await auth.client.auth.resetPasswordForEmail(email,{redirectTo:origin+'/auth/confirm?next=/reset-password'});if(error)return fail('We could not send a recovery email. Please try again later.');return memberReply({message:'If an account exists for this address, a password reset email will be sent.'},200,auth.headers);
 }
 if(action==='reset'){
  const {data:current,error}=await auth.client.auth.getUser();if(error||!current.user?.email_confirmed_at)return fail('Open a valid password reset email before choosing a new password.',401);
  const updated=await auth.client.auth.updateUser({password});if(updated.error)return fail('We could not update your password. Please request a new recovery email.');
  await auth.client.auth.signOut({scope:'global'});return memberReply({redirect:'/login?updated=1'},200,auth.headers);
 }
 return fail('Invalid account action.');
}catch{return fail('The account service is temporarily unavailable. Please try again.',503)}}
