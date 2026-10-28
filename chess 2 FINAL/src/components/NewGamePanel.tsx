import React, { useEffect, useState } from "react";
import { MAP_PRESETS } from "../lib/game/maps";
import { GameMode, PIECES, PieceKind, SHOP_ORDER } from "../types";
import { PieceIcon } from "./Hud";
import { getName, setName as persistName } from "../lib/clientToken";
import { sound } from "../lib/audio";

interface CustomMap {
  id: number;
  name: string;
  author: string;
  width: number;
  height: number;
  plays: number;
}

const MODES: Array<{ id: GameMode; label: string; blurb: string }> = [
  {
    id: "classic",
    label: "Gentlemen's Agreement",
    blurb: "Only classic chess pieces, farms, and harbors. For civil purists who fear airplanes and biological warfare.",
  },
  {
    id: "standard",
    label: "Full Arsenal",
    blurb: "The complete Chess 2 experience: dragons, nukes, portals, boats, and snakes. Chaos as nature intended.",
  },
  {
    id: "chaos",
    label: "Total Anarchy",
    blurb: "Discounted mercenary units, tumbling meteors, random gold rushes, and ink plagues. Zero accountability.",
  },
];

export interface SkirmishOptions {
  name: string;
  mode: GameMode;
  mapPreset: string;
  customMapId?: number;
  ai: number;
  humans: number;
  skill: "easy" | "normal" | "brutal";
  clock?: number;
  increment?: number;
}

const TIMER_PRESETS = [
  { label: "Unlimited", clock: 0, increment: 0 },
  { label: "Bullet (15s)", clock: 15, increment: 2 },
  { label: "Blitz (45s)", clock: 45, increment: 4 },
  { label: "Rapid (90s)", clock: 90, increment: 8 },
  { label: "Classical (180s)", clock: 180, increment: 12 },
];

export default function NewGamePanel({
  onStartSingleplayer,
  onOpenMultiplayer,
  onOpenEditor,
}: {
  onStartSingleplayer: (options: SkirmishOptions) => void;
  onOpenMultiplayer: () => void;
  onOpenEditor: () => void;
}) {
  const [name, setNameState] = useState(getName());
  const [mode, setMode] = useState<GameMode>("standard");
  const [map, setMap] = useState("pangaea");
  const [customId, setCustomId] = useState<number | null>(null);
  const [ai, setAi] = useState(3);
  const [humans, setHumans] = useState(1);
  const [skill, setSkill] = useState<"easy" | "normal" | "brutal">("normal");
  const [clockPreset, setClockPreset] = useState("Unlimited");
  const [clock, setClock] = useState(0);
  const [increment, setIncrement] = useState(0);
  const [customs, setCustoms] = useState<CustomMap[]>([]);

  useEffect(() => {
    fetch("/api/maps")
      .then((r) => r.json())
      .then((d) => setCustoms(d.maps ?? []))
      .catch(() => undefined);
  }, []);

  const handleStart = () => {
    persistName(name);
    onStartSingleplayer({
      name,
      mode,
      mapPreset: map,
      customMapId: customId ?? undefined,
      ai,
      humans,
      skill,
      clock,
      increment,
    });
  };

  const Chip = ({
    on,
    children,
    onClick,
  }: {
    on: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      onClick={() => {
        sound.playSelect();
        onClick();
      }}
      className="btn text-sm"
      style={{ ["--panel" as string]: on ? "#ffe066" : "#fffaf0" }}
    >
      <span>{children}</span>
    </button>
  );

  return (
    <div className="doodle p-5">
      <div>
        <h2 className="text-3xl font-black">Start a Skirmish</h2>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="w-24 text-sm font-bold">Your Name</span>
          <input
            value={name}
            onChange={(e) => {
              setNameState(e.target.value.slice(0, 18));
              persistName(e.target.value.slice(0, 18));
            }}
            className="rounded-lg border-[3px] border-[#2b2118] bg-white/80 px-3 py-1 font-bold outline-none flex-1"
          />
        </div>

        <div className="mt-3.5 flex flex-wrap items-start gap-2">
          <span className="w-24 shrink-0 pt-1.5 text-sm font-bold">Rules</span>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <Chip key={m.id} on={mode === m.id} onClick={() => setMode(m.id)}>
                {m.label}
              </Chip>
            ))}
          </div>
        </div>
        <p className="mt-1 pl-24 text-[12px] opacity-75 font-semibold">
          {MODES.find((m) => m.id === mode)?.blurb}
        </p>

        <div className="mt-3.5 flex flex-wrap items-start gap-2">
          <span className="w-24 shrink-0 pt-1.5 text-sm font-bold">Map</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {MAP_PRESETS.map((m) => (
              <Chip
                key={m.id}
                on={map === m.id && !customId}
                onClick={() => {
                  setMap(m.id);
                  setCustomId(null);
                }}
              >
                {m.name}
              </Chip>
            ))}
            {customs.map((c) => (
              <Chip
                key={c.id}
                on={customId === c.id}
                onClick={() => {
                  setCustomId(c.id);
                  setMap(c.name);
                }}
              >
                {c.name} (Custom)
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="w-24 text-sm font-bold">Opponents</span>
          {[1, 2, 3, 5, 7].map((n) => (
            <Chip key={n} on={ai === n} onClick={() => setAi(n)}>
              {n} Bot{n > 1 ? "s" : ""}
            </Chip>
          ))}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="w-24 text-sm font-bold">Hotseat</span>
          {[1, 2, 3, 4].map((n) => (
            <Chip key={n} on={humans === n} onClick={() => setHumans(n)}>
              {n} Human{n > 1 ? "s" : ""}
            </Chip>
          ))}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="w-24 text-sm font-bold">Bot Brain</span>
          {(["easy", "normal", "brutal"] as const).map((s) => (
            <Chip key={s} on={skill === s} onClick={() => setSkill(s)}>
              <span className="capitalize">{s}</span>
            </Chip>
          ))}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="w-24 text-sm font-bold">Turn Timer</span>
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

        <div className="mt-6 flex flex-wrap items-center gap-3 pt-3 border-t-2 border-dashed border-[#2b2118]/25">
          <button className="btn text-xl font-black" style={{ ["--panel" as string]: "#8ee59a" }} onClick={handleStart}>
            <span>Play Singleplayer</span>
          </button>
          <button className="btn font-bold text-base" style={{ ["--panel" as string]: "#ffe066" }} onClick={onOpenMultiplayer}>
            <span>Online Table</span>
          </button>
          <button className="btn font-bold text-base" onClick={onOpenEditor}>
            <span>Draw a Map</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function PieceGallery() {
  const colors = ["#e8574c", "#4aa3e8", "#7ac74f", "#f0c135", "#a765d8", "#f0903c", "#3fc1a5", "#96643f"];
  const list: PieceKind[] = ["king", ...SHOP_ORDER];

  return (
    <div className="doodle p-5">
      <div>
        <h2 className="text-2xl font-black">Piece Roster</h2>
        <p className="text-[13px] opacity-75 font-semibold">Classic wooden soldiers and powerful special weapons.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {list.map((k, i) => (
            <div
              key={k}
              className="flex items-start gap-2 rounded-xl border-[3px] border-dashed border-[#2b2118]/45 bg-white/50 p-2"
            >
              <PieceIcon kind={k} color={colors[i % colors.length]} size={42} />
              <div className="text-[11px] leading-tight">
                <div className="text-[13px] font-black">
                  {PIECES[k].name}
                  {k === "king" ? "" : ` · $${PIECES[k].cost}`}
                </div>
                <div className="opacity-80 text-[11px] mt-0.5">{PIECES[k].blurb}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
