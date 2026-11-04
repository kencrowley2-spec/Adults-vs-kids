import {enrichPublicHtml,publicLinks,bookSchema} from '../../lib/seo';
import {trackedHtml} from '../../lib/analytics';
import {aboutPage} from '../../lib/store-pages';
export const dynamic='force-dynamic';
export function GET(){return new Response(trackedHtml(enrichPublicHtml(aboutPage().replace('</main>',publicLinks()+'</main>'),'/about')),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}})}
