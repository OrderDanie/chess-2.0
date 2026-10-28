--!strict
-- Types and definitions for Chess 2 (Roblox Port)

local Types = {}

export type PieceKind =
	| "pawn"
	| "knight"
	| "bishop"
	| "rook"
	| "queen"
	| "king"
	| "farm"
	| "harbor"
	| "dragon"
	| "nuke"
	| "portal"
	| "snake"
	| "boat"

export type MovePattern =
	| "pawn"
	| "knight"
	| "bishop"
	| "rook"
	| "queen"
	| "king"
	| "none"
	| "flying"
	| "boat"

export type PieceDef = {
	name: string,
	cost: number,
	upkeep: number,
	income: number,
	move: MovePattern,
	range: number,
	paintRadius: number,
	combatValue: number,
	water: boolean,
	land: boolean,
	blurb: string,
}

Types.PIECES = {
	pawn = {
		name = "Pawn",
		cost = 10,
		upkeep = 1,
		income = 0,
		move = "pawn",
		range = 1,
		paintRadius = 1,
		combatValue = 10,
		water = false,
		land = true,
		blurb = "Advances forward, strikes diagonally. Captures expand your realm.",
	},
	knight = {
		name = "Knight",
		cost = 25,
		upkeep = 2,
		income = 0,
		move = "knight",
		range = 1,
		paintRadius = 1,
		combatValue = 25,
		water = false,
		land = true,
		blurb = "Leaps over obstacles in an L-shape. Agile frontier raider.",
	},
	bishop = {
		name = "Bishop",
		cost = 30,
		upkeep = 2,
		income = 0,
		move = "bishop",
		range = 8,
		paintRadius = 1,
		combatValue = 30,
		water = false,
		land = true,
		blurb = "Rides diagonals across boundless terrain. Deadly sniper.",
	},
	rook = {
		name = "Rook",
		cost = 45,
		upkeep = 3,
		income = 0,
		move = "rook",
		range = 8,
		paintRadius = 2,
		combatValue = 45,
		water = false,
		land = true,
		blurb = "Charges straight lines. Fortifies wide borders upon arrival.",
	},
	queen = {
		name = "Queen",
		cost = 80,
		upkeep = 5,
		income = 0,
		move = "queen",
		range = 8,
		paintRadius = 2,
		combatValue = 80,
		water = false,
		land = true,
		blurb = "Unmatched tactical devastation across all eight compass bearings.",
	},
	king = {
		name = "King",
		cost = 0,
		upkeep = 0,
		income = 5,
		move = "king",
		range = 1,
		paintRadius = 2,
		combatValue = 200,
		water = false,
		land = true,
		blurb = "The heart of your realm. Generates $5/turn. If captured, you fall.",
	},
	farm = {
		name = "Farm",
		cost = 20,
		upkeep = 0,
		income = 3,
		move = "none",
		range = 0,
		paintRadius = 1,
		combatValue = 15,
		water = false,
		land = true,
		blurb = "Civilian structure. Generates +$3 gold every turn. Cannot walk.",
	},
	harbor = {
		name = "Harbor",
		cost = 30,
		upkeep = 0,
		income = 2,
		move = "none",
		range = 0,
		paintRadius = 2,
		combatValue = 20,
		water = true,
		land = true,
		blurb = "Built along coastlines. Generates +$2 gold and projects sea control.",
	},
	dragon = {
		name = "Dragon",
		cost = 65,
		upkeep = 4,
		income = 0,
		move = "flying",
		range = 3,
		paintRadius = 2,
		combatValue = 70,
		water = true,
		land = true,
		blurb = "Soars over land and sea. Devours enemy pieces and mimics their moves.",
	},
	nuke = {
		name = "Nuke",
		cost = 90,
		upkeep = 2,
		income = 0,
		move = "rook",
		range = 2,
		paintRadius = 0,
		combatValue = 90,
		water = false,
		land = true,
		blurb = "Crawls forward. Can be detonated to vaporize a 5x5 crater.",
	},
	portal = {
		name = "Portal",
		cost = 40,
		upkeep = 1,
		income = 0,
		move = "none",
		range = 0,
		paintRadius = 1,
		combatValue = 35,
		water = false,
		land = true,
		blurb = "Gate network. Allows friendly units to warp directly to sibling portals.",
	},
	snake = {
		name = "Snake",
		cost = 35,
		upkeep = 2,
		income = 0,
		move = "knight",
		range = 1,
		paintRadius = 1,
		combatValue = 35,
		water = false,
		land = true,
		blurb = "Slithers like a knight. Granted an immediate extra move upon capturing.",
	},
	boat = {
		name = "Boat",
		cost = 25,
		upkeep = 1,
		income = 0,
		move = "boat",
		range = 4,
		paintRadius = 2,
		combatValue = 30,
		water = true,
		land = false,
		blurb = "Dominates open water. Transports armies and secures naval lanes.",
	},
}

Types.SHOP_ORDER = {
	"pawn",
	"knight",
	"bishop",
	"rook",
	"queen",
	"farm",
	"harbor",
	"dragon",
	"nuke",
	"portal",
	"snake",
	"boat",
}

Types.PLAYER_COLORS = {
	Color3.fromRGB(232, 87, 76), -- Crimson Red
	Color3.fromRGB(74, 163, 232), -- Sky Blue
	Color3.fromRGB(240, 193, 53), -- Gold Yellow
	Color3.fromRGB(122, 199, 79), -- Leaf Green
	Color3.fromRGB(240, 144, 60), -- Amber Orange
	Color3.fromRGB(167, 101, 216), -- Royal Violet
	Color3.fromRGB(63, 193, 165), -- Jade Teal
	Color3.fromRGB(150, 100, 63), -- Raw Umber
}

Types.INK = Color3.fromRGB(43, 33, 24)
Types.OCEAN_A = Color3.fromRGB(67, 166, 221)
Types.OCEAN_B = Color3.fromRGB(60, 154, 210)
Types.LAND_A = Color3.fromRGB(216, 199, 154)
Types.LAND_B = Color3.fromRGB(206, 189, 143)

return Types
