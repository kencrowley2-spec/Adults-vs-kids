import {GAMES} from '../public/arcade-data.js';

const tips:Record<string,string>={
 ghostline:'Before the handoff, ask the first driver which corner cost the most time. Let the second driver test that advice against the ghost.',
 flex:'Choose a comfortable variation together before the timer starts. Take turns being the person who counts a controlled repetition.',
 hexgl:'Take separate runs on the same circuit. Let the waiting pilot call the next turn, then compare how much shield each driver kept.',
 faces:'Ask a question that could eliminate several faces. After the reveal, compare which clue helped each player narrow the board.',
 draw:'After revealing the answer, point to the detail that gave the drawing away. Switch artists so everyone gets to draw and interpret.',
 lava:'After both escapes, reveal one trap placement that surprised the runner. Trade one route-planning tip before the next course.',
 maze:'Let the waiting player trace a possible route in the air. After both turns, compare where each player first spotted a dead end.',
 rps:'Before a rematch, see if either player noticed a favorite opening move. Decide in secret whether to repeat it.',
 code:'After a safe opens, explain which clue helped you choose the next digit. Take turns being the one to explain a guess.',
 memory:'Give the pictures funny names during the preview. After the board clears, compare which names helped each player remember a pair.',
 tic:'After a draw, replay the first three moves together. Try moving the opening mark and see which blocking move changes.',
 trivia:'Let a grown-up read the choices aloud when needed. After both turns, each person picks one surprising answer to remember.',
 frog:'Watch where the other player releases the charge. Describe one short hop and one long hop before switching sides.',
 treasure:'Both players can follow the shuffle silently. After the reveal, ask which crossing made the coin hardest to track.',
 picture:'After both turns, describe the first small detail that helped you recognize an object. Compare two different guesses for the same shape.',
 number:'Pick one puzzle after the timer ends. Show each other two ways to reach the same answer, using fingers or scrap paper.',
 challenge:'Let one person demonstrate a repetition before scoring. Agree on what counts, then switch who moves and who keeps count.',
 mole:'Set the device in the same place for both turns. Compare whether watching the center or scanning the edges helped more.',
 claw:'Choose a target before moving the crane. After the handoff, see whether lining up from a different direction helps.',
 pinball:'Trade the controls after a full game. Have the waiting player call out the star while the player at the flippers watches the ball.'
};
const pinball={id:'pinball',name:'Arcade Pinball',description:'Open the Arcade cabinet and choose Play Pinball. Launch the ball and use the left and right flippers to keep it in play. Bumpers earn 100 points and the star earns 250.'};
const artwork:Record<string,string>={ghostline:'/assets/ghostline-gt.webp',flex:'/assets/flex-off-cover-480.webp',hexgl:'/games/hexgl/css/title.png',pinball:'/assets/avk-pinball-cabinet.webp'};
for(const id of ['memory','claw','lava','faces','mole'])artwork[id]='/assets/featured/'+id+'-480.webp';
export const gamePages=[...GAMES.filter(g=>g.id!=='neighborhood'),pinball].map(g=>({
 ...g,path:'/games/'+g.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),
 tip:tips[g.id],image:artwork[g.id],play:g.id==='pinball'?'/family/arcade#cabinet-pinball':'/family/arcade?game='+g.id
}));
