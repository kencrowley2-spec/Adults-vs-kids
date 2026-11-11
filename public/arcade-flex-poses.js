// Authored SVG demonstrations keep each movement sharp at every screen size.
export function flexPose(id,alternative=false){
 const poses={
 flamingo:['100,34','100,54 100,101','100,66 77,83 65,67','100,66 121,83 134,67','100,101 97,138 87,153','100,101 122,112 103,126'],
 plank:['47,95','65,100 130,111','73,102 65,133 47,133','79,104 86,132 104,132','130,111 154,130 170,131','130,111 150,125 164,127'],
 butterfly:['100,43','100,61 100,105','100,72 77,102 98,126','100,72 123,102 102,126','100,105 64,120 100,132','100,105 136,120 100,132'],
 pushup:['45,78','64,87 126,102','74,90 69,115 57,137','81,92 90,115 88,137','126,102 153,125 174,137','126,102 148,128 163,138'],
 crab:['57,66','72,82 113,111','79,89 52,107 43,138','83,91 74,113 66,139','113,111 143,91 161,138','113,111 124,103 137,139'],
 toe:['110,67','120,86 103,108','115,91 93,116 91,142','119,94 106,119 99,145','103,108 112,132 116,157','103,108 94,132 89,157'],
 wall:['62,38','62,56 66,105','62,67 82,84 102,84','62,70 75,91 91,94','66,105 106,105 106,144 123,144','66,105 94,111 94,148 109,148'],
 star:['100,34','100,54 100,102','100,66 74,75 47,67','100,66 126,75 153,67','100,102 94,137 84,153','100,102 129,118 150,123'],
 cross:['100,42','100,61 100,105','100,72 78,93 65,89','100,72 122,93 135,89','100,105 65,125 127,134','100,105 135,125 73,134']
 };
 const chair=['100,39','100,57 100,100','100,69 78,82 74,99','100,69 122,82 126,99','100,100 77,112 81,146','100,100 124,112 120,146'];
 const p=alternative?chair:poses[id];return `<svg class="flex-pose pose-${id} ${alternative?'pose-alt':''}" viewBox="0 0 200 180" role="img" aria-label="${alternative?'Seated or supported alternative':id+' movement demonstration'}"><ellipse cx="100" cy="161" rx="81" ry="8" fill="#ffd52222"/>${id==='wall'&&!alternative?'<path d="M43 18V153H142" stroke="#ffffff44" fill="none" stroke-width="5"/>':''}${alternative?'<path d="M62 91V117H139M68 117V154M134 117V154" fill="none" stroke="#fff8" stroke-width="5"/>':''}<g class="flex-body" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="${p[0].split(',')[0]}" cy="${p[0].split(',')[1]}" r="13" fill="#ffdbab"/><polyline points="${p[1]}" stroke="#ffd522" stroke-width="18"/>${p.slice(2).map((points,i)=>`<polyline class="flex-limb limb-${i}" points="${points}" stroke="${i<2?'#ffdbab':'#fff'}" stroke-width="9"/>`).join('')}</g>${id==='cross'&&!alternative?'<path d="M159 115V65m-9 10 9-10 9 10" fill="none" stroke="#ffd522" stroke-width="4"/><text x="100" y="178" text-anchor="middle" fill="white" font-size="11">Sit → rise slowly</text>':''}</svg>`;
}
