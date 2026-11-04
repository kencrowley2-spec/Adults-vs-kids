import {activityPage} from '../../lib/public-pages';
import {trackedHtml} from '../../lib/analytics';
export async function GET(_request:Request,{params}:{params:Promise<{publicSlug:string}>}){
 const {publicSlug}=await params;const html=activityPage(publicSlug);
 if(!html)return new Response('Page not found',{status:404,headers:{'X-Robots-Tag':'noindex'}});
 return new Response(trackedHtml(html),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=3600','X-Content-Type-Options':'nosniff'}});
}
