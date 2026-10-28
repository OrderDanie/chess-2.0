import React, { useEffect, useState } from "react";
import { MAP_PRESETS } from "../lib/game/maps";
import { GameMode } from "../types";
import { getName, getToken, setName as persistName } from "../lib/clientToken";

interface Seat {
  index: number;
  type: "human" | "ai";
  name: string;
}

interface Row {
  id: number;
  code: string;
  name: string;
  mode: string;
  mapName: string;
  status: string;
  seats: Seat[];
}

export default function MultiplayerLobby({
  onJoinRoom,
  onBack,
}: {
  onJoinRoom: (gameId: number) => void;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setNameState] = useState(getName());
  const [mode, setMode] = useState<GameMode>("standard");
  const [map, setMap] = useState("pangaea");
  const [humans, setHumans] = useState(2);
  const [ais, setAis] = useState(1);
  const [clockPreset, setClockPreset] = useState("Unlimited");
  const [clock, setClock] = useState(0);
  const [increment, setIncrement] = useState(0);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const TIMER_PRESETS = [
    { label: "Unlimited", clock: 0, increment: 0 },
    { label: "Bullet (15s)", clock: 15, increment: 2 },
    { label: "Blitz (45s)", clock: 45, increment: 4 },
    { label: "Rapid (90s)", clock: 90, increment: 8 },
    { label: "Classical (180s)", clock: 180, increment: 12 },
  ];

  const load = () => {
    fetch("/api/games", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.games ?? []))
      .catch(() => undefined);
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 3500);
    return () => window.clearInterval(id);
  }, []);

  const create = async () => {
    setBusy(true);
    setMsg(null);
    persistName(name);
    try {
      const r = await fetch("/api/games", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hostToken: getToken(),
          hostName: name,
          mode,
          mapPreset: map,
          humans,
          ais,
          name: `${name}'s Table`,
          clock,
          increment,
        }),
      });
      const d = await r.json();
      if (d.id) {
        onJoinRoom(d.id);
      } else {
        setMsg(d.error ?? "Could not open a table");
      }
    } catch {
      setMsg("Connection failed while creating table");
    } finally {
      setBusy(false);
    }
  };

  const joinByCode = async () => {
    if (!code.trim()) return;
    setMsg(null);
    try {
      const r = await fetch(`/api/games?code=${encodeURIComponent(code.trim().toUpperCase())}`);
      const d = await r.json();
      if (d.game?.id) {
        onJoinRoom(d.game.id);
      } else {
        setMsg(d.error ?? "No active table found with that code");
      }
    } catch {
      setMsg("Could not verify room code");
    }
  };

  const Chip = ({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) => (
    <button className="btn text-sm" style={{ ["--panel" as string]: on ? "#ffe066" : "#fffaf0" }} onClick={onClick}>
      <span>{children}</span>
    </button>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-4xl font-black" style={{ textShadow: "3px 4px 0 rgba(43,33,24,0.2)" }}>
          Online Matches
        </h1>
        <button className="btn font-bold" onClick={onBack}>
          <span>← Back to Menu</span>
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Create Table */}
        <section className="doodle p-5">
          <div>
            <h2 className="text-2xl font-black">Open a Table</h2>

            <div className="mt-3 flex items-center gap-2">
              <span className="w-20 text-sm font-bold">Your Name</span>
              <input
                value={name}
                onChange={(e) => {
                  setNameState(e.target.value.slice(0, 18));
                  persistName(e.target.value.slice(0, 18));
                }}
                className="rounded-lg border-[3px] border-[#2b2118] bg-white/80 px-3 py-1 font-bold outline-none flex-1"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="w-20 text-sm font-bold">Rules</span>
              {(["classic", "standard", "chaos"] as const).map((m) => (
                <Chip key={m} on={mode === m} onClick={() => setMode(m)}>
                  {m}
                </Chip>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-start gap-2">
              <span className="w-20 shrink-0 pt-2 text-sm font-bold">Map</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {MAP_PRESETS.map((m) => (
                  <Chip key={m.id} on={map === m.id} onClick={() => setMap(m.id)}>
                    {m.name}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="w-20 text-sm font-bold">Humans</span>
              {[2, 3, 4, 6].map((n) => (
                <Chip key={n} on={humans === n} onClick={() => setHumans(n)}>
                  {n}
                </Chip>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="w-20 text-sm font-bold">Bots</span>
              {[0, 1, 2, 3].map((n) => (
                <Chip key={n} on={ais === n} onClick={() => setAis(n)}>
                  {n}
                </Chip>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="w-20 text-sm font-bold">Timer</span>
              {TIMER_PRESETS.map((t) => (
                <Chip
                  key={t.label}
                  on={clockPreset === t.label}
                  onClick={() => {
                    setClockPreset(t.label);
                    setClock(t.clock);
                    setIncrement(t.increment);
                  }}
                >
                  <span>{t.label}</span>
                </Chip>
              ))}
            </div>

            <button
              className="btn mt-5 w-full text-lg font-black"
              style={{ ["--panel" as string]: "#8ee59a" }}
              disabled={busy}
              onClick={create}
            >
              <span>{busy ? "Drawing the board..." : "Create Table"}</span>
            </button>

            <div className="mt-5 pt-4 border-t-2 border-dashed border-[#2b2118]/25 flex items-center gap-2">
              <input
                value={code}
                placeholder="ROOM CODE"
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
                className="w-32 rounded-lg border-[3px] border-[#2b2118] bg-white/80 px-3 py-1 uppercase tracking-widest font-black outline-none"
              />
              <button className="btn font-bold" onClick={joinByCode}>
                <span>Join by Code</span>
              </button>
            </div>

            {msg ? <p className="mt-2 text-sm font-bold text-red-700">{msg}</p> : null}
          </div>
        </section>

        {/* Public Tables */}
        <section className="doodle p-5" style={{ ["--panel" as string]: "#fffaf0" }}>
          <div>
            <h2 className="text-2xl font-black">Active Rooms</h2>
            <div className="mt-3 flex flex-col gap-2.5 max-h-[420px] overflow-y-auto scroll-thin pr-1">
              {rows.length === 0 ? (
                <div className="text-sm opacity-70 p-4 text-center">
                  No active tables right now. Open one on the left or invite a friend!
                </div>
              ) : null}
              {rows.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onJoinRoom(g.id)}
                  className="flex items-center justify-between rounded-xl border-[3px] border-dashed border-[#2b2118]/40 bg-white/70 px-3 py-2.5 text-sm hover:bg-white transition-all text-left cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-base leading-tight">{g.name}</div>
                    <div className="text-xs opacity-75 mt-0.5">
                      {g.mapName} · {g.mode} rules
                    </div>
                  </div>
                  <span className="rounded-md bg-[#ffe066] px-2.5 py-1 font-black tracking-widest text-xs border border-[#2b2118]">
                    {g.code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
