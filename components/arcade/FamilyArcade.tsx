"use client";

import { useEffect, useState } from "react";

const GAMES = [
  ["🃏", "Memory Match"], ["❌", "Tic-Tac-Toe"], ["🔎", "Spot the Difference"],
  ["🧠", "Trivia Showdown"], ["🔤", "Word Scramble"], ["⚡", "Quick Tap"],
  ["🎯", "Guess the Picture"], ["🔢", "Number Battle"], ["🏆", "Family Challenge"],
] as const;
const ANIMALS = ["🐶", "🦊", "🐼", "🐸", "🦁", "🐵"];
type Card = { id: number; symbol: string };
function newDeck(): Card[] {
  return [...ANIMALS, ...ANIMALS]
    .map((symbol, id) => ({ id, symbol }))
    .sort(() => Math.random() - 0.5);
}
export default function FamilyArcade() {
  const [active, setActive] = useState(false);
  const [deck, setDeck] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [waiting, setWaiting] = useState(false);
  const [moves, setMoves] = useState(0);
  useEffect(() => { setDeck(newDeck()); }, []);
  function restart() {
    setDeck(newDeck()); setRevealed([]); setMatched([]);
    setTurn(0); setScores([0, 0]); setWaiting(false); setMoves(0);
  }
  function flip(id: number) {
    if (waiting || revealed.includes(id) || matched.includes(id) || revealed.length >= 2) return;
    const next = [...revealed, id];
    setRevealed(next);
    if (next.length !== 2) return;
    setMoves(n => n + 1);
    if (deck[next[0]].symbol === deck[next[1]].symbol) {
      setMatched(m => [...m, ...next]);
      setScores(s => s.map((v, i) => i === turn ? v + 1 : v));
      setRevealed([]);
    } else {
      setWaiting(true);
    }
  }
  const finished = matched.length === 12;
  return (
    <section aria-label="Adults vs. Kids Arcade" className="mx-auto max-w-4xl rounded-3xl bg-[#151515] p-4 text-white sm:p-8">
      <p className="text-xs font-bold tracking-widest text-yellow-400">ADULTS vs. KIDS™</p>
      <h2 className="mt-1 text-3xl font-black">THE ARCADE</h2>
      <p className="mt-1 text-sm text-neutral-300">Less Supervising. More Playing.</p>
      {!active ? <>
        <div className="my-6 rounded-xl bg-neutral-800 p-4">
          <p className="font-bold text-yellow-400">FAMILY GAME NIGHT STARTS HERE</p>
          <p>Pick a game. Challenge your kids. Claim bragging rights.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {GAMES.map(([emoji, name], i) => (
            <button key={name} type="button" disabled={i !== 0} onClick={() => { restart(); setActive(true); }}
              className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl bg-neutral-800 p-2 text-center disabled:opacity-60 enabled:focus-visible:outline-2 enabled:focus-visible:outline-yellow-400">
              <span aria-hidden="true" className="text-3xl">{emoji}</span>
              <span className="text-xs font-bold sm:text-sm">{name}</span>
              <span className="text-[10px] text-yellow-400">{i === 0 ? "PLAY NOW" : "COMING SOON"}</span>
            </button>
          ))}
        </div>
      </> : <>
        <button type="button" onClick={() => setActive(false)} className="my-5 text-sm text-yellow-400">← Back to Arcade</button>
        <h3 className="text-center text-xl font-bold">🃏 Memory Match</h3>
        <div className="my-4 grid grid-cols-2 gap-3 text-center">
          {["Adults", "Kids"].map((name, i) => <div key={name} className={`rounded-xl p-3 ${turn === i ? "bg-yellow-400 text-black" : "bg-neutral-800"}`}>
            <p className="text-sm font-bold">{name}{turn === i ? " • Turn" : ""}</p><p className="text-2xl font-black">{scores[i]}</p>
          </div>)}
        </div>
        <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
          {deck.map(card => {
            const faceUp = revealed.includes(card.id) || matched.includes(card.id);
            return <button type="button" key={card.id} onClick={() => flip(card.id)}
              disabled={faceUp || waiting || finished}
              aria-label={faceUp ? card.symbol : "Hidden card"}
              className={`aspect-square rounded-xl text-4xl shadow-sm focus-visible:outline-2 focus-visible:outline-yellow-400 ${faceUp ? "bg-white text-black" : "bg-pink-300 text-white"}`}>
              {faceUp ? card.symbol : "?"}
            </button>;
          })}
        </div>
        <p aria-live="polite" className="mt-5 text-center text-sm">
          {finished ? (scores[0] === scores[1] ? "It's a tie!" : `${scores[0] > scores[1] ? "Adults" : "Kids"} win!`) :
            waiting ? "No match — pass the phone to the other team." : `${turn === 0 ? "Adults" : "Kids"}: Find a pair!`}
        </p>
        {waiting && <button type="button" onClick={() => { setRevealed([]); setTurn(t => 1 - t); setWaiting(false); }}
          className="mt-3 w-full rounded-xl bg-yellow-400 p-3 font-bold text-black">Next Team's Turn →</button>}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span>Attempts: {moves}</span>
          <button type="button" onClick={restart} className="rounded-lg border border-neutral-500 px-4 py-2">New Game</button>
        </div>
      </>}
    </section>
  );
}
