export class DrawMatch {
 constructor(rounds=3,first=0){if(![3,5,0].includes(rounds))throw Error('Invalid rounds');this.rounds=rounds;this.first=first;this.turn=0;this.scores=[0,0];this.finished=false;}
 get artist(){return (this.first+this.turn)%2;}
 get guesser(){return 1-this.artist;}
 get round(){return Math.floor(this.turn/2)+1;}
 settle(correct){if(this.finished)throw Error('Match ended');if(correct)this.scores[this.guesser]++;this.turn++;this.finished=this.rounds>0&&this.turn===this.rounds*2;}
 end(){if(this.turn===0||this.turn%2)throw Error('Finish both turns first');this.finished=true;}
 get winner(){return this.scores[0]===this.scores[1]?null:this.scores[0]>this.scores[1]?0:1;}
}
