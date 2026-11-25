import { verifiedMember, memberRedirect, memberReply } from '../../../lib/auth/session';
import { clubSubscriptions } from '../../../lib/payments/subscriptions';

export const dynamic = 'force-dynamic';

const rounds = [
 ['Paper Basketball Finals','Crumple a sheet of scrap paper into a ball and place a basket on the floor. Mark a shooting line for each player. Alternate five shots each. Every basket earns one point. For a tie, take one shot apiece until one player leads.'],
 ['The Color Swap','Draw matching outlines of a trophy. Each player chooses three colors for the other player. Set a one-minute timer and color together. Reveal your trophies and award each other a title.'],
 ['The Shape Detective','Choose a shape. Each player has one minute to draw household objects that contain it. Reveal your drawings and score one point per different object. Switch shapes for round two.'],
 ['Paper Bridge Challenge','Give each team one sheet of paper. Rest each bridge between two books set the same distance apart. Add identical small paper squares one at a time. Count how many each bridge holds before it touches the table. Try a new fold for the rematch.']
];
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user)return memberRedirect('/login?purchase=weekly',auth.headers);
 try{
  const membership=await clubSubscriptions(auth.user.id);
  if(!membership.paidActive.length&&!membership.legacy){
   return memberReply('<main><h1>Weekly family challenge</h1><p>This activity requires an active Club membership. For help with an existing membership, email kencrowley2@gmail.com.</p><a href="/family/downloads">Return to your library</a></main>',403,auth.headers);
  }
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Indiana/Indianapolis',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const week=Math.floor((Date.parse(date+'T00:00:00Z')-Date.UTC(2026,0,5))/604800000);
  const [title,rules]=rounds[((week%rounds.length)+rounds.length)%rounds.length];
  return memberReply(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Weekly family challenge | Adults vs. Kids</title><link rel="stylesheet" href="/pdfs.css"></head><body><main class="pdf-main"><p class="eyebrow">ALL-ACCESS CLUB · WEEKLY FAMILY CHALLENGE</p><h1>${title}</h1><p class="pdf-intro">${rules}</p><p>The featured round changes every Monday on a four-week rotation.</p><a class="primary" href="/family?tool=timer">Open family game tools</a><p><a href="/family/downloads">My family library</a></p></main></body></html>`,200,auth.headers);
 }catch{
  return memberReply('Membership verification is temporarily unavailable. Please retry shortly.',503,auth.headers);
 }
}
