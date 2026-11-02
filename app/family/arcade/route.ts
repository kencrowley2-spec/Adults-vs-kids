import {verifiedMember,memberReply,memberRedirect} from '../../../lib/auth/session';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberRedirect('/login',auth.headers);
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Arcade · Adults vs. Kids</title><link rel="stylesheet" href="/arcade.css"></head><body><header><a href="/family" class="back">← Dashboard</a><strong>ADULTS <span>vs.</span> KIDS™</strong></header><main><p class="eyebrow">YOUR FAMILY GAME PLATFORM</p><h1>THE ARCADE 🎮</h1><p class="tagline">Nine games. One family. Endless rematches.</p><section id="arcade-grid" aria-label="Choose a game"></section><section id="arcade-game" hidden aria-label="Memory Match"><button id="arcade-return">← All nine games</button><h2>🃏 Memory Match</h2><p>Take turns finding pairs. A match earns your team a point!</p><div id="arcade-score"></div><div id="arcade-cards"></div><p id="arcade-message" role="status"></p><button id="arcade-next" hidden>Next team's turn →</button><button id="arcade-reset">New game ↻</button></section></main><script src="/arcade.js" defer></script></body></html>`;
 return memberReply(html,200,auth.headers);
}
