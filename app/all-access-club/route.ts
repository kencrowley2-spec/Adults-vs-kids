import {clubLanding} from '../../lib/club-landing';
import {trackedHtml} from '../../lib/analytics';
export const dynamic='force-dynamic';
export function GET(){return new Response(trackedHtml(clubLanding()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});}
