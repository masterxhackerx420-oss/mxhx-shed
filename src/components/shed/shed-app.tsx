import { useState } from "react";
import { BENCHES, type BenchId } from "@/lib/shed/ascii";
import { RANKS, StampProvider, rankFor, useStamps } from "@/lib/shed/stamps";
import { DnsBench } from "@/components/shed/dns-bench";
import { PhoneBench } from "@/components/shed/phone-bench";
import { ScrapeBench } from "@/components/shed/scrape-bench";
import { StenoBench } from "@/components/shed/steno-bench";
import { VersionsBench } from "@/components/shed/versions-bench";

function RankPlate() {
  const { stamps, ready, clear } = useStamps();
  const rank = rankFor(stamps.length);
  return (
    <div className="min-w-0 sm:w-64">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-xl tracking-wide text-gold">{ready ? rank.label : "…"}</p>
        <p className="text-sm text-mute tabular-nums">{stamps.length}/15</p>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {RANKS.map((item) => (
          <div key={item.id} className={`h-1.5 flex-1 ${stamps.length >= item.min ? "bg-gold" : "bg-line"}`} />
        ))}
      </div>
      <button type="button" className="mt-2 min-h-11 text-sm text-mute underline-offset-2 hover:text-bone hover:underline" onClick={clear}>
        Clear stamps
      </button>
    </div>
  );
}

function NavThumb({ src }: { src: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return <span className="block h-10 bg-ink" />;
  return <img src={src} alt="" className="h-10 w-full object-cover" onError={() => setHidden(true)} />;
}

function Shed() {
  const [bench, setBench] = useState<BenchId>("versions");
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6">
      <div className="mb-4">
        <div className="h-1 bg-gold" />
        <div className="mt-1 h-px bg-blood" />
      </div>
      <img
        src="/brand/masterx.jpg"
        alt="MasterX_HackerX. Never underestimate the power."
        className="w-full rounded-md ring-1 ring-line"
      />
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-wide text-gold sm:text-5xl">MXHX SHED</h1>
          <p className="font-display text-sm tracking-widest text-blood">Never underestimate the power</p>
          <p className="mt-1 text-sm text-mute">MasterX_HackerX · beginner to god mode</p>
        </div>
        <RankPlate />
      </div>
      <nav className="sticky top-0 z-20 mt-4 grid grid-cols-5 gap-1 bg-soot/95 py-2 backdrop-blur" aria-label="Benches">
        {BENCHES.map((item) => {
          const on = bench === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => setBench(item.id)}
              className={`min-h-11 overflow-hidden rounded-md ring-1 ${on ? "ring-gold" : "ring-line"}`}
            >
              <NavThumb src={item.image} />
              <span className="block py-1 text-center font-display text-xs tracking-widest text-bone">{item.word}</span>
            </button>
          );
        })}
      </nav>
      <main className="mt-4 min-w-0 flex-1">
        {bench === "versions" ? <VersionsBench /> : null}
        {bench === "scrape" ? <ScrapeBench /> : null}
        {bench === "dns" ? <DnsBench /> : null}
        {bench === "phone" ? <PhoneBench /> : null}
        {bench === "steno" ? <StenoBench /> : null}
      </main>
      <footer className="mt-8 border-t border-line py-4 text-sm text-mute">
        Public pages, public DNS, public registries, numbering plans, and notes that stay in this browser. No people search. No private networks.
      </footer>
    </div>
  );
}

export function ShedApp() {
  return (
    <StampProvider>
      <Shed />
    </StampProvider>
  );
}
