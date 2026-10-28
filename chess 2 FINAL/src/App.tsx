import React, { useEffect, useState } from "react";
import NewGamePanel, { SkirmishOptions } from "./components/NewGamePanel";
import GameScreen from "./components/GameScreen";
import MultiplayerLobby from "./components/MultiplayerLobby";
import MapEditor from "./components/MapEditor";
import LandingInGameSnapshot from "./components/LandingInGameSnapshot";
import UnitCodex from "./components/UnitCodex";
import WarDoctrines from "./components/WarDoctrines";
import AudioController from "./components/AudioController";
import ParallaxBackground from "./components/ParallaxBackground";
import { sound } from "./lib/audio";
import { GameState } from "./types";
import { createGame, PlayerConfig } from "./lib/game/engine";
import { buildMap, mapFromTiles, MAP_PRESETS } from "./lib/game/maps";
import { getName, getToken, setName as persistName } from "./lib/clientToken";

type View = "home" | "play_local" | "play_online" | "mp_lobby" | "editor";

interface HallOfFameItem {
  id: number;
  player: string;
  score: number;
  outcome: string;
  mapName: string;
  turns: number;
}

const QUICK_SCENARIOS = [
  {
    title: "Pangaea Skirmish",
    badge: "RECOMMENDED",
    color: "#8ee59a",
    blurb: "4 sovereign kingdoms battle across the continent. Classical imperial expansion.",
    config: { mode: "standard" as const, map: "pangaea", ai: 3, humans: 1, skill: "normal" as const },
  },
  {
    title: "Steppe Blitz (1v1)",
    badge: "FAST DUEL",
    color: "#ffe066",
    blurb: "Tight symmetrical arena. Immediate tactical contact and fierce border friction.",
    config: { mode: "standard" as const, map: "arena", ai: 1, humans: 1, skill: "normal" as const },
  },
  {
    title: "Archipelago Armada",
    badge: "NAVAL WAR",
    color: "#9ad3f2",
    blurb: "Islands scattered across blue seas. Harbors and naval landings decide the war.",
    config: { mode: "standard" as const, map: "archipelago", ai: 2, humans: 1, skill: "normal" as const },
  },
  {
    title: "Chaos Realm",
    badge: "TOTAL ANARCHY",
    color: "#f4a290",
    blurb: "Discounted mercenary recruitment, tactical nukes, and hungry dragons.",
    config: { mode: "chaos" as const, map: "atlas", ai: 3, humans: 1, skill: "normal" as const },
  },
];

const FEATURES = [
  ["Chess Tactics, Sovereign Geopolitics", "Every piece moves with chess precision, but now they demand monthly wages and conquer territory."],
  ["Territorial Paint Spills", "Units literally paint the earth when they arrive. More colored tiles equal more tax revenue from peasant scribbles."],
  ["Kingdom Economy & Desertion", "Farms and harbors finance your war machine. If you go broke, your loyal knights pack their bags and desert."],
  ["Questionable Diplomacy", "Sign 5-turn peace treaties, extort your neighbors for pocket change, and break your promises whenever convenient."],
  ["Medieval Weapons of Mass Destruction", "Deploy dragons that devour bishops and copy their moves, or nukes when peace was never an option."],
  ["Recruitment & Conscription", "Draft fresh pieces from your reserve strip, deploy them behind your borders, and advance."],
  ["Multiplayer & AI Opponents", "Challenge friends via room codes, join public lobbies, or humiliate 3 tiers of bot intelligence."],
  ["Continent Cartography", "Draw your own custom continents with ink brushes if you think Earth's geography was poorly planned."],
];

export default function App() {
  const [view, setView] = useState<View>("home");
  const [playerName, setPlayerName] = useState(getName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [localGame, setLocalGame] = useState<GameState | null>(null);
  const [onlineGameId, setOnlineGameId] = useState<number | null>(null);
  const [onlineState, setOnlineState] = useState<GameState | null>(null);
  const [onlineSeat, setOnlineSeat] = useState<number>(0);
  const [onlineCode, setOnlineCode] = useState<string>("");
  const [hallOfFame, setHallOfFame] = useState<HallOfFameItem[]>([]);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load hall of fame records
  const loadLeaderboard = () => {
    fetch("/api/results")
      .then((r) => r.json())
      .then((d) => setHallOfFame(d.top ?? []))
      .catch(() => undefined);
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const handleSaveName = (newName: string) => {
    const trimmed = newName.trim() || "Lord Sovereign";
    persistName(trimmed);
    setPlayerName(trimmed);
    setIsEditingName(false);
  };

  const startSingleplayer = async (opts: SkirmishOptions) => {
    setLoadingMsg("Sharpening pencils and laying out continent parchment...");
    try {
      let map;
      if (opts.customMapId) {
        const res = await fetch("/api/maps");
        const data = await res.json();
        const custom = (data.maps ?? []).find((m: { id: number }) => m.id === opts.customMapId);
        if (custom) {
          map = mapFromTiles(custom.name, custom.width, custom.height, custom.tiles, custom.spawns ?? [], opts.humans + opts.ai);
        }
      }
      if (!map) {
        map = buildMap(opts.mapPreset, opts.humans + opts.ai);
      }

      const total = opts.humans + opts.ai;
      const configs: PlayerConfig[] = [];
      for (let i = 0; i < total; i++) {
        const isAI = i >= opts.humans;
        configs.push({
          name: isAI ? `Bot ${i + 1}` : i === 0 ? opts.name : `Player ${i + 1}`,
          isAI,
          skill: opts.skill,
        });
      }

      const game = createGame(map, configs, opts.mode, opts.clock ?? 0, opts.increment ?? 0);
      setLocalGame(game);
      setView("play_local");
    } catch {
      const fallbackMap = buildMap("pangaea", 4);
      const game = createGame(fallbackMap, [
        { name: opts.name, isAI: false },
        { name: "Bot 1", isAI: true },
        { name: "Bot 2", isAI: true },
        { name: "Bot 3", isAI: true },
      ], "standard", opts.clock ?? 0, opts.increment ?? 0);
      setLocalGame(game);
      setView("play_local");
    } finally {
      setLoadingMsg(null);
    }
  };

  const joinOnlineRoom = async (gameId: number) => {
    setLoadingMsg("Pulling up an imperial war chair at table...");
    try {
      const token = getToken();
      const name = playerName;
      const r = await fetch(`/api/games/${gameId}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name }),
      });
      const d = await r.json();
      if (d.state) {
        setOnlineGameId(gameId);
        setOnlineState(d.state as GameState);
        setOnlineSeat(d.seat ?? 0);
        setOnlineCode(d.code ?? "");
        setView("play_online");
      } else {
        alert(d.error ?? "Could not connect to table");
      }
    } catch {
      alert("Network error connecting to table");
    } finally {
      setLoadingMsg(null);
    }
  };

  const handleBackToMenu = () => {
    setView("home");
    setLocalGame(null);
    setOnlineGameId(null);
    setOnlineState(null);
    loadLeaderboard();
  };

  if (loadingMsg) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#251d16]">
        <div
          className="doodle wiggle px-8 py-5 text-xl font-black text-[#2b2118]"
          style={{ ["--panel" as string]: "#fdf3dc" }}
        >
          <span>{loadingMsg}</span>
        </div>
      </div>
    );
  }

  if (view === "play_local" && localGame) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <GameScreen
          initial={localGame}
          mode="local"
          playerName={playerName}
          onExit={handleBackToMenu}
        />
      </div>
    );
  }

  if (view === "play_online" && onlineState && onlineGameId) {
    return (
      <div className="relative h-screen w-screen overflow-hidden">
        <GameScreen
          initial={onlineState}
          mode="online"
          seat={onlineSeat}
          gameId={onlineGameId}
          token={getToken()}
          playerName={playerName}
          onExit={handleBackToMenu}
        />
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
          <div
            className="doodle doodle-tight px-3 py-1 text-xs font-bold shadow"
            style={{ ["--panel" as string]: "#ffe066" }}
          >
            <span>
              TABLE CODE <b className="tracking-widest font-black text-sm">{onlineCode}</b>
              {onlineSeat < 0 ? " · SPECTATING" : ` · SEAT ${onlineSeat + 1}`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (view === "mp_lobby") {
    return (
      <div className="min-h-screen">
        <MultiplayerLobby
          onJoinRoom={joinOnlineRoom}
          onBack={handleBackToMenu}
        />
      </div>
    );
  }

  if (view === "editor") {
    return (
      <div className="min-h-screen">
        <MapEditor onBack={handleBackToMenu} />
      </div>
    );
  }

  // Overhauled Landing Page View
  return (
    <div className="relative min-h-screen pb-16 font-sans text-[#2b2118] overflow-x-hidden">
      {/* Hand-Drawn Parallax Background Cartography Layers */}
      <ParallaxBackground scrollY={scrollY} />

      {/* Top Sovereign Ribbon Header */}
      <nav className="sticky top-0 z-40 border-b-[3px] border-[#2b2118] bg-[#fbf4de]/95 backdrop-blur-sm shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="rounded-lg border-2 border-[#2b2118] bg-[#2b2118] px-2.5 py-0.5 text-xs font-black tracking-widest text-[#fbf4dd] uppercase">
              CHESS 2
            </span>
            <span className="hidden sm:inline text-xs font-black text-[#2b2118]/80 tracking-wide">
              SOVEREIGN EMPIRES & ROYAL DIPLOMACY
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            {/* Audio Controller */}
            <AudioController />

            {/* General Identity Tag */}
            <div className="flex items-center gap-1.5 rounded-lg border-2 border-[#2b2118] bg-white/80 px-2.5 py-1">
              <span className="opacity-60 text-[10px] uppercase">General:</span>
              {isEditingName ? (
                <input
                  type="text"
                  defaultValue={playerName}
                  autoFocus
                  onBlur={(e) => handleSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName((e.target as HTMLInputElement).value);
                  }}
                  className="w-28 rounded border border-[#2b2118] px-1 py-0 text-xs font-black outline-none"
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="font-black text-[#2b2118] hover:underline flex items-center gap-1"
                  title="Click to rename your commander identity"
                >
                  <span>{playerName}</span>
                  <span className="text-[10px] opacity-50">(edit)</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setView("mp_lobby")}
              className="btn !px-3 !py-1 text-xs font-black hidden md:block"
              style={{ ["--panel" as string]: "#ffe066" }}
            >
              <span>Multiplayer</span>
            </button>

            <button
              onClick={() => setView("editor")}
              className="btn !px-3 !py-1 text-xs font-black hidden sm:block"
            >
              <span>Map Editor</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 pt-6 space-y-8">
        {/* Grand Hero Header with Live In-Game Snapshot */}
        <header
          className="doodle tilt-a overflow-hidden p-0 shadow-xl"
          style={{ ["--panel" as string]: "#fdf3dc" }}
        >
          <div className="grid gap-6 p-6 lg:p-8 lg:grid-cols-[1.15fr_1fr] items-center">
            <div
              className="flex flex-col justify-center transition-transform duration-75 will-change-transform"
              style={{
                transform: `translate3d(0, ${Math.min(22, scrollY * 0.04)}px, 0)`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-md border border-[#2b2118] bg-[#ffe066] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                  GRAND SOVEREIGN EDITION
                </span>
                <span className="rounded-md border border-[#2b2118] bg-[#8ee59a] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                  EXPANSION WARS · SOVEREIGN REALMS
                </span>
              </div>

              <h1
                className="text-6xl font-black leading-none tracking-tight sm:text-7xl lg:text-8xl"
                style={{ textShadow: "4px 5px 0 rgba(43,33,24,0.18)" }}
              >
                CHESS 2
              </h1>

              <p className="mt-3 text-base sm:text-lg leading-snug font-bold text-[#2b2118]">
                Chess expanded into sovereign territorial conquest. Every soldier moves with classical
                chess discipline, while your kingdom claims territory, levies grain taxes, strikes alliances,
                and fields royal dragons across hand-drawn continents.
              </p>

              {/* Quick Launch Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="btn text-lg sm:text-xl font-black px-5 py-2.5 transition-transform hover:scale-105 active:scale-95 animate-float-skirmish"
                  style={{ ["--panel" as string]: "#8ee59a" }}
                  onClick={() =>
                    startSingleplayer({
                      name: playerName,
                      mode: "standard",
                      mapPreset: "pangaea",
                      ai: 3,
                      humans: 1,
                      skill: "normal",
                    })
                  }
                >
                  <span>Quick Skirmish</span>
                </button>
                <button
                  className="btn text-lg sm:text-xl font-black px-5 py-2.5 transition-transform hover:scale-105 active:scale-95 animate-float-multiplayer"
                  style={{ ["--panel" as string]: "#ffe066" }}
                  onClick={() => setView("mp_lobby")}
                >
                  <span>Online Multiplayer</span>
                </button>
                <button
                  className="btn text-lg font-black px-4 py-2.5"
                  onClick={() => setView("editor")}
                >
                  <span>Draw a Map</span>
                </button>
              </div>

              {/* Key Features Callout */}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-black text-[#2b2118]/80">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8ee59a] border border-[#2b2118]" />
                  Live In-Game Courier Chat
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffe066] border border-[#2b2118]" />
                  5-Turn Peace Treaties
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f4a290] border border-[#2b2118]" />
                  Bankrupt Armies Desert
                </span>
              </div>
            </div>

            {/* In-Game Live Snapshot Card with Paper Tape Details and Parallax Float */}
            <div
              className="relative flex flex-col items-center justify-center transition-transform duration-75 will-change-transform"
              style={{
                transform: `translate3d(0, ${Math.min(48, scrollY * 0.08)}px, 0)`,
              }}
            >
              {/* Paper Tape Top Left */}
              <div className="absolute -top-3 left-4 z-20 h-6 w-24 -rotate-6 bg-[#ecd89f]/90 border border-[#2b2118]/30 shadow-sm" />
              {/* Paper Tape Top Right */}
              <div className="absolute -top-3 right-4 z-20 h-6 w-24 rotate-6 bg-[#ecd89f]/90 border border-[#2b2118]/30 shadow-sm" />

              <div className="w-full overflow-hidden rounded-2xl border-[3px] border-[#2b2118] bg-[#f7eed4] shadow-md p-1.5">
                <LandingInGameSnapshot />
                <div className="p-3 bg-[#fdfaf1] border-t-2 border-dashed border-[#2b2118]/25 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#2b2118] uppercase tracking-wider">
                      TACTICAL MAP DISPATCH · ACTIVE ENGAGEMENT
                    </span>
                    <span className="rounded bg-amber-100 border border-[#2b2118]/40 px-1.5 py-0.5 text-[10px] font-black text-amber-900">
                      TURN 12
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-[#2b2118]/80 leading-tight">
                    Blue King barricaded behind coastal harbor defenses. Red cavalry breakthrough
                    arrows plotted through neutral pass. Dragon on standby in eastern quadrant.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Instant Tactical Scenarios (4 1-Click Battle Cards) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#2b2118]">Tactical Battle Scenarios</h2>
            <span className="text-xs font-bold opacity-75">Click any theater to deploy immediately</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_SCENARIOS.map((scen, idx) => (
              <div
                key={scen.title}
                className="doodle p-4 flex flex-col justify-between hover:scale-[1.02] transition-transform shadow-sm will-change-transform"
                style={{
                  ["--panel" as string]: "#fffdf7",
                  transform: `translate3d(0, ${Math.min(16, Math.max(0, scrollY - 180) * (idx % 2 === 0 ? 0.025 : 0.012))}px, 0)`,
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="rounded border border-[#2b2118] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                      style={{ backgroundColor: scen.color }}
                    >
                      {scen.badge}
                    </span>
                    <span className="text-[11px] font-black text-[#2b2118]/60 uppercase">
                      {scen.config.map}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#2b2118] leading-tight">{scen.title}</h3>
                  <p className="mt-1.5 text-xs font-bold text-[#2b2118]/80 leading-relaxed">
                    {scen.blurb}
                  </p>
                </div>

                <button
                  onClick={() =>
                    startSingleplayer({
                      name: playerName,
                      mode: scen.config.mode,
                      mapPreset: scen.config.map,
                      ai: scen.config.ai,
                      humans: scen.config.humans,
                      skill: scen.config.skill,
                    })
                  }
                  className="btn mt-4 w-full text-xs font-black !py-1.5"
                  style={{ ["--panel" as string]: scen.color }}
                >
                  <span>Deploy to {scen.title.split(" ")[0]}</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* War Table & Hall of Fame Grid */}
        <section id="war-table" className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <NewGamePanel
            onStartSingleplayer={startSingleplayer}
            onOpenMultiplayer={() => setView("mp_lobby")}
            onOpenEditor={() => setView("editor")}
          />

          <div className="flex flex-col gap-6">
            {/* Hall of Fame & Imperial Victories */}
            <div className="doodle tilt-b p-5" style={{ ["--panel" as string]: "#fffaf0" }}>
              <div>
                <div className="flex items-center justify-between border-b-2 border-dashed border-[#2b2118]/25 pb-2 mb-3">
                  <div>
                    <h2 className="text-2xl font-black">Hall of Scribbles</h2>
                    <p className="text-xs opacity-75 font-semibold">Victories and triumphs recorded on this server.</p>
                  </div>
                  <button
                    onClick={loadLeaderboard}
                    className="rounded border border-[#2b2118] bg-white px-2 py-0.5 text-[11px] font-black hover:bg-amber-100"
                  >
                    Refresh
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  {hallOfFame.length === 0 ? (
                    <div className="opacity-60 py-6 text-center italic font-semibold">
                      No recorded triumphs yet. Command a kingdom and claim the crown!
                    </div>
                  ) : null}
                  {hallOfFame.slice(0, 7).map((r, i) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border-b border-dashed border-[#2b2118]/25 pb-1.5 font-bold"
                    >
                      <span className="truncate max-w-[120px]">
                        {i + 1}. {r.player}
                      </span>
                      <span className="opacity-75 text-[11px] font-semibold">
                        {r.mapName} · {r.turns} rds · {r.outcome}
                      </span>
                      <span className="font-black text-amber-900">{r.score} pts</span>
                    </div>
                  ))}
                </div>

                {/* Server Status Badge */}
                <div className="mt-4 rounded-xl border border-dashed border-[#2b2118]/30 bg-[#f9f2dd] p-2.5 text-[11px] font-bold text-[#2b2118]/80 flex items-center justify-between">
                  <span>Server Engine: Active Sync</span>
                  <span className="font-black text-emerald-800">In-Memory / PostgreSQL Ready</span>
                </div>
              </div>
            </div>

            {/* Tactical Pro Tips Scroll */}
            <div
              className="doodle p-5"
              style={{ ["--panel" as string]: "#fcf6e8" }}
            >
              <div>
                <h3 className="text-lg font-black text-[#2b2118] mb-2">Tactical Quick Keys</h3>
                <ul className="space-y-1.5 text-xs font-bold text-[#2b2118]">
                  <li className="flex items-center justify-between border-b border-dashed border-[#2b2118]/20 pb-1">
                    <span>Spacebar</span>
                    <span className="rounded bg-white px-2 py-0.5 border border-[#2b2118]">End Turn</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-dashed border-[#2b2118]/20 pb-1">
                    <span>Right-Click & Drag</span>
                    <span className="rounded bg-white px-2 py-0.5 border border-[#2b2118]">Draw Planning Arrows</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-dashed border-[#2b2118]/20 pb-1">
                    <span>Click when waiting</span>
                    <span className="rounded bg-white px-2 py-0.5 border border-[#2b2118]">Queue Premoves</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Courier Button (bottom-left)</span>
                    <span className="rounded bg-white px-2 py-0.5 border border-[#2b2118]">Open In-Game Chat</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Unit & Weapon Codex */}
        <UnitCodex />

        {/* The Four Sovereign Doctrines */}
        <WarDoctrines />

        {/* Map Cartography Presets Showcase */}
        <section className="doodle p-5" style={{ ["--panel" as string]: "#fefcf6" }}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-[#2b2118]/25 pb-3">
              <div>
                <div className="inline-block rounded-md border border-[#2b2118] bg-[#9ad3f2] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider mb-1">
                  Cartographer Guild
                </div>
                <h2 className="text-2xl font-black text-[#2b2118]">World Continent Presets</h2>
                <p className="text-xs font-semibold opacity-75">
                  Choose your theater of war or design your own bespoke landmasses.
                </p>
              </div>

              <button
                onClick={() => setView("editor")}
                className="btn text-xs font-black"
                style={{ ["--panel" as string]: "#8ee59a" }}
              >
                <span>Launch Map Painter</span>
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {MAP_PRESETS.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border-2 border-[#2b2118] bg-white/80 p-3 flex flex-col justify-between hover:bg-white transition-all shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-[#2b2118]">{m.name}</span>
                      <span className="text-[10px] font-bold opacity-60">Up to {m.maxPlayers}p</span>
                    </div>
                    <p className="text-[11px] font-bold opacity-75 leading-tight">{m.blurb}</p>
                  </div>

                  <button
                    onClick={() =>
                      startSingleplayer({
                        name: playerName,
                        mode: "standard",
                        mapPreset: m.id,
                        ai: Math.min(3, m.maxPlayers - 1),
                        humans: 1,
                        skill: "normal",
                      })
                    }
                    className="btn mt-3 w-full text-[11px] font-black !py-1"
                    style={{ ["--panel" as string]: "#ffe066" }}
                  >
                    <span>Play {m.name}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature & Rules Badges */}
        <section className="doodle p-5" style={{ ["--panel" as string]: "#fcf7e8" }}>
          <div>
            <h2 className="text-2xl font-black">Game Rules & Features Summary</h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {FEATURES.map(([title, blurb]) => (
                <div
                  key={title}
                  className="rounded-xl border-[3px] border-dashed border-[#2b2118]/40 bg-white/60 p-3"
                >
                  <div className="text-[14px] font-black">{title}</div>
                  <div className="text-[12px] opacity-80 mt-0.5 font-bold">{blurb}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 text-center text-xs font-bold text-white/90 space-y-1">
          <div>Drawn by hand, one wobbly ink line at a time. Sovereign Edition 2.4.</div>
          <div className="opacity-70">
            Spacebar ends turn · Right-drag draws tactical arrows · Courier dispatch chat ready.
          </div>
        </footer>
      </main>
    </div>
  );
}
