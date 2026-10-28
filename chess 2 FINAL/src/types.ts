export type PieceKind =
  | "pawn"
  | "knight"
  | "bishop"
  | "rook"
  | "queen"
  | "king"
  | "dragon"
  | "nuke"
  | "portal"
  | "spider"
  | "snake"
  | "plane"
  | "boat"
  | "farm"
  | "harbor"
  | "tank";

export type MoveStyle = "step" | "slide" | "jump" | "fly" | "none";
export type DirSet = "ortho" | "diag" | "all" | "knight";
export type Terrain = "land" | "water" | "any";
export type GameMode = "classic" | "standard" | "chaos";

export interface PieceDef {
  kind: PieceKind;
  name: string;
  cost: number;
  upkeep: number;
  income: number;
  move: MoveStyle;
  dirs: DirSet;
  range: number;
  terrain: Terrain;
  building?: boolean;
  ability?: "detonate" | "teleport" | "chain" | "copy";
  claim: number; // radius of territory claimed when it lands / is built
  blurb: string;
}

export const PIECES: Record<PieceKind, PieceDef> = {
  pawn: {
    kind: "pawn",
    name: "Pawn",
    cost: 3,
    upkeep: 1,
    income: 0,
    move: "step",
    dirs: "all",
    range: 1,
    terrain: "land",
    claim: 1,
    blurb: "Cheap frontline settler. Advances one tile and paints territory. Salary is $1/turn because he has not discovered labor unions yet.",
  },
  knight: {
    kind: "knight",
    name: "Knight",
    cost: 6,
    upkeep: 2,
    income: 0,
    move: "jump",
    dirs: "knight",
    range: 1,
    terrain: "land",
    claim: 1,
    blurb: "Leaps over everything in an L-shape because straight lines make him dizzy. Completely ignores mountains, rivers, and international law.",
  },
  bishop: {
    kind: "bishop",
    name: "Bishop",
    cost: 6,
    upkeep: 2,
    income: 0,
    move: "slide",
    dirs: "diag",
    range: 6,
    terrain: "land",
    claim: 1,
    blurb: "Blasts diagonally across continents. Legally forbidden from stepping on opposing color tiles due to ancient religious treaties.",
  },
  rook: {
    kind: "rook",
    name: "Rook",
    cost: 9,
    upkeep: 3,
    income: 1,
    move: "slide",
    dirs: "ortho",
    range: 6,
    terrain: "land",
    claim: 2,
    blurb: "A literal 50-ton brick fortress charging at highway speeds. Claims massive territory rings upon parking.",
  },
  queen: {
    kind: "queen",
    name: "Queen",
    cost: 14,
    upkeep: 5,
    income: 0,
    move: "slide",
    dirs: "all",
    range: 6,
    terrain: "land",
    claim: 2,
    blurb: "The undisputed CEO of battlefield violence. 8-directional devastation. Demands $5/turn upkeep to maintain her lifestyle.",
  },
  king: {
    kind: "king",
    name: "King",
    cost: 0,
    upkeep: 0,
    income: 3,
    move: "step",
    dirs: "all",
    range: 1,
    terrain: "land",
    claim: 2,
    blurb: "Your supreme monarch. Generates $3/turn purely by existing. If he gets captured, everyone immediately forfeits and goes home.",
  },
  dragon: {
    kind: "dragon",
    name: "Dragon",
    cost: 22,
    upkeep: 6,
    income: 0,
    move: "fly",
    dirs: "all",
    range: 3,
    terrain: "any",
    ability: "copy",
    claim: 1,
    blurb: "Airborne mythical predator. Flies over oceans and mountains. Devours enemies and copies their movement out of pure spite.",
  },
  nuke: {
    kind: "nuke",
    name: "Nuke",
    cost: 18,
    upkeep: 2,
    income: 0,
    move: "step",
    dirs: "all",
    range: 1,
    terrain: "land",
    ability: "detonate",
    claim: 0,
    blurb: "A slow-moving cylinder of catastrophic diplomatic failure. Vaporizes a 5x5 radioactive crater when negotiations stall.",
  },
  portal: {
    kind: "portal",
    name: "Portal",
    cost: 10,
    upkeep: 1,
    income: 0,
    move: "none",
    dirs: "all",
    range: 0,
    terrain: "land",
    building: true,
    ability: "teleport",
    claim: 1,
    blurb: "Interdimensional shortcut. Lets friendly troops bypass miles of terrain because walking is beneath them.",
  },
  spider: {
    kind: "spider",
    name: "Spider",
    cost: 11,
    upkeep: 3,
    income: 0,
    move: "fly",
    dirs: "all",
    range: 2,
    terrain: "any",
    claim: 1,
    blurb: "Eight hairy legs of chaotic territory denial. Skitters over land or water while whistling nonchalantly.",
  },
  snake: {
    kind: "snake",
    name: "Snake",
    cost: 8,
    upkeep: 2,
    income: 0,
    move: "slide",
    dirs: "ortho",
    range: 4,
    terrain: "land",
    ability: "chain",
    claim: 1,
    blurb: "Slithers in straight lines. Granted an immediate bonus move after eating someone. Has zero moral compass.",
  },
  plane: {
    kind: "plane",
    name: "Plane",
    cost: 16,
    upkeep: 4,
    income: 0,
    move: "fly",
    dirs: "all",
    range: 5,
    terrain: "any",
    claim: 1,
    blurb: "Aviation pioneer. Soars five tiles in any direction over armies, mountains, and treaties.",
  },
  boat: {
    kind: "boat",
    name: "Boat",
    cost: 8,
    upkeep: 2,
    income: 1,
    move: "slide",
    dirs: "ortho",
    range: 5,
    terrain: "water",
    claim: 1,
    blurb: "Naval transport vessel. Absolute master of the seven seas, but completely and utterly useless on grass.",
  },
  farm: {
    kind: "farm",
    name: "Farm",
    cost: 6,
    upkeep: 0,
    income: 3,
    move: "none",
    dirs: "all",
    range: 0,
    terrain: "land",
    building: true,
    claim: 1,
    blurb: "Generates +$3 gold every round. The entire kingdom's economy rests on these cabbages. Do not let horses trample them.",
  },
  harbor: {
    kind: "harbor",
    name: "Harbor",
    cost: 7,
    upkeep: 0,
    income: 2,
    move: "none",
    dirs: "all",
    range: 0,
    terrain: "land",
    building: true,
    claim: 1,
    blurb: "Produces +$2 gold, projects territorial water control, and lets you pretend you have an invincible navy.",
  },
  tank: {
    kind: "tank",
    name: "Tank",
    cost: 13,
    upkeep: 4,
    income: 0,
    move: "slide",
    dirs: "ortho",
    range: 2,
    terrain: "land",
    claim: 2,
    blurb: "Heavy armored division. Moves orthogonally up to 2 steps. Claims a 2-radius region when parked and ignores light defenses.",
  },
};

export const SHOP_ORDER: PieceKind[] = [
  "pawn",
  "knight",
  "bishop",
  "rook",
  "queen",
  "tank",
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

export const CLASSIC_SHOP: PieceKind[] = [
  "pawn",
  "knight",
  "bishop",
  "rook",
  "queen",
  "tank",
  "farm",
  "harbor",
];

export function shopFor(mode: GameMode): PieceKind[] {
  if (mode === "classic") return CLASSIC_SHOP;
  return SHOP_ORDER;
}

export interface Unit {
  id: number;
  kind: PieceKind;
  owner: number;
  /** moves already spent this turn */
  mv: number;
  /** extra move granted (snake chain) */
  extra?: number;
  /** dragon: copied movement pattern */
  memory?: PieceKind;
  xp?: number;
  rank?: number;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  gold: number;
  alive: boolean;
  isAI: boolean;
  skill: "easy" | "normal" | "brutal";
  /** seconds left on the clock */
  time: number;
  eliminatedTurn?: number;
}

export interface Treaty {
  a: number;
  b: number;
  /** peace holds until this turn number */
  until: number;
}

export interface LogEntry {
  turn: number;
  player: number;
  text: string;
  kind: "move" | "buy" | "capture" | "diplo" | "boom" | "system";
}

export interface DiploOffer {
  peaceTurns: number;
  gold: number;
  demandGold: number;
}

export interface Offer extends DiploOffer {
  id: number;
  from: number;
  to: number;
}

export interface GameState {
  w: number;
  h: number;
  /** 1 = land, 0 = water */
  land: number[];
  /** owner player index or -1 */
  owner: number[];
  units: (Unit | null)[];
  players: Player[];
  current: number;
  turn: number;
  round: number;
  mode: GameMode;
  mapName: string;
  treaties: Treaty[];
  offers: Offer[];
  log: LogEntry[];
  winner: number | null;
  nextId: number;
  rng: number;
  clock: number;
  increment: number;
  lastMove?: { from: number; to: number } | null;
  boom?: { at: number; turn: number } | null;
  weather?: "sun" | "fog" | "blizzard" | "storm";
}

export type Action =
  | { type: "move"; from: number; to: number }
  | { type: "buy"; kind: PieceKind; at: number }
  | { type: "detonate"; from: number }
  | { type: "teleport"; from: number; to: number }
  | { type: "endTurn" }
  | { type: "diplomacy"; to: number; offer: DiploOffer }
  | { type: "respond"; offerId: number; accept: boolean }
  | { type: "resign" }
  | { type: "tick"; seconds: number }
  | { type: "decree"; name: "tax" | "bridge"; tile?: number };

export interface ActionResult {
  ok: boolean;
  error?: string;
  events: string[];
}

export const PLAYER_COLORS = [
  "#4aa3e8",
  "#e8574c",
  "#f0c135",
  "#7ac74f",
  "#f0903c",
  "#a765d8",
  "#3fc1a5",
  "#96643f",
];

export const PLAYER_NAMES = [
  "Ink Blue",
  "Crayon Red",
  "Butter Yellow",
  "Pencil Green",
  "Marker Orange",
  "Grape Purple",
  "Chalk Teal",
  "Cocoa Brown",
];

export interface ChatMessage {
  id: string;
  sender: string;
  seat: number;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}
