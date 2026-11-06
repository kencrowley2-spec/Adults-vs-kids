import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {drawingImage,visionRequest,visionAnswer} from '../../../../lib/arcade/draw-vision';
export const dynamic='force-dynamic';
export const maxDuration=40;
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 const reply=(body:object,status:number)=>memberReply(body,status,auth.headers);
 if(!auth.user||!auth.client)return reply({error:'Sign in to use the AI guest.'},401);
 if(request.headers.get('Origin')!==requestOrigin(request))return reply({error:'Invalid request origin.'},403);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return reply({error:'JSON required.'},415);
 if(!process.env.OPENAI_API_KEY||process.env.DRAW_IT_AI_ENABLED!=='true')return reply({error:'The AI guest is not connected yet. Your drawing is safe here; try again later or continue without AI.'},503);
 let image:string;
 try{
  // Bound streamed bodies too, before parsing or forwarding any image.
  const reader=request.body?.getReader();if(!reader)return reply({error:'Drawing required.'},400);
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1_401_000){await reader.cancel();return reply({error:'Drawing is too large.'},413);}chunks.push(value);}
  image=drawingImage(JSON.parse(Buffer.concat(chunks).toString('utf8')));
 }catch{return reply({error:'Please send a valid drawing.'},400);}
 try{
  // Database row lock makes the shared daily budget atomic across server instances.
  const budget=await auth.client.rpc('consume_draw_it_vision');
  if(budget.error)return reply({error:'AI is temporarily unavailable. Please retry later.'},503);
  if(budget.data!==true){auth.headers.set('Retry-After','60');return reply({error:'The AI guest needs a break. Try later, or continue without AI.'},429);}
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(visionRequest(image,process.env.DRAW_IT_VISION_MODEL||'gpt-4.1-mini')),signal:AbortSignal.timeout(25_000)});
  if(!response.ok)return reply({error:'The AI guest could not read this drawing right now. Please retry or continue without AI.'},503);
  return reply(visionAnswer(await response.json()),200);
 }catch{return reply({error:'The AI guest lost its connection. Your drawing is still here. Retry or continue without AI.'},503);}
}
