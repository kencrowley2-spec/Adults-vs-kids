import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
export const dynamic='force-dynamic';
const actions=new Set(['initialize','profile','rotate_code','request','approve','decline','remove','block','unblock','challenge','accept_challenge','decline_challenge','cancel_challenge']);
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(!auth.isAdmin)return memberReply({error:'Private app preview access required.'},403,auth.headers);
 const {data,error}=await auth.client.rpc('club_network',{p_action:'read',p_data:{}});
 if(error)return memberReply({error:'Your family network is temporarily unavailable.'},503,auth.headers);
 return memberReply(data,200,auth.headers);
}
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in required.'},401,auth.headers);
 if(!auth.isAdmin)return memberReply({error:'Private app preview access required.'},403,auth.headers);
 if(request.headers.get('Origin')!==requestOrigin(request))return memberReply({error:'Invalid request origin.'},403,auth.headers);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return memberReply({error:'JSON required.'},415,auth.headers);
 let input;try{const raw=await request.text();if(raw.length>2000)return memberReply({error:'Request too large.'},413,auth.headers);input=JSON.parse(raw);if(!actions.has(input?.action)||typeof input.data!=='object'||Array.isArray(input.data)||input.data===null)throw Error();}catch{return memberReply({error:'Check the network request and try again.'},400,auth.headers);}
 const {data,error}=await auth.client.rpc('club_network',{p_action:input.action,p_data:input.data});
 if(error){const allowed=['Unable to send a request with that code','Please wait 24 hours before requesting this connection again','This connection already has an open invitation','Use a club family name of 1 to 60 characters','Please try again later; network action limit reached'];return memberReply({error:allowed.includes(error.message)?error.message:'This action is no longer available. Refresh your family network.'},400,auth.headers);}
 return memberReply(data,200,auth.headers);
}
