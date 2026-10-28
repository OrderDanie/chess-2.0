--!strict
-- Server Script for Chess 2 (Roblox)
-- Manages room tables, matchmaking, AI turns, clock timers, and state replication

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Chess2Folder = ReplicatedStorage:WaitForChild("Chess2")
local Engine = require(Chess2Folder:WaitForChild("Engine") :: ModuleScript)
local MapGen = require(Chess2Folder:WaitForChild("MapGen") :: ModuleScript)
local AI = require(Chess2Folder:WaitForChild("AI") :: ModuleScript)
local Types = require(Chess2Folder:WaitForChild("Types") :: ModuleScript)

-- Setup Remote Events & Functions
local Remotes = Chess2Folder:FindFirstChild("Remotes")
if not Remotes then
	Remotes = Instance.new("Folder")
	Remotes.Name = "Remotes"
	Remotes.Parent = Chess2Folder
end

local function getOrCreateRemote<T>(className: string, name: string): T
	local found = Remotes:FindFirstChild(name)
	if not found then
		found = Instance.new(className)
		found.Name = name
		found.Parent = Remotes
	end
	return (found :: any) :: T
end

local ActionRequest = getOrCreateRemote("RemoteFunction", "ActionRequest") :: RemoteFunction
local CreateRoom = getOrCreateRemote("RemoteFunction", "CreateRoom") :: RemoteFunction
local JoinRoom = getOrCreateRemote("RemoteFunction", "JoinRoom") :: RemoteFunction
local StateUpdate = getOrCreateRemote("RemoteEvent", "StateUpdate") :: RemoteEvent

type Room = {
	id: string,
	code: string,
	name: string,
	mode: string,
	state: Engine.GameState,
	playerSeats: { [Player]: number },
	seatPlayers: { [number]: Player? },
}

local Rooms: { [string]: Room } = {}
local PlayerToRoom: { [Player]: Room } = {}

local function generateCode(): string
	local chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	local code = ""
	for _ = 1, 5 do
		local r = math.random(1, #chars)
		code ..= string.sub(chars, r, r)
	end
	return code
end

local function broadcastState(room: Room)
	for p, _ in pairs(room.playerSeats) do
		StateUpdate:FireClient(p, room.state, room.playerSeats[p], room.code)
	end
end

local function runAITurns(room: Room)
	task.spawn(function()
		local limit = 6
		while room.state.winner == nil and limit > 0 do
			local curId = room.state.current
			local curPlayer = room.state.players[curId + 1]
			if not curPlayer or not curPlayer.isAI or not curPlayer.alive then
				break
			end

			task.wait(0.4)
			local plan = AI.planTurn(room.state, curId)
			for _, act in ipairs(plan) do
				Engine.applyAction(room.state, curId, act)
				broadcastState(room)
				task.wait(0.2)
			end
			limit -= 1
		end
	end)
end

-- Create Room Handler
CreateRoom.OnServerInvoke = function(player: Player, options: any)
	options = options or {}
	local mode = options.mode or "standard"
	local preset = options.mapPreset or "pangaea"
	local totalHumans = math.clamp(options.humans or 1, 1, 4)
	local totalBots = math.clamp(options.ai or 3, 0, 7)
	local totalPlayers = math.clamp(totalHumans + totalBots, 2, 8)

	local mapData = MapGen.generate(preset, totalPlayers)
	local configs = {}

	for i = 1, totalPlayers do
		local isAI = i > totalHumans
		local name = if isAI then ("Bot " .. tostring(i)) elseif i == 1 then player.DisplayName else ("Player " .. tostring(i))
		table.insert(configs, {
			name = name,
			isAI = isAI,
			skill = options.skill or "normal",
		})
	end

	local gameState = MapGen.createInitialGameState(mapData, configs, mode)
	local code = generateCode()

	local room: Room = {
		id = code,
		code = code,
		name = player.DisplayName .. "'s Match",
		mode = mode,
		state = gameState,
		playerSeats = { [player] = 0 },
		seatPlayers = { [0] = player },
	}

	Rooms[code] = room
	PlayerToRoom[player] = room

	-- If seat 0 is AI (unlikely), run AIs
	if gameState.players[1].isAI then
		runAITurns(room)
	end

	return { ok = true, code = code, seat = 0, state = gameState }
end

-- Join Room Handler
JoinRoom.OnServerInvoke = function(player: Player, code: string)
	code = string.upper(code or "")
	local room = Rooms[code]
	if not room then
		return { ok = false, error = "Room code not found" }
	end

	-- Check if already in room
	if room.playerSeats[player] then
		return { ok = true, code = code, seat = room.playerSeats[player], state = room.state }
	end

	-- Find open human seat
	local assignedSeat: number? = nil
	for i = 0, #room.state.players - 1 do
		local pData = room.state.players[i + 1]
		if not pData.isAI and room.seatPlayers[i] == nil then
			assignedSeat = i
			break
		end
	end

	if assignedSeat == nil then
		-- Spectator
		room.playerSeats[player] = -1
		PlayerToRoom[player] = room
		return { ok = true, code = code, seat = -1, state = room.state, spectating = true }
	end

	room.playerSeats[player] = assignedSeat
	room.seatPlayers[assignedSeat] = player
	PlayerToRoom[player] = room
	room.state.players[assignedSeat + 1].name = player.DisplayName

	broadcastState(room)
	return { ok = true, code = code, seat = assignedSeat, state = room.state }
end

-- Action Request Handler
ActionRequest.OnServerInvoke = function(player: Player, action: any)
	local room = PlayerToRoom[player]
	if not room then
		return { ok = false, error = "Not in an active match" }
	end

	local seat = room.playerSeats[player]
	if seat == nil or seat < 0 then
		return { ok = false, error = "Spectators cannot make moves" }
	end

	local ok, err = Engine.applyAction(room.state, seat, action)
	if not ok then
		return { ok = false, error = err or "Action rejected" }
	end

	broadcastState(room)

	-- If turn passed to an AI, execute AI moves
	runAITurns(room)

	return { ok = true, state = room.state }
end

-- Heartbeat loop: advance game timers and clocks every second
task.spawn(function()
	while true do
		task.wait(1)
		for _, room in pairs(Rooms) do
			if room.state.winner == nil then
				local curId = room.state.current
				local curP = room.state.players[curId + 1]
				if curP and curP.alive then
					Engine.applyAction(room.state, curId, { type = "tick", seconds = 1 })
					broadcastState(room)
				end
			end
		end
	end
end)

-- Clean up on player leave
Players.PlayerRemoving:Connect(function(player: Player)
	local room = PlayerToRoom[player]
	if room then
		room.playerSeats[player] = nil
		for seat, p in pairs(room.seatPlayers) do
			if p == player then
				room.seatPlayers[seat] = nil
				break
			end
		end
		PlayerToRoom[player] = nil
	end
end)

print("[Chess2] Server initialized successfully.")
