// ============================================================================
// RETRO GAME BOY SNAKE (DMG-01 EDITION - TRUE GREEN FIXED)
// ============================================================================

// --- GAME STATE ---
enum Mode { Menu, Customise, Playing }
let gameState = Mode.Menu

// --- SYSTEM HARDWARE PALETTE ---
// In standard MakeCode Arcade default palette:
// Color 7 is bright Green (the classic Game Boy background feel)
// Color 15 is Black (the active dark pixels)
const BG_COLOR = 7
const FG_COLOR = 15

// --- GAME ADJUSTABLE PARAMETERS ---
let menuSelection = 0        // Main Menu index (0: Start, 1: Customize)
let customOptionIndex = 0    // Customize Sub-menu item index
let baseSpeedSetting = 1     // 0: Slow (250ms), 1: Norm (175ms), 2: Fast (100ms)
let speedScalingOn = true    // Toggles speed acceleration per point earned
let wallWrapOn = false       // false = Die on walls; true = Wrap around to other side
let soundFXOn = true         // Audio toggle switch

// --- GAME CORE ENGINE VARIABLES ---
let snake: Sprite[] = []
let food: Sprite = null
let currentDX = 1
let currentDY = 0
let nextDX = 1
let nextDY = 0
let currentScore = 0
let coreIntervalTimer = 0

// --- GRAPHIC ARTWORK BUFFERS ---
// 64x16 Hand-Crafted Retro Game Boy Snake Title Logo
// Using color index 'f' (15) for black pixels to clear out contrast
const titleLogoImg = img`
    . . f f f f . . . f . . . . . . . f . . . . . f . f f f f . . . f f f f . . . f f f f . .
    . f f . . f f . . f f . . . . . . f f . . . . f . f f . . f f . . f f . . f f . . f f . . . .
    . f f . . . . . . f f f . . . . . f f . . . . f . f f . . . f f . f f . . f f . . f f . . . .
    . . f f f f . . . f f f f . . . . f f . . . . f . f f . . . f f . f f . . f f . . f f f f . .
    . . . . . f f . . f f . f f . . . f f . . . . f . f f f f f f f . f f f f f . . . f f f f . .
    . f f . . f f . . f f . . f f . . f f . . . . f . f f . . . f f . f f . . f f . . f f . . . .
    . f f f f f . . . f f . . . f f . . f f f f f f . f f . . . f f . f f . . . f f . f f f f f .
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 
    . . . . . . . . . . . . . . . . . . . f f f f f f f f f f f f f . . . . . . . . . . . . . . 
    . . . . . . . . . . . . . . . . . . . . . . . . . f f . . . . . . . . . . . . . . . . . . . 
    . . . . . . . . . . . . . . . . . . . . . . . . . f f . . . . . . . . . . . . . . . . . . . 
    . . . . . . . . . . . . . . . . . . . . . . . . . f f . . . . . . . . . . . . . . . . . . . 
    . . . . . . . . . . . . . . . . . . . . . . . . . f f . . . . . . . . . . . . . . . . . . . 
    . . . . . . . . . . . . . . . . . . . . . . . . . f f . . . . . . . . . . . . . . . . . . . 
    . . . . . . . . . . . . . . . . . . . . . . . . . f f . . . . . . . . . . . . . . . . . . . 
    . . . . . . . . . . . . . . . . . . . . f f f f f f f f f f f f . . . . . . . . . . . . . . 
`

// Initializer Boot Call Configuration
scene.setBackgroundColor(BG_COLOR)
switchToMenu()

// ============================================================================
// SYSTEM ENGINE SCENE CONFIGURATORS
// ============================================================================

function switchToMenu() {
    gameState = Mode.Menu
    menuSelection = 0
    clearAllSprites()
}

function switchToCustomise() {
    gameState = Mode.Customise
    customOptionIndex = 0
}

function initNewGameLoop() {
    gameState = Mode.Playing
    clearAllSprites()

    currentScore = 0
    info.setScore(0)

    // Default heading orientation: Rightward
    nextDX = 1
    nextDY = 0
    currentDX = 1
    currentDY = 0
    coreIntervalTimer = game.runtime()

    // Build standard 3-block Snake chain links using 'f' (Color 15)
    for (let i = 0; i < 3; i++) {
        let segment = sprites.create(img`
            f f f f f f f f
            f f f f f f f f
            f f f f f f f f
            f f f f f f f f
            f f f f f f f f
            f f f f f f f f
            f f f f f f f f
            f f f f f f f f
        `, SpriteKind.Player)
        // Position coordinates mapped safely away from outer bezel parameters
        segment.setPosition(84 - (i * 8), 60)
        snake.push(segment)
    }

    spawnTargetFood()
    if (soundFXOn) music.play(music.melodyPlayable(music.powerUp), music.PlaybackMode.UntilDone)
}

function clearAllSprites() {
    for (let s of sprites.allOfKind(SpriteKind.Player)) s.destroy()
    if (food) { food.destroy(); food = null; }
    snake = []
}

function spawnTargetFood() {
    if (food) food.destroy()
    food = sprites.create(img`
        . . f f f f . .
        . f f . . f f .
        f f . f f . f f
        f f . f f . f f
        f f . f f . f f
        f f . f f . f f
        . f f . . f f .
        . . f f f f . .
    `, SpriteKind.Food)

    // Bounds restricted to stay cleanly inside our drawing window
    let gridX = Math.randomRange(2, 17) // 16 to 136 horizontal
    let gridY = Math.randomRange(2, 12) // 16 to 96 vertical
    food.setPosition(gridX * 8 + 4, gridY * 8 + 4)
}

function triggerGameOver() {
    // Correctly saves the current score if it's a new high score
    info.saveHighScore()

    if (soundFXOn) music.play(music.melodyPlayable(music.wawawawaa), music.PlaybackMode.UntilDone)
    switchToMenu()
}



// ============================================================================
// HARDWARE CONTROLLER INPUT CAPTURE LAYERS
// ============================================================================

controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    if (gameState === Mode.Menu) {
        menuSelection = (menuSelection - 1 + 2) % 2
    } else if (gameState === Mode.Customise) {
        customOptionIndex = (customOptionIndex - 1 + 5) % 5
    } else if (gameState === Mode.Playing && currentDY === 0) {
        nextDX = 0
        nextDY = -1
    }
})

controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    if (gameState === Mode.Menu) {
        menuSelection = (menuSelection + 1) % 2
    } else if (gameState === Mode.Customise) {
        customOptionIndex = (customOptionIndex + 1) % 5
    } else if (gameState === Mode.Playing && currentDY === 0) {
        nextDX = 0
        nextDY = 1
    }
})

controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    if (gameState === Mode.Customise) {
        adjustCustomOption(-1)
    } else if (gameState === Mode.Playing && currentDX === 0) {
        nextDX = -1
        nextDY = 0
    }
})

controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    if (gameState === Mode.Customise) {
        adjustCustomOption(1)
    } else if (gameState === Mode.Playing && currentDX === 0) {
        nextDX = 1
        nextDY = 0
    }
})

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (gameState === Mode.Menu) {
        if (menuSelection === 0) initNewGameLoop()
        else switchToCustomise()
    } else if (gameState === Mode.Customise) {
        if (customOptionIndex === 4) switchToMenu() // Back tracking path option select
    }
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    if (gameState === Mode.Customise) switchToMenu()
})

function adjustCustomOption(dir: number) {
    if (customOptionIndex === 0) {
        baseSpeedSetting = (baseSpeedSetting + dir + 3) % 3
    } else if (customOptionIndex === 1) {
        speedScalingOn = !speedScalingOn
    } else if (customOptionIndex === 2) {
        wallWrapOn = !wallWrapOn
    } else if (customOptionIndex === 3) {
        soundFXOn = !soundFXOn
    }
}

// ============================================================================
// SYSTEM RENDERING ENGINE LAYERS (ON-PAINT SCREEN PIPELINE)
// ============================================================================

game.onPaint(function () {
    // Force constant Game Boy structural hardware framing layer draw
    screen.fill(BG_COLOR)

    if (gameState === Mode.Menu) {
        // Render Title Screen
        screen.print("SNAKE II", 55, 20, FG_COLOR)
        screen.print("HI-SCORE: " + info.highScore(), 46, 38, FG_COLOR)

        // Menu Selections with classic Game Boy cursor (>)
        let yPos1 = 65, yPos2 = 80
        screen.print((menuSelection === 0 ? "> " : "  ") + "START GAME", 45, yPos1, FG_COLOR)
        screen.print((menuSelection === 1 ? "> " : "  ") + "CUSTOMISE", 45, yPos2, FG_COLOR)

        screen.print("Press (A) to Select", 25, 108, FG_COLOR)

    } else if (gameState === Mode.Customise) {
        // Render Customise Menu Frame Layout
        screen.print("--- CUSTOM SETTINGS ---", 12, 10, FG_COLOR)

        let labels = ["SPEED:", "SCALING:", "WALLS:", "SOUND:", "[ BACK TO MENU ]"]
        let yStart = 30

        for (let i = 0; i < 5; i++) {
            let activeMarker = (customOptionIndex === i) ? "> " : "  "
            screen.print(activeMarker + labels[i], 12, yStart + (i * 14), FG_COLOR)

            // Dynamic Option Values Processing Right-Aligned
            if (i === 0) {
                let speedNames = ["SLOW", "NORMAL", "FAST"]
                screen.print(speedNames[baseSpeedSetting], 110, yStart, FG_COLOR)
            } else if (i === 1) {
                screen.print(speedScalingOn ? "ON" : "OFF", 110, yStart + 14, FG_COLOR)
            } else if (i === 2) {
                screen.print(wallWrapOn ? "WRAP" : "SOLID", 110, yStart + 28, FG_COLOR)
            } else if (i === 3) {
                screen.print(soundFXOn ? "ON" : "OFF", 110, yStart + 42, FG_COLOR)
            }
        }
    } else if (gameState === Mode.Playing) {
        // Draw Outer Frame Overlay Board Matrix Border Window Limits
        screen.drawRect(8, 8, 144, 104, FG_COLOR)
    }
})

// ============================================================================
// LOGIC TICK PROCESS ENGINE
// ============================================================================

game.onUpdate(function () {
    if (gameState !== Mode.Playing) return

    // Calculate frame delay dynamically based on selected settings
    let rawInterval = 175
    if (baseSpeedSetting === 0) rawInterval = 250
    else if (baseSpeedSetting === 2) rawInterval = 100

    if (speedScalingOn) {
        // Accelerates frame response matching performance indices
        rawInterval = Math.max(45, rawInterval - (currentScore * 8))
    }

    let timeDelta = game.runtime()
    if (timeDelta - coreIntervalTimer < rawInterval) return
    coreIntervalTimer = timeDelta

    // Save actual heading frame tracking data locks
    currentDX = nextDX
    currentDY = nextDY

    let head = snake[0]
    let targetX = head.x + (currentDX * 8)
    let targetY = head.y + (currentDY * 8)

    // Window borders containment bounding tracking arrays
    if (targetX < 12 || targetX > 148 || targetY < 12 || targetY > 108) {
        if (wallWrapOn) {
            if (targetX < 12) targetX = 148
            else if (targetX > 148) targetX = 12
            if (targetY < 12) targetY = 108
            else if (targetY > 108) targetY = 12
        } else {
            triggerGameOver()
            return
        }
    }

    // Check Self-Collision
    for (let j = 1; j < snake.length; j++) {
        if (snake[j].x === targetX && snake[j].y === targetY) {
            triggerGameOver()
            return
        }
    }

    // Check Food Collection
    if (Math.abs(targetX - food.x) < 4 && Math.abs(targetY - food.y) < 4) {
        currentScore += 1
        info.setScore(currentScore)
        if (soundFXOn) music.play(music.melodyPlayable(music.baDing), music.PlaybackMode.InBackground)
        spawnTargetFood()
    } else {
        // Slide standard frame displacement array sequence transforms
        let tailSegment = snake.pop()
        tailSegment.setPosition(targetX, targetY)
        snake.unshift(tailSegment)
        return
    }

    // Growth allocation handling step logic transforms
    let growthHead = sprites.create(img`
        f f f f f f f f
        f f f f f f f f
        f f f f f f f f
        f f f f f f f f
        f f f f f f f f
        f f f f f f f f
        f f f f f f f f
        f f f f f f f f
    `, SpriteKind.Player)
    growthHead.setPosition(targetX, targetY)
    snake.unshift(growthHead)
})

// Initialize menu on boot
switchToMenu()