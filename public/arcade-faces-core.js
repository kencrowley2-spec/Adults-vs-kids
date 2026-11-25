// Original characters: every feature in the portrait comes from this same data.
const rows=[
 ['Poppy',0,'red','long','green',0,0,1],['Milo',1,'brown','short','blue',1,0,0],['Zara',2,'black','long','brown',0,1,1],['Otto',0,'gray','short','blue',1,1,0],
 ['Cleo',1,'blond','long','green',1,0,1],['Finn',0,'red','short','brown',0,0,0],['Nova',2,'gray','long','blue',0,0,1],['Hugo',2,'black','bald','green',1,0,0],
 ['Ruby',0,'brown','long','brown',0,1,1],['Arlo',1,'blond','short','blue',0,1,0],['Luna',2,'red','short','green',1,0,1],['Gus',1,'gray','bald','brown',0,1,0],
 ['Ivy',0,'black','short','blue',0,0,1],['Jude',2,'brown','short','green',0,0,0],['Tess',1,'gray','long','brown',1,1,1],['Beau',0,'blond','short','green',1,0,0],
 ['Nia',2,'blond','long','brown',0,0,1],['Remy',1,'black','short','blue',0,1,0],['Esme',0,'red','long','blue',1,1,1],['Felix',2,'gray','short','brown',0,0,0],
 ['Ada',1,'brown','short','green',1,0,1],['Leo',0,'black','bald','brown',1,1,0],['Skye',2,'black','long','green',1,1,1],['Max',1,'red','short','blue',0,0,0]
];
export const FACES=rows.map(([name,skin,hair,style,eyes,glasses,hat,earrings],id)=>({id,name,skin,hair:style==='bald'?'none':hair,hairTone:hair,style,eyes:[2,8,12,19].includes(id)?'black':eyes,glasses:!!glasses,hat:!!hat,earrings:!!earrings,beard:[3,7,11,17,21].includes(id),mustache:[3,5,7,9,11,15,17,21].includes(id)}));
export class FaceMatch{
 constructor(first=0){this.secrets=[null,null];this.down=[new Set(),new Set()];this.turn=first;this.winner=null;this.questions=[0,0];this.clues=[[],[]];}
 choose(player,id){if(!FACES[id]||this.secrets[player]!==null)throw Error('Invalid selection');this.secrets[player]=id;}
 toggle(id){if(this.winner!==null||!FACES[id])return;const set=this.down[this.turn];set.has(id)?set.delete(id):set.add(id);}
 ask(key,value){
  if(this.secrets.includes(null)||this.winner!==null)throw Error('Match not ready');
  if(!FEATURES.some(g=>g.key===key&&g.options.some(o=>o.value===value)))throw Error('Unknown feature');
  const answer=FACES[this.secrets[1-this.turn]][key]===value;
  this.clues[this.turn].push({key,value,answer});return answer;
 }
 canEliminate(id){return this.clues[this.turn].some(c=>(FACES[id][c.key]===c.value)!==c.answer);}
 repair(){for(const id of this.down[this.turn])if(!this.canEliminate(id))this.down[this.turn].delete(id);}
 next(){if(this.secrets.includes(null)||this.winner!==null)throw Error('Match not ready');this.repair();this.questions[this.turn]++;this.turn=1-this.turn;}
 guess(id){if(this.secrets.includes(null)||this.winner!==null||!FACES[id])throw Error('Invalid guess');this.winner=id===this.secrets[1-this.turn]?this.turn:1-this.turn;return this.winner;}
}
export function portrait(c){
 const skin=['#ffcca5','#d99a68','#955e49'][c.skin];
 const shade=['#dc956f','#af6945','#6d4037'][c.skin];
 const eyes={blue:'#279eea',green:'#319357',brown:'#97572e',black:'#24232b'}[c.eyes];
 const hair={black:'#26232e',red:'#b94c27',blond:'#efbc53',brown:'#644034',gray:'#a9a9b2'}[c.hairTone];
 const [shirt,bg]=[['#287779','#d1eddf'],['#aa4d45','#ffdec2'],['#5e5998','#e9def5'],['#36668c','#d6e8f5'],['#9a6234','#fff0c8'],['#a34c76','#f8dee9']][c.id%6];
 const ink='#382e39',variant=c.id%4;
 const jaws=['Q81 103 61 105Q36 105 25 75','Q86 99 62 108Q36 102 25 75','Q89 107 61 104Q32 106 25 75','Q80 105 58 105Q38 101 25 75'];
 const fringes=['M22 51Q15 27 33 16Q47 4 67 12Q85 3 98 26L101 48Q80 43 74 29Q61 48 38 42L30 55Z','M21 55Q12 32 30 21Q35 7 48 14Q57 1 69 12Q86 6 89 20Q108 22 99 52L88 42Q83 29 71 31Q57 44 38 35L28 54Z','M22 53Q14 23 40 14Q62 5 83 16Q103 22 99 51L89 45L78 30Q53 52 33 44L28 56Z','M22 55Q12 28 33 19L31 12L47 15L54 6L63 13Q91 5 99 31L100 51L90 44L79 31Q66 41 57 41L61 34Q46 46 34 42L27 56Z'];
 const smiles=['M47 82Q60 88 76 79Q68 101 52 91Z','M48 84Q62 93 77 81','M46 82Q61 88 75 82Q63 98 50 90Z','M48 84Q58 91 74 80'];
 const eye=x=>`<g><path d="M${x-11} 62q9-17 22-2q-7 14-22 2Z" fill="#fffaf2" stroke="${ink}" stroke-width="1.5"/><ellipse cx="${x+1}" cy="60" rx="6.8" ry="7.4" fill="${eyes}"/><circle cx="${x+1}" cy="61" r="3.2" fill="#201e28"/><circle cx="${x-1}" cy="57" r="1.9" fill="white"/></g>`;
 const glasses=c.id%3===0?'<circle cx="43" cy="61" r="15"/><circle cx="78" cy="61" r="15"/>':'<rect x="27" y="48" width="32" height="25" rx="8"/><rect x="63" y="48" width="32" height="25" rx="8"/>';
 return `<svg viewBox="8 1 105 110" aria-hidden="true" stroke-linejoin="round" stroke-linecap="round">
 <rect x="0" width="120" height="124" fill="${bg}"/><circle cx="84" cy="42" r="43" fill="#fff" opacity=".25"/>
 ${c.style==='long'?`<path d="M19 108Q14 91 19 65Q10 12 55 9Q98 4 103 46Q101 81 111 100Q96 111 80 106L47 105Q30 117 17 113Z" fill="${hair}" stroke="${ink}" stroke-width="2.5"/><path d="M27 57Q27 95 22 103M97 56Q91 85 101 100" fill="none" stroke="white" opacity=".22" stroke-width="3"/>`:''}
 <path d="M0 122Q7 108 43 99L78 98Q108 102 120 119V125H0Z" fill="${shirt}"/><path d="M48 88L47 101Q60 118 75 101L73 88" fill="${shade}" stroke="${ink}" stroke-width="2"/>
 <g fill="${skin}" stroke="${shade}" stroke-width="2.5"><ellipse cx="24" cy="66" rx="9" ry="12"/><ellipse cx="96" cy="66" rx="9" ry="12"/></g>
 <path d="M24 58Q21 17 56 15Q97 11 98 55L95 75${jaws[variant]}Z" fill="${skin}" stroke="${ink}" stroke-width="2.3"/>
 <path d="M27 68Q30 92 49 99M93 68Q91 81 85 87" fill="none" stroke="${shade}" stroke-width="4" opacity=".6"/>
 ${c.style==='bald'?'<path d="M34 35q6-13 21-15" fill="none" stroke="#fff" stroke-width="4" opacity=".32"/>':`<path d="${fringes[variant]}" fill="${hair}" stroke="${ink}" stroke-width="2.5"/><path d="M30 32Q44 14 64 17M70 18Q83 15 90 25" fill="none" stroke="white" opacity=".26" stroke-width="2.5"/>`}
 <path d="M32 49q9-${6+variant} 19-2M69 47q11-${5-variant} 20 2" fill="none" stroke="${hair}" stroke-width="4"/>
 ${eye(43)}${eye(77)}
 <path d="M60 63q-1 7-4 10q4 4 10 0" fill="none" stroke="${shade}" stroke-width="2.6"/>
 ${c.beard?`<path d="M25 72Q37 85 45 81Q59 74 75 81Q85 86 95 71L92 87Q80 104 61 107Q40 105 28 88Z" fill="${hair}" stroke="${ink}" stroke-width="1.8"/>`:''}
 <path d="${smiles[variant]}" fill="${variant%2?'none':'#fff5df'}" stroke="${c.beard?'#f1bb98':'#884f47'}" stroke-width="2.3"/>
 ${c.mustache?`<path d="M39 81Q45 83 52 77Q57 73 61 78Q65 72 72 77Q78 81 83 78Q78 89 65 83L61 81Q49 90 39 81Z" fill="${hair}" stroke="${ink}" stroke-width="1.6"/>`:''}
 ${c.glasses?`<g fill="none" stroke="${ink}" stroke-width="3.7">${glasses}<path d="M58 57q3-3 6 0M27 55l-6-3M94 55l6-4"/></g>`:''}
 ${c.earrings?'<g fill="#ffdb55" stroke="#6d4a2c" stroke-width="1.6"><path d="m22 72 4 5-4 6-4-6Z"/><path d="m97 72 4 5-4 6-4-6Z"/></g>':''}
 ${c.hat?`<path d="M22 35Q25 9 43 8Q52 3 62 7Q84 4 94 26L96 34Z" fill="${shirt}" stroke="${ink}" stroke-width="2.5"/><path d="M21 31Q51 23 94 28L95 34Q53 30 20 39Z" fill="${ink}"/><path d="M16 37Q45 28 95 32L105 37Q68 35 23 43Z" fill="${shirt}" stroke="${ink}" stroke-width="2"/><path d="M30 25Q37 12 48 12" fill="none" stroke="#fff" opacity=".35" stroke-width="2.5"/>`:''}
 </svg>`;
}
export const FEATURES=[
 {key:'eyes',label:'Eye color',icon:'◉',options:['blue','green','brown','black'].map(value=>({value,label:value+' eyes'}))},
 {key:'hair',label:'Hair color',icon:'✦',options:[...['black','brown','blond','red','gray'].map(value=>({value,label:value+' hair'})),{value:'none',label:'a bald head'}]},
 {key:'style',label:'Hair style',icon:'〰',options:[{value:'long',label:'long hair'},{value:'short',label:'short hair'},{value:'bald',label:'a bald head'}]},
 ...[['glasses','Glasses','◎','glasses'],['hat','Hats','♜','a hat'],['earrings','Earrings','◆','earrings'],['beard','Beard','▾','a beard'],['mustache','Mustache','⌁','a mustache']].map(([key,label,icon,trait])=>({key,label,icon,options:[{value:true,label:trait},{value:false,label:'no '+trait.replace(/^a /,'')}]}))
];
export function question(key,value){const option=FEATURES.find(g=>g.key===key)?.options.find(o=>o.value===value);return option?'Does your person have '+option.label+'?':null;}
export function guidance(key,value,answer){const group=FEATURES.find(g=>g.key===key),trait=group.options.find(o=>o.value===(typeof value==='boolean'?true:value)).label,hasTrait=typeof value==='boolean'?(value?answer:!answer):answer;return `${answer?'Yes':'No'}! Your opponent’s person ${hasTrait?'has':'does not have'} ${trait}. Flip down everyone who ${hasTrait?'does not have':'has'} ${trait}.`;}
export function parseQuestion(text){
 const s=text.toLowerCase().replace(/grey/g,'gray').replace(/blonde/g,'blond').replace(/moustache/g,'mustache');
 const hits=[];
 for(const g of FEATURES){
  if(g.key==='eyes'||g.key==='hair'){const type=g.key==='eyes'?'eyes?':'hair';for(const o of g.options)if(new RegExp('\\b'+o.value+'(?:[- ]colou?red)?[ -]'+type+'\\b').test(s))hits.push({key:g.key,value:o.value});}
  else if(g.key==='style'){for(const o of g.options)if(s.includes(o.value+' hair')||(o.value==='bald'&&s.includes('bald')))hits.push({key:g.key,value:o.value});}
  else if(new RegExp('\\b'+(g.key==='hat'?'hat|cap':g.key==='glasses'?'glasses|spectacles':g.key)+'\\b').test(s))hits.push({key:g.key,value:!(/\b(no|without)\b|doesn.t|does not|don.t|do not/.test(s))});
 }
 if(hits.length!==1||/\b(or|and)\b/.test(s))return null;
 // Negated color/style questions are ambiguous: ask the player to choose a feature instead.
 if(['eyes','hair','style'].includes(hits[0].key)&&/\b(no|not|without)\b|doesn.t|don.t/.test(s))return null;
 return hits[0];
}
