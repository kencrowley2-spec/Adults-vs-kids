import {productsPage} from '../../lib/public-pages';
import {trackedHtml} from '../../lib/analytics';
export function GET(){return new Response(trackedHtml(productsPage()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});}
