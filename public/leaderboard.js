const $=id=>document.getElementById(id);
import {importDeviceBests} from './arcade-import-bests.js?v=1';
const tabs=[...document.querySelectorAll('[data-game]')];
let active=tabs[0];
let game=active.dataset.game,nextUpdate=0,loading=false,sequence=0,lastAttempt=0;
const displayScore=n=>game==='ghostline'?(n/1000).toFixed(2)+' s':n+' '+(n===1?active.dataset.unit.slice(0,-1):active.dataset.unit);
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
  const history=$('lb-history-rows');
  history.replaceChildren();
  for(const entry of data.history??[]){
   const item=document.createElement('li'),name=document.createElement('b'),count=document.createElement('span');
   name.textContent='#'+entry.place+'  '+entry.family_name+(entry.yours?' · Your family':'');
   count.textContent=entry.matches+' '+(entry.matches===1?'match':'matches');
   item.append(name,count);history.appendChild(item);
  }
  $('lb-history').hidden=!history.children.length;
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
   cell(tr,displayScore(game==='ghostline'?record.elapsed_ms:record.score),'time-col');cell(tr,date(record.achieved_at),'record-date');
   $('lb-rows').appendChild(tr);
  }
  $('lb-empty').hidden=data.rows.length>0;
  $('lb-status').textContent=data.rows.length?`${active.textContent}: ${data.rows.length} ranked ${data.rows.length===1?'family':'families'}.`:'';
  $('lb-best').textContent=data.bestScore===null?'NO RECORD YET':displayScore(game==='ghostline'?data.bestMs:data.bestScore);
  const own=data.rows.find(r=>r.yours);
  $('lb-position').textContent=own?`Published rank #${own.place} · New personal bests enter the next daily update.`:data.bestScore===null?'Complete a qualifying turn to enter.':'Record saved · Check the next daily update for your ranking.';
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
for(const button of tabs)button.addEventListener('click',()=>{
 $('lb-history').hidden=true;
 active=button;game=button.dataset.game;
 $('lb-direction').textContent=game==='ghostline'?'FASTEST TIME WINS':(active.dataset.lower==='true'?'LOWER':'HIGHER')+' SCORE WINS';
 $('lb-unit').textContent=active.dataset.unit.toUpperCase();
 $('lb-teams').textContent='— / 100 TEAMS';
 for(const tab of document.querySelectorAll('[data-game]'))tab.setAttribute('aria-pressed',String(tab===button));
 $('lb-game-title').textContent=active.textContent;$('lb-rule').textContent=active.dataset.rule;
 $('lb-caption').textContent=active.textContent+' · Top 100 families';
 $('lb-play').href=$('lb-empty-play').href='/family/arcade?game='+game;
 $('lb-rows').replaceChildren();$('lb-empty').hidden=true;$('lb-best').textContent='—';$('lb-position').textContent='Loading your record…';load();
});
$('lb-retry').addEventListener('click',load);
window.addEventListener('online',()=>{if(!loading)load();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!loading)load();});
setInterval(tick,1000);
const requested=tabs.find(tab=>tab.dataset.game===new URLSearchParams(location.search).get('game'));
const firstLoad=requested&&requested!==active?requested.click():load();
importDeviceBests(document.body.dataset.accountId).then(async imported=>{if(imported){await firstLoad;load();}});
