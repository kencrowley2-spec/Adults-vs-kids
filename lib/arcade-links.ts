import {GAMES} from '../public/arcade-data.js';
// Only catalog IDs can become destinations; never accept arbitrary return URLs.
export function arcadeDestination(value:unknown){return typeof value==='string'&&GAMES.some(g=>g.id===value&&!('comingSoon' in g&&g.comingSoon))?'/family/arcade?game='+encodeURIComponent(value):'/family';}
export function gameFromRequest(request:Request){return new URL(request.url).searchParams.get('game');}
export function accountGameLinks(html:string,value:unknown){
 const destination=arcadeDestination(value);if(destination==='/family')return html;
 const id=encodeURIComponent(String(value));
 return html.replaceAll('href="/login"','href="/login?game='+id+'"').replaceAll('href="/signup"','href="/signup?game='+id+'"').replace('data-auth-form data-action=','data-auth-form data-game="'+id+'" data-action=');
}
