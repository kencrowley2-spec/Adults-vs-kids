import {gamePages} from '../../lib/game-pages';
import {ORIGIN} from '../../lib/seo';
export function GET(){
 const links=[['Family Arcade and guest rules','/family-games'],['Free printable activities','/printable-family-games'],['Free championship scorecard','/family-championship-scorecard'],['Paperback activity books','/paperback-books'],['Digital activity books','/downloads'],['All-Access Family Entertainment Club','/all-access-club'],['Holiday Championship Gift Basket','/holiday-gift-basket'],['Founder Kenneth W. Crowley','/about-the-founder'],...gamePages.map(g=>[g.name,g.path])];
 const intro='# ADULTS vs. KIDS™\n\nWe create experiences that bring parents and kids together through play, competition, laughter, and connection. We are not trying to increase screen time. We are transforming existing screen time into meaningful family connection.\n\nFamilies share a device for Arcade turns or use printables and activity books at the table. Two guest games and the championship scorecard are free. Paperback books, household-print PDFs and recurring Club membership have separate purchase options. See the individual product pages for current terms.\n';
 return new Response(intro+'\n'+links.map(([label,path])=>'- ['+label+']('+ORIGIN+path+')').join('\n')+'\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
