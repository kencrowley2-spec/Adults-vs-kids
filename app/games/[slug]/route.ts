import {gamePages} from '../../../lib/game-pages';
import {publicShell} from '../../../lib/public-pages';
import {ORIGIN,escapeHtml as esc} from '../../../lib/seo';
import {trackedHtml} from '../../../lib/analytics';
import {coverMarkup} from '../../../public/arcade-library.js';

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const game=gamePages.find(g=>g.path==='/games/'+slug);
 if(!game)return new Response('Game not found',{status:404,headers:{'X-Robots-Tag':'noindex'}});
 const art=game.image
   ? '<img src="'+game.image+'" alt="'+esc(game.name)+' game artwork" style="max-width:100%;width:320px;height:auto">'
   : '<div role="img" aria-label="'+esc(game.name)+' Arcade Rolodex illustration" style="max-width:300px;background:#242638;border-radius:12px">'+(coverMarkup(game).match(/<svg[\s\S]*?<\/svg>/)?.[0]||'')+'</div>';
 const schema={'@type':'VideoGame','@id':ORIGIN+game.path+'#game',url:ORIGIN+game.path,name:game.name,description:game.description,gamePlatform:'Web browser',...(game.image?{image:ORIGIN+game.image}:{}),playMode:'https://schema.org/'+(['hexgl','pinball'].includes(game.id)?'SinglePlayer':'MultiPlayer')};
 const body=`<p><a href="/family-games">All family games</a></p>${art}<h2>How to play ${esc(game.name)}</h2><p>${esc(game.description)}</p><a class="button" href="${game.play}">Play Now · ${esc(game.name)}</a><p>Guests can try two games. An adult can then sign in to a free family account to keep playing.</p><section><h2>Try this together</h2><p>${esc(game.tip)}</p><p>Use the <a href="/family-championship-scorecard">free championship scorecard</a> to make this one event in a <a href="/family-game-night-ideas">family game night</a>.</p></section>`;
 return new Response(trackedHtml(publicShell(game.path,game.name,body,[schema])),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=3600'}});
}
