import React, { useState } from "react";
import { PIECES, PieceKind, SHOP_ORDER, PLAYER_COLORS } from "../types";
import { PieceIcon } from "./Hud";

const CATEGORIES: Array<{ id: string; label: string; kinds: PieceKind[] }> = [
  {
    id: "all",
    label: "Full Arsenal",
    kinds: ["king", ...SHOP_ORDER],
  },
  {
    id: "royal",
    label: "Royal Army",
    kinds: ["king", "queen", "rook", "bishop", "knight", "pawn"],
  },
  {
    id: "exotic",
    label: "Exotic Weapons",
    kinds: ["dragon", "nuke", "portal", "plane", "snake", "spider"],
  },
  {
    id: "economy",
    label: "Economy & Sea",
    kinds: ["farm", "harbor", "boat"],
  },
];

export default function UnitCodex() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPiece, setSelectedPiece] = useState<PieceKind>("dragon");

  const currentCategory = CATEGORIES.find((c) => c.id === activeTab) || CATEGORIES[0];
  const piece = PIECES[selectedPiece];

  return (
    <section
      className="doodle tilt-b p-5 transition-all"
      style={{ ["--panel" as string]: "#fef9ec" }}
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-[#2b2118]/25 pb-3">
          <div>
            <div className="inline-block rounded-md border border-[#2b2118] bg-[#ffe066] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider mb-1">
              Field Dossier
            </div>
            <h2 className="text-2xl font-black text-[#2b2118]">Imperial Unit & Weapon Codex</h2>
            <p className="text-xs font-semibold opacity-75">
              Review stats, recruitment costs, move patterns, and strategic field notes.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab(cat.id);
                  if (!cat.kinds.includes(selectedPiece)) {
                    setSelectedPiece(cat.kinds[0]);
                  }
                }}
                className={`rounded-lg border-2 border-[#2b2118] px-2.5 py-1 text-xs font-black transition-all ${
                  activeTab === cat.id
                    ? "bg-[#2b2118] text-[#fbf4dd] shadow-sm scale-105"
                    : "bg-white/70 text-[#2b2118] hover:bg-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          {/* Unit Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentCategory.kinds.map((kind, idx) => {
              const def = PIECES[kind];
              const isSelected = selectedPiece === kind;
              const unitColor = PLAYER_COLORS[idx % PLAYER_COLORS.length];

              return (
                <button
                  key={kind}
                  onClick={() => setSelectedPiece(kind)}
                  className={`flex items-center gap-2 rounded-xl border-2 p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-[#2b2118] bg-amber-100 shadow-md translate-y-[-2px] ring-2 ring-[#2b2118]"
                      : "border-dashed border-[#2b2118]/40 bg-white/60 hover:bg-white hover:border-[#2b2118]"
                  }`}
                >
                  <div className="shrink-0">
                    <PieceIcon kind={kind} color={unitColor} size={36} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-black truncate text-[#2b2118]">{def.name}</div>
                    <div className="text-[10px] font-bold opacity-75">
                      {kind === "king" ? "Sovereign" : `$${def.cost} / -$${def.upkeep} upkeep`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Piece Deep-Dive Card */}
          <div
            className="rounded-2xl border-[3px] border-[#2b2118] bg-[#fdf2d6] p-4 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b-2 border-dashed border-[#2b2118]/25 pb-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border-2 border-[#2b2118] bg-white p-2 shadow-inner">
                    <PieceIcon kind={selectedPiece} color="#e8574c" size={48} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#2b2118] leading-tight">{piece.name}</h3>
                    <div className="text-[11px] font-bold opacity-75 uppercase tracking-wide">
                      {piece.building ? "Imperial Structure" : `${piece.move.toUpperCase()} · ${piece.terrain.toUpperCase()}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-amber-900">
                    {selectedPiece === "king" ? "CROWN" : `$${piece.cost}`}
                  </div>
                  <div className="text-[10px] font-bold opacity-75">
                    {piece.income > 0 ? `+$${piece.income} income` : `-$${piece.upkeep}/turn wages`}
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                <div className="rounded-lg border border-[#2b2118]/30 bg-white/70 p-1.5">
                  <div className="opacity-60 text-[9px] uppercase">Movement</div>
                  <div className="font-black text-[#2b2118]">{piece.move}</div>
                </div>
                <div className="rounded-lg border border-[#2b2118]/30 bg-white/70 p-1.5">
                  <div className="opacity-60 text-[9px] uppercase">Range</div>
                  <div className="font-black text-[#2b2118]">{piece.range} tiles</div>
                </div>
                <div className="rounded-lg border border-[#2b2118]/30 bg-white/70 p-1.5">
                  <div className="opacity-60 text-[9px] uppercase">Paint Radius</div>
                  <div className="font-black text-[#2b2118]">{piece.claim} tile{piece.claim > 1 ? "s" : ""}</div>
                </div>
              </div>

              {/* Witty Military Dossier */}
              <div className="mt-3 rounded-xl border border-dashed border-[#2b2118]/40 bg-white/80 p-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-900 mb-1">
                  Field Commander Notes
                </div>
                <p className="text-xs font-bold leading-relaxed text-[#2b2118]">
                  "{piece.blurb}"
                </p>
              </div>
            </div>

            {/* Special Ability Pill */}
            {piece.ability ? (
              <div className="mt-3 rounded-lg border-2 border-[#2b2118] bg-[#ffe066] px-3 py-1.5 text-xs font-black text-[#2b2118] flex items-center justify-between">
                <span>SPECIAL DOCTRINE:</span>
                <span className="uppercase">{piece.ability.toUpperCase()}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
