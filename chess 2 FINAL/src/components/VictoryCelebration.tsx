import React, { useEffect, useRef, useState } from "react";
import { GameState, Player } from "../types";
import { scoreOf } from "../lib/game/engine";
import { sound } from "../lib/audio";

export interface VictoryCelebrationProps {
  state: GameState;
  viewerSeat: number; // Viewseat of the local player
  onWatchReplay: () => void;
  onDismiss: () => void;
  onExit: () => void;
}

interface ConfettiDoodle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  size: number;
  shape: "ribbon" | "crown" | "star" | "triangle" | "circle";
  swaySpeed: number;
  swayOffset: number;
}

const PALETTE = ["#ffe066", "#8ee59a", "#f4a290", "#43a6dd", "#a855f7", "#fb923c", "#fdf3dc", "#2b2118"];

export default function VictoryCelebration({
  state,
  viewerSeat,
  onWatchReplay,
  onDismiss,
  onExit,
}: VictoryCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiRef = useRef<ConfettiDoodle[]>([]);
  const animIdRef = useRef<number | null>(null);
  const [clickCount, setClickCount] = useState(0);

  const isVictor = state.winner === viewerSeat;
  const winner = state.winner !== null ? state.players[state.winner] : null;
  const viewerPlayer = state.players[viewerSeat];

  // Calculate scores
  const score = scoreOf(state, viewerSeat);

  // Parse performance metrics from game log
  const viewerLogs = state.log.filter((l) => l.player === viewerSeat);
  const unitsDrafted = viewerLogs.filter((l) => l.kind === "buy").length;
  // Fallback check if kind is not perfectly tagged
  const unitsCaptured = state.log.filter(
    (l) => l.player === viewerSeat && (l.kind === "capture" || l.text.toLowerCase().includes("captured"))
  ).length;
  const treatiesSigned = state.log.filter(
    (l) => l.kind === "diplo" && l.text.toLowerCase().includes("signed")
  ).length;
  const nukesBlasted = state.log.filter(
    (l) => l.player === viewerSeat && (l.kind === "boom" || l.text.toLowerCase().includes("detonated"))
  ).length;

  // Final count of farms & harbors built
  const totalLandTiles = state.land.reduce((acc: number, v: number) => acc + (v === 1 ? 1 : 0), 0);
  const ownedTiles = state.owner.reduce((acc: number, v: number) => acc + (v === viewerSeat ? 1 : 0), 0);
  const landPercent = totalLandTiles > 0 ? Math.round((ownedTiles / totalLandTiles) * 100) : 0;
  const finalGold = viewerPlayer?.gold ?? 0;

  // Calculate Sovereign Archetype Personality Title
  let archetype = "The Grand Tactician";
  let archetypeDesc = "Balanced in territorial defense, economic development, and martial chess prowess.";
  let archetypeIcon = "[T]";

  if (nukesBlasted > 0) {
    archetype = "The Nuclear Negotiator";
    archetypeDesc = "Favored extreme atomic diplomacy when standard chess options became tedious.";
    archetypeIcon = "[N]";
  } else if (unitsCaptured > 10) {
    archetype = "The Dreaded Vanguard";
    archetypeDesc = "Left a path of pure tactical desolation. Demanded absolute chess surrender.";
    archetypeIcon = "[V]";
  } else if (finalGold > 120) {
    archetype = "The Royal Merchant King";
    archetypeDesc = "Amassed an enormous war treasury, funding statecraft on grain tariffs.";
    archetypeIcon = "[M]";
  } else if (treatiesSigned > 1) {
    archetype = "The Sovereign Peacemaker";
    archetypeDesc = "Leveraged 5-turn treaty alliances to secure boundaries through parchment and ink.";
    archetypeIcon = "[P]";
  } else if (unitsDrafted > 15) {
    archetype = "The Endless Legionnaire";
    archetypeDesc = "Maintained high recruitment rates, overwhelming opponents by pure force of numbers.";
    archetypeIcon = "[L]";
  } else if (landPercent > 50) {
    archetype = "The Imperial Cartographer";
    archetypeDesc = "Painted the map with royal authority, claiming grand sovereign domains.";
    archetypeIcon = "[C]";
  }

  // Play audio on victory/defeat
  useEffect(() => {
    if (isVictor) {
      sound.playVictory();
    } else {
      sound.playCapture(); // dramatic fall sound
    }
  }, [isVictor]);

  // Generate hand-drawn CONFETTI DOODLES
  const spawnConfetti = (w: number, h: number, count = 40, isExplosion = false) => {
    const shapes: ConfettiDoodle["shape"][] = ["ribbon", "crown", "star", "triangle", "circle"];
    const newConfetti: ConfettiDoodle[] = [];

    for (let i = 0; i < count; i++) {
      newConfetti.push({
        x: isExplosion ? w / 2 + (Math.random() - 0.5) * 120 : Math.random() * w,
        y: isExplosion ? h * 0.45 : -20 - Math.random() * h,
        vx: isExplosion ? (Math.random() - 0.5) * 14 : (Math.random() - 0.5) * 3,
        vy: isExplosion ? -5 - Math.random() * 12 : 1.5 + Math.random() * 3.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.12,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        size: 10 + Math.random() * 15,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        swaySpeed: 0.02 + Math.random() * 0.04,
        swayOffset: Math.random() * Math.PI * 2,
      });
    }
    confettiRef.current.push(...newConfetti);
  };

  // HTML5 Canvas confetti drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Initial confetti rain
    spawnConfetti(w, h, 80);

    const loop = () => {
      ctx.clearRect(0, 0, w, h);

      // Periodically spawn replacement confetti from top
      if (confettiRef.current.length < 50) {
        spawnConfetti(w, h, 15);
      }

      const confetti = confettiRef.current;
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];

        // Apply falling physics with gentle parchment drift
        c.x += c.vx + Math.sin(Date.now() * c.swaySpeed + c.swayOffset) * 0.6;
        c.y += c.vy;
        c.rotation += c.rotSpeed;

        // Slow down explosion blast friction
        c.vx *= 0.96;

        // Render hand-drawn styled doodle shapes
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        ctx.strokeStyle = "#2b2118";
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        if (c.shape === "ribbon") {
          // Billowing ribbon swirl
          ctx.moveTo(-c.size / 2, -c.size / 2);
          ctx.bezierCurveTo(
            -c.size / 4,
            -c.size,
            c.size / 4,
            0,
            c.size / 2,
            -c.size / 2
          );
          ctx.bezierCurveTo(
            c.size / 4,
            c.size / 2,
            -c.size / 4,
            -c.size / 2,
            -c.size / 2,
            -c.size / 2
          );
          ctx.fill();
          ctx.stroke();
        } else if (c.shape === "crown") {
          // Hand-drawn tiny 3-pointed crown
          const s = c.size / 2;
          ctx.moveTo(-s, s);
          ctx.lineTo(-s, -s * 0.3);
          ctx.lineTo(-s * 0.4, s * 0.2);
          ctx.lineTo(0, -s * 0.8);
          ctx.lineTo(s * 0.4, s * 0.2);
          ctx.lineTo(s, -s * 0.3);
          ctx.lineTo(s, s);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (c.shape === "star") {
          // Star outline
          const s = c.size / 2;
          for (let step = 0; step < 5; step++) {
            const angle = (Math.PI * 2 * step) / 5 - Math.PI / 2;
            const nextAngle = (Math.PI * 2 * (step + 2)) / 5 - Math.PI / 2;
            ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
            ctx.lineTo(Math.cos(nextAngle) * s, Math.sin(nextAngle) * s);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (c.shape === "triangle") {
          // Doodle triangle
          const s = c.size / 2;
          ctx.moveTo(0, -s);
          ctx.lineTo(s, s);
          ctx.lineTo(-s, s);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Scribbled circle
          const r = c.size / 2.5;
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();

        // Recycle if falls out of bounds
        if (c.y > h + 30) {
          confetti.splice(i, 1);
        }
      }

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, []);

  const handleConfettiBlast = () => {
    sound.playSelect();
    setClickCount((c) => c + 1);
    const canvas = canvasRef.current;
    if (canvas) {
      spawnConfetti(canvas.width, canvas.height, 45, true);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#2b2118]/65 backdrop-blur-sm p-4 select-none overflow-y-auto">
      {/* Canvas Confetti Animation */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10 h-full w-full" />

      {/* Primary Scroll Card */}
      <div
        className="doodle pop relative z-20 w-[580px] max-w-full overflow-hidden p-6 sm:p-8 text-center shadow-2xl tilt-a my-auto"
        style={{ ["--panel" as string]: isVictor ? "#fef6e2" : "#fdf0ec" }}
      >
        {/* Paper Tape Top Left */}
        <div className="absolute -top-3 left-6 z-30 h-6 w-24 -rotate-6 bg-[#ecd89f]/90 border border-[#2b2118]/30 shadow-sm" />
        {/* Paper Tape Top Right */}
        <div className="absolute -top-3 right-6 z-30 h-6 w-24 rotate-6 bg-[#ecd89f]/90 border border-[#2b2118]/30 shadow-sm" />

        {/* Dynamic Header Badge */}
        <div
          className={`mb-4 inline-block rounded-xl border-[3px] border-[#2b2118] px-4 py-1.5 shadow-sm transform rotate-[-1deg] ${
            isVictor ? "bg-[#ffe066]" : "bg-[#f4a290]"
          }`}
        >
          <span className="text-xs font-black tracking-widest text-[#2b2118] uppercase">
            {isVictor ? "GRAND SOVEREIGN TRIUMPH" : "VALIANT REALM DEFEAT"} · {state.mapName.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-4xl sm:text-5xl font-black tracking-tight text-[#2b2118] uppercase leading-none"
          style={{ textShadow: "3px 4px 0 rgba(43,33,24,0.18)" }}
        >
          {isVictor ? "ROYAL CONQUEST" : "FALL OF THE CROWN"}
        </h1>

        <p className="mt-3 text-sm font-bold text-[#2b2118]/90 max-w-md mx-auto leading-relaxed">
          {isVictor ? (
            <span>
              All hail <span className="underline decoration-wavy decoration-amber-500 font-black">{winner?.name}</span>!
              Your classical chess tactics and sovereign expansion have brought total hegemony to the realm.
            </span>
          ) : (
            <span>
              The royal crown has shattered on round {state.round}. Though your soldiers fought with classic chess discipline, the realm has fallen.
            </span>
          )}
        </p>

        {/* Dynamic Personality Archetype Card */}
        <div className="mt-5 p-4 rounded-xl border-[3px] border-solid border-[#2b2118] bg-white/70 shadow-sm text-left flex items-start gap-3 transform rotate-[0.5deg]">
          <div className="text-3xl p-1 bg-amber-100 rounded-lg border-2 border-[#2b2118]/40 shrink-0">
            {archetypeIcon}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
              YOUR SOVEREIGN PLAYSTYLE ARCHETYPE
            </div>
            <h4 className="text-lg font-black text-[#2b2118] leading-tight mt-0.5">{archetype}</h4>
            <p className="text-xs font-bold text-[#2b2118]/75 mt-1 leading-snug">{archetypeDesc}</p>
          </div>
        </div>

        {/* Performance Metrics Summary Grid */}
        <div className="mt-5 space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-left text-[#2b2118]/70 px-1">
            CAMPAIGN PERFORMANCE METRICS
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border-2 border-[#2b2118] bg-white/50 p-2 text-center">
              <div className="text-[9px] font-black uppercase text-[#2b2118]/60 leading-none">Score</div>
              <div className="text-base font-black text-amber-900 mt-1">{score} pts</div>
            </div>
            <div className="rounded-xl border-2 border-[#2b2118] bg-white/50 p-2 text-center">
              <div className="text-[9px] font-black uppercase text-[#2b2118]/60 leading-none">Rounds Fought</div>
              <div className="text-base font-black text-[#2b2118] mt-1">{state.round}</div>
            </div>
            <div className="rounded-xl border-2 border-[#2b2118] bg-white/50 p-2 text-center">
              <div className="text-[9px] font-black uppercase text-[#2b2118]/60 leading-none">Land Coverage</div>
              <div className="text-base font-black text-emerald-800 mt-1">{landPercent}%</div>
            </div>
            <div className="rounded-xl border-2 border-[#2b2118] bg-white/50 p-2 text-center">
              <div className="text-[9px] font-black uppercase text-[#2b2118]/60 leading-none">Gold Reserve</div>
              <div className="text-base font-black text-amber-700 mt-1">${finalGold}</div>
            </div>
          </div>
        </div>

        {/* Staggered Secondary Stats List */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs font-bold border border-dashed border-[#2b2118]/40 rounded-xl p-3 bg-white/40">
          <div className="flex justify-between border-r border-[#2b2118]/20 pr-3">
            <span className="opacity-70">Units Drafted:</span>
            <span className="font-black text-[#2b2118]">{unitsDrafted}</span>
          </div>
          <div className="flex justify-between pl-1">
            <span className="opacity-70">Enemies Eaten:</span>
            <span className="font-black text-red-800">{unitsCaptured}</span>
          </div>
          <div className="flex justify-between border-r border-[#2b2118]/20 pr-3 pt-1 border-t border-[#2b2118]/10">
            <span className="opacity-70">Treaties Negotiated:</span>
            <span className="font-black text-emerald-800">{treatiesSigned}</span>
          </div>
          <div className="flex justify-between pl-1 pt-1 border-t border-[#2b2118]/10">
            <span className="opacity-70">Nukes Detonated:</span>
            <span className="font-black text-purple-800">{nukesBlasted}</span>
          </div>
        </div>

        {/* Spark Confetti Trigger Button */}
        <div className="mt-5 flex justify-center">
          <button
            onClick={handleConfettiBlast}
            className="flex items-center gap-1.5 rounded-lg border-2 border-[#2b2118] bg-[#ffe066] px-3.5 py-1.5 text-xs font-black text-[#2b2118] transition-transform hover:scale-105 active:scale-95 shadow-sm hover:rotate-[-1deg]"
          >
            <span>Throw Confetti Doodles</span>
            {clickCount > 0 && (
              <span className="rounded bg-[#2b2118] px-1.5 py-0.5 text-[9px] text-white">+{clickCount * 45}</span>
            )}
          </button>
        </div>

        {/* Actions Button Row */}
        <div className="mt-5 flex flex-wrap justify-center gap-2.5 pt-4 border-t-2 border-dashed border-[#2b2118]/25">
          <button
            className="btn font-black text-xs sm:text-sm !py-2 !px-4"
            style={{ ["--panel" as string]: "#8ee59a" }}
            onClick={onWatchReplay}
          >
            <span>Watch Replay</span>
          </button>
          <button className="btn font-bold text-xs sm:text-sm !py-2 !px-4" onClick={onDismiss}>
            <span>Inspect Map</span>
          </button>
          <button
            className="btn font-black text-xs sm:text-sm !py-2 !px-4"
            style={{ ["--panel" as string]: "#ffe066" }}
            onClick={onExit}
          >
            <span>War Table Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
