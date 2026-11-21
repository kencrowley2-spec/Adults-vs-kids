import {enrichPublicHtml,publicLinks,bookSchema} from '../../lib/seo';
import {trackedHtml} from '../../lib/analytics';
import html from '../../legacy-site-html';
export const dynamic='force-dynamic';
export function GET(){return new Response(trackedHtml(enrichPublicHtml(html.replace('<script src="/app.js?v=amazon-book2">', '<script src="/timer-announcer.js?v=1"></script><script src="/app.js?v=countdown1">').replace('/game-tools.js?v=42','/game-tools.js?v=43').replace('</main>',publicLinks()+'</main>'),'/explore',bookSchema())),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}})}
