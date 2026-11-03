(()=>{
 const question=document.getElementById('family-riddle-question'),answer=document.getElementById('family-riddle-answer'),reveal=document.getElementById('family-riddle-reveal'),next=document.getElementById('family-riddle-next');
 if(!question||!answer||!reveal||!next)return;
 const riddles=[
  ['Why did the teddy bear skip dessert?','Because it was already stuffed!'],
  ['What do you call a dinosaur that is sleeping?','A dino-snore!'],
  ['What kind of room has no doors or windows?','A mushroom!'],
  ['What has hands but can’t clap?','A clock!'],
  ['Why did the banana go to the doctor?','It wasn’t peeling well!'],
  ['What do you call a bear with no teeth?','A gummy bear!'],
  ['What gets wetter the more it dries?','A towel!'],
  ['What do you call a pig that knows karate?','A pork chop!'],
  ['Why did the cookie go to the doctor?','It felt crummy!'],
  ['What has ears but can’t hear?','A cornfield!'],
  ['What do you call cheese that isn’t yours?','Nacho cheese!'],
  ['What goes up but never comes down?','Your age!'],
  ['Why did the bicycle fall over?','It was two-tired!'],
  ['What do you call a fish wearing a bow tie?','Sofishticated!'],
  ['What has a neck but no head?','A bottle!'],
  ['Why are ghosts so bad at lying?','You can see right through them!'],
  ['What do you call a train carrying bubble gum?','A chew-chew train!'],
  ['What can you catch but never throw?','A cold!'],
  ['What do you call a dog magician?','A labracadabrador!'],
  ['Why did the math book look sad?','It had too many problems!'],
  ['What kind of tree fits in your hand?','A palm tree!'],
  ['Why did the golfer bring an extra pair of pants?','In case they got a hole in one!'],
  ['What has lots of keys but can’t open a door?','A piano!'],
  ['What do you call a cow with a great sense of humor?','A laughing stock!'],
  ['What kind of music do balloons dislike?','Pop music!'],
  ['Why did the orange stop rolling?','It ran out of juice!'],
  ['What has one eye but can’t see?','A needle!'],
  ['What do you call a duck that loves telling jokes?','A wise quacker!'],
  ['Why did the superhero flush the toilet?','Because it was their doody!'],
  ['What did one wall say to the other wall?','I’ll meet you at the corner!']
 ];
 const key='avk-family-riddles-v1';let remaining=[],last=-1;
 try{
  const saved=JSON.parse(localStorage.getItem(key)||'null');
  if(saved&&Array.isArray(saved.remaining)&&saved.remaining.length<=riddles.length&&saved.remaining.every(n=>Number.isInteger(n)&&n>=0&&n<riddles.length)&&new Set(saved.remaining).size===saved.remaining.length){remaining=saved.remaining;last=Number.isInteger(saved.last)?saved.last:-1;}
 }catch{}
 function show(){
  if(!remaining.length){
   remaining=riddles.map((_,i)=>i);
   for(let i=remaining.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[remaining[i],remaining[j]]=[remaining[j],remaining[i]];}
   if(remaining.at(-1)===last)[remaining[0],remaining[remaining.length-1]]=[remaining.at(-1),remaining[0]];
  }
  last=remaining.pop();const [q,a]=riddles[last];
  reveal.open=false;reveal.querySelector('summary').textContent='Show answer';
  question.textContent=`“${q}”`;answer.textContent=a;
  try{localStorage.setItem(key,JSON.stringify({remaining,last}));}catch{}
 }
 reveal.addEventListener('toggle',()=>{reveal.querySelector('summary').textContent=reveal.open?'Hide answer':'Show answer';});
 next.hidden=false;next.addEventListener('click',show);show();
})();
