import {clubPage} from './club-app';
import {clubIcon} from './club-icons.js';
export function privateClubPage(startedAt:number|null=null){
 let html=clubPage('home',startedAt);
 const subtitles=['Play Games Now!','Compete & Win!','Your Friends & Invitations','Your Family Tournament','Your Wins & Awards','Global Rankings','New Challenges Each Week','Download Game Sheets','Timers, Music & Scores','Invite & Manage Members','Challenge Other Families','Coming January 2027'];
 let tile=0;
 html=html.replace('<body class="club-home"','<body class="club-home private-club"');
 html=html.replace('</head>','<link rel="stylesheet" href="/private-club.css?v=1"></head>');
 html=html.replace('<div class="preview-bar">','<header class="private-club-masthead"><strong>The Clubhouse · Adults vs. Kids</strong><span>YOUR PRIVATE FAMILY CLUB</span></header><div class="preview-bar">');
 html=html.replace('THE CLUBHOUSE · PRIVATE PREVIEW','♛ KEN’S PRIVATE CLUBHOUSE');
 html=html.replace('YOUR NEXT GAME NIGHT STARTS HERE','WELCOME TO YOUR CLUBHOUSE');
 html=html.replace(/<a class="club-key"[^]*?<\/a>/g,markup=>markup.replace('</a>',`<p class="private-tile-caption">${subtitles[tile++]}</p></a>`));
 html=html.replace('</header><a class="club-news-strip"',`<div class="private-club-stats" aria-label="Family practice statistics"><div>${clubIcon('trophy')}<strong data-parents>0</strong><span>Adults Wins</span></div><div>${clubIcon('crown')}<strong data-kids>0</strong><span>Kids Wins</span></div><div>${clubIcon('arcade')}<strong id="privateMatchCount">0</strong><span>Matches Played</span></div><a href="/admin/app/leaderboard">${clubIcon('leaderboard')}<strong>Top 100</strong><span>See Your Rank</span></a></div></header><a class="club-news-strip"`);
 html=html.replace('FAMILY LEGACY CLOCK</span>','YOUR FAMILY LEGACY CLOCK</span>');
 html=html.replace('HOURS : MINUTES : SECONDS</span>','HOURS : MINUTES : SECONDS · LIVE</span>');
 html=html.replace('</body>','<script src="/private-club.js?v=1" defer></script></body>');
 return html;
}
