import {setupGuide} from '../../../lib/club-checkout';
export function GET(){return new Response(setupGuide(),{headers:{'Content-Type':'text/html; charset=utf-8','Content-Disposition':'attachment; filename="Adults_vs_Kids_Clubhouse_Setup.html"','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});}
