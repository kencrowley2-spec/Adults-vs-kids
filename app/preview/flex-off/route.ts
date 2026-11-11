export const dynamic='force-dynamic';
export function GET(){
 if(process.env.VERCEL_ENV!=='preview')return new Response('Not found',{status:404});
 return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>FLEX OFF! · Playable Preview</title><link rel="stylesheet" href="/arcade-flex.css?v=1"></head><body style="margin:0;background:#090b10;color:white;font-family:Arial"><script type="module">import {mountFlex} from '/arcade-flex.js?v=1';mountFlex({onExit:()=>location.assign('/family/arcade?game=flex')});</script></body></html>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
}
