# Koning Mexico Directory Structure

**Last Updated:** 2025-12-28
**Repository Location:** `d:\repos\koningmexico.nl-website\`

---

## Complete Directory Tree

```
d:\repos\koningmexico.nl-website\
├── .git/                                # Git version control
├── .gitignore                           # Git ignore rules
├── .claude/                             # Claude Code context documentation
│   ├── settings.local.json              # Claude settings
│   └── koning-mexico/                   # Project documentation (this folder)
│       ├── README.md                    # Documentation index
│       ├── project-overview.md          # High-level overview
│       ├── architecture.md              # Technical architecture
│       ├── directory-structure.md       # This file
│       ├── key-features.md              # Feature reference
│       └── development-notes.md         # Developer guide
│
├── assets/                              # Media files (images)
│   ├── logo-fixed.png                   # Primary logo (used in headers) - 1.4MB
│   ├── logo.png                         # Original logo - 1.2MB
│   ├── logo-badge.png                   # Badge variant (OG image) - 1.5MB
│   ├── logo-oval.png                    # Oval variant - 1.6MB
│   ├── favicon.png                      # Browser icon - 1.5MB
│   ├── king-photo.jpg                   # King photo (unused) - 239KB
│   └── og-image.jpg                     # Duplicate (can be removed) - 1.5MB
│
├── index.html                           # 🎯 Landing page (36KB, 452 lines)
├── spelregels.html                      # 🎯 Spelregels handbook (89KB, ~2000 lines)
├── spel.html                            # 🎯 Solo practice mode (20KB)
├── spel_vs_computer.html                # 🎯 vs Computer AI mode (24KB)
├── spel_vs_computer_dev.html            # Development version (testing)
├── ai_psychology.html                   # 🎯 AI psychology docs (55KB)
│
├── styles.css                           # 🎯 Custom CSS (9KB, 300+ lines)
├── script.js                            # 🎯 Landing page JS (17KB, 437 lines)
├── game.js                              # 🎯 Solo mode engine (29KB, ~800 lines)
├── game_vs_computer.js                  # 🎯 AI engine (97KB, ~1200 lines)
├── game_vs_computer.js.bak              # Backup of AI engine (95KB)
│
├── PRD.md                               # Product Requirements Document (47KB)
├── SPELREGELS.md                        # Markdown spelregels (40KB)
├── AI_PSYCHOLOGY.md                     # AI psychology markdown (26KB)
├── README.md                            # Developer documentation (14KB)
├── VERBETERPUNTEN.md                    # Improvement ideas (4KB)
├── CODE_ANALYSIS.md                     # Code quality report (7KB)
├── TESTPLAN.md                          # Testing strategy (4KB)
├── TEST_EXECUTION_REPORT.md             # Test results (26KB)
│
├── CNAME                                # Custom domain configuration (15 bytes)
│
└── [backup files]                       # Old versions (not deployed)
    ├── index-vanilla.html.backup        # Old landing page (21KB)
    └── styles-old.css.backup            # Old CSS (26KB)
```

**Total Project Size:** ~500MB (mostly large PNG logos)
**Core Code Size:** ~316KB (HTML + CSS + JS only)
**Documentation Size:** ~180KB (MD files)

🎯 = Essential files for production deployment

---

## Key Files Detailed

### HTML Pages (5 total)

#### 1. `index.html` (36KB, 452 lines)
**Purpose:** Landing page en navigatie hub
**Sections:**
- Hero (logo, tagline, CTAs)
- Wat is Mexico? (introductie)
- Benodigdheden (5 items)
- Doel van het SPEL
- Mexico als Kroegspel (inzet systeem)
- Rangorde WORPEN (Mexico, Dubbels, Gewone)
- Spelverloop (4 fases per RONDE)
- Optionele Huisregels
- Waarom zo Leuk (3 strategy points)
- Footer (logo + copyright)

**Dependencies:**
- Tailwind CSS (CDN)
- Google Fonts (Cinzel, Open Sans)
- styles.css (custom CSS)
- script.js (interactive features)
- assets/logo-fixed.png

**Key Features:**
- Smooth scroll navigation
- Mobile hamburger menu
- Scroll animations (Intersection Observer)
- Klikbare dobbelstenen met roll animatie
- Easter egg (5× logo click = confetti)
- Back-to-top button

#### 2. `spelregels.html` (89KB, ~2000 lines)
**Purpose:** Complete digitale spelregels documentatie
**Sections:** 16 hoofdstukken
1. Overzicht
2. Terminologie (SPEL/RONDE/WORP/BEURT)
3. Spel Setup
4. Basis Concepten
5. Worp Waardes
6. Complete Game Flow
7. Voorgooier Systeem
8. Beslisbomen
9. Speciale Regels (Mexico, Draaisteen, Vastloper)
10. Instellingen
11. Quick Reference
12. Strategische Tips
13. Optionele Huisregels
14. FAQ
15. Credits
16. Contact

**Key Features:**
- Sticky inhoudsopgave (16 links)
- Scroll tracking (active link highlight)
- Genummerde fase badges (1, 2, 3, 4)
- Unicode dobbelstenen voorbeelden (⚀-⚅)
- Color-coded secties (gold, green, red borders)
- Monospace code blocks (decision trees)
- Responsive tables (rangorde overzicht)

**Known Issue:** Mobile menu button niet functioneel (geen JS)

#### 3. `spel.html` (20KB)
**Purpose:** Solo practice mode (1 speler tegen zichzelf)
**Features:**
- Setup panel (2-6 spelers, 3-10 startpunten)
- Inzet tracking toggle
- Dynamic player panels (gegenereerd via JS)
- Blind vs Open gooien
- Laat Zien (reveal blind throws)
- Opnieuw Gooien (reroll)
- Klaar (end turn)
- Mexico detection & celebration
- Vastloper detection & overgooien
- Draaisteen management (punten system)
- Winnaar bepaling

**Dependencies:**
- game.js (spellogica engine)
- styles.css

#### 4. `spel_vs_computer.html` (24KB)
**Purpose:** 1v1 vs psychologische AI
**Features:** Alle solo mode features, plus:
- Fixed 1v1 setup (jij vs computer)
- Separate dice cups (player left, computer right)
- Computer turn animation ("Computer is aan het denken...")
- Action log (real-time updates)
- AI psychology implementation (8 principes)
- Computer decision transparency (console logging)
- Mexico celebration (beide spelers)
- Statistics tracking (localStorage)

**Dependencies:**
- game_vs_computer.js (AI engine + spellogica)
- styles.css

**AI Features:**
- 8 psychological principles
- 5 personality modes (scared → desperate)
- Dynamic difficulty (reageert op prestaties)

#### 5. `ai_psychology.html` (55KB)
**Purpose:** AI technische documentatie
**Sections:**
- Executive Summary
- Core Design Philosophy
- 8 Psychological Principles (detailed)
- AI Personality System
- Code Architecture
- Testing & Validation
- Future Improvements
- Research References

**Key Features:**
- Research cards (hover effects)
- Code blocks met syntax highlighting
- Implementation cards per principe
- Tables (personality thresholds)
- Emoji indicators (🧠, 🎯, 💻, 🎲)
- Dark header (brown gradient)

**Known Issue:** Mobile menu button niet functioneel

---

### JavaScript Files (3 core + 1 backup)

#### 1. `script.js` (17KB, 437 lines)
**Purpose:** Landing page interactiviteit
**Functions:**
- `smoothScrollToSection()` — Smooth scroll met header offset
- `animateDice(element)` — 10× random symbols @ 50ms
- `setupScrollAnimations()` — Intersection Observer voor fade-in
- `setupMobileMenu()` — Hamburger toggle
- `setupBackToTop()` — Scroll-triggered button
- `setupEasterEgg()` — 5× logo click = confetti
- `celebrateMexico()` — Confetti explosion (50 particles)
- `setupVariantCards()` — Click toggle active state

**No Dependencies:** Pure vanilla JS
**Performance:** < 5ms execution time

#### 2. `game.js` (29KB, ~800 lines)
**Purpose:** Solo practice mode engine
**Core Functions:**
```javascript
// Setup
function newGame()
function setupPlayerCount()
function createPlayerCard(index, name, lives)

// Throwing
function handlePlayerThrow(isBlind)
function rollDice() → { die1, die2, throwValue }
function handleReveal()
function handleReroll()
function handleKeep()

// Game Logic
function compareThrows(throw1, throw2) → -1, 0, 1
function checkForVastloper(players) → { isVastloper, losers }
function handleOvergooien(losers)
function handleMexico(playerIndex)
function updateDraaisteen(playerIndex, ptsToTurn)

// Round Flow
function startNextRound()
function endTurn()
function checkGameOver()

// UI
function updateUI()
function updatePlayerCard(playerIndex)
function disableAllButtons()
function enableRelevantButtons()
```

**State Management:**
```javascript
const gameState = {
    players: [],           // Array van speler objecten
    currentPlayerIndex: 0,
    roundNumber: 1,
    gamePhase: 'setup',
    throwLimit: null,
    voorgooier: null,
    pot: 0
};

const player = {
    name: "Speler 1",
    lives: 6,
    throws: [],
    isRevealed: false,
    hasLocked: false,
    lastThrowValue: null,
    status: ""
};
```

**Edge Cases Handled:**
- Mexico in vastloper (telt niet mee)
- Meerdere Mexicos in zelfde ronde (stacking)
- Speler gooit Mexico als slachtoffer van andere Mexico
- Laatste BEURT binnen worplimiet (auto-lock)
- Blind worp niet revealed (auto-reveal)
- Overgooien bij vastloper (alleen losers)
- Winnaar bij meerdere spelers op 0 punten (delen pot)

#### 3. `game_vs_computer.js` (97KB, ~1200 lines)
**Purpose:** AI engine + spellogica voor 1v1
**Extends:** All game.js functionality
**Additional Functions:**
```javascript
// AI Core
function determinePersonality(lives, roundsSurvived)
function computeRiskProfile(gameState)
function evaluateThrowQuality(throwValue) → 0.0 - 1.0

// AI Decisions
function shouldReroll(currentThrow, throwsLeft) → boolean
function shouldBlindRoll(throwNumber, isVoorgooier) → boolean
function handleMexicoDecision(isVoorgooier) → "everyone" | "victim"

// AI Psychology (8 principles)
function applyLossAversion(risk, isWinning)
function applyRiskVariance(risk)
function applyOverconfidence(risk, recentWins)
function applyAnchoring(risk, firstThrowQuality)
function applyRecencyBias(risk, lastOutcomeWasGood)
function applyHotHand(risk, recentWins)
function applyGamblersFallacy(risk, consecutiveLosses)
function applySatisficing(throwQuality, risk)

// AI Turn Execution
async function computerTurn()
async function computerFirstRoundTurn()
function computerKeep()
function computerReroll()

// Animation & Feedback
function animateDiceCup(player, throwValue)
function logToConsole(message)
function updateActionLog(message)

// Statistics
function updateStats(winner)
function displayStats()
```

**AI State:**
```javascript
aiPsychology: {
    riskTolerance: 0.5,         // 0-1 scale
    recentWins: 0,              // Hot hand tracking
    consecutiveLosses: 0,       // Gamblers fallacy
    roundsSurvived: 0,          // Personality switching
    lastAnchor: null,           // Anchoring effect
    overconfidenceBoost: 0,     // Overconfidence bias
    lossAversionFactor: 1.0     // Loss aversion
}
```

**Performance:**
- AI decision: < 10ms
- Computer turn (with delays): 1-3 seconds (realistic)
- Memory usage: ~20KB extra vs game.js

**Known Issues (Fixed in v2.2.1):**
- ✅ Button state management (disabled properly)
- ✅ Blind throw reveal timing
- ✅ Dice cup element references

---

### CSS Files

#### `styles.css` (9KB, 300+ lines)
**Purpose:** Custom styles + animations
**Sections:**
```css
/* 1. CSS Custom Properties (Design Tokens) */
:root {
    --color-gold: #D4AF37;
    --color-green: #0D5E3A;
    --color-red: #8B0000;
    /* ... 20+ color variables */
}

/* 2. Global Resets & Base */
* { box-sizing: border-box; }
body { font-family: 'Open Sans', sans-serif; }

/* 3. Mobile Menu */
.mobile-menu-toggle { /* Hamburger icon */ }
#main-navigation { /* Mobile slide-down */ }

/* 4. Animations */
@keyframes fadeIn { /* Scroll animations */ }
@keyframes shake { /* Dice cup shake */ }
@keyframes float { /* Floating dobbelstenen */ }
.confetti { /* Confetti particles */ }

/* 5. Dice Cup (3D Flip) */
.dice-cup {
    transform-style: preserve-3d;
    transition: transform 0.6s;
}
.dice-cup.flipped {
    transform: rotateX(180deg);
}

/* 6. Game UI */
.player-card { /* Speler panel styling */ }
.dice-cup { /* 3D perspective */ }
.action-log { /* Scrollable log */ }
.debug-console { /* Collapsible debug */ }

/* 7. Accessibility */
*:focus { outline: 3px solid var(--color-gold); }
@media (prefers-reduced-motion: reduce) {
    * { animation: none !important; }
}

/* 8. Print Styles */
@media print {
    .no-print { display: none; }
    body { background: white; }
}
```

**Design Tokens:**
- 9 color variables (gold, green, red, brown, cream)
- 5 spacing variables (xs → xl)
- 3 transition speeds (fast, normal, slow)

**Responsive Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

### Documentation Files (8 total)

#### Core Documentation

**1. `README.md` (14KB)**
- Project overview
- Features list
- Technology stack
- Project structure
- Local testing instructions
- Deployment guide
- Design tokens reference
- Interactive features explanation
- Browser support
- Accessibility notes
- Performance metrics
- File structure tree

**2. `PRD.md` (47KB)**
- Product Requirements Document (complete spec)
- Executive summary
- Goals & results
- Target audience
- Feature breakdown (5 pagina's)
- Design system (colors, typography, emoji)
- Technical implementation
- Game engine architecture
- AI psychology details
- File structure
- Deployment & hosting
- Testing & QA
- Known issues & limitations
- Future roadmap
- Success metrics
- Maintenance & operations
- Appendices (quick reference, AI thresholds)

**3. `SPELREGELS.md` (40KB)**
- Markdown version van spelregels.html
- Reverse-engineered vanuit game code
- Terminologie (SPEL/RONDE/WORP/BEURT)
- Complete game flow
- Beslisbomen (decision trees)
- Edge cases
- Quick reference cheat sheet

**4. `AI_PSYCHOLOGY.md` (26KB)**
- Markdown version van ai_psychology.html
- Research basis (Kahneman & Tversky)
- 8 psychological principles detailed
- Loss Aversion (2-2.5× effect)
- Tilt mechanics
- Gambler's Fallacy vs Hot Hand
- Bluffing theory
- Satisficing concept
- Implementation examples
- Code snippets
- Future improvements

**5. `VERBETERPUNTEN.md` (4KB)**
- Improvement ideas
- Pattern visualization (UI/UX)
- Future features (multiplayer, stats, sounds, PWA)
- Gerealiseerde verbeteringen (changelog)
- Exact pattern enforcement (2025-12-04)
- Collapsible debug console
- Lucky Mode easter egg
- Dark mode detection

**6. `CODE_ANALYSIS.md` (7KB)**
- Code quality report (analysis date: 2025-12-05)
- Critical bugs fixed (v2.2.1)
  - Button state management
  - Dice cup element references
  - Blind throw reveal timing
- Potential issues identified
  - setTimeout chain race conditions
  - Lucky mode global state (acceptable)
  - LocalStorage size (negligible)
- Code quality observations
  - Strengths (logging, state management, clear functions)
  - Areas for improvement (isProcessing flag, JSDoc, unit tests)
- setTimeout inventory (33 total)
- Element references audit
- Game state consistency check
- Performance analysis (memory, animations)
- Security considerations
- Browser compatibility
- Recommendations summary

**7. `TESTPLAN.md` (4KB)**
- Testing strategy
- Test coverage goals
- Functional testing checklist
- Edge case testing scenarios
- Cross-browser testing matrix
- Performance benchmarks
- Accessibility testing (WCAG AA)
- 25-game execution plan

**8. `TEST_EXECUTION_REPORT.md` (26KB)**
- Test results (25+ games played)
- Bug discoveries and fixes
- Edge cases encountered
- Performance observations
- AI behavior validation
- Success/failure rates
- Recommendations for improvements

---

## Asset Management

### Images (7 files, ~8MB total)

**Usage Matrix:**
| File | Size | Used In | Status |
|------|------|---------|--------|
| `logo-fixed.png` | 1.4MB | All headers | ✅ Primary |
| `logo.png` | 1.2MB | None | ⚠️ Unused |
| `logo-badge.png` | 1.5MB | OG meta tag | ✅ Social |
| `logo-oval.png` | 1.6MB | None | ⚠️ Unused |
| `favicon.png` | 1.5MB | Browser tab | ✅ Icon |
| `king-photo.jpg` | 239KB | None | ⚠️ Unused |
| `og-image.jpg` | 1.5MB | None | ⚠️ Duplicate |

**Optimization Opportunities:**
- [ ] Compress `logo-fixed.png` (WebP format → ~200KB)
- [ ] Compress `favicon.png` (32×32px → ~50KB)
- [ ] Remove unused: `logo.png`, `logo-oval.png`, `king-photo.jpg`, `og-image.jpg`
- **Potential Savings:** ~5MB (60% reduction)

---

## Development vs Production Files

### Production Files (Deployed to GitHub Pages)
```
✅ index.html
✅ spelregels.html
✅ spel.html
✅ spel_vs_computer.html
✅ ai_psychology.html
✅ styles.css
✅ script.js
✅ game.js
✅ game_vs_computer.js
✅ assets/ (all images)
✅ CNAME (custom domain)
```

### Development Files (NOT Deployed)
```
❌ spel_vs_computer_dev.html (testing version)
❌ game_vs_computer.js.bak (backup)
❌ index-vanilla.html.backup (old version)
❌ styles-old.css.backup (old CSS)
❌ .git/ (version control, not served)
❌ .gitignore
❌ All .md files (documentation, not served)
❌ .claude/ (context docs, not served)
```

---

## File Lifecycle

### Landing Page Assets

```
index.html creation
    ↓
[Design phase]
    - Wireframes
    - Color scheme
    - Typography choices
    ↓
[Implementation]
    - HTML structure
    - Tailwind utility classes
    - Custom CSS (styles.css)
    - JavaScript (script.js)
    ↓
[Testing]
    - Cross-browser
    - Mobile responsive
    - Accessibility (WCAG AA)
    ↓
[Deployment]
    - Commit to Git
    - Push to master
    - GitHub Pages auto-deploy
    ↓
[Maintenance]
    - Content updates
    - Bug fixes
    - Feature additions
```

### Game Engine Evolution

```
game.js (Solo mode)
    ↓
[Initial implementation]
    - Core game state
    - Throw comparison
    - Round flow
    ↓
[Edge cases]
    - Mexico stacking
    - Vastloper detection
    - Overgooien logic
    ↓
[Testing & refinement]
    - 25+ games played
    - Bug fixes (v2.2, v2.2.1)
    ↓
game_vs_computer.js (AI mode)
    ↓
[Code duplication]
    - Copy all game.js functions
    - Add AI-specific functions
    ↓
[AI psychology]
    - 8 principles implemented
    - Risk profile calculation
    - Decision functions
    ↓
[Testing & balancing]
    - AI behavior validation
    - Difficulty tuning
    - Edge case handling
    ↓
[Future: Refactoring]
    - Extract shared code
    - DRY principle
    - Module separation
```

---

## Git History

### Branch Structure
- `master` — Production branch (auto-deploys to GitHub Pages)
- Feature branches: ad-hoc (geen standaard workflow)

### Commit Strategy
- Small, frequent commits (no monolithic updates)
- Descriptive messages (e.g., "Fix blind throw reveal timing")
- Version tags: v2.2, v2.2.1 (semantic versioning)

### .gitignore Contents
```
node_modules/
.DS_Store
*.log
.env
.vscode/
```

**NOT Ignored:**
- `.claude/` (context docs are version-controlled)
- `.md` files (documentation is committed)
- Backup files (`.backup` suffix kept in repo)

---

## Storage & Performance

### Total Sizes

**By Category:**
```
HTML files:         ~250KB (5 pages)
CSS files:          ~35KB (styles.css + Tailwind CDN)
JavaScript files:   ~143KB (3 core scripts)
Images (assets):    ~8MB (7 PNG/JPG files)
Documentation:      ~180KB (8 MD files)
Total Repository:   ~9MB
```

**Core Code Only (Production):**
```
HTML + CSS + JS:    ~316KB uncompressed
                    ~80KB gzipped (estimated)
```

**Load Time Breakdown:**
```
First Load (uncached):
    - HTML: ~30KB × 1 page = 30KB
    - Tailwind CDN: ~50KB (cached across sites)
    - Custom CSS: ~9KB
    - JavaScript: ~45KB (game_vs_computer.js largest)
    - Logo image: ~1.4MB
    - Total: ~1.5MB → < 3s on 3G

Subsequent Loads (cached):
    - Only HTML (~30KB) → < 0.5s
```

---

## Directory Navigation Tips

### Quick Access Commands

```bash
# Root directory
cd d:/repos/koningmexico.nl-website

# Key files
code index.html                      # Landing page
code spel_vs_computer.html           # vs AI mode
code game_vs_computer.js             # AI engine
code styles.css                      # Custom CSS

# Documentation
code README.md                       # Developer guide
code PRD.md                          # Product spec
code SPELREGELS.md                   # Game rules

# Claude context
code .claude/koning-mexico/          # This documentation
```

### Find Files by Type

```bash
# All HTML pages
ls *.html

# All JavaScript
ls *.js

# All documentation
ls *.md

# All images
ls assets/

# Backup files
ls *.backup *.bak
```

---

## Future Structure (Post-Refactor)

### Proposed Modular Structure

```
koningmexico.nl-website/
├── src/                             # Source code (modular)
│   ├── components/                  # Reusable UI components
│   │   ├── DiceCup.js
│   │   ├── PlayerCard.js
│   │   └── ActionLog.js
│   ├── game/                        # Game logic (shared)
│   │   ├── GameState.js
│   │   ├── ThrowComparison.js
│   │   ├── MexicoRules.js
│   │   └── VastloperDetection.js
│   ├── ai/                          # AI psychology (isolated)
│   │   ├── PersonalitySystem.js
│   │   ├── RiskProfile.js
│   │   ├── PsychologicalPrinciples.js
│   │   └── DecisionEngine.js
│   └── pages/                       # Page-specific code
│       ├── landing.js
│       ├── solo.js
│       └── vsComputer.js
│
├── dist/                            # Build output (production)
│   ├── index.html
│   ├── bundle.js (all JS combined)
│   └── styles.css (minified)
│
├── tests/                           # Unit & E2E tests
│   ├── game.test.js
│   ├── ai.test.js
│   └── e2e/
│       └── vsComputer.test.js
│
└── docs/                            # Move all .md files here
    ├── PRD.md
    ├── SPELREGELS.md
    └── ...
```

**Benefits:**
- DRY (no code duplication between game.js and game_vs_computer.js)
- Testable (unit tests per module)
- Maintainable (clear separation of concerns)
- Scalable (easy to add multiplayer, more AI opponents, etc.)

**Required:**
- Build step (Webpack/Vite)
- TypeScript (recommended for type safety)
- Testing framework (Jest + Playwright)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-28
**Maintained By:** Daniel van Melzen

*Complete directory structure reference for Koning Mexico project.*
