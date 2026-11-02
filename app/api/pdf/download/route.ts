import {verifiedMember,memberReply} from '../../../../lib/auth/session';
import {fulfillPdf,paymentAdmin} from '../../../../lib/payments/server';
import {pdfProduct} from '../../../../config/pdfs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request),reply=(d:object,s=200)=>memberReply(d,s,auth.headers);
 if(!auth.user||!auth.client)return reply({error:'Sign in required.'},401);
 const params=new URL(request.url).searchParams,session=params.get('order')||'',book=params.get('book')||'';
 if(!/^cs_[A-Za-z0-9_]{10,200}$/.test(session)||!pdfProduct(book)||book==='bundle')return reply({error:'Download not found.'},404);
 try{
  // Check ownership with the family's RLS-protected client before any privileged lookup.
  const {data:order,error}=await auth.client.from('pdf_orders').select('book_ids,status').eq('session_id',session).eq('user_id',auth.user.id).maybeSingle();
  if(error||!order||order.status!=='paid'||!order.book_ids.includes(book))return reply({error:'Download not found.'},404);
  await fulfillPdf(session); // Recheck paid amount, ownership, refunds and disputes on every download.
  const db=paymentAdmin(),asset=await db.from('pdf_assets').select('object_path').eq('book_id',book).eq('ready',true).single();if(asset.error||!asset.data)throw new Error('Asset unavailable');
  const signed=await db.storage.from('paid-pdfs').createSignedUrl(asset.data.object_path,60,{download:pdfProduct(book)!.title.replace(/[^A-Za-z0-9-]/g,'_')+'.pdf'});if(signed.error||!signed.data?.signedUrl)throw new Error('Download unavailable');
  auth.headers.set('Location',signed.data.signedUrl);auth.headers.set('Referrer-Policy','no-referrer');return new Response(null,{status:303,headers:auth.headers});
 }catch{return reply({error:'This download is unavailable. If your purchase was refunded or disputed, download access is removed. Otherwise, please try again.'},409)}
}
