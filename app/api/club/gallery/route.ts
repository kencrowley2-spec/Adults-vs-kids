import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {requestOrigin} from '../../../../lib/request-origin';
import {cleanGalleryImage} from '../../../../lib/club-gallery';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in to open your family gallery.'},401,auth.headers);
 const page=Number(new URL(request.url).searchParams.get('page')||0);
 if(!Number.isSafeInteger(page)||page<0||page>100000)return memberReply({error:'Invalid gallery page.'},400,auth.headers);
 const result=await auth.client.from('club_gallery').select('id,title,source,image_data,created_at',{count:'exact'}).eq('user_id',auth.user.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page,page);
 if(result.error)return memberReply({error:'Your gallery is temporarily unavailable. Please try again.'},503,auth.headers);
 return memberReply({items:result.data,total:result.count||0,page},200,auth.headers);
}
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberReply({error:'Sign in to save to your family gallery.'},401,auth.headers);
 if(request.headers.get('Origin')!==requestOrigin(request))return memberReply({error:'Invalid request origin.'},403,auth.headers);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return memberReply({error:'JSON required.'},415,auth.headers);
 let raw;try{
  const reader=request.body?.getReader();if(!reader)throw Error();const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1_405_000){await reader.cancel();return memberReply({error:'Choose a smaller image.'},413,auth.headers);}chunks.push(value);}
  raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }catch{return memberReply({error:'Choose a valid photo.'},400,auth.headers);}
 let image;try{image=cleanGalleryImage(raw);}catch(e){return memberReply({error:(e as Error).message},400,auth.headers);}
 const result=await auth.client.from('club_gallery').insert({...image,user_id:auth.user.id}).select('id,title,source,created_at').single();
 if(result.error?.code==='23505')return memberReply({saved:true,duplicate:true},200,auth.headers);
 if(result.error)return memberReply({error:'Your image could not be saved. Please retry.'},503,auth.headers);
 return memberReply({saved:true,item:result.data},201,auth.headers);
}
