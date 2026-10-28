--!strict
-- 1:1 Game Engine for Chess 2 (Luau port)

local Types = require(script.Parent.Types)
local PIECES = Types.PIECES

local Engine = {}

export type Unit = {
	kind: string,
	owner: number,
	mv: number,
	memory: string?,
}

export type Player = {
	id: number,
	name: string,
	isAI: boolean,
	color: Color3,
	gold: number,
	alive: boolean,
	time: number,
	skill: string,
}

export type Treaty = {
	a: number,
	b: number,
	turnsLeft: number,
}

export type Offer = {
	id: number,
	fromPlayer: number,
	toPlayer: number,
	peaceTurns: number,
	gold: number,
	demandGold: number,
}

export type LogEntry = {
	turn: number,
	player: number,
	text: string,
}

export type GameState = {
	w: number,
	h: number,
	mode: string,
	mapName: string,
	land: { [number]: number },
	owner: { [number]: number },
	units: { [number]: Unit? },
	players: { Player },
	current: number,
	turn: number,
	round: number,
	winner: number?,
	treaties: { Treaty },
	offers: { Offer },
	log: { LogEntry },
	lastMove: { fromTile: number, toTile: number }?,
	boom: { atTile: number, turn: number }?,
}

local function cloneTable(t: any): any
	if type(t) ~= "table" then return t end
	local copy = {}
	for k, v in pairs(t) do
		copy[k] = cloneTable(v)
	end
	return copy
end

function Engine.clone(s: GameState): GameState
	return cloneTable(s)
end

function Engine.xy(s: GameState, i: number): (number, number)
	return i % s.w, math.floor(i / s.w)
end

function Engine.idx(s: GameState, x: number, y: number): number
	if x < 0 or y < 0 or x >= s.w or y >= s.h then return -1 end
	return y * s.w + x
end

function Engine.costOf(s: GameState, kind: string): number
	local base = (PIECES[kind] and PIECES[kind].cost) or 10
	if s.mode == "chaos" then
		return math.max(5, math.floor(base * 0.75))
	end
	return base
end

function Engine.peaceLeft(s: GameState, a: number, b: number): number
	for _, t in ipairs(s.treaties) do
		if (t.a == a and t.b == b) or (t.a == b and t.b == a) then
			return t.turnsLeft
		end
	end
	return 0
end

function Engine.economy(s: GameState, pId: number)
	local landCount = 0
	local farmCount = 0
	local harborCount = 0
	local unitCount = 0
	local upkeep = 0

	for i = 0, (s.w * s.h) - 1 do
		if s.owner[i] == pId and s.land[i] == 1 then
			landCount += 1
		end
		local u = s.units[i]
		if u and u.owner == pId then
			unitCount += 1
			local def = PIECES[u.kind]
			if def then
				if u.kind == "farm" then
					farmCount += 1
				elseif u.kind == "harbor" then
					harborCount += 1
				end
				upkeep += def.upkeep
			end
		end
	end

	local gross = 5 + math.floor(landCount / 3) + (farmCount * 3) + (harborCount * 2)
	local net = gross - upkeep
	return {
		land = landCount,
		farms = farmCount,
		harbors = harborCount,
		units = unitCount,
		gross = gross,
		upkeep = upkeep,
		net = net,
	}
end

function Engine.paint(s: GameState, center: number, owner: number, radius: number)
	if radius <= 0 then
		s.owner[center] = owner
		return
	end
	local cx, cy = Engine.xy(s, center)
	for dy = -radius, radius do
		for dx = -radius, radius do
			local nx = cx + dx
			local ny = cy + dy
			if nx >= 0 and ny >= 0 and nx < s.w and ny < s.h then
				if math.abs(dx) + math.abs(dy) <= radius + 1 then
					local i = ny * s.w + nx
					if s.land[i] == 1 or PIECES["harbor"] then
						s.owner[i] = owner
					end
				end
			end
		end
	end
end

function Engine.ring(s: GameState, center: number, dist: number): { number }
	local cx, cy = Engine.xy(s, center)
	local out = {}
	for dy = -dist, dist do
		for dx = -dist, dist do
			if dx ~= 0 or dy ~= 0 then
				local nx = cx + dx
				local ny = cy + dy
				if nx >= 0 and ny >= 0 and nx < s.w and ny < s.h then
					table.insert(out, ny * s.w + nx)
				end
			end
		end
	end
	return out
end

function Engine.rawMoves(s: GameState, i: number, ignoreTurn: boolean): { number }
	local u = s.units[i]
	if not u then return {} end
	if not ignoreTurn and (u.owner ~= s.current or u.mv > 0) then return {} end

	local def = PIECES[u.kind]
	if not def or def.move == "none" then return {} end

	local pattern = def.move
	if u.kind == "dragon" and u.memory and PIECES[u.memory] then
		pattern = PIECES[u.memory].move
	end

	local cx, cy = Engine.xy(s, i)
	local moves = {}

	local function canEnter(target: number, isCapture: boolean): boolean
		if s.land[target] == 0 then
			if u.kind ~= "boat" and u.kind ~= "dragon" then return false end
		else
			if u.kind == "boat" then return false end
		end
		local occ = s.units[target]
		if occ then
			if occ.owner == u.owner then return false end
			if Engine.peaceLeft(s, u.owner, occ.owner) > 0 then return false end
			return true
		end
		return not isCapture
	end

	if pattern == "pawn" then
		local forwardY = u.owner % 2 == 0 and 1 or -1
		local fwd = Engine.idx(s, cx, cy + forwardY)
		if fwd >= 0 and not s.units[fwd] and (s.land[fwd] == 1 or u.kind == "boat") then
			table.insert(moves, fwd)
		end
		for _, dx in ipairs({ -1, 1 }) do
			local diag = Engine.idx(s, cx + dx, cy + forwardY)
			if diag >= 0 and s.units[diag] and canEnter(diag, true) then
				table.insert(moves, diag)
			end
		end
	elseif pattern == "knight" then
		local deltas = {
			{1, 2}, {1, -2}, {-1, 2}, {-1, -2},
			{2, 1}, {2, -1}, {-2, 1}, {-2, -1},
		}
		for _, d in ipairs(deltas) do
			local target = Engine.idx(s, cx + d[1], cy + d[2])
			if target >= 0 and canEnter(target, false) then
				table.insert(moves, target)
			end
		end
	elseif pattern == "bishop" or pattern == "rook" or pattern == "queen" or pattern == "boat" then
		local dirs = {}
		if pattern == "bishop" or pattern == "queen" then
			table.insert(dirs, {1, 1}); table.insert(dirs, {1, -1})
			table.insert(dirs, {-1, 1}); table.insert(dirs, {-1, -1})
		end
		if pattern == "rook" or pattern == "queen" or pattern == "boat" then
			table.insert(dirs, {1, 0}); table.insert(dirs, {-1, 0})
			table.insert(dirs, {0, 1}); table.insert(dirs, {0, -1})
		end
		local maxRange = def.range or 8
		for _, d in ipairs(dirs) do
			for step = 1, maxRange do
				local target = Engine.idx(s, cx + d[1] * step, cy + d[2] * step)
				if target < 0 then break end
				local occ = s.units[target]
				if occ then
					if canEnter(target, true) then
						table.insert(moves, target)
					end
					break
				else
					if canEnter(target, false) then
						table.insert(moves, target)
					else
						break
					end
				end
			end
		end
	elseif pattern == "king" then
		for dy = -1, 1 do
			for dx = -1, 1 do
				if dx ~= 0 or dy ~= 0 then
					local target = Engine.idx(s, cx + dx, cy + dy)
					if target >= 0 and canEnter(target, false) then
						table.insert(moves, target)
					end
				end
			end
		end
	elseif pattern == "flying" then
		for dy = -3, 3 do
			for dx = -3, 3 do
				if dx ~= 0 or dy ~= 0 then
					local dist = math.sqrt(dx * dx + dy * dy)
					if dist <= 3.2 then
						local target = Engine.idx(s, cx + dx, cy + dy)
						if target >= 0 and canEnter(target, false) then
							table.insert(moves, target)
						end
					end
				end
			end
		end
	end

	return moves
end

function Engine.legalMoves(s: GameState, i: number): { number }
	return Engine.rawMoves(s, i, false)
end

function Engine.previewMoves(s: GameState, i: number): { number }
	return Engine.rawMoves(s, i, true)
end

function Engine.teleportTargets(s: GameState, i: number): { number }
	local u = s.units[i]
	if not u or u.owner ~= s.current or u.mv > 0 then return {} end
	local cx, cy = Engine.xy(s, i)
	local nearPortal = false
	for dy = -1, 1 do
		for dx = -1, 1 do
			local check = Engine.idx(s, cx + dx, cy + dy)
			if check >= 0 and s.units[check] and s.units[check]!.kind == "portal" and s.units[check]!.owner == u.owner then
				nearPortal = true
				break
			end
		end
	end
	if not nearPortal then return {} end

	local targets = {}
	for tile = 0, (s.w * s.h) - 1 do
		local p = s.units[tile]
		if p and p.kind == "portal" and p.owner == u.owner then
			local px, py = Engine.xy(s, tile)
			for dy = -1, 1 do
				for dx = -1, 1 do
					local dest = Engine.idx(s, px + dx, py + dy)
					if dest >= 0 and dest ~= i and not s.units[dest] and (s.land[dest] == 1 or u.kind == "boat") then
						table.insert(targets, dest)
					end
				end
			end
		end
	end
	return targets
end

function Engine.buySpots(s: GameState, pId: number, kind: string): { number }
	local spots = {}
	local isWater = kind == "boat"
	for i = 0, (s.w * s.h) - 1 do
		if s.owner[i] == pId and not s.units[i] then
			if isWater then
				if s.land[i] == 0 then table.insert(spots, i) end
			else
				if s.land[i] == 1 then table.insert(spots, i) end
			end
		end
	end
	return spots
end

function Engine.checkVictory(s: GameState)
	local living = {}
	for _, p in ipairs(s.players) do
		if p.alive then table.insert(living, p.id) end
	end
	if #living <= 1 then
		s.winner = living[1] or 0
		return
	end

	local totalLand = 0
	for i = 0, (s.w * s.h) - 1 do
		if s.land[i] == 1 then totalLand += 1 end
	end
	if totalLand > 0 then
		for _, pId in ipairs(living) do
			local eco = Engine.economy(s, pId)
			if eco.land / totalLand >= 0.65 then
				s.winner = pId
				return
			end
		end
	end
end

function Engine.killPlayer(s: GameState, pId: number, killerId: number)
	local p = s.players[pId + 1]
	if not p or not p.alive then return end
	p.alive = false
	for i = 0, (s.w * s.h) - 1 do
		local u = s.units[i]
		if u and u.owner == pId then
			s.units[i] = nil
		end
		if s.owner[i] == pId then
			s.owner[i] = killerId >= 0 and killerId or -1
		end
	end
	table.insert(s.log, {
		turn = s.turn,
		player = pId,
		text = p.name .. " has fallen!",
	})
	Engine.checkVictory(s)
end

function Engine.desertion(s: GameState, pId: number)
	local player = s.players[pId + 1]
	if not player or not player.alive or player.gold >= 0 then return end
	local myUnits = {}
	for i = 0, (s.w * s.h) - 1 do
		local u = s.units[i]
		if u and u.owner == pId and u.kind ~= "king" then
			table.insert(myUnits, { idx = i, kind = u.kind, upkeep = PIECES[u.kind].upkeep })
		end
	end
	table.sort(myUnits, function(a, b) return a.upkeep > b.upkeep end)
	local lost = 0
	for _, u in ipairs(myUnits) do
		s.units[u.idx] = nil
		player.gold += PIECES[u.kind].cost / 2
		lost += 1
		if player.gold >= 0 then break end
	end
	if lost > 0 then
		table.insert(s.log, {
			turn = s.turn,
			player = pId,
			text = tostring(lost) .. " units deserted due to unpaid wages",
		})
	end
end

function Engine.endTurn(s: GameState): boolean
	local count = #s.players
	local nextId = s.current
	for _ = 1, count do
		nextId = (nextId + 1) % count
		if s.players[nextId + 1] and s.players[nextId + 1].alive then
			break
		end
	end

	s.current = nextId
	s.turn += 1
	if s.current == 0 then
		s.round += 1
		for i = #s.treaties, 1, -1 do
			s.treaties[i].turnsLeft -= 1
			if s.treaties[i].turnsLeft <= 0 then
				table.remove(s.treaties, i)
			end
		end
	end

	local curPlayer = s.players[s.current + 1]
	if curPlayer and curPlayer.alive then
		local eco = Engine.economy(s, s.current)
		curPlayer.gold += eco.net
		Engine.desertion(s, s.current)
		for i = 0, (s.w * s.h) - 1 do
			local u = s.units[i]
			if u and u.owner == s.current then
				u.mv = 0
			end
		end
	end

	Engine.checkVictory(s)
	return true
end

function Engine.applyAction(s: GameState, actor: number, action: any): (boolean, string?)
	if s.winner ~= nil then return false, "Game over" end

	if action.type == "move" then
		if actor ~= s.current then return false, "Not your turn" end
		local u = s.units[action.from]
		if not u or u.owner ~= actor or u.mv > 0 then return false, "Cannot move" end
		local moves = Engine.legalMoves(s, action.from)
		local valid = false
		for _, m in ipairs(moves) do
			if m == action.to then valid = true; break end
		end
		if not valid then return false, "Illegal move" end

		local target = s.units[action.to]
		local capturedKind: string? = nil
		if target then
			capturedKind = target.kind
			if target.kind == "king" then
				Engine.killPlayer(s, target.owner, actor)
			end
		end

		s.units[action.from] = nil
		s.units[action.to] = u
		u.mv += 1
		s.lastMove = { fromTile = action.from, toTile = action.to }

		if u.kind == "dragon" and capturedKind and capturedKind ~= "king" then
			u.memory = capturedKind
		end

		local def = PIECES[u.kind]
		Engine.paint(s, action.to, actor, def and def.paintRadius or 1)

		if u.kind == "snake" and target then
			u.mv = 0
		end

		table.insert(s.log, {
			turn = s.turn,
			player = actor,
			text = s.players[actor + 1].name .. " moved " .. u.kind .. (target and " and captured " .. target.kind or ""),
		})
		Engine.checkVictory(s)
		return true

	elseif action.type == "buy" then
		if actor ~= s.current then return false, "Not your turn" end
		local cost = Engine.costOf(s, action.kind)
		local cur = s.players[actor + 1]
		if not cur or cur.gold < cost then return false, "Insufficient gold" end
		local spots = Engine.buySpots(s, actor, action.kind)
		local valid = false
		for _, sp in ipairs(spots) do
			if sp == action.at then valid = true; break end
		end
		if not valid then return false, "Invalid spawn tile" end

		cur.gold -= cost
		s.units[action.at] = {
			kind = action.kind,
			owner = actor,
			mv = 1,
		}
		local def = PIECES[action.kind]
		Engine.paint(s, action.at, actor, def and def.paintRadius or 1)

		table.insert(s.log, {
			turn = s.turn,
			player = actor,
			text = cur.name .. " recruited " .. action.kind .. " for $" .. tostring(cost),
		})
		return true

	elseif action.type == "endTurn" then
		if actor ~= s.current then return false, "Not your turn" end
		Engine.endTurn(s)
		return true

	elseif action.type == "detonate" then
		if actor ~= s.current then return false, "Not your turn" end
		local u = s.units[action.from]
		if not u or u.kind ~= "nuke" or u.owner ~= actor then return false, "Invalid nuke" end
		local cx, cy = Engine.xy(s, action.from)
		s.units[action.from] = nil
		s.boom = { atTile = action.from, turn = s.turn }

		for dy = -2, 2 do
			for dx = -2, 2 do
				local idx = Engine.idx(s, cx + dx, cy + dy)
				if idx >= 0 then
					local victim = s.units[idx]
					if victim and victim.kind == "king" then
						Engine.killPlayer(s, victim.owner, actor)
					end
					s.units[idx] = nil
					s.owner[idx] = -1
				end
			end
		end

		table.insert(s.log, {
			turn = s.turn,
			player = actor,
			text = s.players[actor + 1].name .. " detonated a nuclear warhead!",
		})
		Engine.checkVictory(s)
		return true

	elseif action.type == "teleport" then
		if actor ~= s.current then return false, "Not your turn" end
		local u = s.units[action.from]
		if not u or u.owner ~= actor or u.mv > 0 then return false, "Cannot teleport" end
		local valid = false
		for _, tg in ipairs(Engine.teleportTargets(s, action.from)) do
			if tg == action.to then valid = true; break end
		end
		if not valid then return false, "Illegal teleport" end
		s.units[action.from] = nil
		s.units[action.to] = u
		u.mv += 1
		s.lastMove = { fromTile = action.from, toTile = action.to }
		return true

	elseif action.type == "diplomacy" then
		local offer = action.offer
		local fromP = s.players[actor + 1]
		local toP = s.players[action.to + 1]
		if not fromP or not toP or not toP.alive then return false, "Invalid diplomacy target" end
		local id = #s.offers + 1
		table.insert(s.offers, {
			id = id,
			fromPlayer = actor,
			toPlayer = action.to,
			peaceTurns = offer.peaceTurns or 0,
			gold = offer.gold or 0,
			demandGold = offer.demandGold or 0,
		})
		return true

	elseif action.type == "respond" then
		local offerIdx: number? = nil
		for i, o in ipairs(s.offers) do
			if o.id == action.offerId then offerIdx = i; break end
		end
		if not offerIdx then return false, "Offer expired" end
		local off = s.offers[offerIdx]
		table.remove(s.offers, offerIdx)

		if action.accept then
			local fromP = s.players[off.fromPlayer + 1]
			local toP = s.players[off.toPlayer + 1]
			if off.gold > 0 and fromP.gold >= off.gold then
				fromP.gold -= off.gold
				toP.gold += off.gold
			end
			if off.demandGold > 0 and toP.gold >= off.demandGold then
				toP.gold -= off.demandGold
				fromP.gold += off.demandGold
			end
			if off.peaceTurns > 0 then
				table.insert(s.treaties, { a = off.fromPlayer, b = off.toPlayer, turnsLeft = off.peaceTurns })
			end
			table.insert(s.log, {
				turn = s.turn,
				player = off.toPlayer,
				text = toP.name .. " accepted treaty with " .. fromP.name,
			})
		end
		return true

	elseif action.type == "resign" then
		Engine.killPlayer(s, actor, -1)
		return true

	elseif action.type == "tick" then
		local cur = s.players[s.current + 1]
		if cur and cur.alive then
			cur.time -= action.seconds or 1
			if cur.time <= 0 then
				cur.time = 0
				Engine.endTurn(s)
			end
		end
		return true
	end

	return false, "Unknown action"
end

return Engine
