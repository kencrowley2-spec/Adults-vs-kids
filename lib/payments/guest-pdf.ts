import {createHash, createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {fulfillPdf, paymentAdmin, stripeClient} from './server';

const receiptKeyPattern = /^[a-f0-9]{64}$/;
const digest = (key: string) => createHash('sha256').update(key).digest('hex');

function checkoutHash(value: string) {
 const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!secret) throw new Error('Guest checkout unavailable');
 return createHmac('sha256', secret).update(value).digest('hex');
}

export function guestReceiptKey(attempt: string, cart: string) {
 return checkoutHash('guest-pdf-receipt:' + attempt + ':' + cart);
}

export async function allowGuestPdfCheckout(request: Request) {
 const ip = request.headers.get('x-vercel-forwarded-for')?.trim() ?? '';
 const {data, error} = await paymentAdmin().rpc('allow_guest_pdf_checkout', {
  p_key: checkoutHash('guest-pdf-limit:' + (isIP(ip) ? ip : 'unknown')),
 });
 if (error) throw error;
 return data === true;
}

export async function saveGuestPdfCheckout(key: string, sessionId: string) {
 const {error} = await paymentAdmin().from('pdf_guest_checkouts').upsert({
  access_digest: digest(key), session_id: sessionId,
 }, {onConflict: 'access_digest', ignoreDuplicates: true});
 if (error) throw error;
}

export async function guestPdfOrder(key: string) {
 if (!receiptKeyPattern.test(key)) return {state: 'missing'} as const;

 const {data, error} = await paymentAdmin().from('pdf_guest_checkouts').select('session_id')
  .eq('access_digest', digest(key)).maybeSingle();
 if (error) throw error;
 if (!data) return {state: 'missing'} as const;

 const session = await stripeClient().checkout.sessions.retrieve(data.session_id, {expand: ['payment_intent.latest_charge']});
 if (session.metadata?.avk_type !== 'pdf-guest-v1' || session.client_reference_id !== null) return {state: 'missing'} as const;
 if (session.status === 'expired') return {state: 'expired'} as const;
 if (session.status !== 'complete' || session.payment_status !== 'paid') return {state: 'pending'} as const;

 const order = await fulfillPdf(data.session_id, session);
 return {state: 'paid', order} as const;
}
