import {
  Action,
  ActionResult,
  GameMode,
  GameState,
  LogEntry,
  MoveStyle,
  Offer,
  PIECES,
  PieceKind,
  Player,
  PLAYER_COLORS,
  PLAYER_NAMES,
  Unit,
} from "../../types";
import { MapData } from "./maps";

export const ORTHO: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export const DIAG: Array<[number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export const ALL8: Array<[number, number]> = [...ORTHO, ...DIAG];

export const KNIGHT: Array<[number, number]> = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];

export function xOf(s: GameState, i: number) {
  return i % s.w;
}

export function yOf(s: GameState, i: number) {
  return Math.floor(i / s.w);
}

export function idx(s: GameState, x: number, y: number) {
  return y * s.w + x;
}

export function inBounds(s: GameState, x: number, y: number) {
  return x >= 0 && y >= 0 && x < s.w && y < s.h;
}

export function rand(s: GameState) {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function cloneState(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s)) as GameState;
}

export interface PlayerConfig {
  name: string;
  isAI: boolean;
  skill?: "easy" | "normal" | "brutal";
}

export function createGame(
  map: MapData,
  configs: PlayerConfig[],
  mode: GameMode = "standard",
  clock = 240,
  increment = 12,
  seed = Math.floor(Math.random() * 100000),
): GameState {
  const players: Player[] = configs.map((c, i) => ({
    id: i,
    name: c.name || PLAYER_NAMES[i % PLAYER_NAMES.length],
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    gold: mode === "chaos" ? 40 : 24,
    alive: true,
    isAI: c.isAI,
    skill: c.skill ?? "normal",
    time: clock,
  }));

  const s: GameState = {
    w: map.w,
    h: map.h,
    land: map.land.slice(),
    owner: new Array<number>(map.w * map.h).fill(-1),
    units: new Array<Unit | null>(map.w * map.h).fill(null),
    players,
    current: 0,
    turn: 1,
    round: 1,
    mode,
    mapName: map.name,
    treaties: [],
    offers: [],
    log: [],
    winner: null,
    nextId: 1,
    rng: seed >>> 0,
    clock,
    increment,
    lastMove: null,
    boom: null,
    weather: "sun",
  };

  players.forEach((p, i) => {
    const home = map.spawns[i % map.spawns.length];
    place(s, home, "king", p.id);
    claim(s, home, p.id, 2, false);
    // a small starting camp around the capital
    const spots = neighbors(s, home).filter((n) => s.land[n] === 1 && !s.units[n]);
    for (let k = 0; k < Math.min(2, spots.length); k++) {
      place(s, spots[k], "pawn", p.id);
      claim(s, spots[k], p.id, 1, false);
    }
    const farmSpot = spots[2];
    if (farmSpot !== undefined) {
      place(s, farmSpot, "farm", p.id);
      claim(s, farmSpot, p.id, 1, false);
    }
  });

  log(s, s.current, "system", `The scribbled world of ${map.name} awakens.`);
  return s;
}

export function place(s: GameState, at: number, kind: PieceKind, owner: number): Unit {
  const u: Unit = { id: s.nextId++, kind, owner, mv: 0 };
  s.units[at] = u;
  return u;
}

export function neighbors(s: GameState, i: number): number[] {
  const x = xOf(s, i);
  const y = yOf(s, i);
  const out: number[] = [];
  for (const [dx, dy] of ORTHO) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(s, nx, ny)) out.push(idx(s, nx, ny));
  }
  return out;
}

export function log(s: GameState, player: number, kind: LogEntry["kind"], text: string) {
  s.log.push({ turn: s.turn, player, text, kind });
  if (s.log.length > 240) s.log.splice(0, s.log.length - 240);
}

export function atPeace(s: GameState, a: number, b: number) {
  if (a === b) return true;
  return s.treaties.some(
    (t) => ((t.a === a && t.b === b) || (t.a === b && t.b === a)) && t.until > s.turn,
  );
}

export function peaceLeft(s: GameState, a: number, b: number) {
  const t = s.treaties.find(
    (x) => ((x.a === a && x.b === b) || (x.a === b && x.b === a)) && x.until > s.turn,
  );
  return t ? t.until - s.turn : 0;
}

export function movesLeft(u: Unit) {
  return 1 + (u.extra ?? 0) - u.mv;
}

export function costOf(s: GameState, kind: PieceKind) {
  const base = PIECES[kind].cost;
  if (s.mode === "chaos") return Math.max(2, Math.round(base * 0.75));
  return base;
}

function patternFor(u: Unit) {
  if (u.kind === "dragon" && u.memory) {
    const m = PIECES[u.memory];
    return {
      move: m.move === "none" ? ("fly" as const) : m.move,
      dirs: m.dirs,
      range: Math.max(2, Math.min(m.range, 6)),
    };
  }
  const d = PIECES[u.kind];
  return { move: d.move, dirs: d.dirs, range: d.range };
}

function terrainOk(s: GameState, u: Unit, i: number) {
  const def = PIECES[u.kind];
  if (u.kind === "dragon") return true;
  if (def.terrain === "any") return true;
  if (def.terrain === "water") return s.land[i] === 0;
  return s.land[i] === 1;
}

function occupancy(s: GameState, u: Unit, i: number): "free" | "capture" | "blocked" {
  const other = s.units[i];
  if (!other) return "free";
  if (other.owner === u.owner) return "blocked";
  if (atPeace(s, other.owner, u.owner)) return "blocked";
  return "capture";
}

function dirsOf(kind: "ortho" | "diag" | "all" | "knight") {
  if (kind === "ortho") return ORTHO;
  if (kind === "diag") return DIAG;
  if (kind === "knight") return KNIGHT;
  return ALL8;
}

export function getWeatherModifiedRange(s: GameState, u: Unit, moveStyle: MoveStyle, baseRange: number): number {
  if (moveStyle === "step" || moveStyle === "none") return baseRange;
  let r = baseRange;
  if (s.weather === "fog" && moveStyle === "slide") {
    r = Math.max(1, r - 1);
  } else if (s.weather === "blizzard") {
    r = Math.max(1, r - 1);
  } else if (s.weather === "storm" && moveStyle === "fly") {
    r = Math.min(2, r);
  }
  return r;
}

export function legalMoves(s: GameState, from: number): number[] {
  const u = s.units[from];
  if (!u || s.winner !== null) return [];
  if (movesLeft(u) <= 0) return [];
  const pat = patternFor(u);
  if (pat.move === "none") return [];
  const ghost = u.kind === "dragon";
  const res: number[] = [];
  const x0 = xOf(s, from);
  const y0 = yOf(s, from);

  const consider = (i: number) => {
    if (!terrainOk(s, u, i)) return false;
    const occ = occupancy(s, u, i);
    if (occ === "blocked") return false;
    res.push(i);
    return occ === "free";
  };

  if (pat.move === "fly") {
    const r = getWeatherModifiedRange(s, u, "fly", pat.range);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x0 + dx;
        const ny = y0 + dy;
        if (!inBounds(s, nx, ny)) continue;
        consider(idx(s, nx, ny));
      }
    }
    return res;
  }

  if (pat.move === "jump") {
    for (const [dx, dy] of dirsOf(pat.dirs)) {
      const nx = x0 + dx;
      const ny = y0 + dy;
      if (!inBounds(s, nx, ny)) continue;
      consider(idx(s, nx, ny));
    }
    return res;
  }

  const baseRange = pat.move === "step" ? 1 : pat.range;
  const range = getWeatherModifiedRange(s, u, pat.move, baseRange);
  for (const [dx, dy] of dirsOf(pat.dirs)) {
    for (let step = 1; step <= range; step++) {
      const nx = x0 + dx * step;
      const ny = y0 + dy * step;
      if (!inBounds(s, nx, ny)) break;
      const i = idx(s, nx, ny);
      const blockedByTerrain = !terrainOk(s, u, i);
      if (blockedByTerrain && !ghost) break;
      const occ = occupancy(s, u, i);
      if (occ === "blocked") {
        if (ghost) continue;
        break;
      }
      if (!blockedByTerrain) res.push(i);
      if (occ === "capture" && !ghost) break;
    }
  }
  return res;
}

/** Move list ignoring "already moved this turn" - used for premove drafting. */
export function previewMoves(s: GameState, from: number): number[] {
  const u = s.units[from];
  if (!u) return [];
  const keep = u.mv;
  u.mv = 0;
  const res = legalMoves(s, from);
  u.mv = keep;
  return res;
}

export function teleportTargets(s: GameState, from: number): number[] {
  const u = s.units[from];
  if (!u || movesLeft(u) <= 0) return [];
  const portals: number[] = [];
  for (let i = 0; i < s.units.length; i++) {
    const p = s.units[i];
    if (p && p.kind === "portal" && p.owner === u.owner) portals.push(i);
  }
  if (portals.length < 2) return [];
  const near = portals.some((p) => chebyshev(s, p, from) <= 1);
  if (!near) return [];

  const out = new Set<number>();
  for (const p of portals) {
    if (chebyshev(s, p, from) <= 1) continue;
    for (const n of ring(s, p, 1)) {
      if (!terrainOk(s, u, n)) continue;
      if (s.units[n]) continue;
      out.add(n);
    }
  }
  return [...out];
}

export function chebyshev(s: GameState, a: number, b: number) {
  return Math.max(Math.abs(xOf(s, a) - xOf(s, b)), Math.abs(yOf(s, a) - yOf(s, b)));
}

export function manhattan(s: GameState, a: number, b: number) {
  return Math.abs(xOf(s, a) - xOf(s, b)) + Math.abs(yOf(s, a) - yOf(s, b));
}

export function ring(s: GameState, center: number, r: number): number[] {
  const cx = xOf(s, center);
  const cy = yOf(s, center);
  const out: number[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(s, nx, ny)) continue;
      out.push(idx(s, nx, ny));
    }
  }
  return out;
}

export function claim(
  s: GameState,
  center: number,
  player: number,
  radius: number,
  water: boolean,
) {
  if (radius <= 0) return 0;
  const cx = xOf(s, center);
  const cy = yOf(s, center);
  let gained = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(s, nx, ny)) continue;
      const i = idx(s, nx, ny);
      if (s.land[i] === 0 && !water && i !== center) continue;
      if (s.land[i] === 0 && !water) continue;
      const occ = s.units[i];
      if (occ && occ.owner !== player) continue;
      const cur = s.owner[i];
      if (cur === player) continue;
      if (cur !== -1 && atPeace(s, cur, player)) continue;
      s.owner[i] = player;
      gained++;
    }
  }
  return gained;
}

export interface Economy {
  gross: number;
  upkeep: number;
  net: number;
  land: number;
  water: number;
  farms: number;
  units: number;
  army: number;
}

export function economy(s: GameState, p: number): Economy {
  let land = 0;
  let water = 0;
  let gross = 2;
  let upkeep = 0;
  let farms = 0;
  let units = 0;
  let army = 0;

  for (let i = 0; i < s.owner.length; i++) {
    if (s.owner[i] !== p) continue;
    if (s.land[i] === 1) land++;
    else water++;
  }

  for (const u of s.units) {
    if (!u || u.owner !== p) continue;
    const def = PIECES[u.kind];
    upkeep += def.upkeep;
    if (s.weather === "blizzard" && !def.building && u.kind !== "king") {
      upkeep += 1;
    }
    gross += def.income;
    if (u.kind === "farm") farms++;
    if (!def.building && u.kind !== "king") {
      units++;
      army += def.cost;
    }
  }
  gross += Math.floor(land / 3) + Math.floor(water / 5);
  return { gross, upkeep, net: gross - upkeep, land, water, farms, units, army };
}

export function totalLand(s: GameState) {
  let n = 0;
  for (const l of s.land) if (l === 1) n++;
  return n;
}

export function buySpots(s: GameState, player: number, kind: PieceKind): number[] {
  const def = PIECES[kind];
  const out: number[] = [];
  const harbors: number[] = [];

  if (kind === "boat") {
    for (let i = 0; i < s.units.length; i++) {
      const u = s.units[i];
      if (u && u.kind === "harbor" && u.owner === player) harbors.push(i);
    }
    if (harbors.length === 0) return [];
  }

  for (let i = 0; i < s.owner.length; i++) {
    if (s.units[i]) continue;
    if (kind === "boat") {
      if (s.land[i] !== 0) continue;
      if (!harbors.some((hp) => manhattan(s, hp, i) <= 3)) continue;
      out.push(i);
      continue;
    }
    if (s.owner[i] !== player) continue;
    if (def.terrain === "water" ? s.land[i] !== 0 : s.land[i] !== 1) continue;
    if (kind === "harbor" && !neighbors(s, i).some((n) => s.land[n] === 0)) continue;
    out.push(i);
  }
  return out;
}

function eliminate(s: GameState, victim: number, by: number) {
  const p = s.players[victim];
  if (!p || !p.alive) return;
  p.alive = false;
  p.eliminatedTurn = s.turn;
  for (let i = 0; i < s.units.length; i++) {
    const u = s.units[i];
    if (u && u.owner === victim) s.units[i] = null;
    if (s.owner[i] === victim) s.owner[i] = -1;
  }
  s.treaties = s.treaties.filter((t) => t.a !== victim && t.b !== victim);
  s.offers = s.offers.filter((o) => o.from !== victim && o.to !== victim);
  log(s, by, "capture", `${p.name} has been wiped off the map by ${s.players[by]?.name ?? "fate"}.`);
}

export function checkVictory(s: GameState) {
  if (s.winner !== null) return;
  const alive = s.players.filter((p) => p.alive);
  if (alive.length <= 1) {
    s.winner = alive[0]?.id ?? -1;
    if (s.winner >= 0) log(s, s.winner, "system", `${s.players[s.winner].name} rules the doodle world!`);
    return;
  }
  const total = totalLand(s);
  for (const p of alive) {
    let owned = 0;
    for (let i = 0; i < s.owner.length; i++) if (s.owner[i] === p.id && s.land[i] === 1) owned++;
    if (total > 0 && owned / total >= 0.65) {
      s.winner = p.id;
      log(s, p.id, "system", `${p.name} controls 65% of the world. Domination victory!`);
      return;
    }
  }
}

function chaosEvent(s: GameState) {
  if (s.mode !== "chaos") return;
  if (rand(s) > 0.45) return;
  const roll = rand(s);
  const alive = s.players.filter((p) => p.alive);
  if (alive.length === 0) return;

  if (roll < 0.34) {
    const targets: number[] = [];
    for (let i = 0; i < s.units.length; i++) {
      const u = s.units[i];
      if (u && u.kind !== "king") targets.push(i);
    }
    if (targets.length) {
      const hit = targets[Math.floor(rand(s) * targets.length)];
      const victim = s.units[hit];
      s.units[hit] = null;
      s.boom = { at: hit, turn: s.turn };
      log(s, victim ? victim.owner : 0, "boom", `A meteor scribbles out a ${victim ? PIECES[victim.kind].name : "unit"}!`);
    }
  } else if (roll < 0.67) {
    const p = alive[Math.floor(rand(s) * alive.length)];
    p.gold += 30;
    log(s, p.id, "system", `Gold rush! ${p.name} finds 30 coins under a rock.`);
  } else {
    const p = alive[Math.floor(rand(s) * alive.length)];
    const loss = Math.floor(p.gold * 0.15);
    p.gold -= loss;
    log(s, p.id, "system", `Plague of ink blots: ${p.name} loses ${loss} gold.`);
  }
}

function startTurn(s: GameState) {
  const p = s.players[s.current];
  if (!p) return;
  const eco = economy(s, s.current);
  p.gold += eco.net;
  p.time = Math.min(p.time + s.increment, s.clock * 2);

  if (p.gold < 0) {
    // bankruptcy: units desert until the books balance
    while (p.gold < 0) {
      let worst = -1;
      let worstCost = -1;
      for (let i = 0; i < s.units.length; i++) {
        const u = s.units[i];
        if (!u || u.owner !== p.id || u.kind === "king") continue;
        const c = PIECES[u.kind].upkeep;
        if (c > worstCost) {
          worstCost = c;
          worst = i;
        }
      }
      if (worst < 0) break;
      const gone = s.units[worst];
      s.units[worst] = null;
      p.gold += (gone ? PIECES[gone.kind].cost : 4) * 2;
      log(s, p.id, "system", `${p.name} cannot pay wages: a ${gone ? PIECES[gone.kind].name : "unit"} deserts.`);
    }
    if (p.gold < 0) p.gold = 0;
  }

  for (const u of s.units) {
    if (u && u.owner === s.current) {
      u.mv = 0;
      u.extra = 0;
    }
  }
  s.treaties = s.treaties.filter((t) => t.until > s.turn);
  checkVictory(s);
}

export function advanceTurn(s: GameState) {
  if (s.winner !== null) return;
  let guard = 0;
  do {
    s.current = (s.current + 1) % s.players.length;
    if (s.current === 0) {
      s.round++;
      chaosEvent(s);

      // Turn-based random weather cycle
      if (!s.weather) s.weather = "sun";
      const roll = rand(s);
      let newWeather: "sun" | "fog" | "blizzard" | "storm" = "sun";
      if (roll < 0.40) {
        newWeather = "sun";
      } else if (roll < 0.65) {
        newWeather = "fog";
      } else if (roll < 0.85) {
        newWeather = "storm";
      } else {
        newWeather = "blizzard";
      }

      if (newWeather !== s.weather) {
        s.weather = newWeather;
        let msg = "Sunny & clear skies return to the realm.";
        if (newWeather === "fog") msg = "Thick pencil fog blankets the board! Sliding movement ranges are reduced by 1.";
        if (newWeather === "blizzard") msg = "A freezing ink blizzard sweeps in! All moves are slowed by 1, and unit upkeeps increase by +$1.";
        if (newWeather === "storm") msg = "A majestic thunderstorm rages! Flying unit range is capped at 2 tiles.";
        log(s, 0, "system", `WEATHER UPDATE: ${msg}`);
      }
    }
    guard++;
  } while (!s.players[s.current].alive && guard < s.players.length * 3);
  s.turn++;
  startTurn(s);
}

/** Rough "how scary is this nation" number, used by the AI and diplomacy. */
export function strength(s: GameState, p: number) {
  const eco = economy(s, p);
  return eco.army + eco.land * 2 + eco.gross * 3;
}

export function evaluateOffer(s: GameState, offer: Offer): boolean {
  const me = offer.to;
  const them = offer.from;
  const myPower = strength(s, me);
  const theirPower = strength(s, them);
  const skill = s.players[me]?.skill ?? "normal";
  let score = 0;
  score += offer.gold * 1.2;
  score -= offer.demandGold * 1.4;
  // peace is worth more when you are weaker
  const ratio = theirPower / Math.max(1, myPower);
  score += offer.peaceTurns * (ratio - 0.85) * 14;
  if (skill === "brutal") score -= 12;
  if (skill === "easy") score += 12;
  if (s.players[me] && s.players[me].gold < 15) score += offer.gold * 0.6;
  return score > 0;
}

function resolveCombat(
  s: GameState,
  attacker: Unit,
  from: number,
  defender: Unit,
  to: number
): boolean {
  const attDef = PIECES[attacker.kind];
  const defDef = PIECES[defender.kind];

  // Buildings are auto-razed
  if (defDef.building) {
    log(s, attacker.owner, "capture", `${s.players[attacker.owner].name}'s ${attDef.name} razes enemy ${defDef.name}.`);
    s.units[to] = null;
    return true;
  }

  // Base Strengths
  const getBaseStrength = (u: Unit) => {
    if (u.kind === "king") return 4;
    const cost = PIECES[u.kind].cost;
    if (cost <= 3) return 3;
    if (cost <= 8) return 4;
    return 5;
  };

  const attBase = getBaseStrength(attacker);
  const defBase = getBaseStrength(defender);

  const attRank = attacker.rank ?? 0;
  const defRank = defender.rank ?? 0;

  // Dice rolls (1d6) deterministic generator
  const rollDie = () => {
    s.rng = (s.rng * 9301 + 49297) % 233280;
    return 1 + Math.floor((s.rng / 233280) * 6);
  };

  const attRoll = rollDie();
  const defRoll = rollDie();

  // Weather modifiers
  let attWeatherMod = 0;
  let defWeatherMod = 0;
  if (s.weather === "storm") {
    attWeatherMod = -1;
  }
  if (s.weather === "fog") {
    defWeatherMod = 1;
  }

  // Terrain / Fortification modifier
  let defTerrMod = 0;
  if (s.owner[to] === defender.owner) {
    defTerrMod = 1;
  }

  const attTotal = attBase + attRoll + attRank + attWeatherMod;
  const defTotal = defBase + defRoll + defRank + defWeatherMod + defTerrMod;

  const attName = s.players[attacker.owner]?.name ?? "Attacker";
  const defName = s.players[defender.owner]?.name ?? "Defender";

  const rankNames = ["Recruit", "Veteran", "Elite", "Legend"];
  const attRankName = rankNames[Math.min(3, attRank)];
  const defRankName = rankNames[Math.min(3, defRank)];

  if (attTotal >= defTotal) {
    // Attack wins!
    let capMsg = "";
    if (attacker.kind === "dragon") {
      attacker.memory = defender.kind;
      capMsg = `The Dragon devours ${defName}'s ${defRankName} ${defDef.name} and copies its move!`;
    } else {
      capMsg = `${attName}'s ${attRankName} ${attDef.name} defeats ${defName}'s ${defRankName} ${defDef.name} in skirmish!`;
    }
    
    const rollBreakdown = `(Roll: Attacker ${attBase}+d6[${attRoll}]+Rank[${attRank}]${attWeatherMod ? `-Storm[1]` : ""} = ${attTotal} vs Defender ${defBase}+d6[${defRoll}]+Rank[${defRank}]${defWeatherMod ? `+Fog[1]` : ""}${defTerrMod ? `+Fort[1]` : ""} = ${defTotal})`;
    log(s, attacker.owner, "capture", `${capMsg} ${rollBreakdown}`);

    // Award XP to attacker
    attacker.xp = (attacker.xp ?? 0) + 1;
    let rankUp = false;
    let nextRank = attacker.rank ?? 0;
    if (nextRank === 0 && attacker.xp >= 1) { nextRank = 1; rankUp = true; }
    else if (nextRank === 1 && attacker.xp >= 2) { nextRank = 2; rankUp = true; }
    else if (nextRank === 2 && attacker.xp >= 4) { nextRank = 3; rankUp = true; }
    
    if (rankUp) {
      attacker.rank = nextRank;
      log(s, attacker.owner, "system", `PROMOTION: ${attName}'s ${attDef.name} is promoted to ${rankNames[nextRank]}!`);
    }

    if (attacker.kind === "snake") {
      attacker.extra = (attacker.extra ?? 0) + 1;
    }

    if (defender.kind === "king") {
      eliminate(s, defender.owner, attacker.owner);
    }

    s.units[to] = null;
    return true;
  } else {
    // Defense wins!
    const capMsg = `${defName}'s ${defRankName} ${defDef.name} successfully repels ${attName}'s ${attRankName} ${attDef.name}!`;
    const rollBreakdown = `(Roll: Defender ${defBase}+d6[${defRoll}]+Rank[${defRank}]${defWeatherMod ? `+Fog[1]` : ""}${defTerrMod ? `+Fort[1]` : ""} = ${defTotal} vs Attacker ${attBase}+d6[${attRoll}]+Rank[${attRank}]${attWeatherMod ? `-Storm[1]` : ""} = ${attTotal})`;
    log(s, defender.owner, "capture", `${capMsg} ${rollBreakdown}`);

    // Award XP to defender
    defender.xp = (defender.xp ?? 0) + 1;
    let rankUp = false;
    let nextRank = defender.rank ?? 0;
    if (nextRank === 0 && defender.xp >= 1) { nextRank = 1; rankUp = true; }
    else if (nextRank === 1 && defender.xp >= 2) { nextRank = 2; rankUp = true; }
    else if (nextRank === 2 && defender.xp >= 4) { nextRank = 3; rankUp = true; }

    if (rankUp) {
      defender.rank = nextRank;
      log(s, defender.owner, "system", `PROMOTION: ${defName}'s ${defDef.name} is promoted to ${rankNames[nextRank]}!`);
    }

    return false;
  }
}

export function applyAction(s: GameState, actor: number, action: Action): ActionResult {
  const events: string[] = [];
  const fail = (error: string): ActionResult => ({ ok: false, error, events });

  if (action.type === "tick") {
    const p = s.players[s.current];
    if (p && s.winner === null) {
      p.time = Math.max(0, p.time - action.seconds);
      if (p.time <= 0) {
        log(s, p.id, "system", `${p.name} ran out of time and the turn passes.`);
        advanceTurn(s);
      }
    }
    return { ok: true, events };
  }

  if (s.winner !== null) return fail("The match is already over.");

  if (action.type === "respond") {
    const offer = s.offers.find((o) => o.id === action.offerId);
    if (!offer) return fail("That offer expired.");
    if (offer.to !== actor) return fail("Not your offer to answer.");
    s.offers = s.offers.filter((o) => o.id !== offer.id);
    if (!action.accept) {
      log(s, actor, "diplo", `${s.players[actor].name} rejects the offer from ${s.players[offer.from].name}.`);
      return { ok: true, events: ["rejected"] };
    }
    settleOffer(s, offer);
    return { ok: true, events: ["accepted"] };
  }

  if (actor !== s.current) return fail("It is not your turn.");
  const me = s.players[actor];
  if (!me || !me.alive) return fail("You are out of the game.");

  switch (action.type) {
    case "move": {
      const u = s.units[action.from];
      if (!u) return fail("No unit there.");
      if (u.owner !== actor) return fail("That is not your unit.");
      if (movesLeft(u) <= 0) return fail("That unit already moved.");
      const moves = legalMoves(s, action.from);
      if (!moves.includes(action.to)) return fail("Illegal move.");
      const def = PIECES[u.kind];

      const enemyUnit = s.units[action.to];
      if (enemyUnit) {
        const isWin = resolveCombat(s, u, action.from, enemyUnit, action.to);
        u.mv += 1;
        if (isWin) {
          s.units[action.from] = null;
          s.units[action.to] = u;
          s.lastMove = { from: action.from, to: action.to };
          const waterClaim = def.terrain === "water" || u.kind === "spider" || u.kind === "plane";
          claim(s, action.to, actor, def.claim, waterClaim);
        } else {
          // Repelled! Remain in original tile
          s.lastMove = { from: action.from, to: action.from };
        }
      } else {
        s.units[action.from] = null;
        s.units[action.to] = u;
        u.mv += 1;
        s.lastMove = { from: action.from, to: action.to };
        const waterClaim = def.terrain === "water" || u.kind === "spider" || u.kind === "plane";
        claim(s, action.to, actor, def.claim, waterClaim);
      }
      checkVictory(s);
      return { ok: true, events };
    }
    case "buy": {
      const def = PIECES[action.kind];
      if (!def) return fail("Unknown unit.");
      if (action.kind === "king") return fail("Kings cannot be bought.");
      if (s.mode === "classic" && !["pawn", "knight", "bishop", "rook", "queen", "farm", "harbor"].includes(action.kind))
        return fail("That unit is disabled in Classic rules.");
      const cost = costOf(s, action.kind);
      if (me.gold < cost) return fail("Not enough gold.");
      if (!buySpots(s, actor, action.kind).includes(action.at)) return fail("You cannot deploy there.");
      me.gold -= cost;
      const u = place(s, action.at, action.kind, actor);
      u.mv = 1; // freshly bought units rest for a turn
      const waterClaim = action.kind === "harbor" || action.kind === "boat";
      claim(s, action.at, actor, action.kind === "harbor" ? 2 : def.claim, waterClaim);
      log(s, actor, "buy", `${me.name} deploys a ${def.name} for $${cost}.`);
      return { ok: true, events };
    }
    case "detonate": {
      const u = s.units[action.from];
      if (!u || u.owner !== actor || u.kind !== "nuke") return fail("No nuke there.");
      if (movesLeft(u) <= 0) return fail("The nuke already acted.");
      const blast = [action.from, ...ring(s, action.from, 2)];
      let kills = 0;
      for (const i of blast) {
        const target = s.units[i];
        if (!target) continue;
        const dist = chebyshev(s, i, action.from);
        if (target.kind === "king" && dist > 1) continue;
        if (dist > 1 && !PIECES[target.kind].building && rand(s) > 0.8) continue;
        s.units[i] = null;
        kills++;
        if (target.kind === "king") eliminate(s, target.owner, actor);
      }
      for (const i of [action.from, ...ring(s, action.from, 1)]) s.owner[i] = -1;
      s.boom = { at: action.from, turn: s.turn };
      log(s, actor, "boom", `KABOOM! ${me.name}'s nuke erases ${kills} piece${kills === 1 ? "" : "s"}.`);
      checkVictory(s);
      return { ok: true, events };
    }
    case "teleport": {
      const u = s.units[action.from];
      if (!u || u.owner !== actor) return fail("No unit there.");
      if (!teleportTargets(s, action.from).includes(action.to)) return fail("No portal link there.");
      s.units[action.from] = null;
      s.units[action.to] = u;
      u.mv += 1;
      s.lastMove = { from: action.from, to: action.to };
      claim(s, action.to, actor, PIECES[u.kind].claim, false);
      log(s, actor, "move", `${me.name} warps a ${PIECES[u.kind].name} through a portal.`);
      return { ok: true, events };
    }
    case "diplomacy": {
      const target = s.players[action.to];
      if (!target || !target.alive || action.to === actor) return fail("Invalid recipient.");
      if (action.offer.gold > me.gold) return fail("You cannot pay that.");
      const offer: Offer = {
        id: s.nextId++,
        from: actor,
        to: action.to,
        peaceTurns: Math.max(0, Math.min(30, Math.floor(action.offer.peaceTurns))),
        gold: Math.max(0, Math.floor(action.offer.gold)),
        demandGold: Math.max(0, Math.floor(action.offer.demandGold)),
      };
      if (target.isAI) {
        const accept = evaluateOffer(s, offer);
        if (accept) {
          settleOffer(s, offer);
          events.push("accepted");
        } else {
          log(s, action.to, "diplo", `${target.name} scoffs at ${me.name}'s offer.`);
          events.push("rejected");
        }
      } else {
        s.offers.push(offer);
        log(s, actor, "diplo", `${me.name} sends an offer to ${target.name}.`);
        events.push("pending");
      }
      return { ok: true, events };
    }
    case "resign": {
      log(s, actor, "system", `${me.name} resigns.`);
      eliminate(s, actor, actor);
      checkVictory(s);
      if (s.winner === null && s.current === actor) advanceTurn(s);
      return { ok: true, events };
    }
    case "decree": {
      if (action.name === "tax") {
        // Collect tax: gain +$12 gold, lose up to 2 random owned tiles (excluding buildings)
        const candidates: number[] = [];
        for (let i = 0; i < s.owner.length; i++) {
          if (s.owner[i] === actor) {
            const hasUnit = s.units[i];
            if (!hasUnit || !PIECES[hasUnit.kind].building) {
              candidates.push(i);
            }
          }
        }
        // Randomly forfeit 2 tiles
        let lostCount = 0;
        const shuffled = candidates.sort(() => (s.rng = (s.rng * 9301 + 49297) % 233280) / 233280 - 0.5);
        for (let i = 0; i < Math.min(2, shuffled.length); i++) {
          s.owner[shuffled[i]] = -1;
          lostCount++;
        }
        me.gold += 12;
        log(s, actor, "diplo", `${me.name} levies emergency war taxes for $12 gold, sacrificing ${lostCount} territories.`);
        return { ok: true, events };
      } else if (action.name === "bridge") {
        if (action.tile === undefined) return fail("No target tile selected.");
        const t = action.tile;
        if (t < 0 || t >= s.land.length) return fail("Invalid tile.");
        if (s.land[t] !== 0) return fail("Target tile must be water.");
        if (me.gold < 9) return fail("Building a tactical bridge costs $9 gold.");
        // Check if any neighbor is owned by actor
        const nbrs = neighbors(s, t);
        const hasAdjacentFriend = nbrs.some((n) => s.owner[n] === actor);
        if (!hasAdjacentFriend) return fail("Bridge must connect to your existing territory.");

        me.gold -= 9;
        s.land[t] = 1; // Turn water to land
        s.owner[t] = actor; // Claim it
        log(s, actor, "diplo", `${me.name} constructs a tactical dirt bridge, reclaiming the waves.`);
        return { ok: true, events };
      }
      return fail("Unknown decree.");
    }
    case "endTurn": {
      advanceTurn(s);
      return { ok: true, events };
    }
    default:
      return fail("Unknown action.");
  }
}

function settleOffer(s: GameState, offer: Offer) {
  const from = s.players[offer.from];
  const to = s.players[offer.to];
  const pay = Math.min(offer.gold, from.gold);
  from.gold -= pay;
  to.gold += pay;
  const demand = Math.min(offer.demandGold, to.gold);
  to.gold -= demand;
  from.gold += demand;

  if (offer.peaceTurns > 0) {
    const existing = s.treaties.find(
      (t) =>
        (t.a === offer.from && t.b === offer.to) || (t.a === offer.to && t.b === offer.from),
    );
    const until = s.turn + offer.peaceTurns * Math.max(1, s.players.filter((p) => p.alive).length);
    if (existing) existing.until = Math.max(existing.until, until);
    else s.treaties.push({ a: offer.from, b: offer.to, until });
  }

  log(
    s,
    offer.to,
    "diplo",
    `${to.name} accepts ${from.name}'s offer${offer.peaceTurns ? ` - peace for ${offer.peaceTurns} rounds` : ""}${pay ? ` and $${pay}` : ""}.`,
  );
}

export function scoreOf(s: GameState, p: number) {
  const eco = economy(s, p);
  return eco.land * 4 + eco.army * 2 + Math.floor(s.players[p].gold / 4) + eco.farms * 6;
}
