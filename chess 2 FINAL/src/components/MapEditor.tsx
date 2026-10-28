import React, { useCallback, useEffect, useRef, useState } from "react";
import { INK, Sketch } from "../lib/art/doodle";
import { getName } from "../lib/clientToken";
import { sound } from "../lib/audio";

const W = 30;
const H = 20;
const TILE = 26;
type Tool = "land" | "water" | "spawn";

export default function MapEditor({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tiles, setTiles] = useState<number[]>(() => new Array(W * H).fill(0));
  const [spawns, setSpawns] = useState<number[]>([]);
  const [tool, setTool] = useState<Tool>("land");
  const [brush, setBrush] = useState(2);
  const [name, setName] = useState("My Scribble");
  const [msg, setMsg] = useState<string | null>(null);
  const painting = useRef(false);

  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = W * TILE * dpr;
    cvs.height = H * TILE * dpr;
    cvs.style.width = `${W * TILE}px`;
    cvs.style.height = `${H * TILE}px`;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sk = new Sketch(ctx, 4242);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const light = (x + y) % 2 === 0;
        ctx.fillStyle = tiles[i] ? (light ? "#d8c79a" : "#cebd8f") : light ? "#43a6dd" : "#3c9ad2";
        ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
      }
    }

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const right = x + 1 < W ? i + 1 : -1;
        const down = y + 1 < H ? i + W : -1;
        if (right >= 0 && tiles[i] !== tiles[right]) {
          sk.line((x + 1) * TILE, y * TILE, (x + 1) * TILE, (y + 1) * TILE, {
            stroke: "#1f3a4d",
            width: 2.6,
            amp: 1.4,
            passes: 1,
          });
        }
        if (down >= 0 && tiles[i] !== tiles[down]) {
          sk.line(x * TILE, (y + 1) * TILE, (x + 1) * TILE, (y + 1) * TILE, {
            stroke: "#1f3a4d",
            width: 2.6,
            amp: 1.4,
            passes: 1,
          });
        }
      }
    }

    spawns.forEach((i, n) => {
      const x = (i % W) * TILE + TILE / 2;
      const y = Math.floor(i / W) * TILE + TILE / 2;
      sk.ellipse(x, y, TILE * 0.36, TILE * 0.36, {
        fill: ["#4aa3e8", "#e8574c", "#f0c135", "#7ac74f", "#f0903c", "#a765d8", "#3fc1a5", "#96643f"][n % 8],
        stroke: INK,
        width: 2.4,
        amp: 1.2,
      });
    });
  }, [spawns, tiles]);

  useEffect(() => {
    draw();
  }, [draw]);

  const paintAt = (clientX: number, clientY: number) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const r = cvs.getBoundingClientRect();
    const x = Math.floor(((clientX - r.left) / r.width) * W);
    const y = Math.floor(((clientY - r.top) / r.height) * H);
    if (x < 0 || y < 0 || x >= W || y >= H) return;

    if (tool === "spawn") {
      const i = y * W + x;
      setTiles((t) => {
        const n = t.slice();
        n[i] = 1;
        return n;
      });
      setSpawns((s) => (s.includes(i) ? s.filter((v) => v !== i) : [...s, i].slice(0, 8)));
      return;
    }

    setTiles((t) => {
      const n = t.slice();
      const r2 = brush - 1;
      for (let dy = -r2; dy <= r2; dy++) {
        for (let dx = -r2; dx <= r2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (Math.abs(dx) + Math.abs(dy) > r2 + 1) continue;
          n[ny * W + nx] = tool === "land" ? 1 : 0;
        }
      }
      return n;
    });
  };

  const save = async () => {
    const str = tiles.map((t) => (t ? "#" : ".")).join("");
    try {
      const r = await fetch("/api/maps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, author: getName(), width: W, height: H, tiles: str, spawns }),
      });
      const d = await r.json();
      if (d.id) {
        setMsg("Map successfully saved to catalog!");
        window.setTimeout(onBack, 900);
      } else {
        setMsg(d.error ?? "Could not save map");
      }
    } catch {
      setMsg("Network error saving map");
    }
  };

  const Chip = ({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) => (
    <button
      className="btn text-sm"
      style={{ ["--panel" as string]: on ? "#ffe066" : "#fffaf0" }}
      onClick={() => {
        sound.playSelect();
        onClick();
      }}
    >
      <span>{children}</span>
    </button>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-4xl font-black" style={{ textShadow: "3px 4px 0 rgba(43,33,24,0.2)" }}>
          Continent Editor
        </h1>
        <button className="btn font-bold" onClick={onBack}>
          <span>← Back to Menu</span>
        </button>
      </div>

      <div className="doodle mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">Tool:</span>
          <Chip on={tool === "land"} onClick={() => setTool("land")}>
            Land
          </Chip>
          <Chip on={tool === "water"} onClick={() => setTool("water")}>
            Sea
          </Chip>
          <Chip on={tool === "spawn"} onClick={() => setTool("spawn")}>
            Capital Spawn
          </Chip>

          <span className="ml-3 text-sm font-bold">Brush:</span>
          {[1, 2, 3, 4].map((b) => (
            <Chip key={b} on={brush === b} onClick={() => setBrush(b)}>
              {b}
            </Chip>
          ))}

          <button
            className="btn text-sm ml-2"
            onClick={() => {
              setTiles(new Array(W * H).fill(0));
              setSpawns([]);
            }}
          >
            <span>Clear</span>
          </button>

          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="Map title"
            className="ml-auto rounded-lg border-[3px] border-[#2b2118] bg-white/80 px-3 py-1 font-bold outline-none"
          />
          <button className="btn" style={{ ["--panel" as string]: "#8ee59a" }} onClick={save}>
            <span>Save Map</span>
          </button>
        </div>
      </div>

      <div className="doodle inline-block p-3">
        <canvas
          ref={canvasRef}
          className="block cursor-crosshair rounded-lg"
          onPointerDown={(e) => {
            painting.current = true;
            paintAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (painting.current && tool !== "spawn") paintAt(e.clientX, e.clientY);
          }}
          onPointerUp={() => (painting.current = false)}
          onPointerLeave={() => (painting.current = false)}
        />
      </div>

      <p className="mt-3 text-sm font-bold text-white/90">
        Drag to carve continents. Drop up to 8 capitals or leave them empty to let the generator space them fairly.
      </p>
      {msg ? <p className="mt-2 text-base font-black text-amber-100">{msg}</p> : null}
    </main>
  );
}
