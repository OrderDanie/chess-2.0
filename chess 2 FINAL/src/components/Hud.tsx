import React, { useEffect, useRef, useState } from "react";
import { GameState, PIECES, PieceKind, shopFor } from "../types";
import { costOf, economy, peaceLeft } from "../lib/game/engine";
import { INK, Sketch, drawPieceShape } from "../lib/art/doodle";

export function PieceIcon({
  kind,
  color,
  size = 34,
  className = "",
}: {
  kind: PieceKind;
  color: string;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = size * dpr;
    cvs.height = size * dpr;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    let seed = 13;
    for (let i = 0; i < kind.length; i++) seed = (seed * 33 + kind.charCodeAt(i)) % 65521;
    drawPieceShape(ctx, kind, size * 0.82, color, seed);
  }, [kind, color, size]);

  return <canvas ref={ref} style={{ width: size, height: size }} className={className} />;
}

export function HandshakeDoodle({ size = 78 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = size * dpr;
    cvs.height = size * dpr;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const sk = new Sketch(ctx, 21);
    const s = (v: number) => v * size;
    const gold = "#f0b93c";

    sk.path(
      [
        [s(0.04), s(0.62)],
        [s(0.3), s(0.4)],
        [s(0.5), s(0.52)],
        [s(0.42), s(0.72)],
        [s(0.16), s(0.78)],
      ],
      { fill: gold, stroke: INK, width: 3, close: true, amp: 1.6, step: 10 },
    );
    sk.path(
      [
        [s(0.96), s(0.6)],
        [s(0.7), s(0.36)],
        [s(0.46), s(0.5)],
        [s(0.58), s(0.72)],
        [s(0.84), s(0.76)],
      ],
      { fill: "#e0a72e", stroke: INK, width: 3, close: true, amp: 1.6, step: 10 },
    );
    sk.line(s(0.44), s(0.54), s(0.6), s(0.62), { stroke: INK, width: 2, amp: 1.2 });
    sk.line(s(0.2), s(0.3), s(0.26), s(0.18), { stroke: INK, width: 2.4, amp: 1.2 });
    sk.line(s(0.78), s(0.28), s(0.74), s(0.16), { stroke: INK, width: 2.4, amp: 1.2 });
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size }} />;
}

export function HourglassDoodle({ size = 32, low = false }: { size?: number; low?: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = size * dpr;
    cvs.height = size * dpr;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const sk = new Sketch(ctx, 11);
    const s = (v: number) => v * size;
    const ink = "#2b2118";
    const sandColor = low ? "#e8574c" : "#f0b93c";

    // Hourglass top lid
    sk.line(s(0.15), s(0.15), s(0.85), s(0.15), { stroke: ink, width: 2.5, amp: 1 });
    // Hourglass bottom lid
    sk.line(s(0.15), s(0.85), s(0.85), s(0.85), { stroke: ink, width: 2.5, amp: 1 });

    // Hourglass bulb curves (sides)
    sk.path([
      [s(0.2), s(0.2)],
      [s(0.35), s(0.45)],
      [s(0.45), s(0.5)],
      [s(0.35), s(0.55)],
      [s(0.2), s(0.8)]
    ], { stroke: ink, width: 2, amp: 1.2 });

    sk.path([
      [s(0.8), s(0.2)],
      [s(0.65), s(0.45)],
      [s(0.55), s(0.5)],
      [s(0.65), s(0.55)],
      [s(0.8), s(0.8)]
    ], { stroke: ink, width: 2, amp: 1.2 });

    // Draw some sand in the bottom bulb
    sk.path([
      [s(0.48), s(0.52)],
      [s(0.32), s(0.68)],
      [s(0.24), s(0.8)],
      [s(0.76), s(0.8)],
      [s(0.68), s(0.68)],
      [s(0.52), s(0.52)]
    ], { fill: sandColor, stroke: "transparent", width: 0, close: true, amp: 1 });

    // Draw some sand in the top bulb (emptying)
    sk.path([
      [s(0.28), s(0.28)],
      [s(0.38), s(0.42)],
      [s(0.48), s(0.48)],
      [s(0.52), s(0.48)],
      [s(0.62), s(0.42)],
      [s(0.72), s(0.28)]
    ], { fill: sandColor, stroke: "transparent", width: 0, close: true, amp: 1 });

    // Trickling stream of sand down the middle
    sk.line(s(0.5), s(0.45), s(0.5), s(0.78), { stroke: sandColor, width: 1.8, amp: 0.8 });

  }, [size, low]);

  return <canvas ref={ref} style={{ width: size, height: size }} className={low ? "animate-bounce" : ""} />;
}

function clock(t: number) {
  const m = Math.max(0, Math.floor(t / 60));
  const s = Math.max(0, Math.floor(t % 60));
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerList({
  state,
  me,
  onSelectPlayer,
}: {
  state: GameState;
  me: number;
  onSelectPlayer?: (id: number) => void;
}) {
  return (
    <div className="doodle doodle-tight w-[228px] p-2" style={{ ["--panel" as string]: "#fdf3dc" }}>
      <div className="flex flex-col gap-1">
        {state.players.map((p) => {
          const eco = economy(state, p.id);
          const active = state.current === p.id;
          const peace = me !== p.id ? peaceLeft(state, me, p.id) : 0;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPlayer?.(p.id)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-left text-[13px] leading-tight transition-transform hover:scale-[1.02]"
              style={{
                background: p.alive ? `${p.color}` : "#bdb6a8",
                opacity: p.alive ? 1 : 0.55,
                border: active ? "3px solid #2b2118" : "3px solid rgba(43,33,24,0.25)",
                textDecoration: p.alive ? "none" : "line-through",
              }}
            >
              <span className="w-[86px] truncate font-bold text-[#2b2118]">
                {p.name}
                {p.isAI ? " (AI)" : ""}
              </span>
              <span className="w-[58px] font-bold text-[#2b2118]">${p.gold}</span>
              <span className="w-[34px] text-[11px] font-semibold text-[#2b2118]">
                {eco.net >= 0 ? "+" : ""}
                {eco.net}
              </span>
              {state.clock > 0 ? (
                <span className="text-[11px] font-bold text-[#2b2118]/80">{clock(p.time)}</span>
              ) : null}
              {peace > 0 ? (
                <span className="rounded bg-white/80 px-1 text-[9px] font-bold text-[#2b2118]">peace</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ShopBar({
  state,
  me,
  picked,
  onPick,
}: {
  state: GameState;
  me: number;
  picked: PieceKind | null;
  onPick: (k: PieceKind | null) => void;
}) {
  const gold = state.players[me]?.gold ?? 0;
  const list = shopFor(state.mode);

  return (
    <div className="doodle doodle-tight mx-auto flex max-w-full gap-1 overflow-x-auto p-2 scroll-thin">
      {list.map((kind) => {
        const def = PIECES[kind];
        const cost = costOf(state, kind);
        const afford = gold >= cost;
        const on = picked === kind;
        return (
          <button
            key={kind}
            title={def.blurb}
            disabled={!afford}
            onClick={() => onPick(on ? null : kind)}
            className={`flex w-[74px] shrink-0 flex-col items-center rounded-xl px-1 py-1 text-center cursor-pointer transition-all duration-200 shadow-sm
              ${on 
                ? "bg-[#ffe066] border-[3px] border-solid border-[#2b2118] scale-[1.08] -translate-y-1 shadow-md shadow-amber-900/15" 
                : "bg-white/60 border-[3px] border-dashed border-[#2b2118]/25 hover:bg-white/95"
              }
              ${afford 
                ? "hover:scale-[1.12] hover:-translate-y-1.5 hover:border-solid hover:border-[#2b2118]/60 hover:shadow-md hover:shadow-amber-500/10 active:scale-95" 
                : "opacity-40 cursor-not-allowed border-[3px] border-dashed border-[#2b2118]/15"
              }
            `}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide">{def.name}</span>
            <PieceIcon kind={kind} color={state.players[me]?.color ?? "#888"} size={34} />
            <span className="text-[10px] font-bold">${cost}</span>
            <span className="text-[9px] opacity-70">
              {def.income > 0 ? `+$${def.income}/t` : def.upkeep > 0 ? `-$${def.upkeep}/t` : "free"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function LogFeed({ state }: { state: GameState }) {
  const entries = state.log.slice(-7).reverse();
  return (
    <div className="doodle doodle-tight w-[248px] p-2 text-[12px] leading-snug" style={{ ["--panel" as string]: "#fffaf0" }}>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide opacity-60">Chronicle</div>
      <div className="flex max-h-[168px] flex-col gap-1 overflow-y-auto scroll-thin">
        {entries.length === 0 ? <div className="opacity-50">Nothing has happened yet</div> : null}
        {entries.map((e, i) => (
          <div key={i} className="flex gap-1 items-start">
            <span
              className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
              style={{ background: state.players[e.player]?.color ?? "#999" }}
            />
            <span className="leading-tight">{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface DraftOffer {
  peaceTurns: number;
  gold: number;
  demandGold: number;
}

export function DiplomacyModal({
  state,
  me,
  target,
  onClose,
  onSend,
}: {
  state: GameState;
  me: number;
  target: number;
  onClose: () => void;
  onSend: (o: DraftOffer) => void;
}) {
  const [peaceTurns, setPeaceTurns] = useState(5);
  const [gold, setGold] = useState(0);
  const [demand, setDemand] = useState(0);
  const other = state.players[target];
  const myGold = state.players[me]?.gold ?? 0;
  const peace = peaceLeft(state, me, target);
  const cycle = (v: number, list: number[]) => list[(list.indexOf(v) + 1) % list.length];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="doodle pop relative w-[430px] max-w-full p-5" style={{ ["--panel" as string]: "#fdf3dc" }}>
        <div>
          <button className="btn absolute right-2 top-2 !px-2 !py-0 text-sm" onClick={onClose}>
            <span>X</span>
          </button>
          <h3 className="text-center text-xl font-bold">Diplomacy: {other?.name}</h3>
          <p className="text-center text-sm opacity-70">
            {peace > 0 ? `Peace holds for ${peace} more turns` : "Draft offer"}
          </p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-bold">Give</span>
              <button className="btn w-[128px] text-sm" onClick={() => setPeaceTurns(cycle(peaceTurns, [0, 3, 5, 8, 12]))}>
                <span>{peaceTurns > 0 ? `${peaceTurns} turns` : "No peace"}</span>
              </button>
              <button
                className="btn w-[128px] text-sm"
                onClick={() => setGold(cycle(gold, [0, 10, 25, 50, 100].filter((g) => g <= Math.max(0, myGold)).concat(0)))}
              >
                <span>{gold > 0 ? `$${gold}` : "No gold"}</span>
              </button>
            </div>
            <HandshakeDoodle />
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-bold">Receive</span>
              <button className="btn w-[128px] text-sm" onClick={() => setDemand(cycle(demand, [0, 10, 25, 50, 100]))}>
                <span>{demand > 0 ? `$${demand}` : "None"}</span>
              </button>
              <button className="btn w-[128px] text-sm" onClick={() => setPeaceTurns(cycle(peaceTurns, [0, 3, 5, 8, 12]))}>
                <span>{peaceTurns > 0 ? "Mutual peace" : "No peace"}</span>
              </button>
              <div className="text-center text-[11px] opacity-70">
                they hold ${other?.gold ?? 0}
                <br />
                you hold ${myGold}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-center">
            <button
              className="btn text-base"
              style={{ ["--panel" as string]: "#8ee59a" }}
              onClick={() => onSend({ peaceTurns, gold: Math.min(gold, myGold), demandGold: demand })}
            >
              <span>Send Offer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OfferPrompt({
  state,
  me,
  onRespond,
}: {
  state: GameState;
  me: number;
  onRespond: (id: number, accept: boolean) => void;
}) {
  const offer = state.offers.find((o) => o.to === me);
  if (!offer) return null;
  const from = state.players[offer.from];

  return (
    <div className="absolute inset-x-0 top-20 z-40 mx-auto w-[360px] max-w-[92%]">
      <div className="doodle pop p-4 text-center" style={{ ["--panel" as string]: "#fffaf0" }}>
        <div>
          <div className="text-base font-bold">{from?.name} offers a deal!</div>
          <div className="my-2 text-[13px]">
            {offer.peaceTurns > 0 ? `Peace for ${offer.peaceTurns} rounds. ` : ""}
            {offer.gold > 0 ? `They pay you $${offer.gold}. ` : ""}
            {offer.demandGold > 0 ? `They want $${offer.demandGold}.` : ""}
          </div>
          <div className="mt-3 flex justify-center gap-3">
            <button className="btn text-sm" style={{ ["--panel" as string]: "#8ee59a" }} onClick={() => onRespond(offer.id, true)}>
              <span>Accept</span>
            </button>
            <button className="btn text-sm" style={{ ["--panel" as string]: "#ffd6d0" }} onClick={() => onRespond(offer.id, false)}>
              <span>Refuse</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UnitInfo({ state, tile }: { state: GameState; tile: number | null }) {
  if (tile === null) return null;
  const u = state.units[tile];
  if (!u) return null;
  const def = PIECES[u.kind];

  const rankNames = ["Recruit", "Veteran", "Elite", "Legend"];
  const rankName = rankNames[u.rank ?? 0];
  const xpNeeded = u.rank === 2 ? 4 : u.rank === 1 ? 2 : (u.rank ?? 0) === 0 ? 1 : null;
  const nextRankName = u.rank === 2 ? "Legend" : u.rank === 1 ? "Elite" : (u.rank ?? 0) === 0 ? "Veteran" : null;

  return (
    <div className="doodle doodle-tight w-[248px] p-2.5 bg-amber-50/70" style={{ ["--panel" as string]: "#fffaf0" }}>
      <div className="flex items-start gap-2">
        <PieceIcon kind={u.kind} color={state.players[u.owner]?.color ?? "#999"} size={40} />
        <div className="text-[12px] leading-tight flex-1">
          <div className="text-sm font-bold flex justify-between items-center">
            <span>
              {def.name}
              {u.kind === "dragon" && u.memory ? ` (${PIECES[u.memory].name})` : ""}
            </span>
            {!def.building && u.kind !== "king" && (
              <span className="text-[10px] bg-[#2b2118]/10 text-[#2b2118] px-1.5 py-0.5 rounded font-black uppercase">
                {rankName}
              </span>
            )}
          </div>
          <div className="opacity-70 font-semibold mb-1">{state.players[u.owner]?.name}</div>

          {!def.building && u.kind !== "king" && (
            <div className="mb-2 bg-[#2b2118]/5 rounded p-1 border border-[#2b2118]/10 text-[10px] space-y-0.5">
              <div className="font-bold flex justify-between text-[#1f2937]">
                <span>Victories:</span>
                <span>{u.xp ?? 0} {xpNeeded ? `(next at ${xpNeeded})` : ""}</span>
              </div>
              <div className="text-[9px] opacity-75">
                {nextRankName && xpNeeded !== null ? `Need ${xpNeeded - (u.xp ?? 0)} more victory to rank up to ${nextRankName}.` : "At peak legendary prowess!"}
              </div>
              <div className="font-extrabold text-teal-800 mt-1">
                Combat roll bonus: +{u.rank ?? 0}
              </div>
            </div>
          )}

          <div className="mt-1 leading-snug">{def.blurb}</div>
        </div>
      </div>
    </div>
  );
}
