export const FLEX_CARDS = [
 {id:'flamingo',name:'Flamingo Stand',seconds:10,instructions:'Stand tall. Lift one foot and balance for 10 seconds. Keep a support nearby.',alternative:'Hold a sturdy chair while balancing, or sit and lift one foot.'},
 {id:'plank',name:'Plank Battle',seconds:15,instructions:'Forearms under shoulders. Keep your body in a comfortable straight line for 15 seconds. Breathe.',alternative:'Keep knees down, or press your hands into a wall while standing.'},
 {id:'butterfly',name:'Butterfly Stretch',seconds:0,instructions:'Sit tall, soles of feet together. Let knees relax outward. Never push your knees down.',alternative:'Sit on a chair with feet comfortably apart; gently open your knees.'},
 {id:'pushup',name:'Push-Up Power',reps:5,seconds:0,instructions:'Do five slow push-ups. Keep your body aligned; lower and press up with control. Knees down is welcome!',alternative:'Do five controlled wall push-ups or five seated palm presses.'},
 {id:'crab',name:'Crab Walk',reps:6,seconds:0,instructions:'Sit with feet flat and hands behind you. Lift hips comfortably and take six small steps.',alternative:'Stay seated in a sturdy chair and take six alternating foot steps.'},
 {id:'toe',name:'Toe Touch',seconds:0,instructions:'With straight but unlocked knees, reach toward your toes only as far as comfortable. No bouncing or forcing.',alternative:'Sit in a chair, extend one leg and gently reach toward your shin.'},
 {id:'wall',name:'Wall Sit',seconds:15,instructions:'Back against a wall, feet forward. Slide down only as far as comfortable and hold 15 seconds. Breathe.',alternative:'Use a shallow wall sit, or sit tall in a sturdy chair for 15 seconds.'},
 {id:'star',name:'Star Balance',seconds:10,instructions:'Balance on one leg with arms out like a star for 10 seconds. Lift the other foot just a little.',alternative:'Hold a sturdy chair with one hand, or sit with arms extended.'},
 {id:'cross',name:'Cross-Leg Challenge',seconds:0,instructions:'Sit cross-legged. Try standing slowly without your hands. A nearby adult can spot you; never force it.',alternative:'Rise from a sturdy chair using hands or a helper as needed; or do one seated knee lift.'}
];
export function shuffleFlex(random=Math.random){const deck=[...FLEX_CARDS];for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;}
// Team indices match the existing Arcade: adults=0, kids=1.
export class FlexMatch {
 constructor(random=Math.random){this.deck=shuffleFlex(random);this.used=new Set();this.scores=[0,0];this.round=1;this.active=null;this.results=[];this.done=false;this.winner=null;this.history=[];}
 get selector(){return this.round%2?1:0;}
 select(id){if(this.done||this.active||this.used.has(id))throw Error('Card unavailable');const card=this.deck.find(c=>c.id===id);if(!card)throw Error('Unknown card');this.used.add(id);this.active=card;this.results=[];return card;}
 submit(team,success,value=0){if(!this.active||this.done||team!==([this.selector,1-this.selector][this.results.length]))throw Error('Attempt unavailable');if(typeof success!=='boolean'||!Number.isFinite(value)||value<0||value>100)throw Error('Invalid result');if(success&&this.active.reps&&value<this.active.reps)throw Error('Not enough repetitions');if(success&&this.active.seconds&&value<this.active.seconds)throw Error('Hold too short');this.results.push({team,success,value});if(this.results.length<2)return null;
 const a=this.results.find(r=>r.team===0),k=this.results.find(r=>r.team===1);let winner=null;
 if(a.success!==k.success)winner=a.success?0:1;else if(a.success&&(this.active.seconds||this.active.reps)&&a.value!==k.value)winner=a.value>k.value?0:1;
 if(winner!==null)this.scores[winner]++;this.history.push({card:this.active.id,winner,results:[...this.results]});
 if(this.scores.some(s=>s>=4)||(this.round>=7&&this.scores[0]!==this.scores[1])||this.round===9){this.done=true;this.winner=this.scores[0]===this.scores[1]?null:this.scores[0]>this.scores[1]?0:1;}
 const result={winner,done:this.done};this.active=null;this.round++;return result;
 }
}
