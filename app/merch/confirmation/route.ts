import {delivery} from '../../../lib/merch';
import {stripeClient,paymentLive} from '../../../lib/payments/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('session_id')||'';
 let paid=false;
 if(/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(id)){
  try{const session=await stripeClient().checkout.sessions.retrieve(id);paid=session.metadata?.avk_type==='merch-v1'&&session.livemode===paymentLive()&&session.payment_status==='paid';}catch{}
 }
 return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Merch order | Adults vs. Kids</title><link rel="stylesheet" href="/merch.css"><main class="confirmation"><small>ADULTS VS KIDS™ / OFFICIAL PRO SHOP</small><h1>${paid?'Order received.':'Payment unconfirmed.'}</h1><p>${paid?delivery:'Check your email for a Stripe receipt before placing another order.'}</p><a class="action" href="/merch">Back to the shop</a></main></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}
