import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GameState, PIECES } from "../types";
import { INK, Sketch, drawArrow, getSprite, spritePad } from "../lib/art/doodle";

export interface Arrow {
  from: number;
  to: number;
  color: string;
}

interface Props {
  state: GameState;
  selected: number | null;
  moves: number[];
  buySpots: number[];
  blast?: number[];
  threatTiles?: Set<number>;
  premoves?: Array<{ from: number; to: number }>;
  onTile: (i: number) => void;
  arrows: Arrow[];
  onArrows: (a: Arrow[]) => void;
  focus?: number | null;
  arrowColor?: string;
}

const OCEAN_A = "#43a6dd";
const OCEAN_B = "#3c9ad2";
const NEUTRAL_A = "#d8c79a";
const NEUTRAL_B = "#cebd8f";

function mix(hex: string, amt: number) {
  const c = hex.replace("#", "");
  const n = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

export default function Board({
  state,
  selected,
  moves,
  buySpots,
  blast = [],
  threatTiles,
  premoves = [],
  onTile,
  arrows,
  onArrows,
  focus,
  arrowColor = "#f4d35e",
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrainRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const camRef = useRef({ x: 0, y: 0, tile: 46 });
  const dragRef = useRef<{ mode: "none" | "pan" | "arrow"; sx: number; sy: number; moved: boolean; from: number }>({
    mode: "none",
    sx: 0,
    sy: 0,
    moved: false,
    from: -1,
  });
  const [, force] = useState(0);
  const hoverRef = useRef<number>(-1);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 800, h: 600 });

  const ownerKey = useMemo(
    () => `${state.w}x${state.h}|${state.owner.join(",")}|${state.land.join("")}`,
    [state.w, state.h, state.owner, state.land],
  );

  const drawRef = useRef<() => void>(() => {});

  const schedule = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawRef.current();
    });
  }, []);

  const buildTerrain = useCallback(
    (tile: number) => {
      const key = `${ownerKey}|${tile}`;
      if (terrainRef.current && terrainRef.current.key === key) return terrainRef.current.canvas;
      const cvs = document.createElement("canvas");
      const W = state.w * tile;
      const H = state.h * tile;
      cvs.width = W;
      cvs.height = H;
      const ctx = cvs.getContext("2d");
      if (!ctx) return cvs;
      const sk = new Sketch(ctx, 1234);

      const colorOf = (i: number) => {
        const o = state.owner[i];
        const light = ((i % state.w) + Math.floor(i / state.w)) % 2 === 0;
        if (state.land[i] === 0) {
          if (o === -1) return light ? OCEAN_A : OCEAN_B;
          const c = state.players[o]?.color ?? OCEAN_A;
          return light ? mix(c, 6) : mix(c, -12);
        }
        if (o === -1) return light ? NEUTRAL_A : NEUTRAL_B;
        const c = state.players[o]?.color ?? NEUTRAL_A;
        return light ? mix(c, 20) : mix(c, -4);
      };

      for (let y = 0; y < state.h; y++) {
        for (let x = 0; x < state.w; x++) {
          const i = y * state.w + x;
          ctx.fillStyle = colorOf(i);
          ctx.fillRect(x * tile - 1, y * tile - 1, tile + 2, tile + 2);
        }
      }

      // hand drawn coast + border lines
      const edge = (x1: number, y1: number, x2: number, y2: number, width: number, color: string) => {
        sk.path(
          [
            [x1, y1],
            [x2, y2],
          ],
          { stroke: color, width, amp: Math.max(1.2, tile * 0.055), step: tile * 0.34, passes: 1 },
        );
      };

      for (let y = 0; y < state.h; y++) {
        for (let x = 0; x < state.w; x++) {
          const i = y * state.w + x;
          const px = x * tile;
          const py = y * tile;
          const right = x + 1 < state.w ? i + 1 : -1;
          const down = y + 1 < state.h ? i + state.w : -1;
          const coast = (a: number, b: number) =>
            b >= 0 && state.land[a] !== state.land[b];
          const owned = (a: number, b: number) =>
            b >= 0 && state.owner[a] !== state.owner[b] && (state.owner[a] !== -1 || state.owner[b] !== -1);

          if (coast(i, right)) edge(px + tile, py, px + tile, py + tile, tile * 0.1, "#1f3a4d");
          else if (owned(i, right)) edge(px + tile, py, px + tile, py + tile, tile * 0.085, INK);

          if (coast(i, down)) edge(px, py + tile, px + tile, py + tile, tile * 0.1, "#1f3a4d");
          else if (owned(i, down)) edge(px, py + tile, px + tile, py + tile, tile * 0.085, INK);

          if (x === 0 && state.land[i] === 1) edge(px, py, px, py + tile, tile * 0.1, "#1f3a4d");
          if (y === 0 && state.land[i] === 1) edge(px, py, px + tile, py, tile * 0.1, "#1f3a4d");
          if (x === state.w - 1 && state.land[i] === 1)
            edge(px + tile, py, px + tile, py + tile, tile * 0.1, "#1f3a4d");
          if (y === state.h - 1 && state.land[i] === 1)
            edge(px, py + tile, px + tile, py + tile, tile * 0.1, "#1f3a4d");
        }
      }
      terrainRef.current = { key, canvas: cvs };
      return cvs;
    },
    [ownerKey, state],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    }
    sizeRef.current = { w: W, h: H };
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cam = camRef.current;
    const tile = Math.round(cam.tile);
    const time = performance.now() / 1000;

    // ocean backdrop
    const startX = Math.floor(cam.x / tile) - 1;
    const startY = Math.floor(cam.y / tile) - 1;
    ctx.fillStyle = OCEAN_A;
    ctx.fillRect(0, 0, W, H);
    for (let y = startY; y < startY + H / tile + 3; y++) {
      for (let x = startX; x < startX + W / tile + 3; x++) {
        if ((x + y) % 2 !== 0) continue;
        ctx.fillStyle = OCEAN_B;
        ctx.fillRect(x * tile - cam.x, y * tile - cam.y, tile, tile);
      }
    }

    const terrain = buildTerrain(tile);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.drawImage(terrain, 0, 0);

    const cx = (i: number) => (i % state.w) * tile + tile / 2;
    const cy = (i: number) => Math.floor(i / state.w) * tile + tile / 2;
    const sk = new Sketch(ctx, 99);

    // Tactical threat overlay
    if (threatTiles && threatTiles.size > 0) {
      for (const i of threatTiles) {
        if (state.land[i] === 0) continue;
        sk.reseed(i * 13 + 7);
        sk.line(cx(i) - tile * 0.16, cy(i), cx(i) + tile * 0.16, cy(i), {
          stroke: "rgba(220, 38, 38, 0.45)",
          width: Math.max(1, tile * 0.04),
          amp: tile * 0.02,
        });
        sk.line(cx(i), cy(i) - tile * 0.16, cx(i), cy(i) + tile * 0.16, {
          stroke: "rgba(220, 38, 38, 0.45)",
          width: Math.max(1, tile * 0.04),
          amp: tile * 0.02,
        });
      }
    }

    // deploy spots
    if (buySpots.length) {
      for (const i of buySpots) {
        sk.reseed(i * 7 + 3);
        sk.rect(cx(i) - tile * 0.34, cy(i) - tile * 0.34, tile * 0.68, tile * 0.68, {
          stroke: "#fff8e0",
          width: Math.max(1.5, tile * 0.05),
          amp: tile * 0.05,
          step: tile * 0.3,
          passes: 1,
        });
      }
    }

    // blast preview
    for (const i of blast) {
      sk.reseed(i * 13 + 5);
      sk.ellipse(cx(i), cy(i), tile * 0.42, tile * 0.42, {
        stroke: "#ff7a4d",
        width: Math.max(1.5, tile * 0.055),
        amp: tile * 0.05,
        passes: 1,
      });
    }

    // last move trail
    if (state.lastMove && state.lastMove.from !== state.lastMove.to) {
      drawArrow(
        ctx,
        cx(state.lastMove.from),
        cy(state.lastMove.from),
        cx(state.lastMove.to),
        cy(state.lastMove.to),
        "rgba(43,33,24,0.38)",
        Math.max(2, tile * 0.07),
        state.lastMove.from + 17,
      );
    }

    // selection
    if (selected !== null) {
      sk.reseed(selected + 41);
      sk.rect(cx(selected) - tile * 0.44, cy(selected) - tile * 0.44, tile * 0.88, tile * 0.88, {
        stroke: "#ffe066",
        width: Math.max(2, tile * 0.075),
        amp: tile * 0.055,
        step: tile * 0.32,
        passes: 2,
      });
    }

    // queued premove visual highlights
    if (premoves.length > 0) {
      for (const pm of premoves) {
        // Distinct dashed source tile border (Blue-cyan)
        sk.reseed(pm.from * 17 + 1);
        sk.rect(cx(pm.from) - tile * 0.45, cy(pm.from) - tile * 0.45, tile * 0.9, tile * 0.9, {
          stroke: "#0284c7",
          width: Math.max(2.2, tile * 0.08),
          amp: tile * 0.05,
          step: tile * 0.26,
          passes: 2,
        });

        // Distinct dashed destination target tile border (Teal-emerald)
        sk.reseed(pm.to * 19 + 7);
        sk.rect(cx(pm.to) - tile * 0.45, cy(pm.to) - tile * 0.45, tile * 0.9, tile * 0.9, {
          stroke: "#0d9488",
          width: Math.max(2.5, tile * 0.09),
          amp: tile * 0.05,
          step: tile * 0.22,
          passes: 2,
        });

        // Inscribed concentric target marker in target tile
        sk.ellipse(cx(pm.to), cy(pm.to), tile * 0.3, tile * 0.3, {
          stroke: "#14b8a6",
          width: Math.max(1.8, tile * 0.065),
          amp: tile * 0.04,
          passes: 1,
        });

        // Draw distinct dashed premove directional arrow
        drawArrow(
          ctx,
          cx(pm.from),
          cy(pm.from),
          cx(pm.to),
          cy(pm.to),
          "#0d9488",
          Math.max(2.8, tile * 0.085),
          pm.from * 7 + pm.to,
        );
      }
    }

    // move hints
    for (const m of moves) {
      sk.reseed(m * 5 + 9);
      if (state.units[m]) {
        sk.ellipse(cx(m), cy(m), tile * 0.42, tile * 0.42, {
          stroke: "#e8574c",
          width: Math.max(2, tile * 0.075),
          amp: tile * 0.05,
          passes: 2,
        });
      } else {
        sk.ellipse(cx(m), cy(m), tile * 0.15, tile * 0.15, {
          fill: "rgba(255,248,224,0.82)",
          stroke: INK,
          width: Math.max(1, tile * 0.03),
          amp: tile * 0.03,
          passes: 1,
        });
      }
    }

    // units
    const pad = spritePad(tile * 0.78);
    for (let i = 0; i < state.units.length; i++) {
      const u = state.units[i];
      if (!u) continue;
      const color = state.players[u.owner]?.color ?? "#ccc";
      const sprite = getSprite(u.kind, color, Math.round(tile * 0.78), dpr);
      const size = Math.round(tile * 0.78) + pad * 2;
      const done = u.owner === state.current && u.mv > 0 && PIECES[u.kind].move !== "none";

      // Calculate unit-specific idle animation offsets
      const tSeed = i * 4.3 + u.id * 1.7; // unique phase offset per unit instance
      let dx = 0;
      let dy = 0;
      let rotation = 0;
      let scaleX = 1;
      let scaleY = 1;

      const def = PIECES[u.kind];
      const isFlying = u.kind === "dragon" || u.kind === "plane";
      const isWater = u.kind === "boat";
      const isBuilding = def.building || u.kind === "portal" || u.kind === "farm" || u.kind === "harbor";

      if (isFlying) {
        // Float up and down noticeably representing flying wings
        dy = Math.sin(time * 3 + tSeed) * (tile * 0.08);
        rotation = Math.sin(time * 2 + tSeed) * 0.04;
        // Wing beat squash
        scaleY = 1 + Math.sin(time * 6 + tSeed) * 0.035;
      } else if (isWater) {
        // Roll and bob in the ocean waves
        dy = Math.sin(time * 2.2 + tSeed) * (tile * 0.04) + (tile * 0.01);
        rotation = Math.sin(time * 1.8 + tSeed) * 0.07;
      } else if (u.kind === "tank") {
        // Engine hum/vibration (high frequency)
        dx = Math.sin(time * 35 + tSeed) * (tile * 0.007);
        dy = Math.cos(time * 35 + tSeed) * (tile * 0.007);
      } else if (isBuilding) {
        // Sturdy, minor breathing pulse
        scaleY = 1 + Math.sin(time * 1.5 + tSeed) * 0.012;
      } else if (u.kind === "king") {
        // Deep majestic breathing
        scaleY = 1 + Math.sin(time * 1.2 + tSeed) * 0.035;
        scaleX = 1 - Math.sin(time * 1.2 + tSeed) * 0.015;
        dy = -Math.abs(Math.sin(time * 1.2 + tSeed)) * (tile * 0.015);
      } else {
        // Standard ground units (Pawn, Knight, etc.): breathe and rock slightly
        dy = Math.sin(time * 2.5 + tSeed) * (tile * 0.022);
        rotation = Math.sin(time * 2 + tSeed) * 0.035;
        scaleY = 1 + Math.sin(time * 2.5 + tSeed) * 0.02;
        scaleX = 1 - Math.sin(time * 2.5 + tSeed) * 0.01;
      }

      ctx.save();
      
      // Translate to the cell center of the unit (including standard lift offset)
      const drawX = cx(i) + dx;
      const drawY = cy(i) - tile * 0.04 + dy;
      ctx.translate(drawX, drawY);

      if (rotation !== 0) {
        ctx.rotate(rotation);
      }
      if (scaleX !== 1 || scaleY !== 1) {
        ctx.scale(scaleX, scaleY);
      }

      // Draw the sprite centered at (0, 0)
      ctx.globalAlpha = done ? 0.55 : 1;
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.globalAlpha = 1;

      // Draw actual hand-drawn weapon spins and unit-specific action animations on top
      sk.reseed(u.id * 17 + 3);
      const white = "#fffaf0";

      if (u.kind === "pawn") {
        // twirl spear!
        const spearAngle = time * 7.5;
        ctx.save();
        ctx.translate(tile * 0.22, 0); // pawn's hand position
        ctx.rotate(spearAngle);
        // Shaft
        sk.line(0, tile * 0.32, 0, -tile * 0.32, { stroke: INK, width: tile * 0.04, passes: 1 });
        // Spearhead
        sk.path([[-tile * 0.04, -tile * 0.26], [0, -tile * 0.38], [tile * 0.04, -tile * 0.26]], { fill: white, stroke: INK, width: tile * 0.03, close: true });
        ctx.restore();
      } else if (u.kind === "knight") {
        // Swinging sword!
        const swordAngle = Math.sin(time * 6) * 0.6 - 0.2;
        ctx.save();
        ctx.translate(-tile * 0.16, tile * 0.1); // knight's side
        ctx.rotate(swordAngle);
        // Blade
        sk.path([[0, 0], [0, -tile * 0.36], [-tile * 0.03, -tile * 0.32]], { fill: white, stroke: INK, width: tile * 0.03, close: true });
        // Guard
        sk.line(-tile * 0.06, 0, tile * 0.06, 0, { stroke: INK, width: tile * 0.04 });
        ctx.restore();
      } else if (u.kind === "bishop") {
        // Glowing staff orb emitting sparkly wiggles
        ctx.save();
        ctx.translate(tile * 0.22, -tile * 0.06);
        const pulse = 1 + Math.sin(time * 8) * 0.15;
        sk.ellipse(0, 0, tile * 0.06 * pulse, tile * 0.06 * pulse, { fill: "#fef08a", stroke: INK, width: tile * 0.025 });
        for (let r = 0; r < 4; r++) {
          const a = r * Math.PI / 2 + time * 2.5;
          const len = tile * 0.13 * pulse;
          sk.line(0, 0, Math.cos(a) * len, Math.sin(a) * len, { stroke: "#f59e0b", width: tile * 0.015, passes: 1 });
        }
        ctx.restore();
      } else if (u.kind === "rook") {
        // Spinning battle shield!
        ctx.save();
        ctx.rotate(time * 3);
        for (let s = 0; s < 3; s++) {
          const a = (s * Math.PI * 2) / 3;
          sk.ellipse(Math.cos(a) * tile * 0.32, Math.sin(a) * tile * 0.32, tile * 0.04, tile * 0.04, { fill: "#ef4444", stroke: INK, width: tile * 0.025 });
        }
        ctx.restore();
      } else if (u.kind === "queen") {
        // Floating cosmic scepter swirling!
        ctx.save();
        ctx.translate(tile * 0.34, -tile * 0.12);
        ctx.rotate(time * 4);
        sk.line(0, tile * 0.24, 0, -tile * 0.24, { stroke: INK, width: tile * 0.03, passes: 1 });
        sk.ellipse(0, -tile * 0.22, tile * 0.05, tile * 0.05, { fill: "#ffe066", stroke: INK, width: tile * 0.025 });
        ctx.restore();
      } else if (u.kind === "king") {
        // Majestic golden brandishing sword!
        const swordAngle = Math.sin(time * 4) * 0.5 + 0.3;
        ctx.save();
        ctx.translate(tile * 0.24, tile * 0.1);
        ctx.rotate(swordAngle);
        sk.path([[0, 0], [0, -tile * 0.42], [tile * 0.03, -tile * 0.38]], { fill: "#f0b93c", stroke: INK, width: tile * 0.035, close: true });
        sk.line(-tile * 0.08, 0, tile * 0.08, 0, { stroke: INK, width: tile * 0.04 });
        ctx.restore();
      } else if (u.kind === "plane") {
        // Fast spinning front propeller!
        ctx.save();
        ctx.translate(0, -tile * 0.34);
        ctx.rotate(time * 40);
        sk.ellipse(0, 0, tile * 0.22, tile * 0.03, { fill: "rgba(43,33,24,0.3)", stroke: INK, width: 1.2 });
        sk.ellipse(0, 0, tile * 0.035, tile * 0.035, { fill: INK });
        ctx.restore();
      } else if (u.kind === "portal") {
        // Twirling white cosmic vortex spiral
        ctx.save();
        ctx.rotate(-time * 4.5);
        const spiral: Array<[number, number]> = [];
        for (let idx = 0; idx < 24; idx++) {
          const t = idx / 24;
          const a = t * Math.PI * 3.5;
          const r = tile * 0.22 * (1 - t);
          spiral.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        sk.path(spiral, { stroke: white, width: tile * 0.035, passes: 1 });
        ctx.restore();
      } else if (u.kind === "spider") {
        // snapping mandibles!
        const snap = Math.abs(Math.sin(time * 7)) * 0.14;
        ctx.save();
        ctx.translate(-tile * 0.05, -tile * 0.15);
        ctx.rotate(-snap);
        sk.path([[0, 0], [-tile * 0.03, -tile * 0.07], [0, -tile * 0.11]], { stroke: INK, width: tile * 0.025 });
        ctx.restore();
        ctx.save();
        ctx.translate(tile * 0.05, -tile * 0.15);
        ctx.rotate(snap);
        sk.path([[0, 0], [tile * 0.03, -tile * 0.07], [0, -tile * 0.11]], { stroke: INK, width: tile * 0.025 });
        ctx.restore();
      } else if (u.kind === "snake") {
        // flicking forked tongue
        const flick = Math.sin(time * 16) > 0.4;
        if (flick) {
          ctx.save();
          ctx.translate(tile * 0.24, -tile * 0.18);
          sk.path([[0, 0], [tile * 0.1, 0], [tile * 0.14, -tile * 0.03]], { stroke: "#ef4444", width: tile * 0.02, passes: 1 });
          sk.path([[tile * 0.1, 0], [tile * 0.14, tile * 0.03]], { stroke: "#ef4444", width: tile * 0.02, passes: 1 });
          ctx.restore();
        }
      } else if (u.kind === "boat") {
        // fluttering main flag
        ctx.save();
        ctx.translate(0, -tile * 0.34);
        const skew = Math.sin(time * 14) * 0.15;
        ctx.transform(1, 0, skew, 1, 0, 0);
        sk.path([[0, 0], [-tile * 0.16, tile * 0.04], [0, tile * 0.08]], { fill: "#f59e0b", stroke: INK, width: tile * 0.02, close: true });
        ctx.restore();
      } else if (u.kind === "tank") {
        // smoke exhaust particles
        if (Math.sin(time * 12) > 0.5) {
          ctx.save();
          ctx.translate(-tile * 0.24, -tile * 0.06);
          sk.ellipse(0, 0, tile * 0.035, tile * 0.035, { stroke: "rgba(100,116,139,0.35)", width: 1 });
          ctx.restore();
        }
      } else if (u.kind === "dragon") {
        // snorting flame puffs!
        const snort = Math.sin(time * 3) > 0.3;
        if (snort) {
          ctx.save();
          ctx.translate(tile * 0.28, -tile * 0.12);
          const fCycle = (time * 8) % Math.PI;
          const fSize = Math.sin(fCycle) * tile * 0.2;
          sk.path([[0, 0], [fSize * 0.8, -fSize * 0.35], [fSize, 0], [fSize * 0.8, fSize * 0.35]], { fill: "#ef4444", stroke: "#ffe066", width: tile * 0.02, close: true });
          ctx.restore();
        }
      }

      // Draw dragon copied ability indicator text with matched transform
      if (u.kind === "dragon" && u.memory) {
        ctx.font = `${Math.round(tile * 0.22)}px "Comic Neue", cursive`;
        ctx.fillStyle = INK;
        ctx.textAlign = "center";
        ctx.fillText(u.memory.slice(0, 2).toUpperCase(), 0, tile * 0.44);
      }

      // Draw unit experience rank badges (V, E, L) with matched transform
      if (u.rank && u.rank > 0 && u.kind !== "king" && !def.building) {
        const rankChars = ["", "[V]", "[E]", "[L]"];
        const rankCol = u.rank === 3 ? "#b45309" : u.rank === 2 ? "#1e40af" : "#0f766e";
        ctx.font = `bold ${Math.round(tile * 0.17)}px "Comic Neue", cursive`;
        ctx.fillStyle = rankCol;
        ctx.textAlign = "center";
        ctx.fillText(rankChars[u.rank], -tile * 0.28, -tile * 0.24);
      }

      ctx.restore();
    }

    // explosion doodle
    if (state.boom && state.turn - state.boom.turn <= 1) {
      const i = state.boom.at;
      sk.reseed(state.boom.at + state.boom.turn);
      const pts: [number, number][] = [];
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        const r = tile * (k % 2 === 0 ? 0.75 : 0.36);
        pts.push([cx(i) + Math.cos(a) * r, cy(i) + Math.sin(a) * r]);
      }
      sk.path(pts, {
        close: true,
        fill: "rgba(255,190,80,0.75)",
        stroke: "#c1440e",
        width: Math.max(2, tile * 0.07),
        amp: tile * 0.06,
        step: tile * 0.3,
      });
    }

    // player arrows
    for (const a of arrows) {
      drawArrow(ctx, cx(a.from), cy(a.from), cx(a.to), cy(a.to), a.color, Math.max(3, tile * 0.1), a.from * 3 + 1);
    }
    const drag = dragRef.current;
    if (drag.mode === "arrow" && drag.from >= 0 && hoverRef.current >= 0 && hoverRef.current !== drag.from) {
      drawArrow(
        ctx,
        cx(drag.from),
        cy(drag.from),
        cx(hoverRef.current),
        cy(hoverRef.current),
        arrowColor,
        Math.max(3, tile * 0.1),
        7,
      );
    }

    // Weather visual overlay (pencil-drawn / doodle aesthetic)
    if (state.weather && state.weather !== "sun") {
      ctx.save();
      if (state.weather === "fog") {
        ctx.strokeStyle = "rgba(230, 235, 240, 0.45)";
        ctx.lineWidth = tile * 0.14;
        // Fog drifts slowly over time
        const seedWeather = state.turn * 31 + Math.floor(time * 0.6);
        sk.reseed(seedWeather);
        const driftOffset = (time * 14) % (state.w * tile);
        for (let idxWeather = 0; idxWeather < 6; idxWeather++) {
          const yFog = (idxWeather / 5) * (state.h * tile);
          sk.line(-tile - driftOffset, yFog, state.w * tile + tile - driftOffset, yFog + (idxWeather % 2 === 0 ? 10 : -10), {
            stroke: "rgba(224, 231, 255, 0.35)",
            width: tile * 0.2,
            amp: tile * 0.15,
            passes: 1,
          });
        }
      } else if (state.weather === "blizzard") {
        sk.reseed(state.turn * 17);
        // Wind gusts
        const windOffset = (time * 18) % (state.w * tile);
        for (let idxWeather = 0; idxWeather < 8; idxWeather++) {
          const xSnow = ((idxWeather / 7) * (state.w * tile) - windOffset + state.w * tile) % (state.w * tile);
          sk.line(xSnow, -tile, xSnow - tile * 2, state.h * tile + tile, {
            stroke: "rgba(255, 255, 255, 0.28)",
            width: Math.max(1, tile * 0.04),
            amp: tile * 0.08,
            passes: 1,
          });
        }
        // Continuous falling snow particles
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        for (let idxWeather = 0; idxWeather < 40; idxWeather++) {
          const xDrift = idxWeather * 123 + state.turn * 17 - time * 28;
          const yFall = idxWeather * 456 + state.turn * 23 + time * 72;
          const xSnow = ((Math.abs(xDrift) % 1000) / 1000) * (state.w * tile);
          const ySnow = ((Math.abs(yFall) % 1000) / 1000) * (state.h * tile);
          ctx.beginPath();
          ctx.arc(xSnow, ySnow, Math.max(1.2, tile * 0.035), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (state.weather === "storm") {
        sk.reseed(state.turn * 53);
        // Heavy rain streaks
        ctx.strokeStyle = "rgba(180, 200, 230, 0.4)";
        ctx.lineWidth = Math.max(1, tile * 0.025);
        for (let idxWeather = 0; idxWeather < 32; idxWeather++) {
          const xDrift = idxWeather * 177 + state.turn * 41 - time * 130;
          const yFall = idxWeather * 333 + state.turn * 19 + time * 360;
          const xRain = ((Math.abs(xDrift) % 1000) / 1000) * (state.w * tile);
          const yRain = ((Math.abs(yFall) % 1000) / 1000) * (state.h * tile);
          ctx.beginPath();
          ctx.moveTo(xRain, yRain);
          ctx.lineTo(xRain - tile * 0.12, yRain + tile * 0.35);
          ctx.stroke();
        }

        // Lightning flashes in and out rapidly based on real time
        for (let idxWeather = 0; idxWeather < 2; idxWeather++) {
          const flashInterval = 6.2;
          const flashTimer = (time + idxWeather * 3.1) % flashInterval;
          if (flashTimer < 0.22) {
            // Rapid double flicker
            const isFlickerOn = flashTimer < 0.07 || (flashTimer > 0.12 && flashTimer < 0.19);
            if (isFlickerOn) {
              const boltX = (((idxWeather * 321 + state.turn * 11) % (state.w - 2)) + 1) * tile;
              const boltPoints: [number, number][] = [
                [boltX, 0],
                [boltX - tile * 0.3, tile * 1.5],
                [boltX + tile * 0.2, tile * 1.8],
                [boltX - tile * 0.2, tile * 3.5],
                [boltX + tile * 0.1, tile * 4.2],
                [boltX - tile * 0.4, tile * 5.8],
              ];
              sk.path(boltPoints, {
                stroke: "#fef08a",
                width: Math.max(2, tile * 0.08),
                amp: tile * 0.05,
                passes: 2,
              });
            }
          }
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }, [arrowColor, arrows, blast, buildTerrain, buySpots, moves, selected, state]);

  useLayoutEffect(() => {
    drawRef.current = draw;
  });

  const centeredRef = useRef(false);
  const fitView = useCallback(() => {
    if (centeredRef.current) return;
    const wrap = wrapRef.current;
    if (!wrap || wrap.clientWidth < 10) return;
    const fit = Math.min((wrap.clientWidth - 40) / state.w, (wrap.clientHeight - 210) / state.h);
    const tile = Math.max(24, Math.min(54, Math.round(fit)));
    camRef.current.tile = tile;
    camRef.current.x = (state.w * tile - wrap.clientWidth) / 2;
    camRef.current.y = (state.h * tile - wrap.clientHeight) / 2 + 40;
    centeredRef.current = true;
    schedule();
  }, [schedule, state.h, state.w]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      fitView();
      schedule();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fitView, schedule]);

  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      drawRef.current();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    schedule();
  }, [draw, schedule]);

  useEffect(() => {
    fitView();
  }, [fitView]);

  useEffect(() => {
    if (focus === null || focus === undefined || focus < 0) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const tile = camRef.current.tile;
    camRef.current.x = (focus % state.w) * tile + tile / 2 - wrap.clientWidth / 2;
    camRef.current.y = Math.floor(focus / state.w) * tile + tile / 2 - wrap.clientHeight / 2;
    schedule();
  }, [focus, state.w, schedule]);

  const tileAt = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return -1;
    const r = wrap.getBoundingClientRect();
    const cam = camRef.current;
    const tile = Math.round(cam.tile);
    const x = Math.floor((clientX - r.left + cam.x) / tile);
    const y = Math.floor((clientY - r.top + cam.y) / tile);
    if (x < 0 || y < 0 || x >= state.w || y >= state.h) return -1;
    return y * state.w + x;
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        const i = tileAt(e.clientX, e.clientY);
        if (e.button === 2) {
          dragRef.current = { mode: "arrow", sx: e.clientX, sy: e.clientY, moved: false, from: i };
        } else {
          dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, moved: false, from: i };
        }
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        const i = tileAt(e.clientX, e.clientY);
        if (i !== hoverRef.current) {
          hoverRef.current = i;
          if (drag.mode === "arrow") schedule();
        }
        if (drag.mode === "pan" && (e.buttons & 1) === 1) {
          const dx = e.clientX - drag.sx;
          const dy = e.clientY - drag.sy;
          if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
          camRef.current.x -= dx;
          camRef.current.y -= dy;
          drag.sx = e.clientX;
          drag.sy = e.clientY;
          schedule();
        }
      }}
      onPointerUp={(e) => {
        const drag = dragRef.current;
        const i = tileAt(e.clientX, e.clientY);
        if (drag.mode === "arrow") {
          if (i >= 0 && drag.from >= 0 && i !== drag.from) {
            onArrows([...arrows, { from: drag.from, to: i, color: arrowColor }]);
          } else {
            onArrows([]);
          }
        } else if (!drag.moved && i >= 0) {
          if (arrows.length) onArrows([]);
          onTile(i);
        }
        dragRef.current = { mode: "none", sx: 0, sy: 0, moved: false, from: -1 };
        force((v) => v + 1);
        schedule();
      }}
      onWheel={(e) => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const r = wrap.getBoundingClientRect();
        const cam = camRef.current;
        const before = cam.tile;
        const next = Math.max(20, Math.min(84, cam.tile * (e.deltaY > 0 ? 0.9 : 1.1)));
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        cam.x = ((cam.x + mx) * next) / before - mx;
        cam.y = ((cam.y + my) * next) / before - my;
        cam.tile = next;
        schedule();
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div className="absolute bottom-[86px] left-3 flex flex-col gap-1 z-10">
        {[
          { label: "+", factor: 1.18 },
          { label: "−", factor: 0.85 },
        ].map((b) => (
          <button
            key={b.label}
            className="btn !px-3 !py-1 text-lg font-black"
            onClick={(e) => {
              e.stopPropagation();
              const wrap = wrapRef.current;
              if (!wrap) return;
              const cam = camRef.current;
              const before = cam.tile;
              const next = Math.max(20, Math.min(84, cam.tile * b.factor));
              const mx = wrap.clientWidth / 2;
              const my = wrap.clientHeight / 2;
              cam.x = ((cam.x + mx) * next) / before - mx;
              cam.y = ((cam.y + my) * next) / before - my;
              cam.tile = next;
              schedule();
            }}
          >
            <span>{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
