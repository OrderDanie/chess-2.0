--!strict
-- Strategic AI for Chess 2 (Luau port)

local Engine = require(script.Parent.Engine)
local Types = require(script.Parent.Types)
local PIECES = Types.PIECES

local AI = {}

function AI.planTurn(s: Engine.GameState, botId: number): { any }
	local actions = {}
	local me = s.players[botId + 1]
	if not me or not me.alive then
		table.insert(actions, { type = "endTurn" })
		return actions
	end

	-- 1. Identify all friendly units
	local myUnits: { { tile: number, u: Engine.Unit } } = {}
	local enemyUnits: { { tile: number, u: Engine.Unit } } = {}
	local enemyKingTile: number? = nil

	for i = 0, (s.w * s.h) - 1 do
		local u = s.units[i]
		if u then
			if u.owner == botId then
				table.insert(myUnits, { tile = i, u = u })
			else
				table.insert(enemyUnits, { tile = i, u = u })
				if u.kind == "king" and not enemyKingTile then
					enemyKingTile = i
				end
			end
		end
	end

	-- 2. Try to move combat units: prioritize captures, then advancing toward enemy king / unowned land
	for _, entry in ipairs(myUnits) do
		if entry.u.mv == 0 and PIECES[entry.u.kind] and PIECES[entry.u.kind].move ~= "none" then
			local moves = Engine.legalMoves(s, entry.tile)
			if #moves > 0 then
				local bestMove: number? = nil
				local bestScore = -999999

				for _, dest in ipairs(moves) do
					local score = 0
					local occ = s.units[dest]

					if occ then
						-- Capturing value
						local val = (PIECES[occ.kind] and PIECES[occ.kind].combatValue) or 10
						if occ.kind == "king" then
							score += 50000 -- Immediate regicide!
						else
							score += val * 10
						end
					end

					-- Territory expansion bonus
					if s.owner[dest] ~= botId then
						score += 15
					end

					-- Advance toward enemy king
					if enemyKingTile then
						local dx1, dy1 = Engine.xy(s, dest)
						local kx, ky = Engine.xy(s, enemyKingTile)
						local dist = math.abs(dx1 - kx) + math.abs(dy1 - ky)
						score -= dist * 2
					end

					if score > bestScore then
						bestScore = score
						bestMove = dest
					end
				end

				if bestMove then
					table.insert(actions, { type = "move", from = entry.tile, to = bestMove })
				end
			end
		end
	end

	-- 3. Spend gold if available: recruit farm if income is low, or military piece (knight, rook, pawn)
	local eco = Engine.economy(s, botId)
	local goldLeft = me.gold

	-- If low on farms and rich, build farm
	if eco.farms < 3 and goldLeft >= 20 then
		local spots = Engine.buySpots(s, botId, "farm")
		if #spots > 0 then
			table.insert(actions, { type = "buy", kind = "farm", at = spots[math.random(1, #spots)] })
			goldLeft -= 20
		end
	end

	-- Buy military piece
	local buyCandidates = { "rook", "knight", "pawn", "snake", "dragon" }
	for _, kind in ipairs(buyCandidates) do
		local cost = Engine.costOf(s, kind)
		if goldLeft >= cost then
			local spots = Engine.buySpots(s, botId, kind)
			if #spots > 0 then
				table.insert(actions, { type = "buy", kind = kind, at = spots[math.random(1, #spots)] })
				goldLeft -= cost
				break
			end
		end
	end

	-- 4. Always finish with endTurn
	table.insert(actions, { type = "endTurn" })
	return actions
end

return AI
