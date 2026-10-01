import { PawPrint, PieChart } from "lucide-react"

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
  claim: number;
  blurb: string;
}

export const PIECES: Partial<Record<PieceKind, PieceDef>> = {
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
        blurb: "cheap ahh frontline, advances one tile in any direction and claimes the tile on the rmoving range, will cost you 1$ cuz i say so",
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
        blurb: "leaps in L shape cuz straight is not his style, oh  yea, it can jump anything ofc, to tired to code that part",
    },
    bishop: {
        kind: "bishop",
        name: "Bishop",
        cost: 6,
        upkeep: 2,
        income: 0,
        move: "slide",
        dirs: "diag",
        range: 1,
        terrain: "land",
        claim: 1,
        blurb: "slides sideways, do i rlly need to explain this one anymore? oh yea btw, legally forbidden from stepping on opposing color tiles due to ancient religious treaties",
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
        blurb: "CEO of the board, pure violence, doesnt give a fuck if she dies, she ALWAYS COMES BACK, but this this will cost you ",
    }
    king: {
        kind: "king",
        name: "KIng",
        cost: 0,
        upkeep: 0,
        income: 3,
        move: "step",
        dirs: "all",
        range: 1,
        terrain: "land",
        claim: 2,
        blurb: "Generates $3/turn purely by existing, If he gets captured, everyone immediately forfeits and goes home",
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
        claim: 1,
        ability: "copy",
        blurb: "airborn mf, can fly over any thing, eats anything, but will cost ur liver to deploy",
    }
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
        claim: 0,
        ability: "detonate",
        blurb: "moves slow asf, but vaporizes ANYTHING in its 5x5 radius when deployed",
    },
    portal: {
        kind: "portal",
        name: "Portal",
        cost: 18,
        upkeep: 2,
        income: 0,
        move: "step",
        dirs: "all",
        range: 0,
        terrain: "land",
        claim: 1,
        ability: "teleport",
        building: true,
        blurb: "shortcut to death, tp anyone to any where the other portal exists",
    },
    spider: {
        kind: "spider",
        name: "Spider",
        cost: ,
        upkeep: ,
        income: ,
        move: "",
        dirs: "",
        range: ,
        terrain: "",
        claim: ,
        blurb: ,
    }
}
