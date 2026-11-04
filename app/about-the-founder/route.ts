import {enrichPublicHtml,publicLinks,bookSchema} from '../../lib/seo';
import {trackedHtml} from '../../lib/analytics';
import {founderStoryPage} from '../../lib/store-pages';
export const dynamic='force-dynamic';
export function GET(){return new Response(trackedHtml(enrichPublicHtml(founderStoryPage().replace('</main>',publicLinks()+'</main>'),'/about-the-founder')),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}})}
