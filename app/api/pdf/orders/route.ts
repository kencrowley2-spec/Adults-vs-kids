import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {pdfProduct} from '../../../../config/pdfs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request),reply=(d:object,s=200)=>memberReply(d,s,auth.headers);
 if(!auth.user||!auth.client)return reply({error:'Sign in required.'},401);
 const {data,error}=await auth.client.from('pdf_orders').select('session_id,book_ids,amount_total,paid_at,status').eq('user_id',auth.user.id).order('paid_at',{ascending:false}).limit(100);
 if(error)return reply({error:'Your purchases are temporarily unavailable.'},503);
 return reply({orders:(data??[]).map(o=>({...o,books:o.book_ids.map((id:string)=>({id,title:pdfProduct(id)?.title??'PDF',url:'/api/pdf/download?order='+encodeURIComponent(o.session_id)+'&book='+encodeURIComponent(id)}))}))});
}
