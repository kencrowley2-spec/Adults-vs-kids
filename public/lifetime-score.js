import {createResultRecorder} from './arcade-results.js?v=1';
const $=id=>document.getElementById(id),panel=$('lifetime-score');
const gameNames={memory:'Memory Match',tic:'Tic-Tac-Toe',spot:'Spot the Difference',trivia:'Trivia Showdown',word:'Word Scramble',tap:'Quick Tap',picture:'Guess the Picture',number:'Number Battle',challenge:'Family Challenge',maze:'Maze Dash',rps:'Rock Paper Scissors',code:'Code Breaker',golf:'Mini Golf'};
if(panel){
 let loading=false;
 async function load(){
  if(loading)return;loading=true;$('lifetime-refresh').disabled=true;
  try{
   const read=async()=>{const r=await fetch('/api/arcade/results',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error('Unavailable');return r.json();};
   let data=await read();
   const queue=createResultRecorder({accountId:data.accountId,storage:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},send:result=>fetch('/api/arcade/results',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...result,accountId:data.accountId})})});
   const waiting=queue.pendingCount();if(waiting){await queue.drain();data=await read();}
   const {adults,kids,total}=data.score;
   if(![adults,kids,total].every(Number.isSafeInteger)||adults<0||kids<0||adults+kids!==total)throw new Error('Invalid score');
   $('lifetime-adults').textContent=adults;$('lifetime-kids').textContent=kids;
   const lead=total===0?'Your first completed match starts the rivalry.':adults===kids?'It’s tied! Who’s taking the lead next?':`${adults>kids?'Adults':'Kids'} lead by ${Math.abs(adults-kids)} ${Math.abs(adults-kids)===1?'series win':'series wins'}.`;
   $('lifetime-status').textContent=`${lead} ${total} completed ${total===1?'match or series':'matches and series'}.${queue.pendingCount()?' A result on this device is still waiting to save.':''}`;
   $('lifetime-recent').replaceChildren();
   for(const row of data.recent){
    const item=document.createElement('li'),label=document.createElement('strong'),detail=document.createElement('span');
    label.textContent=`${row.winner===0?'Adults':'Kids'} won ${row.adult_wins}–${row.kid_wins}`;
    detail.textContent=`${row.mode==='series'?'3-game series':gameNames[row.game_ids[0]]||'Arcade match'} · ${new Date(row.completed_at).toLocaleDateString()}`;
    item.appendChild(label);item.appendChild(detail);$('lifetime-recent').appendChild(item);
   }
   if(!data.recent.length){const item=document.createElement('li');item.textContent='Your completed results will appear here.';$('lifetime-recent').appendChild(item);}
  }catch{$('lifetime-status').textContent='Your lifetime score is temporarily unavailable. Refresh to try again.';}
  finally{loading=false;$('lifetime-refresh').disabled=false;}
 }
 if(panel.dataset.scorePreview==='true'){
  $('lifetime-status').textContent='Sign in to see your family’s real lifetime score.';$('lifetime-refresh').hidden=true;
 }else{
  $('lifetime-refresh').addEventListener('click',load);
  window.addEventListener('pageshow',load);window.addEventListener('online',load);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});load();
 }
}
