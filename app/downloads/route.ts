import {trackedHtml} from '../../lib/analytics';
import {pdfPage} from '../../lib/pdf-pages';
export const dynamic='force-dynamic';
export function GET(){return new Response(trackedHtml(pdfPage()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
