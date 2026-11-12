// The canonical homepage stays public for guests and signed-in families.
export function GET(request:Request){const url=new URL(request.url);url.pathname='/';return Response.redirect(url,308);}
