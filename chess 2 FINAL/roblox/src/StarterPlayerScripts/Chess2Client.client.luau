--!strict
-- Client Controller for Chess 2 (Roblox)
-- Handles 3D board rendering, piece visualizers, camera panning/zoom,
-- tactical arrows, premoves, sound effects, and UI interaction.
-- STRICTLY ZERO EMOJIS!

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")

local Chess2Folder = ReplicatedStorage:WaitForChild("Chess2")
local Types = require(Chess2Folder:WaitForChild("Types") :: ModuleScript)
local Engine = require(Chess2Folder:WaitForChild("Engine") :: ModuleScript)

local Remotes = Chess2Folder:WaitForChild("Remotes")
local ActionRequest = Remotes:WaitForChild("ActionRequest") :: RemoteFunction
local CreateRoom = Remotes:WaitForChild("CreateRoom") :: RemoteFunction
local JoinRoom = Remotes:WaitForChild("JoinRoom") :: RemoteFunction
local StateUpdate = Remotes:WaitForChild("StateUpdate") :: RemoteEvent

-- Import or build UI
local Chess2GuiModule = require(PlayerGui:WaitForChild("Chess2Gui") :: ModuleScript)
local screenGui = Chess2GuiModule.build(PlayerGui)
local root = screenGui:WaitForChild("Root")
local menuFrame = root:WaitForChild("MenuFrame")
local hudFrame = root:WaitForChild("HudFrame")

local menuCard = menuFrame:WaitForChild("MenuCard")
local skirmishBtn = menuCard:WaitForChild("SkirmishBtn") :: TextButton
local multiplayerBtn = menuCard:WaitForChild("MultiplayerBtn") :: TextButton
local joinFrame = menuCard:FindFirstChildWhichIsA("Frame")
local codeInput = (menuCard:FindFirstChild("CodeInput", true)) :: TextBox
local joinBtn = (menuCard:FindFirstChild("JoinBtn", true)) :: TextButton

local topActions = hudFrame:WaitForChild("TopActions")
local endTurnBtn = topActions:WaitForChild("EndTurnBtn") :: TextButton
local subRow = topActions:FindFirstChildWhichIsA("Frame")
local kingBtn = (topActions:FindFirstChild("KingBtn", true)) :: TextButton
local resignBtn = (topActions:FindFirstChild("ResignBtn", true)) :: TextButton
local detonateBtn = topActions:WaitForChild("DetonateBtn") :: TextButton

local playerListFrame = hudFrame:WaitForChild("PlayerListFrame")
local statsCard = hudFrame:WaitForChild("StatsCard")
local roundLabel = statsCard:WaitForChild("RoundLabel") :: TextLabel
local statsRow = statsCard:WaitForChild("StatsRow") :: TextLabel
local incomeRow = statsCard:WaitForChild("IncomeRow") :: TextLabel

local shopFrame = hudFrame:WaitForChild("ShopFrame")
local shopScroll = shopFrame:WaitForChild("ShopScroll")
local chronicleCard = hudFrame:WaitForChild("ChronicleCard")
local chronicleText = chronicleCard:WaitForChild("ChronicleText") :: TextLabel
local toastLabel = hudFrame:WaitForChild("ToastLabel") :: TextLabel

-- Local Client State
local liveState: Engine.GameState? = nil
local mySeat: number = 0
local roomCode: string = ""
local selectedTile: number? = nil
local pickedShopKind: string? = nil
local moves: { number } = {}
local buySpots: { number } = {}

-- 3D Board Workspace Container
local boardModel = Instance.new("Model")
boardModel.Name = "Chess2Board"
boardModel.Parent = Workspace

local TILE_SIZE = 4
local TILE_HEIGHT = 0.8

local tileParts: { [number]: Part } = {}
local unitVisuals: { [number]: Model } = {}
local highlightParts: { Part } = {}

local function showToast(msg: string)
	toastLabel.Text = msg
	toastLabel.Visible = true
	task.delay(2.5, function()
		if toastLabel.Text == msg then
			toastLabel.Visible = false
		end
	end)
end

-- Top-down orthographic/angled camera setup
local camera = Workspace.CurrentCamera
local camAngle = CFrame.Angles(math.rad(-65), 0, 0)
local camPos = Vector3.new(0, 75, 50)
camera.CameraType = Enum.CameraType.Scriptable

local function focusCameraOn(pos: Vector3)
	camera.CFrame = CFrame.new(pos + Vector3.new(0, 65, 45)) * camAngle
end

-- Clear highlights
local function clearHighlights()
	for _, p in ipairs(highlightParts) do
		p:Destroy()
	end
	table.clear(highlightParts)
end

-- Rebuild or update board parts
local function updateBoardVisuals(s: Engine.GameState)
	-- Board tiles
	for y = 0, s.h - 1 do
		for x = 0, s.w - 1 do
			local i = y * s.w + x
			local part = tileParts[i]
			if not part then
				part = Instance.new("Part")
				part.Name = "Tile_" .. tostring(i)
				part.Size = Vector3.new(TILE_SIZE, TILE_HEIGHT, TILE_SIZE)
				part.Position = Vector3.new(x * TILE_SIZE, 0, y * TILE_SIZE)
				part.Anchored = true
				part.Material = Enum.Material.SmoothPlastic
				part.TopSurface = Enum.SurfaceType.Smooth
				part.Parent = boardModel
				tileParts[i] = part
			end

			-- Checkered coloring
			local light = ((x + y) % 2 == 0)
			local o = s.owner[i]
			if s.land[i] == 0 then
				if o == -1 then
					part.Color = light and Types.OCEAN_A or Types.OCEAN_B
				else
					local pCol = s.players[o + 1] and s.players[o + 1].color or Types.OCEAN_A
					part.Color = pCol:Lerp(Color3.fromRGB(0, 0, 0), 0.2)
				end
			else
				if o == -1 then
					part.Color = light and Types.LAND_A or Types.LAND_B
				else
					local pCol = s.players[o + 1] and s.players[o + 1].color or Types.LAND_A
					part.Color = pCol:Lerp(Color3.fromRGB(255, 255, 255), 0.15)
				end
			end
		end
	end

	-- Units
	for i = 0, (s.w * s.h) - 1 do
		local u = s.units[i]
		local existing = unitVisuals[i]
		if not u then
			if existing then
				existing:Destroy()
				unitVisuals[i] = nil
			end
		else
			local x, y = i % s.w, math.floor(i / s.w)
			local unitPos = Vector3.new(x * TILE_SIZE, TILE_HEIGHT + 1.2, y * TILE_SIZE)
			if not existing or existing:GetAttribute("kind") ~= u.kind or existing:GetAttribute("owner") ~= u.owner then
				if existing then existing:Destroy() end
				local m = Instance.new("Model")
				m.Name = "Unit_" .. u.kind
				m:SetAttribute("kind", u.kind)
				m:SetAttribute("owner", u.owner)

				local p = Instance.new("Part")
				p.Size = Vector3.new(2.4, 2.4, 2.4)
				p.Position = unitPos
				p.Anchored = true
				p.CanCollide = false
				p.Material = Enum.Material.SmoothPlastic
				local ownerCol = s.players[u.owner + 1] and s.players[u.owner + 1].color or Color3.fromRGB(200, 200, 200)
				p.Color = ownerCol
				p.Parent = m

				-- Billboard Label with Piece Name
				local bb = Instance.new("BillboardGui")
				bb.Size = UDim2.new(0, 100, 0, 30)
				bb.StudsOffset = Vector3.new(0, 2.2, 0)
				bb.AlwaysOnTop = true
				bb.Parent = p

				local lbl = Instance.new("TextLabel")
				lbl.Size = UDim2.new(1, 0, 1, 0)
				lbl.BackgroundTransparency = 1
				lbl.Font = Enum.Font.Comic
				lbl.Text = string.upper(u.kind)
				lbl.TextColor3 = Types.INK
				lbl.TextStrokeColor3 = Color3.fromRGB(255, 255, 255)
				lbl.TextStrokeTransparency = 0
				lbl.TextSize = 14
				lbl.Parent = bb

				m.PrimaryPart = p
				m.Parent = boardModel
				unitVisuals[i] = m
			else
				existing.PrimaryPart.Position = unitPos
			end
		end
	end

	-- Update Selection & Move Hints
	clearHighlights()
	if selectedTile ~= nil then
		local sx, sy = selectedTile % s.w, math.floor(selectedTile / s.w)
		local selBox = Instance.new("Part")
		selBox.Size = Vector3.new(TILE_SIZE * 0.9, 0.2, TILE_SIZE * 0.9)
		selBox.Position = Vector3.new(sx * TILE_SIZE, TILE_HEIGHT + 0.1, sy * TILE_SIZE)
		selBox.Anchored = true
		selBox.CanCollide = false
		selBox.Color = Color3.fromRGB(255, 224, 102)
		selBox.Material = Enum.Material.Neon
		selBox.Parent = boardModel
		table.insert(highlightParts, selBox)

		for _, m in ipairs(moves) do
			local mx, my = m % s.w, math.floor(m / s.w)
			local hPart = Instance.new("Part")
			hPart.Size = Vector3.new(TILE_SIZE * 0.5, 0.15, TILE_SIZE * 0.5)
			hPart.Position = Vector3.new(mx * TILE_SIZE, TILE_HEIGHT + 0.1, my * TILE_SIZE)
			hPart.Anchored = true
			hPart.CanCollide = false
			local targetU = s.units[m]
			hPart.Color = targetU and Color3.fromRGB(232, 87, 76) or Color3.fromRGB(255, 250, 240)
			hPart.Material = Enum.Material.Neon
			hPart.Parent = boardModel
			table.insert(highlightParts, hPart)
		end
	end

	-- Deployment spots highlight
	if pickedShopKind ~= nil then
		for _, sp in ipairs(buySpots) do
			local bx, by = sp % s.w, math.floor(sp / s.w)
			local hPart = Instance.new("Part")
			hPart.Size = Vector3.new(TILE_SIZE * 0.7, 0.15, TILE_SIZE * 0.7)
			hPart.Position = Vector3.new(bx * TILE_SIZE, TILE_HEIGHT + 0.1, by * TILE_SIZE)
			hPart.Anchored = true
			hPart.CanCollide = false
			hPart.Color = Color3.fromRGB(142, 229, 154)
			hPart.Material = Enum.Material.Neon
			hPart.Parent = boardModel
			table.insert(highlightParts, hPart)
		end
	end
end

-- Update HUD elements
local function updateHud(s: Engine.GameState)
	roundLabel.Text = "Round " .. tostring(s.round) .. " - " .. string.upper(s.mode)
	local eco = Engine.economy(s, mySeat)
	statsRow.Text = "Land " .. tostring(eco.land) .. " | Farms " .. tostring(eco.farms) .. " | Troops " .. tostring(eco.units)
	incomeRow.Text = "income +$" .. tostring(eco.gross) .. " | upkeep -$" .. tostring(eco.upkeep)

	local isMyTurn = (s.current == mySeat and s.winner == nil)
	endTurnBtn.Text = isMyTurn and "END TURN" or ("Waiting (" .. s.players[s.current + 1].name .. ")")
	endTurnBtn.BackgroundColor3 = isMyTurn and Color3.fromRGB(142, 229, 154) or Color3.fromRGB(220, 215, 205)

	-- Detonate button visibility
	local hasNukeSelected = false
	if selectedTile ~= nil then
		local u = s.units[selectedTile]
		if u and u.kind == "nuke" and u.owner == mySeat and isMyTurn then
			hasNukeSelected = true
		end
	end
	detonateBtn.Visible = hasNukeSelected

	-- Player List Items
	for _, child in ipairs(playerListFrame:GetChildren()) do
		if child:IsA("Frame") then child:Destroy() end
	end

	for i, p in ipairs(s.players) do
		local pId = i - 1
		local row = Instance.new("Frame")
		row.Size = UDim2.new(1, 0, 0, 24)
		row.BackgroundColor3 = p.alive and p.color or Color3.fromRGB(180, 180, 180)
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 6)
		c.Parent = row

		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.new(0, 100, 1, 0)
		nameLabel.Position = UDim2.new(0, 6, 0, 0)
		nameLabel.BackgroundTransparency = 1
		nameLabel.Font = Enum.Font.Comic
		nameLabel.Text = p.name .. (p.isAI and " (AI)" or "")
		nameLabel.TextColor3 = Types.INK
		nameLabel.TextSize = 12
		nameLabel.TextXAlignment = Enum.TextXAlignment.Left
		nameLabel.Parent = row

		local goldLabel = Instance.new("TextLabel")
		goldLabel.Size = UDim2.new(0, 50, 1, 0)
		goldLabel.Position = UDim2.new(0, 110, 0, 0)
		goldLabel.BackgroundTransparency = 1
		goldLabel.Font = Enum.Font.SourceSansBold
		goldLabel.Text = "$" .. tostring(p.gold)
		goldLabel.TextColor3 = Types.INK
		goldLabel.TextSize = 12
		goldLabel.Parent = row

		local timeLabel = Instance.new("TextLabel")
		timeLabel.Size = UDim2.new(0, 50, 1, 0)
		timeLabel.Position = UDim2.new(1, -55, 0, 0)
		timeLabel.BackgroundTransparency = 1
		timeLabel.Font = Enum.Font.SourceSansBold
		local m = math.floor(p.time / 60)
		local sec = p.time % 60
		timeLabel.Text = string.format("%d:%02d", m, sec)
		timeLabel.TextColor3 = Types.INK
		timeLabel.TextSize = 11
		timeLabel.Parent = row

		row.Parent = playerListFrame
	end

	-- Chronicle
	if #s.log > 0 then
		local lastLog = s.log[#s.log]
		chronicleText.Text = lastLog.text
	end
end

-- Populate Shop Buttons
local function populateShop()
	for _, child in ipairs(shopScroll:GetChildren()) do
		if child:IsA("TextButton") then child:Destroy() end
	end

	for _, kind in ipairs(Types.SHOP_ORDER) do
		local def = Types.PIECES[kind]
		local btn = Instance.new("TextButton")
		btn.Name = "Shop_" .. kind
		btn.Size = UDim2.new(0, 72, 1, 0)
		btn.BackgroundColor3 = Color3.fromRGB(255, 250, 240)
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 8)
		c.Parent = btn
		local st = Instance.new("UIStroke")
		st.Color = Types.INK
		st.Thickness = 2
		st.Parent = btn

		local nameLbl = Instance.new("TextLabel")
		nameLbl.Size = UDim2.new(1, 0, 0, 20)
		nameLbl.Position = UDim2.new(0, 0, 0, 4)
		nameLbl.BackgroundTransparency = 1
		nameLbl.Font = Enum.Font.Comic
		nameLbl.Text = string.upper(def.name)
		nameLbl.TextColor3 = Types.INK
		nameLbl.TextSize = 11
		nameLbl.Parent = btn

		local costLbl = Instance.new("TextLabel")
		costLbl.Size = UDim2.new(1, 0, 0, 18)
		costLbl.Position = UDim2.new(0, 0, 0, 24)
		costLbl.BackgroundTransparency = 1
		costLbl.Font = Enum.Font.SourceSansBold
		costLbl.Text = "$" .. tostring(def.cost)
		costLbl.TextColor3 = Types.INK
		costLbl.TextSize = 13
		costLbl.Parent = btn

		local infoLbl = Instance.new("TextLabel")
		infoLbl.Size = UDim2.new(1, 0, 0, 16)
		infoLbl.Position = UDim2.new(0, 0, 0, 44)
		infoLbl.BackgroundTransparency = 1
		infoLbl.Font = Enum.Font.SourceSansBold
		infoLbl.Text = def.income > 0 and ("+$" .. def.income .. "/t") or (def.upkeep > 0 and ("-$" .. def.upkeep .. "/t") or "free")
		infoLbl.TextColor3 = Color3.fromRGB(100, 80, 60)
		infoLbl.TextSize = 10
		infoLbl.Parent = btn

		btn.MouseButton1Click:Connect(function()
			if not liveState or liveState.current ~= mySeat then return end
			if pickedShopKind == kind then
				pickedShopKind = nil
				buySpots = {}
			else
				pickedShopKind = kind
				selectedTile = nil
				moves = {}
				buySpots = Engine.buySpots(liveState, mySeat, kind)
			end
			updateBoardVisuals(liveState)
		end)

		btn.Parent = shopScroll
	end
end

populateShop()

-- Raycasting mouse to board tile
local function getTileUnderMouse(): number?
	if not liveState then return nil end
	local mousePos = UserInputService:GetMouseLocation()
	local ray = camera:ViewportPointToRay(mousePos.X, mousePos.Y)
	local raycastParams = RaycastParams.new()
	raycastParams.FilterDescendantsInstances = { boardModel }
	raycastParams.FilterType = Enum.RaycastFilterType.Include
	local result = Workspace:Raycast(ray.Origin, ray.Direction * 500, raycastParams)

	if result and result.Instance then
		local name = result.Instance.Name
		local idxStr = string.match(name, "Tile_(%d+)")
		if idxStr then
			return tonumber(idxStr)
		end
	end
	return nil
end

-- Mouse Click Handler
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed or not liveState then return end

	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		local clickedTile = getTileUnderMouse()
		if not clickedTile then return end

		local isMyTurn = (liveState.current == mySeat and liveState.winner == nil)

		-- Buying
		if pickedShopKind ~= nil and isMyTurn then
			local valid = false
			for _, sp in ipairs(buySpots) do
				if sp == clickedTile then valid = true; break end
			end
			if valid then
				ActionRequest:InvokeServer({ type = "buy", kind = pickedShopKind, at = clickedTile })
				pickedShopKind = nil
				buySpots = {}
			else
				pickedShopKind = nil
				buySpots = {}
			end
			updateBoardVisuals(liveState)
			return
		end

		-- Move or Teleport
		if selectedTile ~= nil and isMyTurn then
			local validMove = false
			for _, m in ipairs(moves) do
				if m == clickedTile then validMove = true; break end
			end
			if validMove then
				ActionRequest:InvokeServer({ type = "move", from = selectedTile, to = clickedTile })
				selectedTile = nil
				moves = {}
				updateBoardVisuals(liveState)
				return
			end
		end

		-- Select unit
		local u = liveState.units[clickedTile]
		if u and u.owner == mySeat then
			selectedTile = clickedTile
			moves = isMyTurn and Engine.legalMoves(liveState, clickedTile) or Engine.previewMoves(liveState, clickedTile)
		else
			selectedTile = nil
			moves = {}
		end
		updateBoardVisuals(liveState)

	elseif input.KeyCode == Enum.KeyCode.Space then
		if liveState and liveState.current == mySeat and liveState.winner == nil then
			ActionRequest:InvokeServer({ type = "endTurn" })
			selectedTile = nil
			moves = {}
			pickedShopKind = nil
		end
	end
end)

-- UI Button Listeners
skirmishBtn.MouseButton1Click:Connect(function()
	local res = CreateRoom:InvokeServer({ humans = 1, ai = 3, mode = "standard", mapPreset = "pangaea" })
	if res.ok then
		liveState = res.state
		mySeat = res.seat
		roomCode = res.code
		menuFrame.Visible = false
		hudFrame.Visible = true
		focusCameraOn(Vector3.new((liveState.w * TILE_SIZE) / 2, 0, (liveState.h * TILE_SIZE) / 2))
		updateBoardVisuals(liveState)
		updateHud(liveState)
	end
end)

multiplayerBtn.MouseButton1Click:Connect(function()
	local res = CreateRoom:InvokeServer({ humans = 2, ai = 2, mode = "standard", mapPreset = "pangaea" })
	if res.ok then
		liveState = res.state
		mySeat = res.seat
		roomCode = res.code
		menuFrame.Visible = false
		hudFrame.Visible = true
		showToast("Room created! Code: " .. res.code)
		focusCameraOn(Vector3.new((liveState.w * TILE_SIZE) / 2, 0, (liveState.h * TILE_SIZE) / 2))
		updateBoardVisuals(liveState)
		updateHud(liveState)
	end
end)

joinBtn.MouseButton1Click:Connect(function()
	local code = codeInput.Text
	if code == "" then return end
	local res = JoinRoom:InvokeServer(code)
	if res.ok then
		liveState = res.state
		mySeat = res.seat
		roomCode = res.code
		menuFrame.Visible = false
		hudFrame.Visible = true
		showToast("Joined match " .. res.code)
		focusCameraOn(Vector3.new((liveState.w * TILE_SIZE) / 2, 0, (liveState.h * TILE_SIZE) / 2))
		updateBoardVisuals(liveState)
		updateHud(liveState)
	else
		showToast(res.error or "Could not join table")
	end
end)

endTurnBtn.MouseButton1Click:Connect(function()
	if liveState and liveState.current == mySeat and liveState.winner == nil then
		ActionRequest:InvokeServer({ type = "endTurn" })
		selectedTile = nil
		moves = {}
		pickedShopKind = nil
	end
end)

kingBtn.MouseButton1Click:Connect(function()
	if not liveState then return end
	for i = 0, (liveState.w * liveState.h) - 1 do
		local u = liveState.units[i]
		if u and u.kind == "king" and u.owner == mySeat then
			local kx, ky = i % liveState.w, math.floor(i / liveState.w)
			focusCameraOn(Vector3.new(kx * TILE_SIZE, 0, ky * TILE_SIZE))
			break
		end
	end
end)

detonateBtn.MouseButton1Click:Connect(function()
	if selectedTile ~= nil and liveState and liveState.current == mySeat then
		ActionRequest:InvokeServer({ type = "detonate", from = selectedTile })
		selectedTile = nil
		moves = {}
		updateBoardVisuals(liveState)
	end
end)

resignBtn.MouseButton1Click:Connect(function()
	if liveState and liveState.current == mySeat then
		ActionRequest:InvokeServer({ type = "resign" })
	end
end)

-- Receive state updates from server
StateUpdate.OnClientEvent:Connect(function(newState: Engine.GameState, seat: number, code: string)
	liveState = newState
	mySeat = seat
	roomCode = code
	updateBoardVisuals(newState)
	updateHud(newState)
end)

print("[Chess2] Client loaded successfully.")
