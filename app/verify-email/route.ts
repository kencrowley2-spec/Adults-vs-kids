import {trackedHtml} from '../../lib/analytics';
const env = process.env;import {loginPage} from '../../lib/member-pages';
export const dynamic='force-dynamic';export function GET(){return new Response(trackedHtml(loginPage('verify','',env.AUTH_EMAIL_READY==='true')),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})}
