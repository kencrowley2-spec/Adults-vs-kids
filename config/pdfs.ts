// Stripe prices and delivered assets are allowlisted on the server. Never accept prices from the browser.
export const pdfProducts = [
 {id:'book-1', title:'The Ultimate Coloring Challenge', cents:299, cover:'coloring-cover-final.jpg', priceEnv:'STRIPE_PDF_BOOK_1_PRICE', books:['book-1']},
 {id:'book-2', title:'The Ultimate Family Showdown', cents:299, cover:'family-cover-final.png', priceEnv:'STRIPE_PDF_BOOK_2_PRICE', books:['book-2']},
 {id:'book-3', title:'The Ultimate Make-It-and-Play-It Showdown', cents:299, cover:'make-play-cover-final.jpg', priceEnv:'STRIPE_PDF_BOOK_3_PRICE', books:['book-3']},
 {id:'book-4', title:'The Ultimate Young Adult Challenge', cents:299, cover:'young-adult-official-cover.jpg', priceEnv:'STRIPE_PDF_BOOK_4_PRICE', books:['book-4']},
 {id:'bundle', title:'All Four Print-and-Play PDFs', cents:995, cover:'coloring-cover-final.jpg', priceEnv:'STRIPE_PDF_BUNDLE_PRICE', books:['book-1','book-2','book-3','book-4']},
] as const;
export function pdfProduct(id:string){return pdfProducts.find(p=>p.id===id)}
export function pdfCart(value:unknown){
 if(!Array.isArray(value)||!value.length||value.length>4||value.some(id=>typeof id!=='string'||!pdfProduct(id))||new Set(value).size!==value.length)throw new Error('Choose a valid PDF or the four-book bundle.');
 if(value.includes('bundle')&&value.length!==1)throw new Error('The bundle already includes all four books.');
 return value.map(id=>pdfProduct(id)!);
}
