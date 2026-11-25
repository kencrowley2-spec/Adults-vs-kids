import html from '../site-html';
import {verifiedMember,memberReply} from '../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 const page=auth.user?html.replace('href="/signup" data-family-dashboard','href="/family" data-family-dashboard'):html;
 // Keep the seasonal strands through Christmas Day in Indianapolis.
 const christmasEnds = Date.parse('2026-12-26T00:00:00-05:00');
 const homepage = Date.now() < christmasEnds
   ? page.replaceAll('/assets/dashboard-warm-lights.svg', '/assets/home-christmas-lights.svg')
   : page;
 return memberReply(homepage,200,auth.headers);
}
