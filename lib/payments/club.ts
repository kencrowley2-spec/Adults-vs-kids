import {pdfProducts} from '../../config/pdfs';
import type {PaidSession} from './policy';
export const clubPlans={month:{id:'club-month',cents:299,interval:'month',title:'All-Access Club — monthly membership'},year:{id:'club-year',cents:2495,interval:'year',title:'All-Access Club — annual membership'}} as const;
export function clubPlan(value:unknown){return value==='month'||value==='year'?clubPlans[value]:null;}
export const clubTerms='Membership starts today. $2.99 billed automatically every month (month to month), or $24.95 billed automatically every year, until canceled. Cancel renewal in Manage membership before your next billing date. All four book PDFs are included. Charlie AI Host is coming January 2027.';
export function paidClubOrder(session:PaidSession,expectedLive:boolean){
 const plan=clubPlan(session.metadata?.avk_plan);
 const legacy=session.metadata?.avk_type==='club-prelaunch-v1'&&session.metadata?.avk_terms==='delivery-start-v1'&&session.mode==='payment';
 const recurring=session.metadata?.avk_type==='club-subscription-v1'&&session.metadata?.avk_terms==='recurring-v1'&&session.mode==='subscription';
 if(!plan||(!legacy&&!recurring)||session.status!=='complete'||session.payment_status!=='paid'||session.livemode!==expectedLive||session.currency!=='usd'||session.amount_total!==plan.cents)throw new Error('Club payment is not confirmed.');
 const owner=session.client_reference_id;
 if(!owner||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner))throw new Error('Invalid Club account.');
 return {user_id:owner,session_id:session.id,product_ids:[plan.id],book_ids:pdfProducts.filter(p=>p.id!=='bundle').map(p=>p.id),amount_total:plan.cents,currency:'usd'};
}
