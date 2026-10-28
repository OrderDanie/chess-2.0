import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Board, { Arrow } from "./Board";
import InGameChat from "./InGameChat";
import AudioController from "./AudioController";
import VictoryCelebration from "./VictoryCelebration";
import { sound } from "../lib/audio";
import {
  DiplomacyModal,
  DraftOffer,
  HourglassDoodle,
  LogFeed,
  OfferPrompt,
  PlayerList,
  ShopBar,
  UnitInfo,
} from "./Hud";
import {
  applyAction,
  buySpots as spotsFor,
  cloneState,
  economy,
  legalMoves,
  previewMoves,
  ring,
  scoreOf,
  teleportTargets,
} from "../lib/game/engine";
import { planAITurn, suggestMove } from "../lib/game/ai";
import { Action, GameState, PIECES, PieceKind, ChatMessage } from "../types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GameScreenProps {
  initial: GameState;
  mode: "local" | "online";
  seat?: number;
  gameId?: number;
  token?: string;
  playerName?: string;
  onExit: () => void;
}

interface Premove {
  from: number;
  to: number;
}

export default function GameScreen({
  initial,
  mode,
  seat = 0,
  gameId,
  token,
  playerName = "You",
  onExit,
}: GameScreenProps) {
  const [state, setState] = useState<GameState>(initial);
  const stateRef = useRef<GameState>(initial);
  const initialRef = useRef<GameState>(cloneState(initial));
  const logRef = useRef<Array<{ actor: number; action: Action }>>([]);

  const [selected, setSelected] = useState<number | null>(null);
  const [picked, setPicked] = useState<PieceKind | null>(null);
  const [activeDecree, setActiveDecree] = useState<"bridge" | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [premoves, setPremoves] = useState<Premove[]>([]);
  const [diplo, setDiplo] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [replayAt, setReplayAt] = useState<number | null>(null);
  const [posted, setPosted] = useState(false);
  const [dismissedDefeat, setDismissedDefeat] = useState(false);
  const [dismissedVictory, setDismissedVictory] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [threatOverlay, setThreatOverlay] = useState(false);
  const [aiSpeed, setAiSpeed] = useState<"normal" | "fast" | "instant">("fast");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-dispatch",
      sender: "Royal Courier",
      seat: -1,
      text: "Courier routes are active. Propose pacts, demand tribute, or exchange diplomatic dispatches.",
      timestamp: Date.now(),
      isSystem: true,
    },
  ]);

  const mySeat = mode === "local" ? (state.players[state.current]?.isAI ? -1 : state.current) : seat;
  const homeSeat = useMemo(() => {
    if (mode !== "local") return seat >= 0 ? seat : 0;
    const idx = state.players.findIndex((p) => !p.isAI);
    return idx < 0 ? 0 : idx;
  }, [mode, seat, state.players]);

  const viewSeat = mySeat >= 0 ? mySeat : homeSeat;
  const myTurn = mySeat >= 0 && state.current === mySeat && state.winner === null && replayAt === null;
  const eliminated = state.players[viewSeat] ? !state.players[viewSeat].alive : false;

  const push = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400);
  }, []);

  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const apply = useCallback(
    (action: Action, actor: number, quiet = false) => {
      const before = stateRef.current;
      const next = cloneState(before);
      const res = applyAction(next, actor, action);
      if (!res.ok) {
        if (!quiet) push(res.error ?? "Illegal");
        return false;
      }
      if (action.type === "tick") {
        if (next.turn !== before.turn) {
          logRef.current.push({ actor: before.current, action: { type: "endTurn" } });
        }
      } else {
        logRef.current.push({ actor, action });
        // Audio feedback for local / applied actions
        if (action.type === "move") {
          const hadDefender = before.units[action.to] !== null;
          const succ = next.units[action.to]?.id === before.units[action.from]?.id;
          if (hadDefender) {
            if (succ) sound.playCapture();
            else sound.playMove();
          } else {
            sound.playMove();
          }
        } else if (action.type === "buy") {
          sound.playDraft();
        } else if (action.type === "endTurn") {
          sound.playEndTurn();
        } else if (action.type === "detonate") {
          sound.playDetonation();
        } else if (action.type === "respond") {
          if (action.accept) sound.playTreaty();
          else sound.playCourier();
        }
      }
      commit(next);
      return true;
    },
    [commit, push],
  );

  const remote = useCallback(
    async (action: Action) => {
      if (!gameId) return false;
      try {
        const r = await fetch(`/api/games/${gameId}/action`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, action }),
        });
        const data = await r.json();
        if (!r.ok || data.error) {
          if (data.state) commit(data.state as GameState);
          push(data.error ?? "Action rejected");
          return false;
        }
        if (data.state) {
          const before = stateRef.current;
          commit(data.state as GameState);
          if (action.type === "move") {
            const hadDefender = before.units[action.to] !== null;
            const succ = (data.state as GameState).units[action.to]?.id === before.units[action.from]?.id;
            if (hadDefender) {
              if (succ) sound.playCapture();
              else sound.playMove();
            } else {
              sound.playMove();
            }
          } else if (action.type === "buy") {
            sound.playDraft();
          } else if (action.type === "endTurn") {
            sound.playEndTurn();
          } else if (action.type === "detonate") {
            sound.playDetonation();
          } else if (action.type === "respond") {
            if (action.accept) sound.playTreaty();
            else sound.playCourier();
          }
        }
        return true;
      } catch {
        push("Network issue");
        return false;
      }
    },
    [commit, gameId, push, token],
  );

  const dispatch = useCallback(
    (action: Action) => {
      if (mode === "online") {
        void remote(action);
        return true;
      }
      return apply(action, state.current);
    },
    [apply, mode, remote, state.current],
  );

  /* ---------------- online polling ---------------- */
  useEffect(() => {
    if (mode !== "online" || !gameId) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/games/${gameId}`, { cache: "no-store" });
        const data = await r.json();
        if (!stop && data?.state) {
          const incoming = data.state as GameState;
          commit(incoming);
          if (Array.isArray(data.chat)) {
            setChatMessages(data.chat);
          }
        }
      } catch {
        /* ignore */
      }
    };
    const id = window.setInterval(tick, 1800);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [commit, gameId, mode]);

  /* ---------------- AI turns (local) ---------------- */
  const aiBusy = useRef(false);
  useEffect(() => {
    if (mode !== "local" || replayAt !== null) return;
    const live = stateRef.current;
    const cur = live.players[live.current];
    if (!cur || !cur.isAI || live.winner !== null || aiBusy.current) return;
    let cancelled = false;
    aiBusy.current = true;
    (async () => {
      await sleep(aiSpeed === "instant" ? 40 : 250);
      const plan = planAITurn(stateRef.current, cur.id);
      const pace =
        aiSpeed === "instant"
          ? 0
          : aiSpeed === "fast"
          ? 35
          : plan.length > 14
          ? 70
          : plan.length > 8
          ? 130
          : 210;
      for (const act of plan) {
        if (cancelled) break;
        apply(act, cur.id, true);
        if (pace > 0) await sleep(act.type === "endTurn" ? Math.min(100, pace * 1.5) : pace);
      }
      aiBusy.current = false;
    })();
    return () => {
      cancelled = true;
      aiBusy.current = false;
    };
  }, [apply, mode, replayAt, state.turn, state.winner]);

  /* ---------------- clock ---------------- */
  useEffect(() => {
    if (state.winner !== null || replayAt !== null) return;
    const id = window.setInterval(() => {
      if (mode === "local") {
        apply({ type: "tick", seconds: 1 }, stateRef.current.current, true);
      } else {
        const curPlayer = stateRef.current.players[stateRef.current.current];
        if (curPlayer && curPlayer.alive && stateRef.current.clock > 0 && !curPlayer.isAI) {
          const updated = cloneState(stateRef.current);
          const p = updated.players[updated.current];
          if (p) {
            p.time = Math.max(0, p.time - 1);
            commit(updated);
          }
        }
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [apply, commit, mode, replayAt, state.winner]);

  /* ---------------- premoves ---------------- */
  const lastTurnRef = useRef(state.turn);
  useEffect(() => {
    if (state.turn === lastTurnRef.current) return;
    lastTurnRef.current = state.turn;
    if (!myTurn || premoves.length === 0) return;
    const queued = premoves;
    setPremoves([]);
    (async () => {
      for (const pm of queued) {
        await sleep(160);
        if (mode === "online") await remote({ type: "move", from: pm.from, to: pm.to });
        else apply({ type: "move", from: pm.from, to: pm.to }, stateRef.current.current, true);
      }
    })();
  }, [apply, mode, myTurn, premoves, remote, state.turn]);

  /* ---------------- derived ---------------- */
  const moves = useMemo(() => {
    if (selected === null) return [];
    const u = state.units[selected];
    if (!u || u.owner !== viewSeat) return [];
    if (!myTurn) return previewMoves(state, selected);
    return [...legalMoves(state, selected), ...teleportTargets(state, selected)];
  }, [myTurn, viewSeat, selected, state]);

  const buySpots = useMemo(() => {
    if (!picked || !myTurn) return [];
    return spotsFor(state, mySeat, picked);
  }, [myTurn, mySeat, picked, state]);

  const blast = useMemo(() => {
    if (selected === null) return [];
    const u = state.units[selected];
    if (!u || u.kind !== "nuke" || u.owner !== viewSeat) return [];
    return [selected, ...ring(state, selected, 2)];
  }, [viewSeat, selected, state]);

  const eco = economy(state, viewSeat);

  const onTile = (i: number) => {
    if (replayAt !== null) return;
    if (activeDecree === "bridge") {
      setActiveDecree(null);
      if (myTurn) {
        dispatch({ type: "decree", name: "bridge", tile: i });
      }
      return;
    }
    if (picked && myTurn) {
      if (buySpots.includes(i)) {
        dispatch({ type: "buy", kind: picked, at: i });
        const cost = PIECES[picked].cost;
        if ((state.players[mySeat]?.gold ?? 0) < cost * 2) setPicked(null);
      } else {
        setPicked(null);
      }
      return;
    }
    const unit = state.units[i];
    if (selected !== null && moves.includes(i)) {
      if (myTurn) {
        const tp = teleportTargets(state, selected);
        if (tp.includes(i) && !legalMoves(state, selected).includes(i)) {
          dispatch({ type: "teleport", from: selected, to: i });
        } else {
          dispatch({ type: "move", from: selected, to: i });
        }
        const mover = state.units[selected];
        setSelected(mover && mover.kind === "snake" ? i : null);
      } else {
        const from = selected;
        setPremoves((p) => [...p.filter((x) => x.from !== from), { from, to: i }]);
        setSelected(null);
        push("Premove queued");
      }
      return;
    }
    if (unit && unit.owner === viewSeat) {
      setSelected(i === selected ? null : i);
      return;
    }
    setSelected(unit ? i : null);
    if (unit) sound.playSelect();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setPicked(null);
        setDiplo(null);
        setActiveDecree(null);
      }
      if (e.key === " " && myTurn) {
        e.preventDefault();
        dispatch({ type: "endTurn" });
        setSelected(null);
        setPicked(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, myTurn]);

  /* ---------------- replay ---------------- */
  const replayState = useMemo(() => {
    if (replayAt === null) return null;
    const s = cloneState(initialRef.current);
    for (let i = 0; i < replayAt && i < logRef.current.length; i++) {
      const { actor, action } = logRef.current[i];
      applyAction(s, actor, action);
    }
    return s;
  }, [replayAt]);

  const shown = replayState ?? state;

  /* ---------------- results posting ---------------- */
  useEffect(() => {
    if ((state.winner === null && state.players[homeSeat]?.alive !== false) || posted || mode !== "local") return;
    setPosted(true);
    const outcome = state.winner === homeSeat ? "win" : "loss";
    void fetch("/api/results", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        player: playerName,
        opponents: state.players.length - 1,
        mode: state.mode,
        mapName: state.mapName,
        outcome,
        turns: state.round,
        tiles: economy(state, homeSeat).land,
        gold: state.players[homeSeat]?.gold ?? 0,
        score: scoreOf(state, homeSeat),
      }),
    }).catch(() => undefined);
  }, [homeSeat, mode, playerName, posted, state]);

  // Audio cue when turn passes to the player
  const prevMyTurnRef = useRef(myTurn);
  useEffect(() => {
    if (!prevMyTurnRef.current && myTurn) {
      sound.playSelect();
      push("Your turn, Sovereign!");
    }
    prevMyTurnRef.current = myTurn;
  }, [myTurn, push]);

  // Audio cue on game resolution
  const prevWinnerRef = useRef<number | null>(null);
  useEffect(() => {
    if (state.winner !== null && prevWinnerRef.current !== state.winner) {
      prevWinnerRef.current = state.winner;
      if (state.winner === viewSeat) sound.playVictory();
      else sound.playDefeat();
    }
  }, [state.winner, viewSeat]);

  // Threat overlay calculation
  const threatTiles = useMemo(() => {
    if (!threatOverlay) return undefined;
    const threats = new Set<number>();
    const live = shown;
    const myP = live.players[viewSeat];
    if (!myP || !myP.alive) return undefined;

    for (let i = 0; i < live.units.length; i++) {
      const u = live.units[i];
      if (!u || u.owner === viewSeat) continue;
      const owner = live.players[u.owner];
      if (!owner || !owner.alive) continue;
      const inTreaty = live.treaties.some(
        (t) => (t.a === viewSeat && t.b === u.owner) || (t.b === viewSeat && t.a === u.owner)
      );
      if (inTreaty) continue;

      const mvs = legalMoves(live, i);
      for (const m of mvs) {
        threats.add(m);
      }
    }
    return threats;
  }, [threatOverlay, shown, viewSeat]);

  const selectedUnit = selected !== null ? shown.units[selected] : null;

  const handleSendChatMessage = async (msgText: string) => {
    sound.playCourier();
    if (mode === "online" && gameId) {
      try {
        const r = await fetch(`/api/games/${gameId}/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, text: msgText, senderName: playerName }),
        });
        const data = await r.json();
        if (data?.chat) {
          setChatMessages(data.chat);
        }
      } catch {
        push("Courier was intercepted");
      }
    } else {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: playerName || "You",
        seat: viewSeat,
        text: msgText,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, userMsg]);

      // Witty AI banter in local games
      const aliveBots = state.players.filter((p) => p.isAI && p.alive);
      if (aliveBots.length > 0) {
        const chosenBot = aliveBots[Math.floor(Math.random() * aliveBots.length)];
        const lower = msgText.toLowerCase();
        let reply = "Our cartographers record your words with imperial skepticism.";
        if (lower.includes("peace") || lower.includes("treaty") || lower.includes("truce")) {
          const peaceReplies = [
            "We shall consider peace once your cavalry departs our onion fields.",
            "A five-turn treaty is tempting, but our dragon requires frequent snacks.",
            "Send 10 gold coins as tribute and we might sign your parchment.",
            "Peace? But we just finished polishing all these halberds!",
          ];
          reply = peaceReplies[Math.floor(Math.random() * peaceReplies.length)];
        } else if (lower.includes("dragon")) {
          reply = "The dragon refuses all diplomatic entreaties and demands agricultural subsidies.";
        } else if (lower.includes("gold") || lower.includes("yield") || lower.includes("tribute")) {
          reply = "Our treasury holds two copper buttons and a stale biscuit. Which do you claim?";
        } else if (lower.includes("move") || lower.includes("good") || lower.includes("gg") || lower.includes("well")) {
          reply = "Flattery will not protect your rear guard from our bishops.";
        } else if (lower.includes("line") || lower.includes("border") || lower.includes("hold")) {
          reply = "Your borders are drawn in pencil, sovereign. We brought an eraser.";
        }

        setTimeout(() => {
          const botMsg: ChatMessage = {
            id: `msg-bot-${Date.now()}`,
            sender: chosenBot.name,
            seat: chosenBot.id,
            text: reply,
            timestamp: Date.now(),
          };
          setChatMessages((prev) => [...prev, botMsg]);
          sound.playCourier();
        }, 800);
      }
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <Board
        state={shown}
        selected={replayAt === null ? selected : null}
        moves={replayAt === null ? moves : []}
        buySpots={replayAt === null ? buySpots : []}
        blast={replayAt === null ? blast : []}
        threatTiles={threatTiles}
        premoves={premoves}
        onTile={onTile}
        arrows={arrows}
        onArrows={setArrows}
        focus={focus}
        arrowColor={state.players[viewSeat]?.color ?? "#ffe066"}
      />

      {/* Top Left: Players & Kingdom Stats */}
      <div className="pointer-events-auto absolute left-3 top-3 flex flex-col gap-2 z-20">
        <PlayerList
          state={shown}
          me={viewSeat}
          onSelectPlayer={(id) => {
            if (id === viewSeat || shown.winner !== null) return;
            setDiplo(id);
          }}
        />
        <div className="doodle doodle-tight w-[228px] p-2 text-[12px]" style={{ ["--panel" as string]: "#fffaf0" }}>
          <div className="flex justify-between font-bold">
            <span>Round {shown.round}</span>
            <span className="uppercase text-amber-800">{shown.mode}</span>
          </div>
          <div className="flex justify-between font-semibold mt-1">
            <span>Land {eco.land}</span>
            <span>Farms {eco.farms}</span>
            <span>Troops {eco.units}</span>
          </div>
          <div className="opacity-75 text-[11px] mt-0.5">
            income +${eco.gross} | upkeep -${eco.upkeep}
          </div>
        </div>

        {/* Sovereign Orders Decrees Card */}
        {shown.winner === null && (
          <div className="doodle doodle-tight w-[228px] p-2 text-[12px] bg-amber-50/50" style={{ ["--panel" as string]: "#fdf6e2" }}>
            <div className="text-center font-black text-[#2b2118] border-b border-[#2b2118]/20 pb-1 mb-1.5 uppercase tracking-wide">
              SOVEREIGN WAR ORDERS
            </div>
            <div className="space-y-1.5">
              <button
                disabled={!myTurn || shown.owner.filter((o) => o === viewSeat).length < 3}
                onClick={() => {
                  sound.playDraft();
                  dispatch({ type: "decree", name: "tax" });
                }}
                className="w-full text-left p-1 border-2 border-[#2b2118] rounded bg-[#fffaf0] hover:bg-[#ffe066]/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="font-bold flex justify-between">
                  <span>Emergency Tax Levy</span>
                  <span className="text-emerald-800 font-extrabold">+$12 Gold</span>
                </div>
                <div className="text-[10px] opacity-75 mt-0.5 leading-snug">
                  Collect emergency capital in exchange for forfeiting 2 random territories.
                </div>
              </button>

              <button
                disabled={!myTurn || (state.players[viewSeat]?.gold ?? 0) < 9}
                onClick={() => {
                  sound.playSelect();
                  setActiveDecree(activeDecree === "bridge" ? null : "bridge");
                  push(activeDecree === "bridge" ? "Bridge placement cancelled" : "Select any water tile adjacent to your territory to build a bridge!");
                }}
                className={`w-full text-left p-1 border-2 border-[#2b2118] rounded transition-all disabled:opacity-50 ${
                  activeDecree === "bridge" ? "bg-amber-200" : "bg-[#fffaf0] hover:bg-[#ffe066]/20"
                }`}
              >
                <div className="font-bold flex justify-between">
                  <span>Tactical Bridge</span>
                  <span className="text-amber-800 font-extrabold">-$9 Gold</span>
                </div>
                <div className="text-[10px] opacity-75 mt-0.5 leading-snug">
                  Convert a water tile adjacent to your borders into a traversable land bridge.
                </div>
              </button>
              {activeDecree === "bridge" && (
                <div className="text-[9px] font-bold text-amber-900 text-center animate-pulse mt-1">
                  [Click adjacent water tile on board]
                </div>
              )}
            </div>
          </div>
        )}

        {/* Realm Atmosphere Weather Card */}
        <div className="doodle doodle-tight w-[228px] p-2 text-[12px] bg-sky-50/40" style={{ ["--panel" as string]: "#f0f6fc" }}>
          <div className="text-center font-black text-[#2b2118] border-b border-[#2b2118]/20 pb-1 mb-1.5 uppercase tracking-wide">
            REALM ATMOSPHERE
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center font-black">
              <span className="text-[#2b2118] uppercase tracking-wider text-[11px]">
                {shown.weather === "sun" && "Sunny & Clear"}
                {shown.weather === "fog" && "Thick Pencil Fog"}
                {shown.weather === "blizzard" && "Ink Blizzard"}
                {shown.weather === "storm" && "Thunderstorm"}
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-black uppercase">
                {shown.weather || "sun"}
              </span>
            </div>
            <div className="text-[10px] opacity-75 leading-snug mt-1">
              {shown.weather === "sun" && "The skies are clear. All units enjoy maximum movement range and standard battle rolls."}
              {shown.weather === "fog" && "Hazy haze reduces sliding ranges (Rook, Bishop, Queen, Tank) by 1. Defenders gain +1 Fog evasion in battle rolls."}
              {shown.weather === "blizzard" && "Freezing ink blizzard slows all unit ranges by 1 (min 1) and adds +$1 troop upkeep for heating rations."}
              {shown.weather === "storm" && "Violent thunderstorm caps all flying ranges at 2 tiles. Aerial wind currents inflict -1 penalty on all attacks."}
            </div>
          </div>
        </div>
      </div>

      {/* Top Right: Actions & Menu */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 z-20">
        <div className="flex items-center gap-2">
          <AudioController compact />
          <button className="btn text-sm font-bold" onClick={onExit}>
            <span>Menu</span>
          </button>
          <button className="btn text-sm font-bold" onClick={() => setShowHelp((v) => !v)}>
            <span>?</span>
          </button>
        </div>

        {state.clock > 0 && state.winner === null && (
          <div
            className={`doodle doodle-tight flex items-center gap-2 px-3 py-1.5 font-black text-sm transition-all duration-200 shadow
              ${(state.players[state.current]?.time ?? 0) < 15 ? "bg-red-100 border-red-800 scale-105 animate-pulse text-red-950" : "bg-white"}
            `}
            style={{
              ["--panel" as string]: (state.players[state.current]?.time ?? 0) < 15 ? "#ffd6d0" : "#fffdf7",
            }}
          >
            <HourglassDoodle size={24} low={(state.players[state.current]?.time ?? 0) < 15} />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] opacity-65 uppercase font-extrabold tracking-wide">
                {state.players[state.current]?.id === viewSeat ? "Your Time" : `${state.players[state.current]?.name}'s Time`}
              </span>
              <span className="text-base font-black tracking-wider mt-0.5">
                {Math.max(0, Math.floor((state.players[state.current]?.time ?? 0) / 60))}:
                {Math.max(0, Math.floor((state.players[state.current]?.time ?? 0) % 60)).toString().padStart(2, "0")}
              </span>
            </div>
            {state.increment > 0 && (
              <span className="text-[10px] bg-amber-50 border border-[#2b2118]/20 px-1 rounded ml-1 text-amber-900 font-extrabold">
                +{state.increment}s
              </span>
            )}
          </div>
        )}

        <button
          className="btn text-lg font-black tracking-wide"
          disabled={!myTurn}
          onClick={() => {
            dispatch({ type: "endTurn" });
            setSelected(null);
            setPicked(null);
          }}
          style={{ ["--panel" as string]: myTurn ? "#8ee59a" : "#e8e1cf" }}
        >
          <span>END TURN</span>
        </button>

        <div className="flex gap-1.5 flex-wrap justify-end">
          <button
            className="btn text-xs font-bold"
            style={{ ["--panel" as string]: threatOverlay ? "#ffb4a2" : "#fbf4dd" }}
            onClick={() => {
              sound.playSelect();
              setThreatOverlay((v) => !v);
            }}
            title="Toggle red threat markers showing enemy attack zones"
          >
            <span>{threatOverlay ? "Threats: ON" : "Threats: OFF"}</span>
          </button>
          {mode === "local" ? (
            <button
              className="btn text-xs font-bold"
              onClick={() => {
                sound.playSelect();
                setAiSpeed((s) => (s === "normal" ? "fast" : s === "fast" ? "instant" : "normal"));
              }}
              title="Toggle AI turn speed"
            >
              <span>AI: {aiSpeed.toUpperCase()}</span>
            </button>
          ) : null}
          <button
            className="btn text-xs font-bold"
            onClick={() => {
              sound.playSelect();
              const home = stateRef.current.units.findIndex((u) => u && u.kind === "king" && u.owner === viewSeat);
              if (home >= 0) {
                setFocus(home);
                window.setTimeout(() => setFocus(null), 60);
              }
            }}
          >
            <span>My King</span>
          </button>
          <button
            className="btn text-xs font-bold"
            disabled={!myTurn}
            onClick={() => {
              sound.playSelect();
              const s = suggestMove(stateRef.current, state.current);
              if (s && s.type === "move") {
                setArrows([{ from: s.from, to: s.to, color: "#ffffff" }]);
                setFocus(s.from);
                window.setTimeout(() => setFocus(null), 60);
              } else push("No moves to suggest");
            }}
          >
            <span>Hint</span>
          </button>
          <button
            className="btn text-xs font-bold"
            onClick={() => {
              sound.playSelect();
              if (replayAt === null) setReplayAt(logRef.current.length);
              else setReplayAt(null);
            }}
          >
            <span>{replayAt === null ? "Replay" : "Live"}</span>
          </button>
          <button
            className="btn text-xs font-bold text-red-800"
            disabled={!myTurn}
            onClick={() => {
              if (window.confirm("Tip over your king and resign?")) dispatch({ type: "resign" });
            }}
          >
            <span>Resign</span>
          </button>
        </div>

        {selectedUnit && selectedUnit.kind === "nuke" && selectedUnit.owner === viewSeat && myTurn ? (
          <button
            className="btn text-sm font-bold text-red-900"
            style={{ ["--panel" as string]: "#ff9a6b" }}
            onClick={() => {
              if (selected !== null) dispatch({ type: "detonate", from: selected });
              setSelected(null);
            }}
          >
            <span>Detonate 5x5!</span>
          </button>
        ) : null}
      </div>

      {/* Right Column: Unit Info and Chronicle */}
      <div className="absolute bottom-[132px] right-3 hidden flex-col gap-2 lg:flex z-10 pointer-events-auto">
        <UnitInfo state={shown} tile={selected} />
        <LogFeed state={shown} />
      </div>

      {/* Bottom Shop Bar */}
      <div className="absolute inset-x-0 bottom-2 px-3 z-20">
        <div className="mx-auto w-fit max-w-full">
          <ShopBar
            state={shown}
            me={viewSeat}
            picked={picked}
            onPick={(k) => {
              sound.playSelect();
              setPicked(k);
            }}
          />
        </div>
      </div>

      {/* Queued Premoves Status Badge */}
      {premoves.length > 0 && !myTurn ? (
        <div className="pointer-events-auto absolute bottom-24 left-3 z-30 flex items-center gap-2 rounded-xl border-2 border-[#0d9488] bg-[#ecfdf5] px-3 py-1.5 shadow-md">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#0f766e]">
            <span className="h-2 w-2 rounded-full bg-[#0d9488] animate-ping" />
            <span>{premoves.length} Queued Premove{premoves.length > 1 ? "s" : ""}</span>
          </div>
          <button
            className="rounded border border-[#0d9488] bg-white px-2 py-0.5 text-[10px] font-black text-[#0f766e] hover:bg-[#ccfbf1] active:scale-95"
            onClick={() => {
              sound.playSelect();
              setPremoves([]);
              push("Queued premoves cleared");
            }}
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* Replay Scrubber */}
      {replayAt !== null ? (
        <div className="absolute inset-x-0 top-3 mx-auto w-[420px] max-w-[92%] z-30">
          <div className="doodle doodle-tight p-2" style={{ ["--panel" as string]: "#fffaf0" }}>
            <div className="flex items-center gap-2 text-[12px]">
              <button className="btn !px-2 !py-0 font-bold" onClick={() => setReplayAt((v) => Math.max(0, (v ?? 0) - 1))}>
                <span>◀</span>
              </button>
              <input
                type="range"
                min={0}
                max={logRef.current.length}
                value={replayAt}
                onChange={(e) => setReplayAt(Number(e.target.value))}
                className="flex-1 accent-amber-600"
              />
              <button
                className="btn !px-2 !py-0 font-bold"
                onClick={() => setReplayAt((v) => Math.min(logRef.current.length, (v ?? 0) + 1))}
              >
                <span>▶</span>
              </button>
              <span className="w-16 text-right font-bold">
                {replayAt}/{logRef.current.length}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Turn Banner */}
      {!myTurn && state.winner === null && replayAt === null ? (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 z-20">
          <div className="doodle doodle-tight px-4 py-1.5 text-sm wiggle font-bold" style={{ ["--panel" as string]: "#fffaf0" }}>
            <span>
              {state.players[state.current]?.name} is taking turn...
              {premoves.length ? ` (${premoves.length} premove ready)` : ""}
            </span>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="pointer-events-none absolute bottom-[150px] left-1/2 -translate-x-1/2 z-40">
          <div className="doodle doodle-tight pop px-4 py-1.5 text-sm font-bold shadow-lg" style={{ ["--panel" as string]: "#ffd6d0" }}>
            <span>{toast}</span>
          </div>
        </div>
      ) : null}

      {diplo !== null ? (
        <DiplomacyModal
          state={state}
          me={viewSeat}
          target={diplo}
          onClose={() => setDiplo(null)}
          onSend={(o: DraftOffer) => {
            dispatch({ type: "diplomacy", to: diplo, offer: o });
            setDiplo(null);
          }}
        />
      ) : null}

      <OfferPrompt
        state={state}
        me={viewSeat}
        onRespond={(id, accept) => {
          if (mode === "online") void remote({ type: "respond", offerId: id, accept });
          else apply({ type: "respond", offerId: id, accept }, viewSeat);
        }}
      />

      {/* Help Modal */}
      {showHelp ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowHelp(false)}>
          <div
            className="doodle max-h-[85%] w-[560px] max-w-full overflow-y-auto p-5 text-sm scroll-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-2xl font-black">How to Play Chess 2</h3>
                <button className="btn !px-2 !py-0 font-bold" onClick={() => setShowHelp(false)}>
                  <span>X</span>
                </button>
              </div>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                <li><b>Territory:</b> When a piece moves or is built, it paints territory around it. More territory = more income every turn.</li>
                <li><b>Economy:</b> Farms (+3 gold) and Harbors (+2 gold) fund your realm. Armies cost ongoing upkeep. If gold reaches &lt; $0, units desert!</li>
                <li><b>Recruitment:</b> Pick a unit from the bottom strip and click any illuminated tile within your borders.</li>
                <li><b>Regicide & Domination:</b> Capture an enemy King to eliminate their nation and take their lands. Alternatively, control 65% of all land to win immediately.</li>
                <li><b>Special Pieces:</b> Dragon flies and copies movement of pieces it captures; Nuke obliterates 5x5; Portal warps allies; Snake gets extra moves on kills; Boat rules the waves.</li>
                <li><b>Controls:</b> Right-drag to draw strategic arrows. Click a unit when waiting to queue premoves. Spacebar ends your turn.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {/* Defeat Banner */}
      {eliminated && state.winner === null && !dismissedDefeat ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="doodle pop w-[420px] max-w-full p-6 text-center" style={{ ["--panel" as string]: "#ffd6d0" }}>
            <div>
              <h2 className="text-3xl font-black text-red-950">Your King Has Fallen</h2>
              <p className="mt-2 text-sm opacity-85">
                {state.players[viewSeat]?.name} was eliminated on round {state.round}. The other realms continue their battle.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button className="btn font-bold" onClick={() => setDismissedDefeat(true)}>
                  <span>Keep Spectating</span>
                </button>
                <button className="btn font-bold" onClick={() => setReplayAt(0)}>
                  <span>Watch Replay</span>
                </button>
                <button className="btn font-bold" onClick={onExit}>
                  <span>Menu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Post-Game Victory & Summary Celebration Screen */}
      {state.winner !== null && !dismissedVictory ? (
        <VictoryCelebration
          state={state}
          viewerSeat={viewSeat}
          onWatchReplay={() => {
            setDismissedVictory(true);
            setReplayAt(0);
          }}
          onDismiss={() => setDismissedVictory(true)}
          onExit={onExit}
        />
      ) : null}

      {/* Victory / Game Over Overlay (when spectating or after triumph dismissed) */}
      {state.winner !== null && dismissedVictory ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="doodle pop w-[440px] max-w-full p-6 text-center" style={{ ["--panel" as string]: "#fdf3dc" }}>
            <div>
              <h2 className="text-3xl font-black">
                {state.winner === viewSeat
                  ? "Grand Triumph Achieved!"
                  : `${state.players[state.winner]?.name ?? "Nobody"} Wins!`}
              </h2>
              <p className="mt-1 text-sm opacity-75">
                {state.round} rounds · {state.mapName} · {state.mode} rules
              </p>
              <div className="mt-4 flex flex-col gap-1.5 text-sm bg-white/50 p-3 rounded-xl border-2 border-[#2b2118]/20">
                {state.players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border border-[#2b2118]" style={{ background: p.color }} />
                      {p.name} {p.id === viewSeat ? "(You)" : ""}
                    </span>
                    <span>{scoreOf(state, p.id)} pts</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-center gap-3">
                <button className="btn font-bold" onClick={() => setDismissedVictory(false)}>
                  <span>Summary & Doodles</span>
                </button>
                <button className="btn font-bold" onClick={() => setReplayAt(0)}>
                  <span>Watch Replay</span>
                </button>
                <button className="btn font-bold" style={{ ["--panel" as string]: "#8ee59a" }} onClick={onExit}>
                  <span>Main Menu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {/* In-Game Courier Chat */}
      <InGameChat
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        mySeat={viewSeat}
        playerName={playerName}
        isOnline={mode === "online"}
        activePlayers={state.players.map((p) => ({ name: p.name, color: p.color, alive: p.alive }))}
      />
    </div>
  );
}
