import {pdfCart} from '../../config/pdfs';
export type PaidSession={id:string;mode:string|null;status:string|null;payment_status:string;currency:string|null;amount_total:number|null;client_reference_id:string|null;livemode:boolean;metadata:Record<string,string>|null};
export function paidOrder(session:PaidSession,expectedLive:boolean){
 if(session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||session.livemode!==expectedLive||session.currency!=='usd')throw new Error('Payment is not confirmed.');
 const owner=session.client_reference_id;
 if(!owner||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner)||session.metadata?.avk_type!=='pdf-v1')throw new Error('This payment is not a PDF order.');
 const products=pdfCart(JSON.parse(session.metadata?.avk_products||'null'));
 if(session.amount_total!==products.reduce((n,p)=>n+p.cents,0))throw new Error('The payment amount does not match this order.');
 return {user_id:owner,session_id:session.id,product_ids:products.map(p=>p.id),book_ids:[...new Set(products.flatMap(p=>[...p.books]))],amount_total:session.amount_total,currency:'usd'};
}
