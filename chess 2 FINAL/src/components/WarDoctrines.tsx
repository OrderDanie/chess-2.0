import React, { useState } from "react";

interface Doctrine {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  description: string;
  rules: string[];
  quote: string;
}

const DOCTRINES: Doctrine[] = [
  {
    id: "territory",
    title: "Territorial Paint Spills",
    subtitle: "Every tile claimed is gold in the treasury",
    badge: "EXPANSION",
    color: "#8ee59a",
    description:
      "Unlike standard chess where the board remains barren wood, Chess 2 turns every march into a land grab. Whenever a piece moves or is drafted, it splashes your kingdom's colors across the soil.",
    rules: [
      "Every piece claims a 1-to-2 tile radius of territory upon arrival.",
      "Each colored tile pays tax revenue directly into your treasury every turn.",
      "Control 65% of all habitable land on the continent to achieve immediate Territorial Hegemony victory.",
      "You can only draft fresh reinforcements inside or directly adjacent to your painted borders.",
    ],
    quote: "A king without borders is merely an eccentric gentleman carrying a wooden staff.",
  },
  {
    id: "economy",
    title: "The Desertion Economy",
    subtitle: "Bankrupt monarchs command empty thrones",
    badge: "TREASURY",
    color: "#ffe066",
    description:
      "War is expensive. Your knights, bishops, and dragons do not fight for honor—they demand monthly wages. Manage your farms and harbors, or watch your grand army pack their baggage and desert.",
    rules: [
      "Pawns demand $1/turn, Knights and Bishops demand $2/turn, Queens and Dragons demand $3/turn.",
      "Build Farms (+3 gold/turn) on land and Harbors (+2 gold/turn) on coastlines to finance your conquest.",
      "If your treasury balance hits less than $0 at the start of your turn, random unpaid units desert your cause immediately.",
      "Defeated enemy pieces yield 50% bounty gold directly into your royal coffers.",
    ],
    quote: "Loyalty is a noble virtue, but barley soup pays the knight's blacksmith.",
  },
  {
    id: "diplomacy",
    title: "Questionable Diplomacy",
    subtitle: "Pacts, tribute, and convenient backstabs",
    badge: "STATECRAFT",
    color: "#9ad3f2",
    description:
      "Why fight a two-front war when you can pay your neighbor to look the other way? Use the diplomatic dispatch scroll to forge non-aggression treaties or extort weaker realms.",
    rules: [
      "Propose 5-turn mutual peace treaties. During a treaty, neither kingdom can strike the other.",
      "Trade lump-sum gold to fund a struggling ally or bribe a hostile neighbor into peace.",
      "Demand gold tribute under threat of immediate cavalry invasion.",
      "Once a treaty expires, promises dissolve like wet parchment. Strike when they least expect it.",
    ],
    quote: "Sign with your right hand, and sharpen your dagger with your left.",
  },
  {
    id: "exotic",
    title: "Weapons of Mass Devastation",
    subtitle: "Dragons, atomic warheads, and occult portals",
    badge: "SPECIAL WEAPONS",
    color: "#f4a290",
    description:
      "When standard chess tactics stall against defensive pawn phalanxes, deploy the exotic arsenal. From airborne reptilian predators to tactical warheads, break any deadlock with supreme force.",
    rules: [
      "Dragon: Flies over all terrain, devours enemy pieces, and permanently copies their movement rules.",
      "Nuke: Can detonate on command, permanently scorching a 5x5 tile quadrant and vaporizing all occupants.",
      "Portal: Warps any friendly piece to any other portal across the world instantly.",
      "Harbors & Boats: Launch naval campaigns across oceans to bypass fortified land chokepoints.",
    ],
    quote: "There is no tactical stalemate that cannot be resolved with five tons of high-yield gunpowder.",
  },
];

export default function WarDoctrines() {
  const [activeId, setActiveId] = useState("territory");
  const current = DOCTRINES.find((d) => d.id === activeId) || DOCTRINES[0];

  return (
    <section className="doodle p-5" style={{ ["--panel" as string]: "#fffdf7" }}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-[#2b2118]/25 pb-3">
          <div>
            <div className="inline-block rounded-md border border-[#2b2118] bg-[#ffe066] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider mb-1">
              Field Manual
            </div>
            <h2 className="text-2xl font-black text-[#2b2118]">The Four Sovereign Doctrines</h2>
            <p className="text-xs font-semibold opacity-75">
              The foundational pillars that separate Chess 2 from ordinary board games.
            </p>
          </div>

          {/* Doctrine Selectors */}
          <div className="flex flex-wrap gap-1.5">
            {DOCTRINES.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setActiveId(doc.id)}
                className={`rounded-lg border-2 border-[#2b2118] px-3 py-1 text-xs font-black transition-all ${
                  activeId === doc.id
                    ? "bg-[#2b2118] text-[#fbf4dd] shadow-sm scale-105"
                    : "bg-white/75 text-[#2b2118] hover:bg-white"
                }`}
              >
                {doc.badge}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Doctrine Content */}
        <div className="mt-4 grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border-[3px] border-[#2b2118] bg-[#faf3e0] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="rounded-md border border-[#2b2118] px-2 py-0.5 text-[10px] font-black uppercase"
                style={{ backgroundColor: current.color }}
              >
                {current.badge}
              </span>
              <h3 className="text-xl font-black text-[#2b2118]">{current.title}</h3>
            </div>
            <p className="text-xs font-black text-amber-900 mb-3">{current.subtitle}</p>
            <p className="text-sm font-bold text-[#2b2118] leading-relaxed mb-4">
              {current.description}
            </p>

            <div className="rounded-xl border border-dashed border-[#2b2118]/40 bg-white/70 p-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-[#2b2118] mb-2">
                Rules of Engagement:
              </div>
              <ul className="space-y-1.5 text-xs font-bold text-[#2b2118]">
                {current.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#2b2118] mt-1 shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Commander Dispatch Note */}
          <div className="flex flex-col justify-between rounded-2xl border-[3px] border-dashed border-[#2b2118]/45 bg-[#f5ecce] p-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#2b2118]/60 mb-2">
                Imperial Archive Dispatch #0{DOCTRINES.findIndex((d) => d.id === current.id) + 1}
              </div>
              <blockquote className="text-sm font-black italic text-[#2b2118] leading-relaxed border-l-4 border-[#2b2118] pl-3 py-1">
                "{current.quote}"
              </blockquote>
            </div>

            <div className="mt-4 rounded-xl border-2 border-[#2b2118] bg-white/80 p-3 text-xs font-bold text-[#2b2118]">
              <div className="font-black text-[11px] uppercase tracking-wider text-amber-950 mb-1">
                Field Tip:
              </div>
              <div>
                Always keep 3 gold in reserve at all times. Desertion checks execute the instant your turn begins before farm harvests are collected!
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
