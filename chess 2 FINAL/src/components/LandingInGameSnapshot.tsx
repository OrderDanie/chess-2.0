import React, { useEffect, useRef } from "react";
import { INK, Sketch, drawArrow, drawPieceShape } from "../lib/art/doodle";

const OCEAN_A = "#43a6dd";
const OCEAN_B = "#3c9ad2";
const LAND_RED_A = "#f4a290";
const LAND_RED_B = "#ea8c78";
const LAND_BLUE_A = "#9ad3f2";
const LAND_BLUE_B = "#81c3e8";
const NEUTRAL_A = "#d8c79a";
const NEUTRAL_B = "#cebd8f";

export default function LandingInGameSnapshot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = 520;
    const H = 250;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = 8;
    const rows = 4;
    const tileW = W / cols;
    const tileH = (H - 38) / rows;
    const offsetY = 28;

    // Grid definition for the snapshot:
    // 0: ocean, 1: red land, 2: blue land, 3: neutral land
    const grid = [
      [1, 1, 1, 3, 3, 2, 2, 0],
      [1, 1, 1, 3, 2, 2, 0, 0],
      [1, 1, 3, 3, 2, 2, 2, 0],
      [0, 1, 1, 3, 3, 2, 0, 0],
    ];

    const sk = new Sketch(ctx, 42);

    // Draw tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = grid[r][c];
        const light = (r + c) % 2 === 0;
        let fill = light ? NEUTRAL_A : NEUTRAL_B;
        if (type === 0) fill = light ? OCEAN_A : OCEAN_B;
        else if (type === 1) fill = light ? LAND_RED_A : LAND_RED_B;
        else if (type === 2) fill = light ? LAND_BLUE_A : LAND_BLUE_B;

        ctx.fillStyle = fill;
        ctx.fillRect(c * tileW, offsetY + r * tileH, tileW + 0.5, tileH + 0.5);

        // Subtle notebook grid dots / lines on land
        if (type !== 0) {
          ctx.fillStyle = "rgba(43,33,24,0.06)";
          ctx.beginPath();
          ctx.arc(c * tileW + tileW / 2, offsetY + r * tileH + tileH / 2, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Hand-drawn coastline and national borders
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const current = grid[r][c];
        const px = c * tileW;
        const py = offsetY + r * tileH;

        // Coastline border
        if (c + 1 < cols && (current === 0) !== (grid[r][c + 1] === 0)) {
          sk.line(px + tileW, py, px + tileW, py + tileH, {
            stroke: "#1f3a4d",
            width: 2.2,
            amp: 1.4,
            step: 12,
            passes: 1,
          });
        }
        if (r + 1 < rows && (current === 0) !== (grid[r + 1][c] === 0)) {
          sk.line(px, py + tileH, px + tileW, py + tileH, {
            stroke: "#1f3a4d",
            width: 2.2,
            amp: 1.4,
            step: 12,
            passes: 1,
          });
        }

        // Territory line between Red (1) and Neutral/Blue (2,3)
        if (
          c + 1 < cols &&
          current !== 0 &&
          grid[r][c + 1] !== 0 &&
          ((current === 1 && grid[r][c + 1] !== 1) || (current !== 1 && grid[r][c + 1] === 1))
        ) {
          sk.line(px + tileW, py, px + tileW, py + tileH, {
            stroke: INK,
            width: 2.4,
            amp: 1.2,
            step: 10,
            passes: 2,
          });
        }
      }
    }

    // Move preview target circles for Knight move
    const moves = [
      { c: 3, r: 1 },
      { c: 4, r: 2 },
    ];
    for (const m of moves) {
      const cx = m.c * tileW + tileW / 2;
      const cy = offsetY + m.r * tileH + tileH / 2;
      sk.ellipse(cx, cy, tileW * 0.28, tileH * 0.32, {
        stroke: "#f7d046",
        fill: "rgba(255, 235, 140, 0.45)",
        width: 2,
        amp: 1.2,
        passes: 1,
      });
    }

    // Selected tile highlight around Red Knight at (2, 2)
    const selX = 2 * tileW + 3;
    const selY = offsetY + 2 * tileH + 3;
    sk.rect(selX, selY, tileW - 6, tileH - 6, {
      stroke: "#ffe066",
      width: 2.5,
      amp: 1.3,
      passes: 2,
    });

    // Draw pieces with hand-drawn art:
    // Red King at (0, 1)
    const drawPieceAt = (kind: any, color: string, col: number, row: number, seed: number) => {
      ctx.save();
      const cx = col * tileW + tileW / 2;
      const cy = offsetY + row * tileH + tileH / 2;
      ctx.translate(cx, cy);
      drawPieceShape(ctx, kind, Math.min(tileW, tileH) * 0.88, color, seed);
      ctx.restore();
    };

    // Red Realm
    drawPieceAt("king", "#e8574c", 0, 1, 91);
    drawPieceAt("farm", "#e8574c", 1, 0, 44);
    drawPieceAt("knight", "#e8574c", 2, 2, 53);
    drawPieceAt("pawn", "#e8574c", 1, 3, 17);

    // Blue Realm
    drawPieceAt("dragon", "#4a86e8", 5, 0, 88);
    drawPieceAt("pawn", "#4a86e8", 4, 2, 33);
    drawPieceAt("harbor", "#4a86e8", 6, 2, 72);
    drawPieceAt("boat", "#4a86e8", 7, 1, 19);
    drawPieceAt("king", "#4a86e8", 6, 1, 62);

    // Floating farm income badge "+$3"
    ctx.save();
    const farmX = 1 * tileW + tileW * 0.82;
    const farmY = offsetY + 0 * tileH + tileH * 0.3;
    ctx.fillStyle = "#2d7a36";
    ctx.font = "bold 11px 'Comic Neue', cursive, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("+$3", farmX, farmY);
    ctx.restore();

    // Hand-drawn curved tactical arrow from Red Knight (2, 2) to Blue Pawn (4, 2)
    const kx = 2 * tileW + tileW / 2;
    const ky = offsetY + 2 * tileH + tileH / 2;
    const tx = 4 * tileW + tileW / 2;
    const ty = offsetY + 2 * tileH + tileH / 2;
    drawArrow(ctx, kx, ky, tx, ty, "#f4d35e", 4.2, 77);

    // Top In-Game HUD Bar
    ctx.fillStyle = "rgba(43,33,24,0.92)";
    ctx.fillRect(0, 0, W, offsetY);

    ctx.fillStyle = "#fffaf0";
    ctx.font = "bold 12px 'Comic Neue', cursive, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ROUND 3  |  RED: $42 (+$9/t)   BLUE: $18 (+$3/t)", 12, 19);

    ctx.fillStyle = "#ffe066";
    ctx.font = "bold 11px 'Comic Neue', cursive, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("YOUR TURN  ·  TIME 4:32", W - 12, 19);

    // Bottom In-Game status strip
    ctx.fillStyle = "rgba(253, 243, 220, 0.94)";
    ctx.fillRect(0, H - 24, W, 24);
    sk.line(0, H - 24, W, H - 24, { stroke: INK, width: 1.5, passes: 1 });

    ctx.fillStyle = INK;
    ctx.font = "bold 11px 'Comic Neue', cursive, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TACTICAL PLAN: Knight to e4  |  Right-drag to sketch arrows  |  Space to end turn", 10, H - 8);

    // Subtle paper tape accents in top-left and top-right corners
    const drawTape = (x: number, y: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.fillStyle = "rgba(240, 220, 160, 0.75)";
      ctx.strokeStyle = "rgba(180, 150, 90, 0.4)";
      ctx.lineWidth = 1;
      ctx.fillRect(-18, -6, 36, 12);
      ctx.strokeRect(-18, -6, 36, 12);
      ctx.restore();
    };
    drawTape(16, 6, -18);
    drawTape(W - 16, 6, 22);
  }, []);

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border-[3px] border-[#2b2118] bg-[#f7eed4] shadow-md">
      {/* Real in-game match canvas */}
      <canvas ref={canvasRef} className="block w-full max-w-[520px] aspect-[520/250]" />

      {/* Caption strip under the live match snapshot */}
      <div className="w-full border-t-[2px] border-[#2b2118] bg-[#fffaf0] px-3.5 py-2 flex items-center justify-between text-left">
        <div>
          <div className="font-black text-sm text-[#2b2118] tracking-tight">
            Snapshot: Skirmish #142 (Turn 3 · The Cavalry Flank)
          </div>
          <div className="text-[12px] opacity-75 font-semibold text-[#2b2118]">
            Note: The dragon refuses to negotiate and demands agricultural subsidies.
          </div>
        </div>
        <div className="shrink-0 pl-2">
          <span className="inline-block rounded-md border-[2px] border-[#2b2118] bg-[#ffe066] px-2 py-0.5 text-[10px] font-black tracking-wider uppercase text-[#2b2118]">
            In-Game Capture
          </span>
        </div>
      </div>
    </div>
  );
}
