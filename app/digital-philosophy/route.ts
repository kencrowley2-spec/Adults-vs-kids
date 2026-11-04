import {enrichPublicHtml,publicLinks,bookSchema} from '../../lib/seo';
import {trackedHtml} from '../../lib/analytics';
import {digitalPhilosophyPage} from '../../lib/store-pages';
export const dynamic='force-dynamic';
export function GET(){return new Response(trackedHtml(enrichPublicHtml(digitalPhilosophyPage().replace('</main>',publicLinks()+'</main>'),'/digital-philosophy')),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}})}
