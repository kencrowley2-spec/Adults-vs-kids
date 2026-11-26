import {pdfProduct} from '../../../config/pdfs';
import {guestPdfOrder} from '../../../lib/payments/guest-pdf';
import {pdfSignedDownload} from '../../../lib/payments/server';

export const dynamic='force-dynamic';

function receipt(heading:string,content:string,status=200){
 return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${heading} · Adults vs. Kids</title><link rel="icon" href="/assets/icon.svg">
<link rel="stylesheet" href="/pdfs.css?v=guest-checkout"></head><body><main class="pdf-main">
<a href="/downloads">Adults vs. Kids PDF store</a><h1>${heading}</h1><section class="pdf-order">${content}</section>
<p>Need help? <a href="mailto:kencrowley2@gmail.com">Contact Adults vs. Kids</a>.</p></main></body></html>`,{
  status,
  headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
   'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'},
 });
}

export async function GET(request:Request){
 const {searchParams}=new URL(request.url);
 const key=searchParams.get('key')||'', book=searchParams.get('book');

 try{
  const result=await guestPdfOrder(key);
  if(result.state==='missing')return receipt('Download link unavailable','<p>Open the private download page from your completed checkout.</p>',404);
  if(result.state==='expired')return receipt('Checkout expired','<p>Visit the PDF store to start again.</p>',410);
  if(result.state==='pending')return receipt('Waiting for payment confirmation','<p>Keep this page and refresh it shortly. Your download will appear once Stripe confirms payment.</p>');

  if(book){
   const product=pdfProduct(book);
   if(!product||!result.order.book_ids.some(id=>id===product.id))
    return receipt('Download unavailable','<p>This PDF is outside this purchase.</p>',404);
   return new Response(null,{status:303,headers:{
    Location:await pdfSignedDownload(product.id,product.title),
    'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer',
   }});
  }
  const links=result.order.book_ids.map(id=>`<a class="pdf-download" href="?key=${key}&amp;book=${id}">Download ${pdfProduct(id)!.title}</a>`).join('');
  return receipt('Your PDFs are ready',`<p>Save this private page to download your books again.</p>${links}
<script src="/pdfs.js?v=guest-checkout" data-pdf-guest-receipt="${result.order.product_ids.join(',')}" defer></script>`);
 }catch{
  return receipt('Download unavailable','<p>Refresh to try again. If your purchase was refunded or disputed, download access ends.</p>',409);
 }
}
