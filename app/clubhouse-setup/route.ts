import {setupGuide} from '../../lib/club-checkout';
export function GET(){return new Response(setupGuide(),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Robots-Tag':'noindex, nofollow'}});}
