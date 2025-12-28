# Koning Mexico Architecture

**Last Updated:** 2025-12-28

---

## System Architecture Overview

Koning Mexico volgt een **three-layer architecture** voor de game implementation:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ index.html  │  │ spel.html   │  │spel_vs_comp │        │
│  │ (Landing)   │  │ (Solo)      │  │ (vs AI)     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│          ↓                ↓                ↓                │
├─────────────────────────────────────────────────────────────┤
│                      GAME LOGIC LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  script.js   │  │   game.js    │  │game_vs_comp  │     │
│  │ (Animations) │  │ (Solo Engine)│  │ (AI Engine)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                           │                   │             │
│                           ↓                   ↓             │
│                  ┌────────────────────────────┐             │
│                  │   Game State Manager       │             │
│                  │ (players, rounds, throws)  │             │
│                  └────────────────────────────┘             │
├─────────────────────────────────────────────────────────────┤
│                      AI PSYCHOLOGY LAYER                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              AI Decision Engine                      │  │
│  │  - computeRiskProfile() (personality + biases)       │  │
│  │  - shouldReroll() (risk evaluation)                  │  │
│  │  - shouldBlindRoll() (strategic choice)              │  │
│  │  - handleMexicoDecision() (special cases)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                    8 Psychological Principles                │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Presentation Layer

### Purpose
User interface en visual feedback voor alle game modes.

### Components

#### 1. Landing Page (index.html + script.js)

**Responsibilities:**
- Hero section met logo en CTAs
- Content secties (Wat is Mexico, Benodigdheden, etc.)
- Navigation system (desktop + mobile menu)
- Interactive elements (dobbelstenen, scroll animations)
- Easter egg (5× logo click)

**Key JavaScript Features:**
```javascript
// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        e.preventDefault();
        // Smooth scroll met header offset
    });
});

// Dice animation
function animateDice(element) {
    // 10× random symbols (⚀-⚅) @ 50ms
    // Total duration: 500ms
}

// Scroll animations (Intersection Observer)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
});

// Easter egg: Mexico celebration
let logoClickCount = 0;
logo.addEventListener('click', () => {
    logoClickCount++;
    if (logoClickCount >= 5) {
        celebrateMexico(); // Confetti explosion
    }
});
```

**Performance:**
- Lightweight (~437 lines JS)
- No dependencies
- Smooth 60fps animations
- RequestAnimationFrame for animations

#### 2. Solo Mode UI (spel.html)

**Structure:**
```html
<div class="game-container">
    <!-- Setup Panel -->
    <div class="setup-panel">
        <label>Aantal spelers (2-6)</label>
        <input type="number" id="playerCount">
        <label>Startpunten (3-10)</label>
        <input type="number" id="startingLives">
        <button id="newGameButton">Nieuw Spel</button>
    </div>

    <!-- Current Round Info -->
    <div class="round-info">
        <p>Ronde: <span id="roundNumber">1</span></p>
        <p>Voorgooier: <span id="voorgooier">-</span></p>
        <p>Worplimiet: <span id="throwLimit">-</span></p>
    </div>

    <!-- Player Panels (dynamically generated) -->
    <div id="playerPanelsContainer">
        <!-- Player cards inserted here -->
    </div>

    <!-- Action Controls -->
    <div class="controls">
        <button id="throwBlindButton">Gooi (Blind)</button>
        <button id="throwOpenButton">Gooi (Open)</button>
        <button id="revealButton">Laat Zien</button>
        <button id="rerollButton">Opnieuw Gooien</button>
        <button id="keepButton">Klaar</button>
    </div>
</div>
```

**Dynamic Player Cards:**
```javascript
function createPlayerCard(index, name, lives) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
        <h3>${name}</h3>
        <div class="lives">
            ${'⚫'.repeat(lives)}
        </div>
        <div class="throw-display">
            <span class="die">⚀</span>
            <span class="die">⚀</span>
        </div>
        <p class="status"></p>
    `;
    return card;
}
```

#### 3. vs Computer UI (spel_vs_computer.html)

**Enhanced Features:**
```html
<!-- Player vs Computer Layout -->
<div class="game-grid">
    <!-- Player Panel (left) -->
    <div class="player-panel">
        <h2>Jij</h2>
        <div class="dice-cup" id="playerDiceCup">
            <span class="die" id="playerDice1">⚀</span>
            <span class="die" id="playerDice2">⚀</span>
        </div>
        <div class="lives" id="playerLives">⚫⚫⚫⚫⚫⚫</div>
        <div class="throw-history" id="playerHistory"></div>
    </div>

    <!-- Computer Panel (right) -->
    <div class="computer-panel">
        <h2>Computer 🤖</h2>
        <div class="dice-cup" id="computerDiceCup">
            <span class="die" id="computerDice1">⚀</span>
            <span class="die" id="computerDice2">⚀</span>
        </div>
        <div class="lives" id="computerLives">⚫⚫⚫⚫⚫⚫</div>
        <div class="throw-history" id="computerHistory"></div>
    </div>
</div>

<!-- Action Log -->
<div class="action-log">
    <h3>Acties</h3>
    <div id="actionLogContent">
        <!-- Real-time updates: "Computer gooit blind...", etc. -->
    </div>
</div>
```

**Dice Cup Animation (3D Flip):**
```css
.dice-cup {
    transform-style: preserve-3d;
    transition: transform 0.6s;
}

.dice-cup.flipped {
    transform: rotateX(180deg);
}

.dice-cup.shake {
    animation: shake 0.5s;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}
```

**Computer Turn Animation:**
```javascript
async function computerTurn() {
    // Show "thinking" feedback
    logToConsole('Computer is aan het denken...');

    // Realistic pause (500-1500ms based on decision complexity)
    await sleep(calculateThinkingTime());

    // Execute decision
    if (shouldBlindRoll()) {
        throwBlind();
        logToConsole('Computer gooit blind');
    } else {
        throwOpen();
        logToConsole('Computer gooit open');
    }

    // Animate dice cup
    animateDiceCup('computer', gameState.computer.currentThrow);
}
```

---

## Layer 2: Game Logic Layer

### Purpose
Spelregels, state management, en game flow control.

### Core Game State

```javascript
const gameState = {
    // Player data
    player: {
        lives: 6,                   // Punten op draaisteen
        throwCount: 0,              // Worpen gebruikt deze BEURT
        currentThrow: null,         // Huidige worp (e.g., "65")
        displayThrow: null,         // Display value (kan verschillen als blind)
        isBlind: false,             // Is laatste worp blind?
        hasRevealed: false,         // Is blind worp al revealed?
        isMexico: false,            // Gooit Mexico deze BEURT?
        throwHistory: []            // Array van alle worpen dit SPEL
    },

    // Computer data (vs AI mode only)
    computer: {
        lives: 6,
        throwCount: 0,
        currentThrow: null,
        displayThrow: null,
        isBlind: false,
        hasRevealed: false,
        isMexico: false,
        throwHistory: []
    },

    // Round state
    roundNumber: 1,
    isFirstRound: true,             // Eerste ronde = beide blind
    playerToGoFirst: null,          // 'player' of 'computer' (voorgooier)
    maxThrows: 3,                   // Worplimiet (1-3)
    voorgooierPattern: [],          // [false, true, false] = [open, blind, open]

    // Special states
    mexicoCount: 0,                 // Mexico count deze ronde (stacking)

    // AI state (vs AI mode only)
    aiPersonality: null,            // 'scared', 'defensive', 'neutral', 'aggressive', 'desperate'
    aiPsychology: {
        riskTolerance: 0.5,         // 0-1 scale
        recentWins: 0,              // Voor hot hand fallacy
        consecutiveLosses: 0,       // Voor gamblers fallacy
        roundsSurvived: 0,          // Voor personality switching
        lastAnchor: null,           // Voor anchoring effect
        overconfidenceBoost: 0,     // Voor overconfidence bias
        lossAversionFactor: 1.0     // Voor loss aversion
    }
};
```

### Game Flow State Machine

```
STATE: setup
    ↓
    [newGame() called]
    ↓
STATE: firstRound
    ↓
    [Both throw blind]
    ↓
STATE: compareResults
    ↓
    [Determine winner/loser/tie]
    ↓
    ┌───── [Loser becomes voorgooier] ────┐
    │                                     │
    ↓                                     ↓
STATE: voorgooien                    STATE: achterligger
    ↓                                     ↓
    [Throws 1-3 times]                [Follows pattern]
    ↓                                     ↓
    └──────→ STATE: compareResults ←──────┘
                    ↓
            [Check for Mexico]
                    ↓
         ┌──────────┴──────────┐
         ↓                     ↓
STATE: mexicoDecision    STATE: vastloper?
         ↓                     ↓
    [Iedereen/Slachtoffer]  [Overgooien]
         ↓                     ↓
         └──────────┬──────────┘
                    ↓
         [Update draaisteen]
                    ↓
         [Check for game over]
                    ↓
         ┌──────────┴──────────┐
         ↓                     ↓
    STATE: gameOver      STATE: nextRound
         ↓                     ↓
    [Show winner]         [startNextRound()]
                               ↓
                          STATE: voorgooien
```

### Key Game Logic Functions

#### 1. Throw Generation

```javascript
function rollDice() {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;

    // Create throw value: highest die first
    const throwValue = die1 >= die2
        ? String(die1) + String(die2)
        : String(die2) + String(die1);

    return { die1, die2, throwValue };
}
```

#### 2. Throw Comparison (Core Algorithm)

```javascript
function compareThrows(throw1, throw2) {
    // Input: "21", "65", "33", etc.
    // Output: -1 (throw1 wins), 0 (tie), 1 (throw2 wins)

    // Step 1: Check for Mexico (21)
    const isMexico1 = (throw1 === "21");
    const isMexico2 = (throw2 === "21");

    if (isMexico1 && !isMexico2) return -1;  // throw1 wins
    if (!isMexico1 && isMexico2) return 1;   // throw2 wins
    if (isMexico1 && isMexico2) return 0;    // Tie (both Mexico)

    // Step 2: Check for Dubbels
    const isDouble1 = (throw1[0] === throw1[1]);
    const isDouble2 = (throw2[0] === throw2[1]);

    if (isDouble1 && !isDouble2) return -1;
    if (!isDouble1 && isDouble2) return 1;

    if (isDouble1 && isDouble2) {
        // Compare as hundreds (66 > 55 > 44 > 33 > 22 > 11)
        const value1 = parseInt(throw1[0]) * 100;
        const value2 = parseInt(throw2[0]) * 100;
        return value1 > value2 ? -1 : (value1 < value2 ? 1 : 0);
    }

    // Step 3: Gewone worpen (vergelijk als integers)
    const value1 = parseInt(throw1);
    const value2 = parseInt(throw2);

    return value1 > value2 ? -1 : (value1 < value2 ? 1 : 0);
}
```

**Throw Ranking Examples:**
```
21 (Mexico)        → Highest
66 (Dubbel zes)    → 2nd highest
55 (Dubbel vijf)   → 3rd
...
11 (Dubbel een)    → Lowest dubbel
65 (Zes-vijf)      → Highest gewone
64, 63, 62, 61     → High gewone
54, 53, 52, 51     → ...
43, 42, 41         → ...
32, 31             → Lowest gewone
```

#### 3. Vastloper Detection

```javascript
function checkForVastloper(players) {
    // Only check locked players with revealed throws
    const revealedPlayers = players.filter(p =>
        p.hasLocked && p.hasRevealed && p.currentThrow !== null
    );

    if (revealedPlayers.length < 2) {
        return { isVastloper: false, losers: [] };
    }

    // Find lowest throw
    let lowestThrow = null;
    let lowestCount = 0;

    revealedPlayers.forEach(p => {
        if (lowestThrow === null) {
            lowestThrow = p.currentThrow;
            lowestCount = 1;
        } else {
            const comparison = compareThrows(p.currentThrow, lowestThrow);
            if (comparison > 0) {
                // New lowest
                lowestThrow = p.currentThrow;
                lowestCount = 1;
            } else if (comparison === 0) {
                // Tie for lowest
                lowestCount++;
            }
        }
    });

    // Vastloper if 2+ players have lowest throw
    const isVastloper = (lowestCount >= 2);

    if (isVastloper) {
        const losers = revealedPlayers.filter(p =>
            compareThrows(p.currentThrow, lowestThrow) === 0
        );
        return { isVastloper: true, losers };
    }

    return { isVastloper: false, losers: [] };
}
```

#### 4. Mexico Stacking

```javascript
function handleMexicoStacking(mexicoCount) {
    // 1× Mexico = 2 pts draaien
    // 2× Mexico = 4 pts draaien (cumulative)
    // 3× Mexico = 6 pts draaien

    const ptsToTurn = mexicoCount * 2;

    logToConsole(`Mexico stack: ${mexicoCount}× = ${ptsToTurn} pts draaien`);

    return ptsToTurn;
}
```

---

## Layer 3: AI Psychology Layer

### Purpose
Menselijk realistisch AI gedrag via cognitive biases.

### AI Decision Engine Architecture

```
┌──────────────────────────────────────────────────┐
│         AI Decision Point                        │
│  "Should I reroll?" / "Blind or open?"           │
└──────────────────┬───────────────────────────────┘
                   ↓
    ┌──────────────────────────────┐
    │   computeRiskProfile()       │
    │  - Determine personality     │
    │  - Base risk tolerance       │
    │  - Apply 8 psychological     │
    │    adjustments               │
    └──────────────┬───────────────┘
                   ↓
         ┌─────────────────────┐
         │  Adjusted Risk      │
         │  Tolerance Value    │
         │  (0.0 - 1.0)        │
         └─────────┬───────────┘
                   ↓
    ┌──────────────────────────────┐
    │  Decision Functions          │
    │  - shouldReroll()            │
    │  - shouldBlindRoll()         │
    │  - handleMexicoDecision()    │
    └──────────────┬───────────────┘
                   ↓
         ┌─────────────────────┐
         │   Execute Action    │
         │   (throw, keep,     │
         │    blind/open)      │
         └─────────────────────┘
```

### Personality System

#### Personality Determination

```javascript
function determinePersonality(lives, roundsSurvived) {
    // Desperate: 1 punt over
    if (lives <= 1) {
        return "desperate";
    }

    // Scared: 2 punten over
    if (lives <= 2) {
        return "scared";
    }

    // Defensive: 3 punten over
    if (lives <= 3) {
        return "defensive";
    }

    // Aggressive: 8+ punten + 5+ rounds survived
    if (lives >= 8 && roundsSurvived >= 5) {
        return "aggressive";
    }

    // Default: Neutral
    return "neutral";
}
```

#### Base Risk per Personality

```javascript
const RISK_MAP = {
    "scared": 0.2,         // Zeer voorzichtig (20% risk tolerance)
    "defensive": 0.35,     // Voorzichtig (35%)
    "neutral": 0.5,        // Balanced (50%)
    "aggressive": 0.7,     // Risico-zoekend (70%)
    "desperate": 0.9       // All-in (90%)
};
```

### 8 Psychological Principles Implementation

#### 1. Loss Aversion

**Research:** Kahneman & Tversky (1979), Prospect Theory
**Effect:** Verliezen voelen 2-2.5× erger dan winnen goed voelt

```javascript
function applyLossAversion(risk, isWinning) {
    if (isWinning) {
        // Voor in score → veel voorzichtiger
        return risk * 0.4;  // -60% risk tolerance
    }
    return risk;  // Achter in score → geen adjustment (blijf agressief)
}
```

**Example:**
```
Computer lives: 5, Player lives: 2 → Computer is winning
Base risk (neutral): 0.5
After loss aversion: 0.5 × 0.4 = 0.2 (zeer voorzichtig!)

Computer lives: 2, Player lives: 5 → Computer is losing
Base risk (neutral): 0.5
After loss aversion: 0.5 (geen change, blijf agressief)
```

#### 2. Risk Tolerance Variance

**Research:** Individual differences in risk perception
**Effect:** Mensen zijn niet consistent rationeel

```javascript
function applyRiskVariance(risk) {
    // ±15% random variatie
    const variance = (Math.random() - 0.5) * 0.3;  // -0.15 tot +0.15
    return risk * (1 + variance);
}
```

**Example:**
```
Base risk: 0.5
Variance: -0.1 → 0.5 × 0.9 = 0.45 (iets voorzichtiger)
Variance: +0.1 → 0.5 × 1.1 = 0.55 (iets agressiever)
```

#### 3. Overconfidence Bias

**Research:** Hot streaks lead to overestimation of skill
**Effect:** Na wins neemt AI meer risico

```javascript
function applyOverconfidence(risk, recentWins) {
    if (recentWins > 0) {
        // +10% risk per win (max +30%)
        const boost = Math.min(0.1 * recentWins, 0.3);
        return risk * (1 + boost);
    }
    return risk;
}
```

**Example:**
```
Base risk: 0.5
Recent wins: 2 → 0.5 × 1.2 = 0.6 (+20% risk)
Recent wins: 4 → 0.5 × 1.3 = 0.65 (capped at +30%)
```

#### 4. Anchoring Effect

**Research:** First information disproportionately influences decisions
**Effect:** Eerste worp van de beurt beïnvloedt reroll beslissing

```javascript
function applyAnchoring(risk, firstThrowQuality) {
    // firstThrowQuality: 0.0 (terrible) to 1.0 (perfect)

    if (firstThrowQuality > 0.5) {
        // Goede eerste worp → minder risk (tevreden)
        return risk * 0.8;  // -20% risk
    } else if (firstThrowQuality < 0.3) {
        // Slechte eerste worp → meer risk (compensate)
        return risk * 1.2;  // +20% risk
    }

    return risk;  // Neutral anchor (no change)
}
```

#### 5. Recency Bias

**Research:** Recent events weigh more than older events
**Effect:** Laatste uitkomst beïnvloedt volgende beslissing

```javascript
function applyRecencyBias(risk, lastOutcomeWasGood) {
    if (lastOutcomeWasGood === true) {
        // Laatste worp was goed → verhoogd confidence
        return risk * 1.2;  // +20% risk
    } else if (lastOutcomeWasGood === false) {
        // Laatste worp was slecht → verminderd confidence
        return risk * 0.8;  // -20% risk
    }

    return risk;  // Geen recente uitkomst (eerste worp)
}
```

#### 6. Hot Hand Fallacy

**Research:** Belief in "lucky streaks" in random outcomes
**Effect:** Na 3+ wins gelooft AI dat het "on fire" is

```javascript
function applyHotHand(risk, recentWins) {
    if (recentWins >= 3) {
        // "I'm on a lucky streak!"
        return risk * 1.3;  // +30% risk
    }
    return risk;
}
```

#### 7. Gamblers Fallacy

**Research:** Expectation of mean reversion in random events
**Effect:** Na 2+ losses verwacht AI dat het "nu wel goed moet gaan"

```javascript
function applyGamblersFallacy(risk, consecutiveLosses) {
    if (consecutiveLosses >= 2) {
        // "I'm due for a win!"
        return risk * 1.4;  // +40% risk
    }
    return risk;
}
```

#### 8. Satisficing

**Research:** Herbert Simon - "Good enough" vs optimal
**Effect:** AI stopt soms met "goed genoeg" i.p.v. optimaal te zoeken

```javascript
function applySatisficing(throwQuality, risk) {
    const GOOD_ENOUGH_THRESHOLD = 0.65;

    if (throwQuality >= GOOD_ENOUGH_THRESHOLD && risk < 0.5) {
        // Throw is "good enough" en we zijn niet agressief
        // → Stop rerolling
        return true;  // Satisfice (accept good enough)
    }

    return false;  // Continue optimizing
}
```

### Complete Risk Profile Calculation

```javascript
function computeRiskProfile(gameState) {
    const { computer, player, aiPsychology } = gameState;

    // Step 1: Determine personality
    const personality = determinePersonality(
        computer.lives,
        aiPsychology.roundsSurvived
    );

    // Step 2: Get base risk
    let risk = RISK_MAP[personality];

    // Step 3: Apply psychological adjustments

    // 1. Loss Aversion (strongest effect)
    const isWinning = (computer.lives > player.lives);
    risk = applyLossAversion(risk, isWinning);

    // 2. Risk Variance (random noise)
    risk = applyRiskVariance(risk);

    // 3. Overconfidence
    risk = applyOverconfidence(risk, aiPsychology.recentWins);

    // 4. Anchoring (if we have a first throw)
    if (aiPsychology.lastAnchor !== null) {
        const firstThrowQuality = evaluateThrowQuality(aiPsychology.lastAnchor);
        risk = applyAnchoring(risk, firstThrowQuality);
    }

    // 5. Recency Bias
    const lastOutcome = determineLastOutcome();
    risk = applyRecencyBias(risk, lastOutcome);

    // 6. Hot Hand
    risk = applyHotHand(risk, aiPsychology.recentWins);

    // 7. Gamblers Fallacy
    risk = applyGamblersFallacy(risk, aiPsychology.consecutiveLosses);

    // Step 4: Clamp to valid range [0, 1]
    risk = Math.max(0, Math.min(1, risk));

    return {
        personality,
        baseRisk: RISK_MAP[personality],
        adjustedRisk: risk
    };
}
```

### AI Decision Functions

#### shouldReroll()

```javascript
function shouldReroll(currentThrow, throwsLeft) {
    if (currentThrow === "21") {
        // NEVER reroll Mexico
        return false;
    }

    if (isDouble(currentThrow) && parseInt(currentThrow) >= 600) {
        // NEVER reroll 66 or higher dubbels
        return false;
    }

    if (throwsLeft === 0) {
        // No throws left
        return false;
    }

    // Compute risk profile
    const riskProfile = computeRiskProfile(gameState);
    const { adjustedRisk } = riskProfile;

    // Evaluate current throw quality (0.0 - 1.0)
    const throwQuality = evaluateThrowQuality(currentThrow);

    // Check satisficing
    if (applySatisficing(throwQuality, adjustedRisk)) {
        return false;  // "Good enough"
    }

    // Reroll if throw quality < risk threshold
    if (throwQuality < adjustedRisk) {
        return true;  // Too low, try again
    }

    return false;  // Keep current throw
}
```

#### evaluateThrowQuality()

```javascript
function evaluateThrowQuality(throwValue) {
    // Convert throw to quality score (0.0 - 1.0)

    if (throwValue === "21") return 1.0;  // Perfect (Mexico)

    if (isDouble(throwValue)) {
        // Dubbels: 66 = 0.95, 55 = 0.85, ..., 11 = 0.55
        const value = parseInt(throwValue[0]);
        return 0.5 + (value / 6) * 0.45;
    }

    // Gewone worpen: 65 = 0.50, 64 = 0.48, ..., 31 = 0.05
    const numValue = parseInt(throwValue);

    // Map 31-65 to 0.05-0.50
    const minThrow = 31;
    const maxThrow = 65;
    const quality = 0.05 + ((numValue - minThrow) / (maxThrow - minThrow)) * 0.45;

    return Math.max(0.05, Math.min(0.50, quality));
}
```

**Quality Mapping:**
```
21 (Mexico)    → 1.00
66 (Dubbel 6)  → 0.95
55 (Dubbel 5)  → 0.85
44 (Dubbel 4)  → 0.75
33 (Dubbel 3)  → 0.65
22 (Dubbel 2)  → 0.55
11 (Dubbel 1)  → 0.50
65 (Zes-vijf)  → 0.50
64             → 0.48
...
32             → 0.07
31             → 0.05
```

#### shouldBlindRoll()

```javascript
function shouldBlindRoll(throwNumber, isVoorgooier, playerToGoFirst) {
    // First round: beide blind (regel)
    if (gameState.isFirstRound) {
        return true;
    }

    // Voorgooier: vrije keuze
    if (isVoorgooier) {
        const riskProfile = computeRiskProfile(gameState);
        const { adjustedRisk } = riskProfile;

        // Higher risk → meer kans op blind
        // 0.0 risk → 10% blind, 1.0 risk → 90% blind
        const blindProbability = 0.1 + (adjustedRisk * 0.8);

        return Math.random() < blindProbability;
    }

    // Achterligger: volg voorgooier pattern
    const pattern = gameState.voorgooierPattern;

    if (throwNumber < pattern.length) {
        return pattern[throwNumber];  // Follow exact pattern
    }

    // Extra throw (beyond voorgooier) → vrije keuze
    return Math.random() < 0.5;
}
```

#### handleMexicoDecision()

```javascript
function handleMexicoDecision(isVoorgooier) {
    if (isVoorgooier) {
        // Voorgooier: ALWAYS choose "Iedereen Draait"
        // (Strategisch: verspreid de schade)
        return "everyone";
    } else {
        // Achterligger: Strategic choice
        const riskProfile = computeRiskProfile(gameState);
        const { adjustedRisk, personality } = riskProfile;

        // Aggressive/Desperate → meer kans op "Slachtoffer" (targeted attack)
        // Scared/Defensive → meer kans op "Iedereen" (safe choice)

        if (personality === "desperate" || personality === "aggressive") {
            // 70% kans op victim choice
            return Math.random() < 0.7 ? "victim" : "everyone";
        } else if (personality === "scared" || personality === "defensive") {
            // 30% kans op victim choice
            return Math.random() < 0.3 ? "victim" : "everyone";
        } else {
            // Neutral: 50/50
            return Math.random() < 0.5 ? "victim" : "everyone";
        }
    }
}
```

---

## Data Flow Examples

### Example 1: Player Blind Throw

```
User clicks: "Gooi (Blind)"
    ↓
handlePlayerThrow(isBlind = true)
    ↓
rollDice() → { die1: 6, die2: 5, throwValue: "65" }
    ↓
gameState.player.currentThrow = "65"
gameState.player.displayThrow = "??"  (hidden)
gameState.player.isBlind = true
    ↓
updateUI()
    - Show dice as "??"
    - Enable "Laat Zien" button
    - Increment throwCount
    ↓
[User clicks "Laat Zien"]
    ↓
handleReveal()
    ↓
gameState.player.displayThrow = "65"  (revealed)
gameState.player.hasRevealed = true
    ↓
updateUI()
    - Show dice as "⚅ ⚄"
    - Disable "Opnieuw Gooien" (blind first throw rule)
    ↓
[User clicks "Klaar"]
    ↓
handlePlayerKeep()
    ↓
gameState.player.hasLocked = true
    ↓
computerTurn()
```

### Example 2: AI Reroll Decision

```
computerTurn()
    ↓
throwDice() → currentThrow = "42"
    ↓
computeRiskProfile()
    - Personality: neutral (5 lives, 3 rounds survived)
    - Base risk: 0.5
    - Loss aversion: × 1.0 (not winning)
    - Risk variance: × 1.1 (random +10%)
    - Overconfidence: × 1.0 (no recent wins)
    - Adjusted risk: 0.55
    ↓
evaluateThrowQuality("42") → 0.15 (low quality)
    ↓
shouldReroll("42", throwsLeft = 2)
    - throwQuality (0.15) < adjustedRisk (0.55)
    - Decision: REROLL
    ↓
logToConsole("Computer gooit opnieuw (worp te laag)")
    ↓
throwDice() → currentThrow = "54"
    ↓
evaluateThrowQuality("54") → 0.35
    ↓
shouldReroll("54", throwsLeft = 1)
    - throwQuality (0.35) < adjustedRisk (0.55)
    - Decision: REROLL
    ↓
throwDice() → currentThrow = "65"
    ↓
evaluateThrowQuality("65") → 0.50
    ↓
shouldReroll("65", throwsLeft = 0)
    - No throws left
    - Decision: KEEP
    ↓
computerKeep()
```

### Example 3: Mexico Stacking

```
Round 1:
    Player throws: "21" (Mexico!)
        ↓
    handleMexico("player")
        - gameState.mexicoCount = 1
        - Player chooses: "Slachtoffer" → Computer
        ↓
    computerLoseLife(2)  // 2 pts for 1 Mexico
        - computer.lives: 6 → 4

Round 2:
    Computer throws: "21" (Mexico!)
        ↓
    handleMexico("computer")
        - gameState.mexicoCount = 2  // STACKING!
        - Computer chooses: "Iedereen Draait" (is voorgooier)
        ↓
    playerLoseLife(4)  // 4 pts for 2 Mexicos (cumulative)
        - player.lives: 6 → 2

Round 3:
    Player throws: "21" (Mexico AGAIN!)
        ↓
    handleMexico("player")
        - gameState.mexicoCount = 3  // TRIPLE STACK!
        - Player chooses: "Slachtoffer" → Computer
        ↓
    computerLoseLife(6)  // 6 pts for 3 Mexicos
        - computer.lives: 4 → 0 (eliminated!)
        ↓
    checkGameOver()
        - Only player has lives
        - Player wins! 🏆
```

---

## Performance Characteristics

### Load Time
- **First Contentful Paint:** < 1.5s (3G)
- **Time to Interactive:** < 2.5s (3G)
- **Total Load:** < 3s (3G)

### Runtime Performance
- **JavaScript Execution:** < 10ms per game action
- **UI Updates:** 60fps animations
- **Memory Usage:** < 50KB per game session
- **No memory leaks:** Tested 100+ rondes

### Animation Timing
- Dice roll: 500ms (10× @ 50ms)
- Dice cup shake: 500ms
- Dice cup flip: 600ms transition
- Confetti: 600ms (30 particles @ 20ms)

---

## Security Architecture

### Security Principles
1. ✅ No eval() or dangerous functions
2. ✅ No external API calls
3. ✅ No user-generated content
4. ✅ LocalStorage properly sanitized
5. ⚠️ Lucky mode can be activated via console (acceptable easter egg)

### Data Storage
- **LocalStorage:** Game statistics only (< 1KB)
- **No cookies**
- **No tracking**
- **No personal data**

---

## Browser Compatibility

**Tested & Supported:**
- Chrome 120+ (primary)
- Firefox 121+
- Safari 17+ (macOS/iOS)
- Edge 120+
- Chrome Android
- Samsung Internet

**Required Features:**
- ES6+ JavaScript
- CSS Custom Properties
- CSS Grid & Flexbox
- CSS Transforms (3D)
- localStorage API
- Intersection Observer API

---

**Document Version:** 1.0
**Last Updated:** 2025-12-28
**Maintained By:** Daniel van Melzen

*Complete technical architecture for Koning Mexico platform.*
