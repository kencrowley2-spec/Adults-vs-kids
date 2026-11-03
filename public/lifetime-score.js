import {createResultRecorder} from './arcade-results.js?v=1';
const $=id=>document.getElementById(id),panel=$('lifetime-score');
const gameNames={memory:'Memory Match',tic:'Tic-Tac-Toe',spot:'Spot the Difference',trivia:'Trivia Showdown',word:'Word Scramble',tap:'Quick Tap',treasure:'Treasure Shuffle',picture:'Guess the Picture',number:'Number Battle',challenge:'Family Challenge',maze:'Maze Dash',rps:'Rock Paper Scissors',code:'Code Breaker',golf:'Mini Golf'};
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
   const leader=adults>kids?'Adults':'Kids',loser=adults>kids?'Kids':'Adults';
   const lead=total===0?'The rivalry starts here. Your first completed match makes the headlines.':adults===kids?`The family series is all square through ${total} completed matches.`:`${leader} lead by ${Math.abs(adults-kids)} in the family series through ${total} completed ${total===1?'match':'matches'}.`;
   $('lifetime-status').textContent=lead+(queue.pendingCount()?' A result on this device is still waiting to save.':'');
   const challenges={
    Adults:["Adults, you’re not going to take that, are you? Time for a comeback!","Adults, the kids have the bragging rights. Ready to earn them back?","Adults, all that life experience… and the kids are ahead? Rematch time!"],
    Kids:["Kids, you’re not going to take that, are you? Time for a comeback!","Kids, the grown-ups have the lead. Show them what you’ve got!","Kids, the adults are getting comfortable up there. Time to shake things up!"]
   };
   $('lifetime-smacktalk').textContent=total===0?'Adults vs. Kids. Bragging rights are up for grabs. Who’s striking first?':adults===kids?'All tied up. Who’s making the next headline?':challenges[loser][(total-1)%challenges[loser].length];
   $('lifetime-challenge').hidden=false;
   $('lifetime-recent').replaceChildren();
   for(const row of data.recent){
    const item=document.createElement('li'),label=document.createElement('strong'),detail=document.createElement('span');
    label.textContent=`${row.winner===0?'Adults':'Kids'} won ${row.adult_wins}–${row.kid_wins}`;
    detail.textContent=`${row.mode==='series'?'3-game series':gameNames[row.game_ids[0]]||'Arcade match'} · ${new Date(row.completed_at).toLocaleDateString()}`;
    item.appendChild(label);item.appendChild(detail);$('lifetime-recent').appendChild(item);
   }
   if(!data.recent.length){const item=document.createElement('li');item.textContent='Your completed results will appear here.';$('lifetime-recent').appendChild(item);}
  }catch{$('lifetime-challenge').hidden=true;$('lifetime-status').textContent='Your lifetime score is temporarily unavailable. Refresh to try again.';}
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
