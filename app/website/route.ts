import {trackedHtml} from '../../lib/analytics';
import html from '../../site-html';
// An explicit public-site destination for books and information while signed in.
export const dynamic='force-dynamic';
export function GET(){return new Response(trackedHtml(html),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}})}
