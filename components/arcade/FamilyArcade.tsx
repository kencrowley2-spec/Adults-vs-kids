import Link from "next/link";

// Keep any embedded Arcade entry on the same maintained 13-game experience.
export default function FamilyArcade() {
  return <section aria-label="Adults vs. Kids Arcade" className="rounded-3xl bg-[#151515] p-8 text-white">
    <p className="text-xs font-bold tracking-widest text-yellow-400">ADULTS vs. KIDS™</p>
    <h2 className="mt-2 text-3xl font-black">THE ARCADE</h2>
    <p className="my-4">Thirteen games. One device. Parents vs. kids. First to three round wins.</p>
    <Link href="/family/arcade" className="inline-block rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black">Open Arcade →</Link>
  </section>;
}
