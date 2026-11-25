import {purchaseLinks} from '../../lib/arcade-links';
import {trackedHtml} from '../../lib/analytics';
const env = process.env;import {loginPage} from '../../lib/member-pages';
export const dynamic='force-dynamic';export function GET(request:Request){return new Response(trackedHtml(purchaseLinks(loginPage('verify','',env.AUTH_EMAIL_READY==='true'),new URL(request.url).searchParams.get('purchase'))),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})}
