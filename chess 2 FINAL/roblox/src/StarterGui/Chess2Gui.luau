--!strict
-- Complete OG Game UI builder for Chess 2 in Roblox
-- Built with native Roblox UI objects, UICorner, UIStroke, and custom paper color schemes.
-- STRICTLY ZERO EMOJIS!

local Types = require(game:GetService("ReplicatedStorage"):WaitForChild("Chess2"):WaitForChild("Types") :: ModuleScript)

local Chess2Gui = {}

local INK = Types.INK
local PANEL_BG = Color3.fromRGB(253, 243, 220)
local CARD_BG = Color3.fromRGB(255, 250, 240)
local ACCENT_GREEN = Color3.fromRGB(142, 229, 154)
local ACCENT_YELLOW = Color3.fromRGB(255, 224, 102)
local ACCENT_RED = Color3.fromRGB(255, 214, 208)

local function applyPaperBorder(inst: GuiObject, cornerRadius: number?)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, cornerRadius or 12)
	corner.Parent = inst

	local stroke = Instance.new("UIStroke")
	stroke.Color = INK
	stroke.Thickness = 3
	stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	stroke.Parent = inst
end

function Chess2Gui.build(playerGui: PlayerGui)
	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "Chess2Gui"
	screenGui.ResetOnSpawn = false
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	-- Root Container
	local root = Instance.new("Frame")
	root.Name = "Root"
	root.Size = UDim2.new(1, 0, 1, 0)
	root.BackgroundTransparency = 1
	root.Parent = screenGui

	---------------------------------------------------------
	-- MENU VIEW
	---------------------------------------------------------
	local menuFrame = Instance.new("Frame")
	menuFrame.Name = "MenuFrame"
	menuFrame.Size = UDim2.new(1, 0, 1, 0)
	menuFrame.BackgroundColor3 = Color3.fromRGB(43, 85, 120)
	menuFrame.Parent = root

	local menuCard = Instance.new("Frame")
	menuCard.Name = "MenuCard"
	menuCard.Size = UDim2.new(0, 560, 0, 480)
	menuCard.Position = UDim2.new(0.5, -280, 0.5, -240)
	menuCard.BackgroundColor3 = PANEL_BG
	applyPaperBorder(menuCard, 16)
	menuCard.Parent = menuFrame

	local titleLabel = Instance.new("TextLabel")
	titleLabel.Size = UDim2.new(1, 0, 0, 60)
	titleLabel.Position = UDim2.new(0, 0, 0, 18)
	titleLabel.BackgroundTransparency = 1
	titleLabel.Font = Enum.Font.Comic
	titleLabel.Text = "CHESS 2"
	titleLabel.TextColor3 = INK
	titleLabel.TextSize = 48
	titleLabel.Parent = menuCard

	local subtitleLabel = Instance.new("TextLabel")
	subtitleLabel.Size = UDim2.new(1, -40, 0, 48)
	subtitleLabel.Position = UDim2.new(0, 20, 0, 78)
	subtitleLabel.BackgroundTransparency = 1
	subtitleLabel.Font = Enum.Font.SourceSansBold
	subtitleLabel.Text = "Turn-based 4X grand strategy crossed with chess pieces. Build farms, capture territory, command armies, and conquer continents."
	subtitleLabel.TextColor3 = INK
	subtitleLabel.TextSize = 15
	subtitleLabel.TextWrapped = true
	subtitleLabel.Parent = menuCard

	local skirmishBtn = Instance.new("TextButton")
	skirmishBtn.Name = "SkirmishBtn"
	skirmishBtn.Size = UDim2.new(1, -60, 0, 52)
	skirmishBtn.Position = UDim2.new(0, 30, 0, 150)
	skirmishBtn.BackgroundColor3 = ACCENT_GREEN
	skirmishBtn.Font = Enum.Font.Comic
	skirmishBtn.Text = "Quick Skirmish"
	skirmishBtn.TextColor3 = INK
	skirmishBtn.TextSize = 22
	applyPaperBorder(skirmishBtn, 12)
	skirmishBtn.Parent = menuCard

	local multiplayerBtn = Instance.new("TextButton")
	multiplayerBtn.Name = "MultiplayerBtn"
	multiplayerBtn.Size = UDim2.new(1, -60, 0, 52)
	multiplayerBtn.Position = UDim2.new(0, 30, 0, 218)
	multiplayerBtn.BackgroundColor3 = ACCENT_YELLOW
	multiplayerBtn.Font = Enum.Font.Comic
	multiplayerBtn.Text = "Host Online Match"
	multiplayerBtn.TextColor3 = INK
	multiplayerBtn.TextSize = 22
	applyPaperBorder(multiplayerBtn, 12)
	multiplayerBtn.Parent = menuCard

	-- Join by Code Box
	local joinFrame = Instance.new("Frame")
	joinFrame.Size = UDim2.new(1, -60, 0, 52)
	joinFrame.Position = UDim2.new(0, 30, 0, 286)
	joinFrame.BackgroundTransparency = 1
	joinFrame.Parent = menuCard

	local codeInput = Instance.new("TextBox")
	codeInput.Name = "CodeInput"
	codeInput.Size = UDim2.new(0, 160, 1, 0)
	codeInput.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
	codeInput.Font = Enum.Font.SourceSansBold
	codeInput.PlaceholderText = "ROOM CODE"
	codeInput.Text = ""
	codeInput.TextColor3 = INK
	codeInput.TextSize = 18
	applyPaperBorder(codeInput, 10)
	codeInput.Parent = joinFrame

	local joinBtn = Instance.new("TextButton")
	joinBtn.Name = "JoinBtn"
	joinBtn.Size = UDim2.new(1, -175, 1, 0)
	joinBtn.Position = UDim2.new(0, 175, 0, 0)
	joinBtn.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
	joinBtn.Font = Enum.Font.Comic
	joinBtn.Text = "Join Table by Code"
	joinBtn.TextColor3 = INK
	joinBtn.TextSize = 18
	applyPaperBorder(joinBtn, 10)
	joinBtn.Parent = joinFrame

	local footerLabel = Instance.new("TextLabel")
	footerLabel.Size = UDim2.new(1, -40, 0, 40)
	footerLabel.Position = UDim2.new(0, 20, 0, 360)
	footerLabel.BackgroundTransparency = 1
	footerLabel.Font = Enum.Font.SourceSansBold
	footerLabel.Text = "Controls: Left-click unit to move or deploy. Right-drag to draw tactical arrows. Spacebar ends your turn."
	footerLabel.TextColor3 = INK
	footerLabel.TextSize = 13
	footerLabel.TextWrapped = true
	footerLabel.Parent = menuCard

	---------------------------------------------------------
	-- HUD (IN-GAME SCREEN)
	---------------------------------------------------------
	local hudFrame = Instance.new("Frame")
	hudFrame.Name = "HudFrame"
	hudFrame.Size = UDim2.new(1, 0, 1, 0)
	hudFrame.BackgroundTransparency = 1
	hudFrame.Visible = false
	hudFrame.Parent = root

	-- Top Left: Player List
	local playerListFrame = Instance.new("Frame")
	playerListFrame.Name = "PlayerListFrame"
	playerListFrame.Size = UDim2.new(0, 230, 0, 190)
	playerListFrame.Position = UDim2.new(0, 12, 0, 12)
	playerListFrame.BackgroundColor3 = PANEL_BG
	applyPaperBorder(playerListFrame, 12)
	playerListFrame.Parent = hudFrame

	local playerListLayout = Instance.new("UIListLayout")
	playerListLayout.SortOrder = Enum.SortOrder.LayoutOrder
	playerListLayout.Padding = UDim.new(0, 4)
	playerListLayout.Parent = playerListFrame

	local playerListPadding = Instance.new("UIPadding")
	playerListPadding.PaddingTop = UDim.new(0, 8)
	playerListPadding.PaddingLeft = UDim.new(0, 8)
	playerListPadding.PaddingRight = UDim.new(0, 8)
	playerListPadding.PaddingBottom = UDim.new(0, 8)
	playerListPadding.Parent = playerListFrame

	-- Top Left: Kingdom Stats Card
	local statsCard = Instance.new("Frame")
	statsCard.Name = "StatsCard"
	statsCard.Size = UDim2.new(0, 230, 0, 78)
	statsCard.Position = UDim2.new(0, 12, 0, 210)
	statsCard.BackgroundColor3 = CARD_BG
	applyPaperBorder(statsCard, 10)
	statsCard.Parent = hudFrame

	local roundLabel = Instance.new("TextLabel")
	roundLabel.Name = "RoundLabel"
	roundLabel.Size = UDim2.new(1, -16, 0, 22)
	roundLabel.Position = UDim2.new(0, 8, 0, 4)
	roundLabel.BackgroundTransparency = 1
	roundLabel.Font = Enum.Font.Comic
	roundLabel.Text = "Round 1 - STANDARD"
	roundLabel.TextColor3 = INK
	roundLabel.TextSize = 14
	roundLabel.TextXAlignment = Enum.TextXAlignment.Left
	roundLabel.Parent = statsCard

	local statsRow = Instance.new("TextLabel")
	statsRow.Name = "StatsRow"
	statsRow.Size = UDim2.new(1, -16, 0, 20)
	statsRow.Position = UDim2.new(0, 8, 0, 26)
	statsRow.BackgroundTransparency = 1
	statsRow.Font = Enum.Font.SourceSansBold
	statsRow.Text = "Land 12 | Farms 1 | Troops 2"
	statsRow.TextColor3 = INK
	statsRow.TextSize = 12
	statsRow.TextXAlignment = Enum.TextXAlignment.Left
	statsRow.Parent = statsCard

	local incomeRow = Instance.new("TextLabel")
	incomeRow.Name = "IncomeRow"
	incomeRow.Size = UDim2.new(1, -16, 0, 20)
	incomeRow.Position = UDim2.new(0, 8, 0, 48)
	incomeRow.BackgroundTransparency = 1
	incomeRow.Font = Enum.Font.SourceSansBold
	incomeRow.Text = "income +$9 | upkeep -$1"
	incomeRow.TextColor3 = Color3.fromRGB(90, 70, 50)
	incomeRow.TextSize = 11
	incomeRow.TextXAlignment = Enum.TextXAlignment.Left
	incomeRow.Parent = statsCard

	-- Top Right: Actions & Turn Button
	local topActions = Instance.new("Frame")
	topActions.Name = "TopActions"
	topActions.Size = UDim2.new(0, 200, 0, 180)
	topActions.Position = UDim2.new(1, -212, 0, 12)
	topActions.BackgroundTransparency = 1
	topActions.Parent = hudFrame

	local endTurnBtn = Instance.new("TextButton")
	endTurnBtn.Name = "EndTurnBtn"
	endTurnBtn.Size = UDim2.new(1, 0, 0, 50)
	endTurnBtn.BackgroundColor3 = ACCENT_GREEN
	endTurnBtn.Font = Enum.Font.Comic
	endTurnBtn.Text = "END TURN"
	endTurnBtn.TextColor3 = INK
	endTurnBtn.TextSize = 22
	applyPaperBorder(endTurnBtn, 12)
	endTurnBtn.Parent = topActions

	local subRow = Instance.new("Frame")
	subRow.Size = UDim2.new(1, 0, 0, 36)
	subRow.Position = UDim2.new(0, 0, 0, 58)
	subRow.BackgroundTransparency = 1
	subRow.Parent = topActions

	local kingBtn = Instance.new("TextButton")
	kingBtn.Name = "KingBtn"
	kingBtn.Size = UDim2.new(0.48, 0, 1, 0)
	kingBtn.BackgroundColor3 = CARD_BG
	kingBtn.Font = Enum.Font.Comic
	kingBtn.Text = "My King"
	kingBtn.TextColor3 = INK
	kingBtn.TextSize = 14
	applyPaperBorder(kingBtn, 8)
	kingBtn.Parent = subRow

	local resignBtn = Instance.new("TextButton")
	resignBtn.Name = "ResignBtn"
	resignBtn.Size = UDim2.new(0.48, 0, 1, 0)
	resignBtn.Position = UDim2.new(0.52, 0, 0, 0)
	resignBtn.BackgroundColor3 = ACCENT_RED
	resignBtn.Font = Enum.Font.Comic
	resignBtn.Text = "Resign"
	resignBtn.TextColor3 = INK
	resignBtn.TextSize = 14
	applyPaperBorder(resignBtn, 8)
	resignBtn.Parent = subRow

	-- Detonate Nuke Button
	local detonateBtn = Instance.new("TextButton")
	detonateBtn.Name = "DetonateBtn"
	detonateBtn.Size = UDim2.new(1, 0, 0, 38)
	detonateBtn.Position = UDim2.new(0, 0, 0, 102)
	detonateBtn.BackgroundColor3 = Color3.fromRGB(255, 154, 107)
	detonateBtn.Font = Enum.Font.Comic
	detonateBtn.Text = "Detonate 5x5!"
	detonateBtn.TextColor3 = INK
	detonateBtn.TextSize = 16
	detonateBtn.Visible = false
	applyPaperBorder(detonateBtn, 8)
	detonateBtn.Parent = topActions

	-- Bottom: Shop Bar
	local shopFrame = Instance.new("Frame")
	shopFrame.Name = "ShopFrame"
	shopFrame.Size = UDim2.new(1, -40, 0, 78)
	shopFrame.Position = UDim2.new(0, 20, 1, -90)
	shopFrame.BackgroundColor3 = PANEL_BG
	applyPaperBorder(shopFrame, 14)
	shopFrame.Parent = hudFrame

	local shopScroll = Instance.new("ScrollingFrame")
	shopScroll.Name = "ShopScroll"
	shopScroll.Size = UDim2.new(1, -16, 1, -12)
	shopScroll.Position = UDim2.new(0, 8, 0, 6)
	shopScroll.BackgroundTransparency = 1
	shopScroll.ScrollBarThickness = 4
	shopScroll.CanvasSize = UDim2.new(0, 1000, 0, 0)
	shopScroll.Parent = shopFrame

	local shopLayout = Instance.new("UIListLayout")
	shopLayout.FillDirection = Enum.FillDirection.Horizontal
	shopLayout.SortOrder = Enum.SortOrder.LayoutOrder
	shopLayout.Padding = UDim.new(0, 6)
	shopLayout.Parent = shopScroll

	-- Chronicle (Right Bottom)
	local chronicleCard = Instance.new("Frame")
	chronicleCard.Name = "ChronicleCard"
	chronicleCard.Size = UDim2.new(0, 230, 0, 140)
	chronicleCard.Position = UDim2.new(1, -242, 1, -240)
	chronicleCard.BackgroundColor3 = CARD_BG
	applyPaperBorder(chronicleCard, 10)
	chronicleCard.Parent = hudFrame

	local chronicleTitle = Instance.new("TextLabel")
	chronicleTitle.Size = UDim2.new(1, -16, 0, 20)
	chronicleTitle.Position = UDim2.new(0, 8, 0, 4)
	chronicleTitle.BackgroundTransparency = 1
	chronicleTitle.Font = Enum.Font.Comic
	chronicleTitle.Text = "CHRONICLE"
	chronicleTitle.TextColor3 = INK
	chronicleTitle.TextSize = 12
	chronicleTitle.TextXAlignment = Enum.TextXAlignment.Left
	chronicleTitle.Parent = chronicleCard

	local chronicleText = Instance.new("TextLabel")
	chronicleText.Name = "ChronicleText"
	chronicleText.Size = UDim2.new(1, -16, 1, -28)
	chronicleText.Position = UDim2.new(0, 8, 0, 24)
	chronicleText.BackgroundTransparency = 1
	chronicleText.Font = Enum.Font.SourceSansBold
	chronicleText.Text = "Match beginning..."
	chronicleText.TextColor3 = INK
	chronicleText.TextSize = 11
	chronicleText.TextWrapped = true
	chronicleText.TextYAlignment = Enum.TextYAlignment.Top
	chronicleText.TextXAlignment = Enum.TextXAlignment.Left
	chronicleText.Parent = chronicleCard

	-- Banner Notification
	local toastLabel = Instance.new("TextLabel")
	toastLabel.Name = "ToastLabel"
	toastLabel.Size = UDim2.new(0, 280, 0, 36)
	toastLabel.Position = UDim2.new(0.5, -140, 1, -135)
	toastLabel.BackgroundColor3 = ACCENT_RED
	toastLabel.Font = Enum.Font.Comic
	toastLabel.Text = ""
	toastLabel.TextColor3 = INK
	toastLabel.TextSize = 14
	toastLabel.Visible = false
	applyPaperBorder(toastLabel, 8)
	toastLabel.Parent = hudFrame

	screenGui.Parent = playerGui
	return screenGui
end

return Chess2Gui
