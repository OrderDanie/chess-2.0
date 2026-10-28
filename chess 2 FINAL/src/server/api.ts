import { Router, Request, Response } from "express";
import { GameMode, GameState, ChatMessage } from "../types";
import { createGame, applyAction, PlayerConfig } from "../lib/game/engine";
import { buildMap, mapFromTiles } from "../lib/game/maps";
import { planAITurn } from "../lib/game/ai";
import {
  pool,
  memGames,
  memMaps,
  memResults,
  makeCode,
  getNextGameId,
  getNextMapId,
  getNextResultId,
  getGameRecord,
  updateGameRecord,
  addChatMessage,
  Seat,
  LogRow,
  CustomMapRecord,
  MatchResultRecord,
} from "./db";

export function runAIs(state: GameState, log: LogRow[], maxTurns = 8) {
  let turns = 0;
  while (state.winner === null && turns < maxTurns) {
    const cur = state.players[state.current];
    if (!cur || !cur.isAI || !cur.alive) break;
    const plan = planAITurn(state, cur.id);
    for (const action of plan) {
      const res = applyAction(state, cur.id, action);
      if (res.ok) log.push({ actor: cur.id, action });
    }
    turns++;
  }
}

export const apiRouter = Router();

// Health check endpoint
apiRouter.get("/health", async (_req: Request, res: Response) => {
  let dbOk = false;
  if (pool) {
    try {
      await pool.query("SELECT 1");
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }
  res.json({
    ok: true,
    storage: dbOk ? "postgresql" : "in-memory (active)",
    dbAvailable: dbOk,
  });
});

// List games or query by code
apiRouter.get("/games", async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;

  if (code) {
    const searchCode = code.toUpperCase().trim();
    if (pool) {
      try {
        const qr = await pool.query("SELECT id, code, status, name FROM games WHERE code = $1 LIMIT 1", [searchCode]);
        if (qr.rows.length) return res.json({ game: qr.rows[0] });
      } catch {
        /* fallback */
      }
    }
    const memFound = Array.from(memGames.values()).find((g) => g.code === searchCode);
    if (memFound)
      return res.json({
        game: { id: memFound.id, code: memFound.code, status: memFound.status, name: memFound.name },
      });
    return res.status(404).json({ error: "No table found with that code" });
  }

  // Active public rooms list
  if (pool) {
    try {
      const qr = await pool.query(
        'SELECT id, code, name, mode, map_name as "mapName", status, seats, updated_at as "updatedAt" FROM games WHERE status = \'active\' ORDER BY updated_at DESC LIMIT 24',
      );
      if (qr.rows.length) return res.json({ games: qr.rows });
    } catch {
      /* fallback */
    }
  }

  const list = Array.from(memGames.values())
    .filter((g) => g.status === "active")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 24)
    .map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      mode: g.mode,
      mapName: g.mapName,
      status: g.status,
      seats: g.seats,
      updatedAt: g.updatedAt,
    }));

  return res.json({ games: list });
});

// Create game room
apiRouter.post("/games", async (req: Request, res: Response) => {
  const body = req.body || {};
  if (!body.hostToken) return res.status(400).json({ error: "missing token" });

  const humans = Math.max(1, Math.min(8, Number(body.humans ?? 2)));
  const ais = Math.max(0, Math.min(7, Number(body.ais ?? 0)));
  const total = Math.max(2, Math.min(8, humans + ais));
  const mode: GameMode = body.mode ?? "standard";

  let map;
  if (body.customMapId) {
    const custom = memMaps.find((m) => m.id === Number(body.customMapId));
    if (custom) {
      map = mapFromTiles(custom.name, custom.width, custom.height, custom.tiles, custom.spawns, total);
    }
  }
  if (!map) {
    map = buildMap(body.mapPreset ?? "pangaea", total);
  }

  const seats: Seat[] = [];
  const configs: PlayerConfig[] = [];
  for (let i = 0; i < total; i++) {
    const isAI = i >= humans;
    const name = isAI ? `Bot ${i + 1}` : i === 0 ? body.hostName || "Host" : `Open Seat ${i + 1}`;
    seats.push({ index: i, type: isAI ? "ai" : "human", name, token: i === 0 ? body.hostToken : null });
    configs.push({ name, isAI, skill: body.skill ?? "normal" });
  }

  const clock = body.clock !== undefined ? Number(body.clock) : 0;
  const increment = body.increment !== undefined ? Number(body.increment) : 0;
  const state = createGame(map, configs, mode, clock, increment);
  const log: LogRow[] = [];
  runAIs(state, log);

  const code = makeCode();
  const roomName = body.name || `${map.name} Skirmish`;

  if (pool) {
    try {
      const ins = await pool.query(
        `INSERT INTO games (code, name, mode, map_name, status, version, seats, state, log)
         VALUES ($1, $2, $3, $4, 'active', 0, $5, $6, $7)
         RETURNING id, code`,
        [code, roomName, mode, map.name, JSON.stringify(seats), JSON.stringify(state), JSON.stringify(log)],
      );
      if (ins.rows.length) {
        const id = ins.rows[0].id;
        memGames.set(id, {
          id,
          code,
          name: roomName,
          mode,
          mapName: map.name,
          status: "active",
          version: 0,
          seats,
          state,
          log,
          chat: [],
          winner: null,
          updatedAt: new Date(),
        });
        return res.json({ id, code, seat: 0 });
      }
    } catch (err) {
      console.warn("DB insert failed, using memory fallback:", err);
    }
  }

  const id = getNextGameId();
  memGames.set(id, {
    id,
    code,
    name: roomName,
    mode,
    mapName: map.name,
    status: "active",
    version: 0,
    seats,
    state,
    log,
    chat: [],
    winner: null,
    updatedAt: new Date(),
  });

  return res.json({ id, code, seat: 0 });
});

// Join match
apiRouter.post("/games/:id/join", async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);
  const body = req.body || {};
  if (!body.token) return res.status(400).json({ error: "missing token" });

  const record = await getGameRecord(gameId);
  if (!record) return res.status(404).json({ error: "match not found" });

  const seats = record.seats ?? [];
  const state = record.state;

  let seat = seats.find((s) => s.token === body.token);
  if (!seat) {
    seat = seats.find((s) => s.type === "human" && !s.token);
    if (!seat) {
      return res.json({ seat: -1, code: record.code, state, spectating: true });
    }
    seat.token = body.token;
    seat.name = body.name || `Player ${seat.index + 1}`;
    if (state.players[seat.index]) {
      state.players[seat.index].name = seat.name;
    }
    await updateGameRecord(gameId, state, record.log, seats);
  }

  return res.json({ seat: seat.index, code: record.code, state });
});

// Get state / polling endpoint
apiRouter.get("/games/:id", async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);
  const record = await getGameRecord(gameId);
  if (!record) return res.status(404).json({ error: "game not found" });

  const state = record.state;
  const seats = record.seats ?? [];

  if (state.winner === null && state.clock > 0) {
    const curPlayer = state.players[state.current];
    if (curPlayer && curPlayer.alive && !curPlayer.isAI) {
      const elapsed = Math.floor((Date.now() - record.updatedAt.getTime()) / 1000);
      if (elapsed > 0) {
        if (elapsed >= curPlayer.time) {
          curPlayer.time = 0;
          applyAction(state, state.current, { type: "endTurn" });
          const log = record.log ?? [];
          log.push({ actor: curPlayer.id, action: { type: "endTurn" } });
          runAIs(state, log);
          await updateGameRecord(record.id, state, log);
        } else {
          curPlayer.time -= elapsed;
        }
      }
    }
  }

  if (state.winner === null && state.players[state.current]?.isAI) {
    const log = record.log ?? [];
    runAIs(state, log);
    await updateGameRecord(record.id, state, log);
  }

  return res.json({
    id: record.id,
    code: record.code,
    name: record.name,
    status: record.status,
    seats: seats.map((s) => ({ index: s.index, type: s.type, name: s.name, taken: Boolean(s.token) })),
    version: record.version,
    state,
    chat: record.chat ?? [],
  });
});

// Send in-game courier chat message
apiRouter.post("/games/:id/chat", async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);
  const body = req.body || {};
  const text = (body.text || "").trim().slice(0, 240);
  if (!text) return res.status(400).json({ error: "Empty dispatch message" });

  const record = await getGameRecord(gameId);
  if (!record) return res.status(404).json({ error: "match not found" });

  const seats = record.seats ?? [];
  const seat = seats.find((s) => s.token === body.token);
  const sender = seat ? seat.name : body.senderName ? String(body.senderName).slice(0, 30) : "Spectator";
  const seatIdx = seat ? seat.index : -1;

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender,
    seat: seatIdx,
    text,
    timestamp: Date.now(),
    isSystem: Boolean(body.isSystem),
  };

  const updatedChat = await addChatMessage(gameId, newMsg);
  return res.json({ ok: true, chat: updatedChat ?? [], message: newMsg });
});

// Apply player action
apiRouter.post("/games/:id/action", async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);
  const body = req.body || {};
  if (!body.token || !body.action) return res.status(400).json({ error: "missing token or action" });

  const record = await getGameRecord(gameId);
  if (!record) return res.status(404).json({ error: "match not found" });

  const seats = record.seats ?? [];
  const seat = seats.find((s) => s.token === body.token);
  if (!seat) return res.status(403).json({ error: "You are not seated in this match" });

  const state = record.state;
  const log = record.log ?? [];

  if (state.winner === null && state.clock > 0 && seat.index === state.current) {
    const curPlayer = state.players[state.current];
    if (curPlayer && curPlayer.alive && !curPlayer.isAI) {
      const elapsed = Math.floor((Date.now() - record.updatedAt.getTime()) / 1000);
      if (elapsed > 0) {
        curPlayer.time = Math.max(0, curPlayer.time - elapsed);
        if (curPlayer.time <= 0 && body.action.type !== "endTurn") {
          applyAction(state, seat.index, { type: "endTurn" });
          log.push({ actor: seat.index, action: { type: "endTurn" } });
          runAIs(state, log);
          await updateGameRecord(record.id, state, log);
          return res.status(400).json({ error: "Turn timer expired! Turn force-ended.", state });
        }
      }
    }
  }

  const resAction = applyAction(state, seat.index, body.action);
  if (!resAction.ok) {
    return res.status(400).json({ error: resAction.error ?? "illegal action", state });
  }

  log.push({ actor: seat.index, action: body.action });
  runAIs(state, log);
  await updateGameRecord(record.id, state, log);

  return res.json({ state, version: record.version + 1 });
});

// Custom maps
apiRouter.get("/maps", async (_req: Request, res: Response) => {
  if (pool) {
    try {
      const qr = await pool.query("SELECT * FROM custom_maps ORDER BY created_at DESC LIMIT 40");
      if (qr.rows.length) return res.json({ maps: qr.rows });
    } catch {
      /* fallback */
    }
  }
  return res.json({ maps: memMaps });
});

apiRouter.post("/maps", async (req: Request, res: Response) => {
  const body = req.body || {};
  const width = Math.max(8, Math.min(48, Math.round(body.width ?? 24)));
  const height = Math.max(8, Math.min(32, Math.round(body.height ?? 18)));
  const tiles = (body.tiles ?? "").slice(0, width * height);
  if (tiles.length !== width * height) return res.status(400).json({ error: "tile data mismatch" });

  let land = 0;
  for (const ch of tiles) if (ch === "#") land++;
  if (land < 24) return res.status(400).json({ error: "Draw a bit more land first" });

  const spawns = (body.spawns ?? []).filter((n: number) => Number.isInteger(n) && n >= 0 && n < width * height).slice(0, 8);
  const name = (body.name || "Untitled scribble").slice(0, 60);
  const author = (body.author || "anonymous").slice(0, 40);

  if (pool) {
    try {
      const ins = await pool.query(
        `INSERT INTO custom_maps (name, author, width, height, tiles, spawns)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [name, author, width, height, tiles, JSON.stringify(spawns)],
      );
      if (ins.rows.length) return res.json({ id: ins.rows[0].id });
    } catch {
      /* fallback */
    }
  }

  const id = getNextMapId();
  const rec: CustomMapRecord = {
    id,
    name,
    author,
    width,
    height,
    tiles,
    spawns,
    plays: 0,
    createdAt: new Date(),
  };
  memMaps.unshift(rec);
  return res.json({ id });
});

// Hall of fame / match results
apiRouter.get("/results", async (_req: Request, res: Response) => {
  if (pool) {
    try {
      const top = await pool.query("SELECT * FROM match_results ORDER BY score DESC LIMIT 12");
      const recent = await pool.query("SELECT * FROM match_results ORDER BY created_at DESC LIMIT 8");
      return res.json({ top: top.rows, recent: recent.rows });
    } catch {
      /* fallback */
    }
  }
  const top = [...memResults].sort((a, b) => b.score - a.score).slice(0, 12);
  const recent = [...memResults].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8);
  return res.json({ top, recent });
});

apiRouter.post("/results", async (req: Request, res: Response) => {
  const body = req.body || {};
  const rec: MatchResultRecord = {
    id: getNextResultId(),
    player: (body.player || "Anonymous").slice(0, 40),
    opponents: Math.max(0, Math.min(7, Math.round(body.opponents ?? 1))),
    mode: (body.mode || "standard").slice(0, 16),
    mapName: (body.mapName || "Pangaea").slice(0, 60),
    outcome: (body.outcome || "loss").slice(0, 12),
    turns: Math.max(0, Math.round(body.turns ?? 0)),
    tiles: Math.max(0, Math.round(body.tiles ?? 0)),
    gold: Math.max(0, Math.round(body.gold ?? 0)),
    score: Math.max(0, Math.round(body.score ?? 0)),
    createdAt: new Date(),
  };

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO match_results (player, opponents, mode, map_name, outcome, turns, tiles, gold, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [rec.player, rec.opponents, rec.mode, rec.mapName, rec.outcome, rec.turns, rec.tiles, rec.gold, rec.score],
      );
    } catch {
      /* fallback */
    }
  }

  memResults.unshift(rec);
  return res.json({ id: rec.id });
});
