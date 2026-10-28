import pg from "pg";
import { GameMode, GameState, Action, ChatMessage } from "../types";

const { Pool } = pg;

export interface Seat {
  index: number;
  type: "human" | "ai";
  name: string;
  token: string | null;
}

export interface LogRow {
  actor: number;
  action: Action;
}

export interface GameRecord {
  id: number;
  code: string;
  name: string;
  mode: GameMode;
  mapName: string;
  status: string;
  version: number;
  seats: Seat[];
  state: GameState;
  log: LogRow[];
  chat: ChatMessage[];
  winner: number | null;
  updatedAt: Date;
}

export interface CustomMapRecord {
  id: number;
  name: string;
  author: string;
  width: number;
  height: number;
  tiles: string;
  spawns: number[];
  plays: number;
  createdAt: Date;
}

export interface MatchResultRecord {
  id: number;
  player: string;
  opponents: number;
  mode: string;
  mapName: string;
  outcome: string;
  turns: number;
  tiles: number;
  gold: number;
  score: number;
  createdAt: Date;
}

// In-Memory Fallback Store
let nextGameId = 1;
let nextMapId = 1;
let nextResultId = 1;

export function getNextGameId(): number {
  return nextGameId++;
}

export function getNextMapId(): number {
  return nextMapId++;
}

export function getNextResultId(): number {
  return nextResultId++;
}
export const memGames = new Map<number, GameRecord>();
export const memMaps: CustomMapRecord[] = [];
export const memResults: MatchResultRecord[] = [];

// Alphabet for 5-letter game codes
export function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// PostgreSQL setup (e.g., Supabase / Neon / Cloud SQL)
const rawDbUrl = process.env.DATABASE_URL;
export const isRealDbConfigured =
  Boolean(rawDbUrl) &&
  !rawDbUrl?.includes("[YOUR-PASSWORD]") &&
  rawDbUrl?.startsWith("postgres");

export let pool: pg.Pool | null = null;

if (isRealDbConfigured && rawDbUrl) {
  try {
    pool = new Pool({
      connectionString: rawDbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    pool
      .query(`
        CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          code VARCHAR(8) NOT NULL,
          name TEXT NOT NULL DEFAULT 'Chess 2 match',
          mode VARCHAR(16) NOT NULL DEFAULT 'standard',
          map_name TEXT NOT NULL DEFAULT 'Pangaea',
          status VARCHAR(16) NOT NULL DEFAULT 'active',
          version INT NOT NULL DEFAULT 0,
          seats JSONB NOT NULL DEFAULT '[]'::jsonb,
          state JSONB NOT NULL,
          log JSONB NOT NULL DEFAULT '[]'::jsonb,
          chat JSONB NOT NULL DEFAULT '[]'::jsonb,
          winner INT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS games_code_idx ON games (code);
        ALTER TABLE games ADD COLUMN IF NOT EXISTS chat JSONB NOT NULL DEFAULT '[]'::jsonb;

        CREATE TABLE IF NOT EXISTS custom_maps (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          author TEXT NOT NULL DEFAULT 'anonymous',
          width INT NOT NULL,
          height INT NOT NULL,
          tiles TEXT NOT NULL,
          spawns JSONB NOT NULL DEFAULT '[]'::jsonb,
          plays INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS match_results (
          id SERIAL PRIMARY KEY,
          player TEXT NOT NULL,
          opponents INT NOT NULL DEFAULT 1,
          mode VARCHAR(16) NOT NULL DEFAULT 'standard',
          map_name TEXT NOT NULL DEFAULT 'Pangaea',
          outcome VARCHAR(12) NOT NULL DEFAULT 'loss',
          turns INT NOT NULL DEFAULT 0,
          tiles INT NOT NULL DEFAULT 0,
          gold INT NOT NULL DEFAULT 0,
          score INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `)
      .then(() => {
        console.log("PostgreSQL schema successfully verified.");
      })
      .catch((err) => {
        console.warn("PostgreSQL connection error, falling back to in-memory store:", err.message);
        pool = null;
      });
  } catch (err) {
    console.warn("Could not initialize Pool, using memory fallback.", err);
    pool = null;
  }
}

export async function getGameRecord(id: number): Promise<GameRecord | null> {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM games WHERE id = $1 LIMIT 1", [id]);
      if (res.rows.length) {
        const r = res.rows[0];
        return {
          id: r.id,
          code: r.code,
          name: r.name,
          mode: r.mode,
          mapName: r.map_name,
          status: r.status,
          version: r.version,
          seats: r.seats,
          state: r.state,
          log: r.log,
          chat: Array.isArray(r.chat) ? r.chat : [],
          winner: r.winner,
          updatedAt: r.updated_at,
        };
      }
    } catch {
      // fallback to memory
    }
  }
  return memGames.get(id) ?? null;
}

export async function updateGameRecord(
  id: number,
  state: GameState,
  log: LogRow[],
  seats?: Seat[],
  chat?: ChatMessage[],
): Promise<boolean> {
  const g = await getGameRecord(id);
  if (!g) return false;

  const nextVersion = g.version + 1;
  const winner = state.winner;
  const status = winner !== null ? "finished" : "active";
  const updatedSeats = seats ?? g.seats;
  const updatedChat = chat ?? g.chat ?? [];

  if (pool) {
    try {
      await pool.query(
        `UPDATE games 
         SET state = $1, log = $2, seats = $3, chat = $4, version = $5, status = $6, winner = $7, updated_at = NOW() 
         WHERE id = $8`,
        [
          JSON.stringify(state),
          JSON.stringify(log),
          JSON.stringify(updatedSeats),
          JSON.stringify(updatedChat),
          nextVersion,
          status,
          winner,
          id,
        ],
      );
    } catch (err) {
      console.warn("Failed saving to pg, updating memory fallback:", err);
    }
  }

  memGames.set(id, {
    ...g,
    state,
    log,
    seats: updatedSeats,
    chat: updatedChat,
    version: nextVersion,
    status,
    winner,
    updatedAt: new Date(),
  });
  return true;
}

export async function addChatMessage(id: number, message: ChatMessage): Promise<ChatMessage[] | null> {
  const g = await getGameRecord(id);
  if (!g) return null;

  const updatedChat = [...(g.chat ?? []), message].slice(-60); // keep last 60 courier messages
  await updateGameRecord(id, g.state, g.log, g.seats, updatedChat);
  return updatedChat;
}
