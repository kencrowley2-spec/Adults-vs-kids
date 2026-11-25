import {GAMES} from '../public/arcade-data.js';
// Only catalog IDs can become destinations; never accept arbitrary return URLs.
export function arcadeDestination(value:unknown){return typeof value==='string'&&GAMES.some(g=>g.id===value&&!('comingSoon' in g&&g.comingSoon))?'/family/arcade?game='+encodeURIComponent(value):'/family';}
export function gameFromRequest(request:Request){return new URL(request.url).searchParams.get('game');}
export function accountGameLinks(html:string,value:unknown){
 const destination=arcadeDestination(value);if(destination==='/family')return html;
 const id=encodeURIComponent(String(value));
 return html.replaceAll('href="/login"','href="/login?game='+id+'"').replaceAll('href="/signup"','href="/signup?game='+id+'"').replace('data-auth-form data-action=','data-auth-form data-game="'+id+'" data-action=');
}

// A purchase return carries only a catalog selection, never a URL or a price.
export function purchaseSelection(value:unknown):string {
 if(typeof value!=='string')return '';
 if(['club-month','club-year','bundle','library','weekly'].includes(value))return value;
 const ids=value.split(',');
 return ids.length<=4 && ids.every(id=>/^book-[1-4]$/.test(id)) && new Set(ids).size===ids.length ? ids.join(',') : '';
}
export function accountDestination(game:unknown,selection:unknown){
 const key=purchaseSelection(selection);
 if(!key)return arcadeDestination(game);
 if(key==='weekly')return '/family/weekly-challenge';
 if(key==='library')return '/family/downloads';
 if(key.startsWith('club-'))return '/club-checkout?plan='+key.slice(5);
 return '/downloads?cart='+encodeURIComponent(key)+'#pdfCart';
}
export function purchaseLinks(html:string,selection:unknown){
 const key=purchaseSelection(selection);
 if(!key)return html;
 return html.replace(/href="\/(login|signup|verify-email)"/g,(_,route)=>'href="/'+route+'?purchase='+encodeURIComponent(key)+'"')
  .replace('data-auth-form ','data-auth-form data-purchase="'+key+'" ');
}
