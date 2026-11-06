// Original characters: every feature in the portrait comes from this same data.
const rows=[
 ['Poppy',0,'red','long','green',0,0,1],['Milo',1,'brown','short','blue',1,0,0],['Zara',2,'black','long','brown',0,1,1],['Otto',0,'gray','short','blue',1,1,0],
 ['Cleo',1,'blond','long','green',1,0,1],['Finn',0,'red','short','brown',0,0,0],['Nova',2,'gray','long','blue',0,0,1],['Hugo',2,'black','bald','green',1,0,0],
 ['Ruby',0,'brown','long','brown',0,1,1],['Arlo',1,'blond','short','blue',0,1,0],['Luna',2,'red','short','green',1,0,1],['Gus',1,'gray','bald','brown',0,1,0],
 ['Ivy',0,'black','short','blue',0,0,1],['Jude',2,'brown','short','green',0,0,0],['Tess',1,'gray','long','brown',1,1,1],['Beau',0,'blond','short','green',1,0,0],
 ['Nia',2,'blond','long','brown',0,0,1],['Remy',1,'black','short','blue',0,1,0],['Esme',0,'red','long','blue',1,1,1],['Felix',2,'gray','short','brown',0,0,0],
 ['Ada',1,'brown','short','green',1,0,1],['Leo',0,'black','bald','brown',1,1,0],['Skye',2,'black','long','green',1,1,1],['Max',1,'red','short','blue',0,0,0]
];
export const FACES=rows.map(([name,skin,hair,style,eyes,glasses,hat,earrings],id)=>({id,name,skin,hair,style,eyes,glasses:!!glasses,hat:!!hat,earrings:!!earrings,beard:[3,7,11,17,21].includes(id)}));
export class FaceMatch{
 constructor(first=0){this.secrets=[null,null];this.down=[new Set(),new Set()];this.turn=first;this.winner=null;this.questions=[0,0];}
 choose(player,id){if(!FACES[id]||this.secrets[player]!==null)throw Error('Invalid selection');this.secrets[player]=id;}
 toggle(id){if(this.winner!==null||!FACES[id])return;const set=this.down[this.turn];set.has(id)?set.delete(id):set.add(id);}
 next(){if(this.secrets.includes(null)||this.winner!==null)throw Error('Match not ready');this.questions[this.turn]++;this.turn=1-this.turn;}
 guess(id){if(this.secrets.includes(null)||this.winner!==null||!FACES[id])throw Error('Invalid guess');this.winner=id===this.secrets[1-this.turn]?this.turn:1-this.turn;return this.winner;}
}
export function portrait(c){
 const skin=['#ffd0aa','#d99a67','#81503d'][c.skin],hair={red:'#ca592b',brown:'#643923',black:'#29243a',gray:'#c4c7df',blond:'#ffce45'}[c.hair],eye={blue:'#319bd5',green:'#4c936a',brown:'#805332'}[c.eyes],shirt=['#f36f82','#54b9c4','#9b80d7','#e9ad3d'][c.id%4];
 return `<svg viewBox="0 0 120 122" aria-hidden="true"><rect width="120" height="122" rx="12" fill="${['#fff0d1','#e5f6f2','#f2e7ff','#ffe5df'][c.id%4]}"/>${c.style==='long'?`<rect x="24" y="24" width="72" height="91" rx="33" fill="${hair}"/>`:''}<path d="M10 122Q14 91 60 92Q106 91 110 122" fill="${shirt}"/><path d="M47 88v14q13 14 26 0V88" fill="${skin}"/><circle cx="27" cy="62" r="9" fill="${skin}"/><circle cx="93" cy="62" r="9" fill="${skin}"/><rect x="29" y="22" width="62" height="76" rx="29" fill="${skin}"/>${c.style!=='bald'?`<path d="M27 49V35Q27 8 60 10Q99 10 94 51L82 37Q60 38 51 24Q45 43 27 49" fill="${hair}"/>`:''}<path d="M39 48q7-5 14 0M67 48q7-5 14 0" fill="none" stroke="${hair}" stroke-width="4" stroke-linecap="round"/>${[46,74].map(x=>`<ellipse cx="${x}" cy="60" rx="9" ry="10" fill="white"/><circle cx="${x}" cy="61" r="6" fill="${eye}"/><circle cx="${x}" cy="61" r="3" fill="#232338"/><circle cx="${x-2}" cy="58" r="2" fill="white"/>`).join('')}<path d="M59 64l-3 10h6" fill="none" stroke="#af705b" stroke-width="2" stroke-linecap="round"/><path d="M48 81q12 15 24 0" fill="white" stroke="#b96261" stroke-width="2" stroke-linejoin="round"/>${c.beard?`<path d="M30 73Q32 104 60 102Q88 104 90 73L78 83Q60 103 42 83Z" fill="${hair}"/><path d="M47 79q13-8 26 0l-3 5H50Z" fill="${hair}"/>`:''}${c.glasses?'<g fill="none" stroke="#433650" stroke-width="4"><rect x="32" y="49" width="27" height="24" rx="8"/><rect x="62" y="49" width="27" height="24" rx="8"/><path d="M59 56h3M27 53h5M89 53h5"/></g>':''}${c.earrings?'<circle cx="27" cy="75" r="5" fill="#ffcf42"/><circle cx="93" cy="75" r="5" fill="#ffcf42"/>':''}${c.hat?`<path d="M24 31Q24 3 60 3Q96 3 96 31" fill="${shirt}"/><rect x="17" y="26" width="86" height="12" rx="6" fill="#40334f"/><path d="M40 16h40" stroke="#fff4" stroke-width="6"/>`:''}</svg>`;
}
