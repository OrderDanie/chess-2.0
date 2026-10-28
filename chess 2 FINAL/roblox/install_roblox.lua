--[[
=============================================================================
CHESS 2 : ROBLOX STUDIO ONE-LINE INSTALLER
=============================================================================
Instructions:
1. Open any place in Roblox Studio (Baseplate or new game).
2. Open the Command Bar (View tab -> Command Bar).
3. Paste this entire script into the Command Bar at the bottom and press ENTER.
4. Press Play (F5) to test immediately!
=============================================================================
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")
local StarterPlayerScripts = StarterPlayer:WaitForChild("StarterPlayerScripts")
local StarterGui = game:GetService("StarterGui")

print("[Chess2] Starting 1:1 Roblox installation...")

-- 1. Create ReplicatedStorage/Chess2
local Chess2Folder = ReplicatedStorage:FindFirstChild("Chess2")
if not Chess2Folder then
	Chess2Folder = Instance.new("Folder")
	Chess2Folder.Name = "Chess2"
	Chess2Folder.Parent = ReplicatedStorage
end

local RemotesFolder = Chess2Folder:FindFirstChild("Remotes")
if not RemotesFolder then
	RemotesFolder = Instance.new("Folder")
	RemotesFolder.Name = "Remotes"
	RemotesFolder.Parent = Chess2Folder
end

local function makeRemote(className, name)
	local r = RemotesFolder:FindFirstChild(name)
	if not r then
		r = Instance.new(className)
		r.Name = name
		r.Parent = RemotesFolder
	end
	return r
end

makeRemote("RemoteFunction", "ActionRequest")
makeRemote("RemoteFunction", "CreateRoom")
makeRemote("RemoteFunction", "JoinRoom")
makeRemote("RemoteEvent", "StateUpdate")

local function createModule(parent, name, source)
	local mod = parent:FindFirstChild(name)
	if not mod then
		mod = Instance.new("ModuleScript")
		mod.Name = name
		mod.Parent = parent
	end
	mod.Source = source
	return mod
end

local function createScript(parent, name, source)
	local s = parent:FindFirstChild(name)
	if not s then
		s = Instance.new("Script")
		s.Name = name
		s.Parent = parent
	end
	s.Source = source
	return s
end

local function createLocalScript(parent, name, source)
	local s = parent:FindFirstChild(name)
	if not s then
		s = Instance.new("LocalScript")
		s.Name = name
		s.Parent = parent
	end
	s.Source = source
	return s
end

-----------------------------------------------------------------------------
-- Types Module
-----------------------------------------------------------------------------
local typesSource = [=[
--!strict
local Types = {}
Types.PIECES = {
	pawn = { name = "Pawn", cost = 10, upkeep = 1, income = 0, move = "pawn", range = 1, paintRadius = 1, combatValue = 10, water = false, land = true, blurb = "Advances forward, strikes diagonally." },
	knight = { name = "Knight", cost = 25, upkeep = 2, income = 0, move = "knight", range = 1, paintRadius = 1, combatValue = 25, water = false, land = true, blurb = "Leaps over obstacles in an L-shape." },
	bishop = { name = "Bishop", cost = 30, upkeep = 2, income = 0, move = "bishop", range = 8, paintRadius = 1, combatValue = 30, water = false, land = true, blurb = "Rides diagonals across boundless terrain." },
	rook = { name = "Rook", cost = 45, upkeep = 3, income = 0, move = "rook", range = 8, paintRadius = 2, combatValue = 45, water = false, land = true, blurb = "Charges straight lines, paints wide borders." },
	queen = { name = "Queen", cost = 80, upkeep = 5, income = 0, move = "queen", range = 8, paintRadius = 2, combatValue = 80, water = false, land = true, blurb = "Unmatched devastation in all directions." },
	king = { name = "King", cost = 0, upkeep = 0, income = 5, move = "king", range = 1, paintRadius = 2, combatValue = 200, water = false, land = true, blurb = "The heart of your realm. Generates $5/t." },
	farm = { name = "Farm", cost = 20, upkeep = 0, income = 3, move = "none", range = 0, paintRadius = 1, combatValue = 15, water = false, land = true, blurb = "Produces +$3 gold every turn." },
	harbor = { name = "Harbor", cost = 30, upkeep = 0, income = 2, move = "none", range = 0, paintRadius = 2, combatValue = 20, water = true, land = true, blurb = "Produces +$2 gold and controls the waves." },
	dragon = { name = "Dragon", cost = 65, upkeep = 4, income = 0, move = "flying", range = 3, paintRadius = 2, combatValue = 70, water = true, land = true, blurb = "Soars over obstacles and mimics captured pieces." },
	nuke = { name = "Nuke", cost = 90, upkeep = 2, income = 0, move = "rook", range = 2, paintRadius = 0, combatValue = 90, water = false, land = true, blurb = "Detonates to vaporize a 5x5 crater." },
	portal = { name = "Portal", cost = 40, upkeep = 1, income = 0, move = "none", range = 0, paintRadius = 1, combatValue = 35, water = false, land = true, blurb = "Allows allies to warp between portals." },
	snake = { name = "Snake", cost = 35, upkeep = 2, income = 0, move = "knight", range = 1, paintRadius = 1, combatValue = 35, water = false, land = true, blurb = "Slithers like a knight; extra move on kill." },
	boat = { name = "Boat", cost = 25, upkeep = 1, income = 0, move = "boat", range = 4, paintRadius = 2, combatValue = 30, water = true, land = false, blurb = "Dominates open water." },
}
Types.SHOP_ORDER = { "pawn", "knight", "bishop", "rook", "queen", "farm", "harbor", "dragon", "nuke", "portal", "snake", "boat" }
Types.PLAYER_COLORS = {
	Color3.fromRGB(232, 87, 76),
	Color3.fromRGB(74, 163, 232),
	Color3.fromRGB(240, 193, 53),
	Color3.fromRGB(122, 199, 79),
	Color3.fromRGB(240, 144, 60),
	Color3.fromRGB(167, 101, 216),
	Color3.fromRGB(63, 193, 165),
	Color3.fromRGB(150, 100, 63),
}
Types.INK = Color3.fromRGB(43, 33, 24)
Types.OCEAN_A = Color3.fromRGB(67, 166, 221)
Types.OCEAN_B = Color3.fromRGB(60, 154, 210)
Types.LAND_A = Color3.fromRGB(216, 199, 154)
Types.LAND_B = Color3.fromRGB(206, 189, 143)
return Types
]=]
createModule(Chess2Folder, "Types", typesSource)

-----------------------------------------------------------------------------
-- Engine Module
-----------------------------------------------------------------------------
local engineSource = [=[
--!strict
local Types = require(script.Parent.Types)
local PIECES = Types.PIECES
local Engine = {}

function Engine.xy(s, i) return i % s.w, math.floor(i / s.w) end
function Engine.idx(s, x, y) if x < 0 or y < 0 or x >= s.w or y >= s.h then return -1 end return y * s.w + x end
function Engine.costOf(s, kind)
	local b = (PIECES[kind] and PIECES[kind].cost) or 10
	if s.mode == "chaos" then return math.max(5, math.floor(b * 0.75)) end
	return b
end

function Engine.economy(s, pId)
	local land, farms, harbors, units, upkeep = 0, 0, 0, 0, 0
	for i = 0, (s.w * s.h) - 1 do
		if s.owner[i] == pId and s.land[i] == 1 then land += 1 end
		local u = s.units[i]
		if u and u.owner == pId then
			units += 1
			local d = PIECES[u.kind]
			if d then
				if u.kind == "farm" then farms += 1 elseif u.kind == "harbor" then harbors += 1 end
				upkeep += d.upkeep
			end
		end
	end
	local gross = 5 + math.floor(land / 3) + (farms * 3) + (harbors * 2)
	return { land = land, farms = farms, harbors = harbors, units = units, gross = gross, upkeep = upkeep, net = gross - upkeep }
end

function Engine.paint(s, center, owner, radius)
	if radius <= 0 then s.owner[center] = owner return end
	local cx, cy = Engine.xy(s, center)
	for dy = -radius, radius do
		for dx = -radius, radius do
			local nx, ny = cx + dx, cy + dy
			if nx >= 0 and ny >= 0 and nx < s.w and ny < s.h and math.abs(dx) + math.abs(dy) <= radius + 1 then
				local idx = ny * s.w + nx
				if s.land[idx] == 1 or PIECES["harbor"] then s.owner[idx] = owner end
			end
		end
	end
end

function Engine.legalMoves(s, i)
	local u = s.units[i]
	if not u or u.owner ~= s.current or u.mv > 0 then return {} end
	local def = PIECES[u.kind]
	if not def or def.move == "none" then return {} end
	local pattern = def.move
	if u.kind == "dragon" and u.memory and PIECES[u.memory] then pattern = PIECES[u.memory].move end
	local cx, cy = Engine.xy(s, i)
	local moves = {}

	local function canEnter(target, isCap)
		if s.land[target] == 0 and u.kind ~= "boat" and u.kind ~= "dragon" then return false end
		if s.land[target] == 1 and u.kind == "boat" then return false end
		local occ = s.units[target]
		if occ then return occ.owner ~= u.owner end
		return not isCap
	end

	if pattern == "pawn" then
		local fwdY = u.owner % 2 == 0 and 1 or -1
		local fwd = Engine.idx(s, cx, cy + fwdY)
		if fwd >= 0 and not s.units[fwd] and (s.land[fwd] == 1 or u.kind == "boat") then table.insert(moves, fwd) end
		for _, dx in ipairs({ -1, 1 }) do
			local diag = Engine.idx(s, cx + dx, cy + fwdY)
			if diag >= 0 and s.units[diag] and canEnter(diag, true) then table.insert(moves, diag) end
		end
	elseif pattern == "knight" then
		local deltas = {{1,2},{1,-2},{-1,2},{-1,-2},{2,1},{2,-1},{-2,1},{-2,-1}}
		for _, d in ipairs(deltas) do
			local t = Engine.idx(s, cx + d[1], cy + d[2])
			if t >= 0 and canEnter(t, false) then table.insert(moves, t) end
		end
	elseif pattern == "bishop" or pattern == "rook" or pattern == "queen" or pattern == "boat" then
		local dirs = {}
		if pattern == "bishop" or pattern == "queen" then
			table.insert(dirs, {1,1}); table.insert(dirs, {1,-1}); table.insert(dirs, {-1,1}); table.insert(dirs, {-1,-1})
		end
		if pattern == "rook" or pattern == "queen" or pattern == "boat" then
			table.insert(dirs, {1,0}); table.insert(dirs, {-1,0}); table.insert(dirs, {0,1}); table.insert(dirs, {0,-1})
		end
		for _, d in ipairs(dirs) do
			for st = 1, def.range or 8 do
				local t = Engine.idx(s, cx + d[1] * st, cy + d[2] * st)
				if t < 0 then break end
				if s.units[t] then
					if canEnter(t, true) then table.insert(moves, t) end
					break
				else
					if canEnter(t, false) then table.insert(moves, t) else break end
				end
			end
		end
	elseif pattern == "king" then
		for dy = -1, 1 do
			for dx = -1, 1 do
				if dx ~= 0 or dy ~= 0 then
					local t = Engine.idx(s, cx + dx, cy + dy)
					if t >= 0 and canEnter(t, false) then table.insert(moves, t) end
				end
			end
		end
	elseif pattern == "flying" then
		for dy = -3, 3 do
			for dx = -3, 3 do
				if (dx ~= 0 or dy ~= 0) and math.sqrt(dx*dx + dy*dy) <= 3.2 then
					local t = Engine.idx(s, cx + dx, cy + dy)
					if t >= 0 and canEnter(t, false) then table.insert(moves, t) end
				end
			end
		end
	end
	return moves
end

function Engine.buySpots(s, pId, kind)
	local spots = {}
	local water = kind == "boat"
	for i = 0, (s.w * s.h) - 1 do
		if s.owner[i] == pId and not s.units[i] then
			if water and s.land[i] == 0 then table.insert(spots, i)
			elseif not water and s.land[i] == 1 then table.insert(spots, i) end
		end
	end
	return spots
end

function Engine.checkVictory(s)
	local living = {}
	for _, p in ipairs(s.players) do if p.alive then table.insert(living, p.id) end end
	if #living <= 1 then s.winner = living[1] or 0 return end
	local totalLand = 0
	for i = 0, (s.w * s.h) - 1 do if s.land[i] == 1 then totalLand += 1 end end
	if totalLand > 0 then
		for _, pId in ipairs(living) do
			if Engine.economy(s, pId).land / totalLand >= 0.65 then s.winner = pId return end
		end
	end
end

function Engine.killPlayer(s, pId, killerId)
	local p = s.players[pId + 1]
	if not p or not p.alive then return end
	p.alive = false
	for i = 0, (s.w * s.h) - 1 do
		if s.units[i] and s.units[i].owner == pId then s.units[i] = nil end
		if s.owner[i] == pId then s.owner[i] = killerId >= 0 and killerId or -1 end
	end
	table.insert(s.log, { turn = s.turn, player = pId, text = p.name .. " has fallen!" })
	Engine.checkVictory(s)
end

function Engine.endTurn(s)
	local count = #s.players
	local nextId = s.current
	for _ = 1, count do
		nextId = (nextId + 1) % count
		if s.players[nextId + 1] and s.players[nextId + 1].alive then break end
	end
	s.current = nextId
	s.turn += 1
	if s.current == 0 then s.round += 1 end
	local curP = s.players[s.current + 1]
	if curP and curP.alive then
		curP.gold += Engine.economy(s, s.current).net
		for i = 0, (s.w * s.h) - 1 do
			if s.units[i] and s.units[i].owner == s.current then s.units[i].mv = 0 end
		end
	end
	Engine.checkVictory(s)
end

function Engine.applyAction(s, actor, act)
	if s.winner ~= nil then return false, "Game over" end
	if act.type == "move" then
		if actor ~= s.current then return false, "Not your turn" end
		local u = s.units[act.from]
		if not u or u.owner ~= actor or u.mv > 0 then return false, "Cannot move" end
		local target = s.units[act.to]
		if target and target.kind == "king" then Engine.killPlayer(s, target.owner, actor) end
		s.units[act.from] = nil
		s.units[act.to] = u
		u.mv += 1
		Engine.paint(s, act.to, actor, (PIECES[u.kind] and PIECES[u.kind].paintRadius) or 1)
		if u.kind == "snake" and target then u.mv = 0 end
		table.insert(s.log, { turn = s.turn, player = actor, text = s.players[actor + 1].name .. " moved " .. u.kind })
		Engine.checkVictory(s)
		return true
	elseif act.type == "buy" then
		if actor ~= s.current then return false, "Not your turn" end
		local cost = Engine.costOf(s, act.kind)
		local cur = s.players[actor + 1]
		if not cur or cur.gold < cost then return false, "Not enough gold" end
		cur.gold -= cost
		s.units[act.at] = { kind = act.kind, owner = actor, mv = 1 }
		Engine.paint(s, act.at, actor, (PIECES[act.kind] and PIECES[act.kind].paintRadius) or 1)
		table.insert(s.log, { turn = s.turn, player = actor, text = cur.name .. " recruited " .. act.kind })
		return true
	elseif act.type == "detonate" then
		local u = s.units[act.from]
		if not u or u.kind ~= "nuke" or u.owner ~= actor then return false, "Invalid nuke" end
		local cx, cy = Engine.xy(s, act.from)
		s.units[act.from] = nil
		for dy = -2, 2 do
			for dx = -2, 2 do
				local idx = Engine.idx(s, cx + dx, cy + dy)
				if idx >= 0 then
					local victim = s.units[idx]
					if victim and victim.kind == "king" then Engine.killPlayer(s, victim.owner, actor) end
					s.units[idx] = nil
					s.owner[idx] = -1
				end
			end
		end
		table.insert(s.log, { turn = s.turn, player = actor, text = s.players[actor + 1].name .. " detonated a nuke!" })
		Engine.checkVictory(s)
		return true
	elseif act.type == "endTurn" then
		if actor ~= s.current then return false, "Not your turn" end
		Engine.endTurn(s)
		return true
	elseif act.type == "resign" then
		Engine.killPlayer(s, actor, -1)
		return true
	elseif act.type == "tick" then
		local p = s.players[s.current + 1]
		if p and p.alive then
			p.time -= act.seconds or 1
			if p.time <= 0 then Engine.endTurn(s) end
		end
		return true
	end
	return false, "Invalid action"
end

return Engine
]=]
createModule(Chess2Folder, "Engine", engineSource)

-----------------------------------------------------------------------------
-- MapGen Module
-----------------------------------------------------------------------------
local mapGenSource = [=[
--!strict
local Types = require(script.Parent.Types)
local MapGen = {}

function MapGen.generate(preset, playerCount)
	local w, h = 30, 20
	local land = {}
	for i = 0, (w * h) - 1 do land[i] = 0 end
	local function blob(cx, cy, r)
		for dy = -r, r do
			for dx = -r, r do
				if math.sqrt(dx*dx + dy*dy) <= r then
					local nx, ny = math.floor(cx + dx), math.floor(cy + dy)
					if nx >= 1 and ny >= 1 and nx < w - 1 and ny < h - 1 then land[ny * w + nx] = 1 end
				end
			end
		end
	end
	for _ = 1, 9 do blob(w*0.5 + math.random(-6, 6), h*0.5 + math.random(-4, 4), 6) end
	local spawns = {}
	local candidates = {}
	for y = 2, h - 3 do
		for x = 2, w - 3 do
			if land[y * w + x] == 1 then table.insert(candidates, y * w + x) end
		end
	end
	for i = 1, playerCount do
		local pick = candidates[math.floor((i / playerCount) * #candidates)] or candidates[1]
		table.insert(spawns, pick)
	end
	return { name = preset or "Pangaea", w = w, h = h, land = land, spawns = spawns }
end

function MapGen.createInitialGameState(map, configs, mode)
	local owner, units, players = {}, {}, {}
	for i = 0, (map.w * map.h) - 1 do owner[i] = -1 end
	for i, cfg in ipairs(configs) do
		local pId = i - 1
		table.insert(players, {
			id = pId,
			name = cfg.name,
			isAI = cfg.isAI,
			color = Types.PLAYER_COLORS[((pId) % #Types.PLAYER_COLORS) + 1],
			gold = 30,
			alive = true,
			time = 300,
			skill = "normal",
		})
		local sp = map.spawns[i]
		if sp then
			units[sp] = { kind = "king", owner = pId, mv = 0 }
			local sx, sy = sp % map.w, math.floor(sp / map.w)
			for dy = -2, 2 do
				for dx = -2, 2 do
					local nx, ny = sx + dx, sy + dy
					if nx >= 0 and ny >= 0 and nx < map.w and ny < map.h and math.abs(dx) + math.abs(dy) <= 3 then
						local idx = ny * map.w + nx
						if map.land[idx] == 1 then owner[idx] = pId end
					end
				end
			end
			local f = (sy + 1) * map.w + sx
			if map.land[f] == 1 and not units[f] then units[f] = { kind = "farm", owner = pId, mv = 0 } end
		end
	end
	return {
		w = map.w, h = map.h, mode = mode or "standard", mapName = map.name,
		land = map.land, owner = owner, units = units, players = players,
		current = 0, turn = 1, round = 1, winner = nil, treaties = {}, offers = {},
		log = { { turn = 1, player = 0, text = "Match started on " .. map.name } },
	}
end
return MapGen
]=]
createModule(Chess2Folder, "MapGen", mapGenSource)

-----------------------------------------------------------------------------
-- AI Module
-----------------------------------------------------------------------------
local aiSource = [=[
--!strict
local Engine = require(script.Parent.Engine)
local Types = require(script.Parent.Types)
local PIECES = Types.PIECES
local AI = {}

function AI.planTurn(s, botId)
	local actions = {}
	local myUnits = {}
	for i = 0, (s.w * s.h) - 1 do
		local u = s.units[i]
		if u and u.owner == botId and u.mv == 0 and PIECES[u.kind].move ~= "none" then
			local moves = Engine.legalMoves(s, i)
			if #moves > 0 then
				table.insert(actions, { type = "move", from = i, to = moves[math.random(1, #moves)] })
			end
		end
	end
	local me = s.players[botId + 1]
	if me and me.gold >= 25 then
		local spots = Engine.buySpots(s, botId, "knight")
		if #spots > 0 then
			table.insert(actions, { type = "buy", kind = "knight", at = spots[math.random(1, #spots)] })
		end
	end
	table.insert(actions, { type = "endTurn" })
	return actions
end
return AI
]=]
createModule(Chess2Folder, "AI", aiSource)

-----------------------------------------------------------------------------
-- Server Script
-----------------------------------------------------------------------------
local serverSource = [=[
--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Chess2Folder = ReplicatedStorage:WaitForChild("Chess2")
local Engine = require(Chess2Folder:WaitForChild("Engine"))
local MapGen = require(Chess2Folder:WaitForChild("MapGen"))
local AI = require(Chess2Folder:WaitForChild("AI"))

local Remotes = Chess2Folder:WaitForChild("Remotes")
local ActionRequest = Remotes:WaitForChild("ActionRequest")
local CreateRoom = Remotes:WaitForChild("CreateRoom")
local JoinRoom = Remotes:WaitForChild("JoinRoom")
local StateUpdate = Remotes:WaitForChild("StateUpdate")

local Rooms = {}
local PlayerToRoom = {}

local function generateCode()
	local chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	local code = ""
	for _ = 1, 5 do
		local r = math.random(1, #chars)
		code ..= string.sub(chars, r, r)
	end
	return code
end

local function broadcast(room)
	for p, _ in pairs(room.playerSeats) do
		StateUpdate:FireClient(p, room.state, room.playerSeats[p], room.code)
	end
end

local function runAIs(room)
	task.spawn(function()
		while room.state.winner == nil do
			local curId = room.state.current
			local p = room.state.players[curId + 1]
			if not p or not p.isAI or not p.alive then break end
			task.wait(0.4)
			local plan = AI.planTurn(room.state, curId)
			for _, act in ipairs(plan) do
				Engine.applyAction(room.state, curId, act)
				broadcast(room)
				task.wait(0.2)
			end
		end
	end)
end

CreateRoom.OnServerInvoke = function(player, options)
	options = options or {}
	local humans = options.humans or 1
	local ai = options.ai or 3
	local total = humans + ai
	local map = MapGen.generate(options.mapPreset or "pangaea", total)
	local cfgs = {}
	for i = 1, total do
		local isAI = i > humans
		table.insert(cfgs, { name = isAI and ("Bot " .. i) or player.DisplayName, isAI = isAI })
	end
	local s = MapGen.createInitialGameState(map, cfgs, options.mode or "standard")
	local code = generateCode()
	local r = { code = code, state = s, playerSeats = { [player] = 0 }, seatPlayers = { [0] = player } }
	Rooms[code] = r
	PlayerToRoom[player] = r
	return { ok = true, code = code, seat = 0, state = s }
end

JoinRoom.OnServerInvoke = function(player, code)
	code = string.upper(code or "")
	local r = Rooms[code]
	if not r then return { ok = false, error = "Room not found" } end
	if r.playerSeats[player] then return { ok = true, code = code, seat = r.playerSeats[player], state = r.state } end
	local seat = nil
	for i = 0, #r.state.players - 1 do
		if not r.state.players[i + 1].isAI and r.seatPlayers[i] == nil then seat = i; break end
	end
	if not seat then return { ok = true, code = code, seat = -1, state = r.state, spectating = true } end
	r.playerSeats[player] = seat
	r.seatPlayers[seat] = player
	PlayerToRoom[player] = r
	r.state.players[seat + 1].name = player.DisplayName
	broadcast(r)
	return { ok = true, code = code, seat = seat, state = r.state }
end

ActionRequest.OnServerInvoke = function(player, action)
	local r = PlayerToRoom[player]
	if not r then return { ok = false, error = "Not in match" } end
	local seat = r.playerSeats[player]
	if seat == nil or seat < 0 then return { ok = false, error = "Spectators cannot move" } end
	local ok, err = Engine.applyAction(r.state, seat, action)
	if not ok then return { ok = false, error = err } end
	broadcast(r)
	runAIs(r)
	return { ok = true, state = r.state }
end

task.spawn(function()
	while true do
		task.wait(1)
		for _, r in pairs(Rooms) do
			if r.state.winner == nil then
				local cur = r.state.players[r.state.current + 1]
				if cur and cur.alive then
					Engine.applyAction(r.state, r.state.current, { type = "tick", seconds = 1 })
					broadcast(r)
				end
			end
		end
	end
end)
]=]
createScript(ServerScriptService, "Chess2Server", serverSource)

-----------------------------------------------------------------------------
-- UI Builder (StarterGui.Chess2Gui)
-----------------------------------------------------------------------------
createModule(StarterGui, "Chess2Gui", [=[
local Chess2Gui = {}
function Chess2Gui.build(playerGui)
	local sg = Instance.new("ScreenGui")
	sg.Name = "Chess2Gui"
	sg.ResetOnSpawn = false
	local root = Instance.new("Frame")
	root.Name = "Root"
	root.Size = UDim2.new(1, 0, 1, 0)
	root.BackgroundTransparency = 1
	root.Parent = sg

	local menu = Instance.new("Frame")
	menu.Name = "MenuFrame"
	menu.Size = UDim2.new(1, 0, 1, 0)
	menu.BackgroundColor3 = Color3.fromRGB(43, 85, 120)
	menu.Parent = root

	local card = Instance.new("Frame")
	card.Name = "MenuCard"
	card.Size = UDim2.new(0, 520, 0, 420)
	card.Position = UDim2.new(0.5, -260, 0.5, -210)
	card.BackgroundColor3 = Color3.fromRGB(253, 243, 220)
	local c1 = Instance.new("UICorner"); c1.CornerRadius = UDim.new(0, 14); c1.Parent = card
	local s1 = Instance.new("UIStroke"); s1.Color = Color3.fromRGB(43, 33, 24); s1.Thickness = 3; s1.Parent = card
	card.Parent = menu

	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, 0, 0, 50)
	title.Position = UDim2.new(0, 0, 0, 20)
	title.BackgroundTransparency = 1
	title.Font = Enum.Font.Comic
	title.Text = "CHESS 2"
	title.TextColor3 = Color3.fromRGB(43, 33, 24)
	title.TextSize = 44
	title.Parent = card

	local desc = Instance.new("TextLabel")
	desc.Size = UDim2.new(1, -40, 0, 40)
	desc.Position = UDim2.new(0, 20, 0, 72)
	desc.BackgroundTransparency = 1
	desc.Font = Enum.Font.SourceSansBold
	desc.Text = "Turn-based 4X grand strategy crossed with chess pieces. Build farms, capture territory, and conquer continents."
	desc.TextColor3 = Color3.fromRGB(43, 33, 24)
	desc.TextSize = 14
	desc.TextWrapped = true
	desc.Parent = card

	local skBtn = Instance.new("TextButton")
	skBtn.Name = "SkirmishBtn"
	skBtn.Size = UDim2.new(1, -60, 0, 46)
	skBtn.Position = UDim2.new(0, 30, 0, 130)
	skBtn.BackgroundColor3 = Color3.fromRGB(142, 229, 154)
	skBtn.Font = Enum.Font.Comic
	skBtn.Text = "Quick Skirmish"
	skBtn.TextColor3 = Color3.fromRGB(43, 33, 24)
	skBtn.TextSize = 20
	local c2 = Instance.new("UICorner"); c2.CornerRadius = UDim.new(0, 10); c2.Parent = skBtn
	local s2 = Instance.new("UIStroke"); s2.Color = Color3.fromRGB(43, 33, 24); s2.Thickness = 3; s2.Parent = skBtn
	skBtn.Parent = card

	local mpBtn = Instance.new("TextButton")
	mpBtn.Name = "MultiplayerBtn"
	mpBtn.Size = UDim2.new(1, -60, 0, 46)
	mpBtn.Position = UDim2.new(0, 30, 0, 186)
	mpBtn.BackgroundColor3 = Color3.fromRGB(255, 224, 102)
	mpBtn.Font = Enum.Font.Comic
	mpBtn.Text = "Host Online Match"
	mpBtn.TextColor3 = Color3.fromRGB(43, 33, 24)
	mpBtn.TextSize = 20
	local c3 = Instance.new("UICorner"); c3.CornerRadius = UDim.new(0, 10); c3.Parent = mpBtn
	local s3 = Instance.new("UIStroke"); s3.Color = Color3.fromRGB(43, 33, 24); s3.Thickness = 3; s3.Parent = mpBtn
	mpBtn.Parent = card

	local jFrame = Instance.new("Frame")
	jFrame.Size = UDim2.new(1, -60, 0, 46)
	jFrame.Position = UDim2.new(0, 30, 0, 242)
	jFrame.BackgroundTransparency = 1
	jFrame.Parent = card

	local cInput = Instance.new("TextBox")
	cInput.Name = "CodeInput"
	cInput.Size = UDim2.new(0, 150, 1, 0)
	cInput.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
	cInput.Font = Enum.Font.SourceSansBold
	cInput.PlaceholderText = "ROOM CODE"
	cInput.TextColor3 = Color3.fromRGB(43, 33, 24)
	cInput.TextSize = 16
	local c4 = Instance.new("UICorner"); c4.CornerRadius = UDim.new(0, 8); c4.Parent = cInput
	local s4 = Instance.new("UIStroke"); s4.Color = Color3.fromRGB(43, 33, 24); s4.Thickness = 2; s4.Parent = cInput
	cInput.Parent = jFrame

	local jBtn = Instance.new("TextButton")
	jBtn.Name = "JoinBtn"
	jBtn.Size = UDim2.new(1, -162, 1, 0)
	jBtn.Position = UDim2.new(0, 162, 0, 0)
	jBtn.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
	jBtn.Font = Enum.Font.Comic
	jBtn.Text = "Join by Code"
	jBtn.TextColor3 = Color3.fromRGB(43, 33, 24)
	jBtn.TextSize = 16
	local c5 = Instance.new("UICorner"); c5.CornerRadius = UDim.new(0, 8); c5.Parent = jBtn
	local s5 = Instance.new("UIStroke"); s5.Color = Color3.fromRGB(43, 33, 24); s5.Thickness = 2; s5.Parent = jBtn
	jBtn.Parent = jFrame

	local hud = Instance.new("Frame")
	hud.Name = "HudFrame"
	hud.Size = UDim2.new(1, 0, 1, 0)
	hud.BackgroundTransparency = 1
	hud.Visible = false
	hud.Parent = root

	local pList = Instance.new("Frame")
	pList.Name = "PlayerListFrame"
	pList.Size = UDim2.new(0, 220, 0, 180)
	pList.Position = UDim2.new(0, 12, 0, 12)
	pList.BackgroundColor3 = Color3.fromRGB(253, 243, 220)
	local c6 = Instance.new("UICorner"); c6.CornerRadius = UDim.new(0, 10); c6.Parent = pList
	local s6 = Instance.new("UIStroke"); s6.Color = Color3.fromRGB(43, 33, 24); s6.Thickness = 3; s6.Parent = pList
	local pll = Instance.new("UIListLayout"); pll.Padding = UDim.new(0, 4); pll.Parent = pList
	pList.Parent = hud

	local stats = Instance.new("Frame")
	stats.Name = "StatsCard"
	stats.Size = UDim2.new(0, 220, 0, 75)
	stats.Position = UDim2.new(0, 12, 0, 200)
	stats.BackgroundColor3 = Color3.fromRGB(255, 250, 240)
	local c7 = Instance.new("UICorner"); c7.CornerRadius = UDim.new(0, 10); c7.Parent = stats
	local s7 = Instance.new("UIStroke"); s7.Color = Color3.fromRGB(43, 33, 24); s7.Thickness = 2; s7.Parent = stats
	stats.Parent = hud

	local rLbl = Instance.new("TextLabel"); rLbl.Name = "RoundLabel"; rLbl.Size = UDim2.new(1, -16, 0, 22); rLbl.Position = UDim2.new(0, 8, 0, 4); rLbl.BackgroundTransparency = 1; rLbl.Font = Enum.Font.Comic; rLbl.Text = "Round 1"; rLbl.TextColor3 = Color3.fromRGB(43, 33, 24); rLbl.TextXAlignment = Enum.TextXAlignment.Left; rLbl.Parent = stats
	local sRow = Instance.new("TextLabel"); sRow.Name = "StatsRow"; sRow.Size = UDim2.new(1, -16, 0, 20); sRow.Position = UDim2.new(0, 8, 0, 26); sRow.BackgroundTransparency = 1; sRow.Font = Enum.Font.SourceSansBold; sRow.Text = "Land 12 | Troops 2"; sRow.TextColor3 = Color3.fromRGB(43, 33, 24); sRow.TextXAlignment = Enum.TextXAlignment.Left; sRow.Parent = stats
	local iRow = Instance.new("TextLabel"); iRow.Name = "IncomeRow"; iRow.Size = UDim2.new(1, -16, 0, 20); iRow.Position = UDim2.new(0, 8, 0, 48); iRow.BackgroundTransparency = 1; iRow.Font = Enum.Font.SourceSansBold; iRow.Text = "income +$9"; iRow.TextColor3 = Color3.fromRGB(90, 70, 50); iRow.TextXAlignment = Enum.TextXAlignment.Left; iRow.Parent = stats

	local actions = Instance.new("Frame")
	actions.Name = "TopActions"
	actions.Size = UDim2.new(0, 190, 0, 140)
	actions.Position = UDim2.new(1, -202, 0, 12)
	actions.BackgroundTransparency = 1
	actions.Parent = hud

	local endBtn = Instance.new("TextButton")
	endBtn.Name = "EndTurnBtn"
	endBtn.Size = UDim2.new(1, 0, 0, 46)
	endBtn.BackgroundColor3 = Color3.fromRGB(142, 229, 154)
	endBtn.Font = Enum.Font.Comic
	endBtn.Text = "END TURN"
	endBtn.TextColor3 = Color3.fromRGB(43, 33, 24)
	endBtn.TextSize = 20
	local c8 = Instance.new("UICorner"); c8.CornerRadius = UDim.new(0, 10); c8.Parent = endBtn
	local s8 = Instance.new("UIStroke"); s8.Color = Color3.fromRGB(43, 33, 24); s8.Thickness = 3; s8.Parent = endBtn
	endBtn.Parent = actions

	local subR = Instance.new("Frame"); subR.Size = UDim2.new(1, 0, 0, 32); subR.Position = UDim2.new(0, 0, 0, 52); subR.BackgroundTransparency = 1; subR.Parent = actions
	local kBtn = Instance.new("TextButton"); kBtn.Name = "KingBtn"; kBtn.Size = UDim2.new(0.48, 0, 1, 0); kBtn.BackgroundColor3 = Color3.fromRGB(255, 250, 240); kBtn.Font = Enum.Font.Comic; kBtn.Text = "My King"; kBtn.TextColor3 = Color3.fromRGB(43, 33, 24); kBtn.TextSize = 13; local c9 = Instance.new("UICorner"); c9.CornerRadius = UDim.new(0, 6); c9.Parent = kBtn; local s9 = Instance.new("UIStroke"); s9.Color = Color3.fromRGB(43, 33, 24); s9.Thickness = 2; s9.Parent = kBtn; kBtn.Parent = subR
	local rBtn = Instance.new("TextButton"); rBtn.Name = "ResignBtn"; rBtn.Size = UDim2.new(0.48, 0, 1, 0); rBtn.Position = UDim2.new(0.52, 0, 0, 0); rBtn.BackgroundColor3 = Color3.fromRGB(255, 214, 208); rBtn.Font = Enum.Font.Comic; rBtn.Text = "Resign"; rBtn.TextColor3 = Color3.fromRGB(43, 33, 24); rBtn.TextSize = 13; local c10 = Instance.new("UICorner"); c10.CornerRadius = UDim.new(0, 6); c10.Parent = rBtn; local s10 = Instance.new("UIStroke"); s10.Color = Color3.fromRGB(43, 33, 24); s10.Thickness = 2; s10.Parent = rBtn; rBtn.Parent = subR
	local dBtn = Instance.new("TextButton"); dBtn.Name = "DetonateBtn"; dBtn.Size = UDim2.new(1, 0, 0, 34); dBtn.Position = UDim2.new(0, 0, 0, 90); dBtn.BackgroundColor3 = Color3.fromRGB(255, 154, 107); dBtn.Font = Enum.Font.Comic; dBtn.Text = "Detonate 5x5!"; dBtn.TextColor3 = Color3.fromRGB(43, 33, 24); dBtn.TextSize = 15; dBtn.Visible = false; local c11 = Instance.new("UICorner"); c11.CornerRadius = UDim.new(0, 6); c11.Parent = dBtn; local s11 = Instance.new("UIStroke"); s11.Color = Color3.fromRGB(43, 33, 24); s11.Thickness = 2; s11.Parent = dBtn; dBtn.Parent = actions

	local shop = Instance.new("Frame")
	shop.Name = "ShopFrame"
	shop.Size = UDim2.new(1, -40, 0, 74)
	shop.Position = UDim2.new(0, 20, 1, -84)
	shop.BackgroundColor3 = Color3.fromRGB(253, 243, 220)
	local c12 = Instance.new("UICorner"); c12.CornerRadius = UDim.new(0, 12); c12.Parent = shop
	local s12 = Instance.new("UIStroke"); s12.Color = Color3.fromRGB(43, 33, 24); s12.Thickness = 3; s12.Parent = shop
	local sScroll = Instance.new("ScrollingFrame"); sScroll.Name = "ShopScroll"; sScroll.Size = UDim2.new(1, -12, 1, -10); sScroll.Position = UDim2.new(0, 6, 0, 5); sScroll.BackgroundTransparency = 1; sScroll.ScrollBarThickness = 3; sScroll.CanvasSize = UDim2.new(0, 960, 0, 0); sScroll.Parent = shop
	local sl = Instance.new("UIListLayout"); sl.FillDirection = Enum.FillDirection.Horizontal; sl.Padding = UDim.new(0, 6); sl.Parent = sScroll
	shop.Parent = hud

	local chron = Instance.new("Frame"); chron.Name = "ChronicleCard"; chron.Size = UDim2.new(0, 220, 0, 120); chron.Position = UDim2.new(1, -232, 1, -220); chron.BackgroundColor3 = Color3.fromRGB(255, 250, 240); local c13 = Instance.new("UICorner"); c13.CornerRadius = UDim.new(0, 10); c13.Parent = chron; local s13 = Instance.new("UIStroke"); s13.Color = Color3.fromRGB(43, 33, 24); s13.Thickness = 2; s13.Parent = chron; chron.Parent = hud
	local cTxt = Instance.new("TextLabel"); cTxt.Name = "ChronicleText"; cTxt.Size = UDim2.new(1, -12, 1, -12); cTxt.Position = UDim2.new(0, 6, 0, 6); cTxt.BackgroundTransparency = 1; cTxt.Font = Enum.Font.SourceSansBold; cTxt.Text = "Match beginning..."; cTxt.TextColor3 = Color3.fromRGB(43, 33, 24); cTxt.TextSize = 11; cTxt.TextWrapped = true; cTxt.TextYAlignment = Enum.TextYAlignment.Top; cTxt.TextXAlignment = Enum.TextXAlignment.Left; cTxt.Parent = chron

	local tLbl = Instance.new("TextLabel"); tLbl.Name = "ToastLabel"; tLbl.Size = UDim2.new(0, 260, 0, 32); tLbl.Position = UDim2.new(0.5, -130, 1, -125); tLbl.BackgroundColor3 = Color3.fromRGB(255, 214, 208); tLbl.Font = Enum.Font.Comic; tLbl.Text = ""; tLbl.TextColor3 = Color3.fromRGB(43, 33, 24); tLbl.TextSize = 13; tLbl.Visible = false; local c14 = Instance.new("UICorner"); c14.CornerRadius = UDim.new(0, 6); c14.Parent = tLbl; local s14 = Instance.new("UIStroke"); s14.Color = Color3.fromRGB(43, 33, 24); s14.Thickness = 2; s14.Parent = tLbl; tLbl.Parent = hud

	sg.Parent = playerGui
	return sg
end
return Chess2Gui
]=])

-----------------------------------------------------------------------------
-- Client Script (StarterPlayerScripts.Chess2Client)
-----------------------------------------------------------------------------
createLocalScript(StarterPlayerScripts, "Chess2Client", [=[
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")
local Chess2Folder = ReplicatedStorage:WaitForChild("Chess2")
local Types = require(Chess2Folder:WaitForChild("Types"))
local Engine = require(Chess2Folder:WaitForChild("Engine"))

local Remotes = Chess2Folder:WaitForChild("Remotes")
local ActionRequest = Remotes:WaitForChild("ActionRequest")
local CreateRoom = Remotes:WaitForChild("CreateRoom")
local JoinRoom = Remotes:WaitForChild("JoinRoom")
local StateUpdate = Remotes:WaitForChild("StateUpdate")

local Chess2GuiModule = require(StarterGui:WaitForChild("Chess2Gui"))
local screenGui = Chess2GuiModule.build(PlayerGui)
local root = screenGui:WaitForChild("Root")
local menuFrame = root:WaitForChild("MenuFrame")
local hudFrame = root:WaitForChild("HudFrame")
local menuCard = menuFrame:WaitForChild("MenuCard")
local skirmishBtn = menuCard:WaitForChild("SkirmishBtn")
local multiplayerBtn = menuCard:WaitForChild("MultiplayerBtn")
local codeInput = menuCard:FindFirstChild("CodeInput", true)
local joinBtn = menuCard:FindFirstChild("JoinBtn", true)

local topActions = hudFrame:WaitForChild("TopActions")
local endTurnBtn = topActions:WaitForChild("EndTurnBtn")
local kingBtn = topActions:FindFirstChild("KingBtn", true)
local resignBtn = topActions:FindFirstChild("ResignBtn", true)
local detonateBtn = topActions:WaitForChild("DetonateBtn")
local statsCard = hudFrame:WaitForChild("StatsCard")
local roundLabel = statsCard:WaitForChild("RoundLabel")
local statsRow = statsCard:WaitForChild("StatsRow")
local incomeRow = statsCard:WaitForChild("IncomeRow")
local playerListFrame = hudFrame:WaitForChild("PlayerListFrame")
local shopScroll = hudFrame:WaitForChild("ShopFrame"):WaitForChild("ShopScroll")
local chronicleText = hudFrame:WaitForChild("ChronicleCard"):WaitForChild("ChronicleText")
local toastLabel = hudFrame:WaitForChild("ToastLabel")

local liveState = nil
local mySeat = 0
local selectedTile = nil
local pickedShopKind = nil
local moves = {}
local buySpots = {}

local boardModel = Instance.new("Model"); boardModel.Name = "Chess2Board"; boardModel.Parent = Workspace
local TILE_SIZE = 4
local tileParts = {}
local unitVisuals = {}
local highlightParts = {}

local camera = Workspace.CurrentCamera
local camAngle = CFrame.Angles(math.rad(-65), 0, 0)
camera.CameraType = Enum.CameraType.Scriptable

local function focusOn(pos) camera.CFrame = CFrame.new(pos + Vector3.new(0, 65, 45)) * camAngle end

local function clearHighlights()
	for _, p in ipairs(highlightParts) do p:Destroy() end
	table.clear(highlightParts)
end

local function updateVisuals(s)
	for y = 0, s.h - 1 do
		for x = 0, s.w - 1 do
			local i = y * s.w + x
			local part = tileParts[i]
			if not part then
				part = Instance.new("Part")
				part.Name = "Tile_" .. i
				part.Size = Vector3.new(TILE_SIZE, 0.8, TILE_SIZE)
				part.Position = Vector3.new(x * TILE_SIZE, 0, y * TILE_SIZE)
				part.Anchored = true
				part.Material = Enum.Material.SmoothPlastic
				part.Parent = boardModel
				tileParts[i] = part
			end
			local light = ((x + y) % 2 == 0)
			local o = s.owner[i]
			if s.land[i] == 0 then
				part.Color = o == -1 and (light and Types.OCEAN_A or Types.OCEAN_B) or (s.players[o + 1] and s.players[o + 1].color or Types.OCEAN_A)
			else
				part.Color = o == -1 and (light and Types.LAND_A or Types.LAND_B) or (s.players[o + 1] and s.players[o + 1].color or Types.LAND_A)
			end
		end
	end

	for i = 0, (s.w * s.h) - 1 do
		local u = s.units[i]
		local ex = unitVisuals[i]
		if not u then
			if ex then ex:Destroy(); unitVisuals[i] = nil end
		else
			local x, y = i % s.w, math.floor(i / s.w)
			local pos = Vector3.new(x * TILE_SIZE, 2, y * TILE_SIZE)
			if not ex or ex:GetAttribute("kind") ~= u.kind or ex:GetAttribute("owner") ~= u.owner then
				if ex then ex:Destroy() end
				local m = Instance.new("Model"); m.Name = "Unit_" .. u.kind; m:SetAttribute("kind", u.kind); m:SetAttribute("owner", u.owner)
				local p = Instance.new("Part"); p.Size = Vector3.new(2.2, 2.2, 2.2); p.Position = pos; p.Anchored = true; p.CanCollide = false
				p.Color = s.players[u.owner + 1] and s.players[u.owner + 1].color or Color3.fromRGB(200, 200, 200); p.Parent = m
				local bb = Instance.new("BillboardGui"); bb.Size = UDim2.new(0, 80, 0, 24); bb.StudsOffset = Vector3.new(0, 2, 0); bb.AlwaysOnTop = true; bb.Parent = p
				local l = Instance.new("TextLabel"); l.Size = UDim2.new(1, 0, 1, 0); l.BackgroundTransparency = 1; l.Font = Enum.Font.Comic; l.Text = string.upper(u.kind); l.TextColor3 = Types.INK; l.TextStrokeColor3 = Color3.fromRGB(255, 255, 255); l.TextStrokeTransparency = 0; l.TextSize = 13; l.Parent = bb
				m.PrimaryPart = p; m.Parent = boardModel; unitVisuals[i] = m
			else
				ex.PrimaryPart.Position = pos
			end
		end
	end

	clearHighlights()
	if selectedTile ~= nil then
		for _, m in ipairs(moves) do
			local mx, my = m % s.w, math.floor(m / s.w)
			local hp = Instance.new("Part"); hp.Size = Vector3.new(TILE_SIZE * 0.6, 0.2, TILE_SIZE * 0.6); hp.Position = Vector3.new(mx * TILE_SIZE, 0.9, my * TILE_SIZE); hp.Anchored = true; hp.CanCollide = false; hp.Color = Color3.fromRGB(255, 224, 102); hp.Material = Enum.Material.Neon; hp.Parent = boardModel; table.insert(highlightParts, hp)
		end
	end
	if pickedShopKind ~= nil then
		for _, sp in ipairs(buySpots) do
			local bx, by = sp % s.w, math.floor(sp / s.w)
			local hp = Instance.new("Part"); hp.Size = Vector3.new(TILE_SIZE * 0.6, 0.2, TILE_SIZE * 0.6); hp.Position = Vector3.new(bx * TILE_SIZE, 0.9, by * TILE_SIZE); hp.Anchored = true; hp.CanCollide = false; hp.Color = Color3.fromRGB(142, 229, 154); hp.Material = Enum.Material.Neon; hp.Parent = boardModel; table.insert(highlightParts, hp)
		end
	end
end

local function updateHud(s)
	roundLabel.Text = "Round " .. s.round .. " - " .. string.upper(s.mode)
	local eco = Engine.economy(s, mySeat)
	statsRow.Text = "Land " .. eco.land .. " | Troops " .. eco.units
	incomeRow.Text = "income +$" .. eco.gross .. " | upkeep -$" .. eco.upkeep
	local isMy = (s.current == mySeat and s.winner == nil)
	endTurnBtn.Text = isMy and "END TURN" or ("Waiting (" .. s.players[s.current + 1].name .. ")")
	endTurnBtn.BackgroundColor3 = isMy and Color3.fromRGB(142, 229, 154) or Color3.fromRGB(220, 215, 205)

	local hasNuke = false
	if selectedTile ~= nil and s.units[selectedTile] and s.units[selectedTile].kind == "nuke" and s.units[selectedTile].owner == mySeat and isMy then
		hasNuke = true
	end
	detonateBtn.Visible = hasNuke

	for _, c in ipairs(playerListFrame:GetChildren()) do if c:IsA("Frame") then c:Destroy() end end
	for _, p in ipairs(s.players) do
		local r = Instance.new("Frame"); r.Size = UDim2.new(1, 0, 0, 22); r.BackgroundColor3 = p.alive and p.color or Color3.fromRGB(180, 180, 180); local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, 4); c.Parent = r
		local nl = Instance.new("TextLabel"); nl.Size = UDim2.new(0, 110, 1, 0); nl.Position = UDim2.new(0, 4, 0, 0); nl.BackgroundTransparency = 1; nl.Font = Enum.Font.Comic; nl.Text = p.name .. (p.isAI and " (AI)" or ""); nl.TextColor3 = Types.INK; nl.TextSize = 11; nl.TextXAlignment = Enum.TextXAlignment.Left; nl.Parent = r
		local gl = Instance.new("TextLabel"); gl.Size = UDim2.new(0, 50, 1, 0); gl.Position = UDim2.new(0, 115, 0, 0); gl.BackgroundTransparency = 1; gl.Font = Enum.Font.SourceSansBold; gl.Text = "$" .. p.gold; gl.TextColor3 = Types.INK; gl.TextSize = 11; gl.Parent = r
		r.Parent = playerListFrame
	end
	if #s.log > 0 then chronicleText.Text = s.log[#s.log].text end
end

for _, kind in ipairs(Types.SHOP_ORDER) do
	local def = Types.PIECES[kind]
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(0, 70, 1, 0); btn.BackgroundColor3 = Color3.fromRGB(255, 250, 240); local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, 6); c.Parent = btn
	local nl = Instance.new("TextLabel"); nl.Size = UDim2.new(1, 0, 0, 18); nl.BackgroundTransparency = 1; nl.Font = Enum.Font.Comic; nl.Text = string.upper(def.name); nl.TextColor3 = Types.INK; nl.TextSize = 10; nl.Parent = btn
	local cl = Instance.new("TextLabel"); cl.Size = UDim2.new(1, 0, 0, 18); cl.Position = UDim2.new(0, 0, 0, 20); cl.BackgroundTransparency = 1; cl.Font = Enum.Font.SourceSansBold; cl.Text = "$" .. def.cost; cl.TextColor3 = Types.INK; cl.TextSize = 12; cl.Parent = btn
	btn.MouseButton1Click:Connect(function()
		if not liveState or liveState.current ~= mySeat then return end
		if pickedShopKind == kind then pickedShopKind = nil; buySpots = {}
		else pickedShopKind = kind; selectedTile = nil; moves = {}; buySpots = Engine.buySpots(liveState, mySeat, kind) end
		updateVisuals(liveState)
	end)
	btn.Parent = shopScroll
end

local function getTileUnderMouse()
	local m = UserInputService:GetMouseLocation()
	local ray = camera:ViewportPointToRay(m.X, m.Y)
	local p = RaycastParams.new(); p.FilterDescendantsInstances = { boardModel }; p.FilterType = Enum.RaycastFilterType.Include
	local r = Workspace:Raycast(ray.Origin, ray.Direction * 500, p)
	if r and r.Instance then
		local id = string.match(r.Instance.Name, "Tile_(%d+)")
		if id then return tonumber(id) end
	end
	return nil
end

UserInputService.InputBegan:Connect(function(input, gp)
	if gp or not liveState then return end
	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		local t = getTileUnderMouse()
		if not t then return end
		local isMy = (liveState.current == mySeat and liveState.winner == nil)
		if pickedShopKind ~= nil and isMy then
			for _, sp in ipairs(buySpots) do
				if sp == t then ActionRequest:InvokeServer({ type = "buy", kind = pickedShopKind, at = t }); break end
			end
			pickedShopKind = nil; buySpots = {}
			updateVisuals(liveState)
			return
		end
		if selectedTile ~= nil and isMy then
			for _, m in ipairs(moves) do
				if m == t then ActionRequest:InvokeServer({ type = "move", from = selectedTile, to = t }); break end
			end
			selectedTile = nil; moves = {}
			updateVisuals(liveState)
			return
		end
		local u = liveState.units[t]
		if u and u.owner == mySeat then
			selectedTile = t; moves = Engine.legalMoves(liveState, t)
		else
			selectedTile = nil; moves = {}
		end
		updateVisuals(liveState)
	elseif input.KeyCode == Enum.KeyCode.Space then
		if liveState and liveState.current == mySeat and liveState.winner == nil then
			ActionRequest:InvokeServer({ type = "endTurn" })
		end
	end
end)

skirmishBtn.MouseButton1Click:Connect(function()
	local res = CreateRoom:InvokeServer({ humans = 1, ai = 3, mode = "standard" })
	if res.ok then
		liveState = res.state; mySeat = res.seat
		menuFrame.Visible = false; hudFrame.Visible = true
		focusOn(Vector3.new((liveState.w * TILE_SIZE) / 2, 0, (liveState.h * TILE_SIZE) / 2))
		updateVisuals(liveState); updateHud(liveState)
	end
end)

multiplayerBtn.MouseButton1Click:Connect(function()
	local res = CreateRoom:InvokeServer({ humans = 2, ai = 2, mode = "standard" })
	if res.ok then
		liveState = res.state; mySeat = res.seat
		menuFrame.Visible = false; hudFrame.Visible = true
		focusOn(Vector3.new((liveState.w * TILE_SIZE) / 2, 0, (liveState.h * TILE_SIZE) / 2))
		updateVisuals(liveState); updateHud(liveState)
	end
end)

joinBtn.MouseButton1Click:Connect(function()
	local res = JoinRoom:InvokeServer(codeInput.Text)
	if res.ok then
		liveState = res.state; mySeat = res.seat
		menuFrame.Visible = false; hudFrame.Visible = true
		focusOn(Vector3.new((liveState.w * TILE_SIZE) / 2, 0, (liveState.h * TILE_SIZE) / 2))
		updateVisuals(liveState); updateHud(liveState)
	end
end)

endTurnBtn.MouseButton1Click:Connect(function()
	if liveState and liveState.current == mySeat then ActionRequest:InvokeServer({ type = "endTurn" }) end
end)

kingBtn.MouseButton1Click:Connect(function()
	if not liveState then return end
	for i = 0, (liveState.w * liveState.h) - 1 do
		local u = liveState.units[i]
		if u and u.kind == "king" and u.owner == mySeat then
			local kx, ky = i % liveState.w, math.floor(i / liveState.w)
			focusOn(Vector3.new(kx * TILE_SIZE, 0, ky * TILE_SIZE))
			break
		end
	end
end)

detonateBtn.MouseButton1Click:Connect(function()
	if selectedTile ~= nil and liveState and liveState.current == mySeat then
		ActionRequest:InvokeServer({ type = "detonate", from = selectedTile })
		selectedTile = nil; moves = {}
		updateVisuals(liveState)
	end
end)

resignBtn.MouseButton1Click:Connect(function()
	if liveState and liveState.current == mySeat then ActionRequest:InvokeServer({ type = "resign" }) end
end)

StateUpdate.OnClientEvent:Connect(function(newState, seat)
	liveState = newState; mySeat = seat
	updateVisuals(newState); updateHud(newState)
end)
]=])

print("[Chess2] Installation completed successfully! Hit Play (F5) to test your game.")
