import {trackedHtml} from '../../lib/analytics';
import {memberPage} from '../../lib/member-pages';export const dynamic='force-dynamic';export function GET(){return new Response(trackedHtml(memberPage('Your home team',true,'Player')),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}
