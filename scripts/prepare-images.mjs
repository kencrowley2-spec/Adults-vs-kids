// Smaller display copies keep the original illustrations and printable files available.
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root=new URL('../public/',import.meta.url);
const output=new URL('assets/display/',root);
await mkdir(output,{recursive:true});

async function copy(source,name,width,area){
  let image=sharp(new URL(source,root).pathname);
  if(area)image=image.extract(area);
  await image.resize({width,withoutEnlargement:true}).webp({quality:78,effort:5})
    .toFile(path.join(output.pathname,name+'.webp'));
}

// These rectangles are the portions of the original layout artwork visible inside the hero.
for(const width of [480,820,1072]){
  await copy('assets/home-mobile-reference.webp','hero-mobile-'+width,width,{left:72,top:537,width:1072,height:638});
}
await copy('assets/home-desktop-reference-optimized.webp','hero-desktop',1220,{left:0,top:50,width:1220,height:310});
const images=[
 ['assets/original-team.png','original-team',1220],
 ['assets/family-reality-quiz.png','family-quiz',1100],
 ['assets/problem-and-solution.png','problem-solution',1000],
 ['assets/defend-neighborhood-cover.png','neighborhood-cover',480],
 ['games/hexgl/css/title.png','hexgl-title',600],
 ['assets/ghostline-gt.webp','ghostline-cover',600],
 ['assets/avk-gold-cabinet.webp','cabinet-mobile',800],
 ['assets/dashboard-arcade-photo.webp','arcade-room-mobile',800],
 ['assets/clubhouse-prototype-hd.webp','clubhouse-preview',640],
 ['assets/clubhouse-prototype-preview.webp','clubhouse-tile',150],
 ['assets/holiday-wrapped-present-768.webp','holiday-banner',768],
 ['assets/holiday-gift-basket-1536.webp','basket-thumb',160],
 ['assets/holiday-gift-ad-1536.webp','basket-ad-thumb',160],
 ['assets/holiday-gift-basket-1536.webp','basket-main',800],
 ['assets/flex-off-cover.webp','flex-cover',480],
];
for(const id of ['lava','claw','memory','draw','faces','mole']){
  images.push(['assets/featured/'+id+'-480.webp','featured-'+id,480]);
}
for(const stem of ['coloring-cover-final','family-cover-final','make-play-cover-final','young-adult-cover-final','young-adult-official-cover']){
  for(const width of [340,440]){
    images.push(['assets/web-'+stem+'.webp',stem+'-'+width,width]);
  }
}
for(const [source,name,width] of images)await copy(source,name,width);
