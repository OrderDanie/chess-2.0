import {
  applyAction,
  atPeace,
  buySpots,
  chebyshev,
  claim,
  cloneState,
  costOf,
  economy,
  idx,
  legalMoves,
  manhattan,
  movesLeft,
  neighbors,
  ring,
  strength,
  xOf,
  yOf,
} from "./engine";
import { Action, GameState, PIECES, PieceKind, Unit } from "../../types";

function attacksFrom(s: GameState, i: number): number[] {
  const u = s.units[i];
  if (!u) return [];
  const keep = u.mv;
  u.mv = 0;
  const moves = legalMoves(s, i);
  u.mv = keep;
  return moves;
}

function threatMap(s: GameState, me: number): number[] {
  const t = new Array<number>(s.w * s.h).fill(0);
  for (let i = 0; i < s.units.length; i++) {
    const u = s.units[i];
    if (!u || u.owner === me) continue;
    if (atPeace(s, u.owner, me)) continue;
    const val = PIECES[u.kind].cost || 3;
    for (const m of attacksFrom(s, i)) t[m] = Math.max(t[m], val);
  }
  return t;
}

/** multi source BFS over the whole grid */
function bfs(s: GameState, sources: number[], landOnly = true): number[] {
  const dist = new Array<number>(s.w * s.h).fill(999);
  const q: number[] = [];
  for (const src of sources) {
    dist[src] = 0;
    q.push(src);
  }
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    const d = dist[cur] + 1;
    for (const n of neighbors(s, cur)) {
      if (landOnly && s.land[n] === 0) continue;
      if (dist[n] <= d) continue;
      dist[n] = d;
      q.push(n);
    }
  }
  return dist;
}

function claimGain(s: GameState, at: number, u: Unit): number {
  const def = PIECES[u.kind];
  const r = def.claim;
  if (r <= 0) return 0;
  let gain = 0;
  const cx = xOf(s, at);
  const cy = yOf(s, at);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > r) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h) continue;
      const i = idx(s, nx, ny);
      if (s.land[i] === 0) continue;
      if (s.owner[i] === u.owner) continue;
      const occ = s.units[i];
      if (occ && occ.owner !== u.owner) continue;
      if (s.owner[i] !== -1 && atPeace(s, s.owner[i], u.owner)) continue;
      gain += s.owner[i] === -1 ? 1 : 1.6;
    }
  }
  return gain;
}

export function planAITurn(real: GameState, me: number): Action[] {
  const s = cloneState(real);
  const plan: Action[] = [];
  const p = s.players[me];
  if (!p || !p.alive || s.winner !== null) return [{ type: "endTurn" }];
  const aggression = p.skill === "brutal" ? 1.35 : p.skill === "easy" ? 0.6 : 1;

  // ---- diplomacy ----------------------------------------------------------
  const myPower = strength(s, me);
  for (const other of s.players) {
    if (!other.alive || other.id === me) continue;
    if (atPeace(s, me, other.id)) continue;
    const theirs = strength(s, other.id);
    if (theirs > myPower * 1.45 && p.gold > 30 && Math.random() < 0.4) {
      const act: Action = {
        type: "diplomacy",
        to: other.id,
        offer: { peaceTurns: 5, gold: Math.min(40, Math.floor(p.gold * 0.25)), demandGold: 0 },
      };
      applyAction(s, me, act);
      plan.push(act);
      break;
    }
  }

  // ---- economy ------------------------------------------------------------
  const enemyTiles: number[] = [];
  const freeTiles: number[] = [];
  for (let i = 0; i < s.owner.length; i++) {
    if (s.land[i] !== 1) continue;
    if (s.owner[i] === -1) freeTiles.push(i);
    else if (s.owner[i] !== me && !atPeace(s, s.owner[i], me)) enemyTiles.push(i);
  }
  for (let i = 0; i < s.units.length; i++) {
    const u = s.units[i];
    if (u && u.owner !== me && !atPeace(s, u.owner, me)) enemyTiles.push(i);
  }
  const distEnemy = bfs(s, enemyTiles.length ? enemyTiles : [0], true);
  const distFree = bfs(s, freeTiles.length ? freeTiles : [0], true);

  let kingAt = -1;
  for (let i = 0; i < s.units.length; i++) {
    const u = s.units[i];
    if (u && u.owner === me && u.kind === "king") kingAt = i;
  }
  const kingDanger =
    kingAt >= 0 && enemyTiles.some((e) => manhattan(s, e, kingAt) <= 3) ? 1 : 0;

  const eco = economy(s, me);
  const unlocked: PieceKind[] =
    s.mode === "classic"
      ? ["pawn", "knight", "bishop", "rook", "queen", "farm", "harbor"]
      : [
          "pawn",
          "knight",
          "bishop",
          "rook",
          "queen",
          "farm",
          "harbor",
          "boat",
          "snake",
          "spider",
          "portal",
          "plane",
          "nuke",
          "dragon",
        ];

  const wants: PieceKind[] = [];
  if (eco.farms < Math.max(1, Math.floor(eco.land / 7)) && eco.net >= -2) wants.push("farm");
  if (kingDanger) wants.push("rook", "knight");
  if (eco.units < 3) wants.push("pawn", "pawn");
  if (eco.gross > 16 && eco.units < eco.land / 4) wants.push("knight", "bishop");
  if (eco.gross > 26) wants.push("rook");
  if (eco.gross > 34 && p.skill !== "easy") wants.push("queen");
  if (s.mode !== "classic" && eco.gross > 30 && Math.random() < 0.5) {
    wants.push(
      ["snake", "spider", "plane", "nuke", "dragon", "portal"][
        Math.floor(Math.random() * 6)
      ] as PieceKind,
    );
  }
  wants.push("farm", "pawn", "pawn", "knight");

  let buys = 0;
  for (const kind of wants) {
    if (buys >= 6) break;
    if (!unlocked.includes(kind)) continue;
    const cost = costOf(s, kind);
    const reserve = kindIsEconomy(kind) ? 0 : 4;
    if (s.players[me].gold < cost + reserve) continue;
    const spots = buySpots(s, me, kind);
    if (!spots.length) continue;

    let best = -1;
    let bestScore = -Infinity;
    for (const spot of spots) {
      let sc = 0;
      if (kindIsEconomy(kind)) {
        sc += Math.min(distEnemy[spot], 12) * 2;
        sc -= countAdjacentBuildings(s, spot, me) * 3;
      } else {
        sc -= Math.min(distEnemy[spot], 14);
        sc -= Math.min(distFree[spot], 14) * 0.8;
        if (kingDanger && kingAt >= 0) sc -= manhattan(s, spot, kingAt) * 1.4;
      }
      sc += Math.random() * 2;
      if (sc > bestScore) {
        bestScore = sc;
        best = spot;
      }
    }
    if (best < 0) continue;
    const act: Action = { type: "buy", kind, at: best };
    const res = applyAction(s, me, act);
    if (res.ok) {
      plan.push(act);
      buys++;
    }
  }

  // ---- movement -----------------------------------------------------------
  const threats = threatMap(s, me);
  let steps = 0;
  for (let pass = 0; pass < 2; pass++) {
    const mine: number[] = [];
    for (let i = 0; i < s.units.length; i++) {
      const u = s.units[i];
      if (u && u.owner === me && movesLeft(u) > 0 && PIECES[u.kind].move !== "none") mine.push(i);
    }
    mine.sort((a, b) => (PIECES[s.units[b]!.kind].cost || 0) - (PIECES[s.units[a]!.kind].cost || 0));
    if (!mine.length) break;

    let acted = false;
    for (const from of mine) {
      if (steps > 40) break;
      const u = s.units[from];
      if (!u || movesLeft(u) <= 0) continue;

      // nuke logic: blow up when it pays off
      if (u.kind === "nuke") {
        let kills = 0;
        let value = 0;
        for (const i of [from, ...ring(s, from, 2)]) {
          const t = s.units[i];
          if (!t) continue;
          if (t.owner === me) value -= PIECES[t.kind].cost;
          else if (!atPeace(s, t.owner, me)) {
            kills++;
            value += t.kind === "king" ? 200 : PIECES[t.kind].cost;
          }
        }
        if (kills >= 2 && value > PIECES.nuke.cost) {
          const act: Action = { type: "detonate", from };
          if (applyAction(s, me, act).ok) {
            plan.push(act);
            steps++;
            acted = true;
            continue;
          }
        }
      }

      const moves = legalMoves(s, from);
      if (!moves.length) continue;
      let bestTo = -1;
      let bestScore = 0.6;
      for (const to of moves) {
        const victim = s.units[to];
        let sc = 0;
        if (victim) {
          sc += victim.kind === "king" ? 400 : PIECES[victim.kind].cost * 3.2 * aggression;
          if (PIECES[victim.kind].building) sc += 6;
        }
        sc += claimGain(s, to, u) * 3.2;
        sc += (Math.min(distFree[from], 20) - Math.min(distFree[to], 20)) * 1.1;
        sc += (Math.min(distEnemy[from], 20) - Math.min(distEnemy[to], 20)) * 0.9 * aggression;
        const danger = threats[to];
        if (danger > 0) sc -= Math.min(PIECES[u.kind].cost, 20) * 1.5 * (2 - aggression);
        if (u.kind === "king") {
          sc -= 10;
          if (danger > 0) sc -= 25;
        }
        if (u.kind === "boat") sc += 1;
        sc += Math.random() * 1.5;
        if (sc > bestScore) {
          bestScore = sc;
          bestTo = to;
        }
      }
      if (bestTo >= 0) {
        const act: Action = { type: "move", from, to: bestTo };
        const res = applyAction(s, me, act);
        if (res.ok) {
          plan.push(act);
          steps++;
          acted = true;
        }
      }
    }
    if (!acted) break;
  }

  plan.push({ type: "endTurn" });
  return plan;
}

function kindIsEconomy(kind: PieceKind) {
  return kind === "farm" || kind === "harbor" || kind === "portal";
}

function countAdjacentBuildings(s: GameState, at: number, owner: number) {
  let n = 0;
  for (const i of ring(s, at, 1)) {
    const u = s.units[i];
    if (u && u.owner === owner && PIECES[u.kind].building) n++;
  }
  return n;
}

/** Exported for the "auto play my turn" helper button. */
export function suggestMove(s: GameState, me: number): Action | null {
  const plan = planAITurn(s, me).filter((a) => a.type === "move");
  return plan[0] ?? null;
}

export { claim, chebyshev };
