import {paperbackPage} from '../../lib/public-pages';
import {trackedHtml} from '../../lib/analytics';
export function GET(){return new Response(trackedHtml(paperbackPage()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=3600','X-Content-Type-Options':'nosniff'}});}
