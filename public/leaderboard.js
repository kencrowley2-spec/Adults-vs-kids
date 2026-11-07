const games={maze:{name:'Maze Dash',rule:'Reach the flag before the 45-second buzzer.'},spot:{name:'Spot the Difference',rule:'Find all 3 differences. Wrong taps add 1 second each.'},picture:{name:'Guess the Picture',rule:'Answer all 3 pictures correctly within 30 seconds.'},number:{name:'Number Battle',rule:'Answer all 5 number puzzles correctly within 30 seconds.'}};
const $=id=>document.getElementById(id);
let game='maze',nextUpdate=0,loading=false,sequence=0,lastAttempt=0;
const duration=ms=>(ms/1000).toFixed(3)+'s';
const date=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
function cell(row,value,className=''){const td=document.createElement('td');td.className=className;td.textContent=value;row.appendChild(td);return td;}
async function load(){
 const token=++sequence;loading=true;lastAttempt=Date.now();
 $('lb-status').textContent='Loading the standings…';$('lb-retry').hidden=true;
 try{
  const response=await fetch('/api/arcade/leaderboard?game='+game,{credentials:'same-origin',cache:'no-store'});
  if(response.status===401){location.assign('/login');return;}
  if(!response.ok)throw new Error('Unavailable');
  const data=await response.json();if(token!==sequence)return;
  nextUpdate=Date.parse(data.next_update_at);
  $('lb-updated').textContent='Last updated '+date(data.updated_at);
  $('lb-teams').textContent=`${data.rows.length} / 100 TEAMS`;
  $('lb-rows').replaceChildren();
  for(const record of data.rows){
   const tr=document.createElement('tr');tr.className=record.yours?'your-row':'';
   const rank=cell(tr,'#'+record.place,'rank rank-'+record.place);if(record.place===1){const crown=document.createElement('span');crown.className='rank-crown';crown.setAttribute('aria-hidden','true');crown.textContent='♛';rank.prepend(crown);}
   const name=cell(tr,'','team-name');
   const emblem=document.createElement('span');emblem.className='team-emblem';emblem.setAttribute('aria-hidden','true');emblem.textContent=record.place<=3?'🏅':'⚑';
   const label=document.createElement('strong');label.textContent=`${record.family_name}`;name.append(emblem,label);
   if(record.yours){const badge=document.createElement('small');badge.textContent='YOUR FAMILY';name.appendChild(badge);}
   cell(tr,duration(record.elapsed_ms),'time-col');cell(tr,date(record.achieved_at),'record-date');
   $('lb-rows').appendChild(tr);
  }
  $('lb-empty').hidden=data.rows.length>0;
  $('lb-status').textContent=data.rows.length?`${games[game].name}: ${data.rows.length} ranked ${data.rows.length===1?'family':'families'}.`:'';
  $('lb-best').textContent=data.bestMs===null?'NO RECORD YET':duration(data.bestMs);
  const own=data.rows.find(r=>r.yours);
  $('lb-position').textContent=own?`Published rank #${own.place} · New personal bests enter the next daily update.`:data.bestMs===null?'Complete a qualifying turn to enter.':'Record saved · Check the next daily update for your ranking.';
  tick();
 }catch{if(token===sequence){$('lb-status').textContent='We couldn’t load the latest standings. Please retry.';$('lb-retry').hidden=false;}}
 finally{if(token===sequence)loading=false;}
}
function tick(){
 if(!nextUpdate)return;
 const seconds=Math.max(0,Math.ceil((nextUpdate-Date.now())/1000));
 $('lb-countdown').textContent=seconds?`NEXT UPDATE IN ${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:'Daily update in progress…';
 // Re-fetch after the scheduled refresh, including tabs left open overnight.
 if(!seconds&&!loading&&Date.now()-lastAttempt>60000&&!document.hidden)load();
}
for(const button of document.querySelectorAll('[data-game]'))button.addEventListener('click',()=>{
 game=button.dataset.game;
 for(const tab of document.querySelectorAll('[data-game]'))tab.setAttribute('aria-pressed',String(tab===button));
 $('lb-game-title').textContent=games[game].name;$('lb-rule').textContent=games[game].rule;
 $('lb-caption').textContent=games[game].name+' · Top 100 fastest families';
 $('lb-play').href=$('lb-empty-play').href='/family/arcade?game='+game;
 $('lb-rows').replaceChildren();$('lb-empty').hidden=true;$('lb-best').textContent='—';$('lb-position').textContent='Loading your record…';load();
});
$('lb-retry').addEventListener('click',load);
window.addEventListener('online',()=>{if(!loading)load();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!loading)load();});
setInterval(tick,1000);load();
