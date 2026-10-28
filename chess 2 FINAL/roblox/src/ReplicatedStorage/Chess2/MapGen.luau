--!strict
-- Procedural and custom map generator for Chess 2 (Luau port)

local Types = require(script.Parent.Types)

local MapGen = {}

export type MapData = {
	name: string,
	w: number,
	h: number,
	land: { [number]: number },
	spawns: { number },
}

local function seedRandom(seed: number)
	local s = seed % 2147483647
	if s <= 0 then s += 2147483646 end
	return function()
		s = (s * 16807) % 2147483647
		return (s - 1) / 2147483646
	end
end

function MapGen.generate(preset: string, playerCount: number, seed: number?): MapData
	local w, h = 30, 20
	if preset == "arena" then
		w, h = 20, 20
	elseif preset == "archipelago" then
		w, h = 32, 22
	end

	local rand = seedRandom(seed or tick())
	local land = {}
	for i = 0, (w * h) - 1 do
		land[i] = 0
	end

	local function carveBlob(cx: number, cy: number, r: number)
		for dy = -r, r do
			for dx = -r, r do
				local dist = math.sqrt(dx * dx + dy * dy)
				if dist <= r + (rand() * 1.8 - 0.9) then
					local nx = math.floor(cx + dx)
					local ny = math.floor(cy + dy)
					if nx >= 1 and ny >= 1 and nx < w - 1 and ny < h - 1 then
						land[ny * w + nx] = 1
					end
				end
			end
		end
	end

	if preset == "pangaea" then
		for _ = 1, 9 do
			carveBlob(w * 0.5 + (rand() * 10 - 5), h * 0.5 + (rand() * 8 - 4), 5.5 + rand() * 2)
		end
	elseif preset == "archipelago" then
		local islandCount = math.max(playerCount, 6)
		for _ = 1, islandCount do
			local ix = 4 + rand() * (w - 8)
			local iy = 3 + rand() * (h - 6)
			carveBlob(ix, iy, 3.2 + rand() * 1.5)
		end
	elseif preset == "arena" then
		for y = 2, h - 3 do
			for x = 2, w - 3 do
				land[y * w + x] = 1
			end
		end
	else -- Default Continent
		for _ = 1, 8 do
			carveBlob(w * 0.5 + (rand() * 8 - 4), h * 0.5 + (rand() * 6 - 3), 5 + rand() * 2)
		end
	end

	-- Pick spawns with maximum spacing on land
	local spawns: { number } = {}
	local candidates = {}
	for y = 2, h - 3 do
		for x = 2, w - 3 do
			local idx = y * w + x
			if land[idx] == 1 then
				table.insert(candidates, idx)
			end
		end
	end

	if #candidates < playerCount then
		-- Fallback fill
		for y = 2, h - 3 do
			for x = 2, w - 3 do
				land[y * w + x] = 1
				table.insert(candidates, y * w + x)
			end
		end
	end

	for _ = 1, playerCount do
		local bestCandidate = candidates[1]
		local bestDist = -1
		for _, idx in ipairs(candidates) do
			local x, y = idx % w, math.floor(idx / w)
			local minDist = 999999
			for _, sp in ipairs(spawns) do
				local sx, sy = sp % w, math.floor(sp / w)
				local d = math.sqrt((x - sx) ^ 2 + (y - sy) ^ 2)
				if d < minDist then minDist = d end
			end
			if #spawns == 0 or minDist > bestDist then
				bestDist = minDist
				bestCandidate = idx
			end
		end
		table.insert(spawns, bestCandidate)
	end

	return {
		name = preset,
		w = w,
		h = h,
		land = land,
		spawns = spawns,
	}
end

function MapGen.createInitialGameState(map: MapData, playerConfigs: { { name: string, isAI: boolean, skill: string? } }, mode: string)
	local totalTiles = map.w * map.h
	local owner = {}
	local units = {}
	for i = 0, totalTiles - 1 do
		owner[i] = -1
	end

	local players = {}
	for i, cfg in ipairs(playerConfigs) do
		local pId = i - 1
		local col = Types.PLAYER_COLORS[((pId) % #Types.PLAYER_COLORS) + 1]
		table.insert(players, {
			id = pId,
			name = cfg.name,
			isAI = cfg.isAI,
			color = col,
			gold = 30,
			alive = true,
			time = 300,
			skill = cfg.skill or "normal",
		})

		-- Place King at spawn
		local sp = map.spawns[i]
		if sp then
			units[sp] = {
				kind = "king",
				owner = pId,
				mv = 0,
			}
			-- Paint capital
			local sx, sy = sp % map.w, math.floor(sp / map.w)
			for dy = -2, 2 do
				for dx = -2, 2 do
					local nx, ny = sx + dx, sy + dy
					if nx >= 0 and ny >= 0 and nx < map.w and ny < map.h then
						if math.abs(dx) + math.abs(dy) <= 3 then
							local idx = ny * map.w + nx
							if map.land[idx] == 1 then
								owner[idx] = pId
							end
						end
					end
				end
			end

			-- Starter farm & pawns
			local farmTile = (sy + 1) * map.w + sx
			if map.land[farmTile] == 1 and not units[farmTile] then
				units[farmTile] = { kind = "farm", owner = pId, mv = 0 }
			end
			local pawnTile = (sy) * map.w + (sx + 1)
			if map.land[pawnTile] == 1 and not units[pawnTile] then
				units[pawnTile] = { kind = "pawn", owner = pId, mv = 0 }
			end
		end
	end

	return {
		w = map.w,
		h = map.h,
		mode = mode or "standard",
		mapName = map.name,
		land = map.land,
		owner = owner,
		units = units,
		players = players,
		current = 0,
		turn = 1,
		round = 1,
		winner = nil,
		treaties = {},
		offers = {},
		log = {
			{ turn = 1, player = 0, text = "Match started on " .. map.name },
		},
		lastMove = nil,
		boom = nil,
	}
end

return MapGen
