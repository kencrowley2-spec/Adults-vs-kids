import {bookPage} from '../../../lib/book-pages';
import {trackedHtml} from '../../../lib/analytics';
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,html=bookPage(slug);
 return html?new Response(trackedHtml(html),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=3600'}}):new Response('Book not found',{status:404,headers:{'X-Robots-Tag':'noindex'}});
}
