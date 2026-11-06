import {pdfProducts} from '../../config/pdfs';
import type {PaidSession} from './policy';
export const clubPlans={month:{id:'club-month',cents:299,title:'All-Access Club — first month'},year:{id:'club-year',cents:2495,title:'All-Access Club — first year'}} as const;
export function clubPlan(value:unknown){return value==='month'||value==='year'?clubPlans[value]:null;}
export const clubTerms='One-time prelaunch payment. Your first month or year begins when the updated Club app is delivered. All four book PDFs are included now. No automatic renewal. Charlie AI Host is coming January 2027.';
export function paidClubOrder(session:PaidSession,expectedLive:boolean){
 const plan=clubPlan(session.metadata?.avk_plan);
 if(!plan||session.metadata?.avk_type!=='club-prelaunch-v1'||session.metadata?.avk_terms!=='delivery-start-v1'||session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||session.livemode!==expectedLive||session.currency!=='usd'||session.amount_total!==plan.cents)throw new Error('Club payment is not confirmed.');
 const owner=session.client_reference_id;
 if(!owner||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner))throw new Error('Invalid Club account.');
 return {user_id:owner,session_id:session.id,product_ids:[plan.id],book_ids:pdfProducts.filter(p=>p.id!=='bundle').map(p=>p.id),amount_total:plan.cents,currency:'usd'};
}
