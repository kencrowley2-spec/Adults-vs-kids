import {clubCheckout} from '../../lib/club-checkout';
export const dynamic='force-dynamic';
export function GET(request:Request){return new Response(clubCheckout(new URL(request.url).searchParams.get('plan')),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});}
