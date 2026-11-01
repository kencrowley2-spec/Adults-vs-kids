/** Next's internal request URL can use a bind hostname. Use the HTTP Host
 * received by the route for browser-origin checks and auth redirects. */
export function requestOrigin(request: Request): string {
 const url=new URL(request.url);
 const host=request.headers.get('host');
 if(host)url.host=host;
 return url.origin;
}
