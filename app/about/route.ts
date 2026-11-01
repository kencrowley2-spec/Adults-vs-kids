import {aboutPage} from '../../lib/store-pages';
export const dynamic='force-dynamic';
export function GET(){return new Response(aboutPage(),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}})}
