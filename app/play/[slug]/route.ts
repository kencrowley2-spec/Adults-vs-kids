// Preserve old book/sample URLs and open the existing sample dialog on Explore.
const bookSlugs=['coloring','family-showdown','make-and-play','young-adult'];
export function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 return params.then(({slug})=>bookSlugs.includes(slug)?new Response(null,{status:308,headers:{Location:'/explore?book='+slug+'#books'}}):new Response('Book not found',{status:404,headers:{'X-Robots-Tag':'noindex'}}));
}
