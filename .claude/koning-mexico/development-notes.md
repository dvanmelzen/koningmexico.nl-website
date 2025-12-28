# Koning Mexico Development Notes

**Last Updated:** 2025-12-28
**For:** Engineers working with or extending Koning Mexico

---

## Quick Reference

### Essential Commands

```bash
# Local Development
cd d:/repos/koningmexico.nl-website

# Option 1: Python HTTP server (recommended)
python -m http.server 8000
# Open: http://localhost:8000

# Option 2: npx serve
npx serve -l 3000
# Open: http://localhost:3000

# Option 3: VS Code Live Server
# Install "Live Server" extension
# Right-click index.html → Open with Live Server
```

### Git Workflow

```bash
# Check status
git status

# Stage changes
git add .
# Or specific files
git add index.html game_vs_computer.js

# Commit
git commit -m "Fix blind throw reveal timing"

# Push to GitHub (auto-deploys to GitHub Pages)
git push origin master

# Wait ~1 minute for deployment
# Verify at production URL
```

### Common Tasks

```bash
# Edit landing page
code index.html

# Edit AI engine
code game_vs_computer.js

# Edit styles
code styles.css

# View documentation
code PRD.md
code SPELREGELS.md

# Run linter (if configured)
npm run lint

# Run tests (if configured)
npm test
```

---

## Common Workflows

### 1. Daily Development Routine

**Morning:**
```bash
cd d:/repos/koningmexico.nl-website
git pull origin master  # Get latest changes
code .                  # Open in VS Code
```

**During Development:**
1. Start local server (`python -m http.server 8000`)
2. Open http://localhost:8000 in browser
3. Open DevTools Console (F12)
4. Make changes in code editor
5. Refresh browser to test
6. Check console for errors
7. Test on mobile (DevTools → Device Toolbar)

**Evening:**
```bash
git add .
git commit -m "Descriptive commit message"
git push origin master
# Verify deployment in ~1 min
```

---

### 2. Adding New Feature

**Planning Phase:**
1. Document in VERBETERPUNTEN.md
2. Check PRD.md for alignment with goals
3. Consider impact on existing features

**Implementation Phase:**
```bash
# Option 1: Work directly on master (small changes)
git pull
# Make changes
git add .
git commit -m "Add feature X"
git push

# Option 2: Feature branch (larger changes)
git checkout -b feature/new-game-mode
# Make changes
git add .
git commit -m "Implement multiplayer mode"
git push origin feature/new-game-mode
# Create PR on GitHub
# Merge after review
```

**Testing Phase:**
1. Test locally (all game modes)
2. Test edge cases (see TESTPLAN.md)
3. Cross-browser testing
4. Mobile testing
5. Accessibility check (WAVE extension)

**Documentation Phase:**
1. Update README.md (if user-facing)
2. Update PRD.md (if feature spec)
3. Update CODE_ANALYSIS.md (if architecture change)
4. Update .claude/koning-mexico/ docs (if significant)

---

### 3. Fixing Bugs

**Bug Report Template:**
```markdown
## Bug: [Short description]

**Severity:** Critical / High / Medium / Low

**Observed Behavior:**
[What actually happens]

**Expected Behavior:**
[What should happen]

**Steps to Reproduce:**
1. Open spel_vs_computer.html
2. Start new game
3. Click "Gooi Blind"
4. ...

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Screen size: 1920×1080

**Console Errors:**
```
[Paste console errors here]
```

**Screenshots:**
[If applicable]
```

**Bug Fix Workflow:**
```bash
# 1. Reproduce locally
python -m http.server 8000
# Follow steps to reproduce

# 2. Identify root cause
# Check console errors
# Add console.log() for debugging
# Use Chrome DevTools debugger

# 3. Fix the bug
code game_vs_computer.js
# Make necessary changes

# 4. Test fix
# Verify bug is resolved
# Test related functionality
# Check for regressions

# 5. Document in CODE_ANALYSIS.md
# Add to "Fixed Bugs" section

# 6. Commit & push
git add game_vs_computer.js CODE_ANALYSIS.md
git commit -m "Fix: Blind throw reveal timing (issue #12)"
git push origin master
```

---

### 4. Updating Documentation

**When to Update:**
- ✅ New feature added
- ✅ Game rules changed
- ✅ AI psychology modified
- ✅ File structure changed
- ✅ Bug fixed (if significant)

**Files to Update:**

| Change Type | Update Files |
|-------------|-------------|
| User-facing feature | README.md, PRD.md |
| Game rule | SPELREGELS.md, spelregels.html |
| AI behavior | AI_PSYCHOLOGY.md, ai_psychology.html |
| Code architecture | CODE_ANALYSIS.md, .claude/koning-mexico/architecture.md |
| File added/removed | .claude/koning-mexico/directory-structure.md |
| All features | .claude/koning-mexico/key-features.md |

**Update Workflow:**
```bash
# 1. Identify what changed
git diff

# 2. Open relevant docs
code README.md PRD.md

# 3. Update content
# Add new sections
# Update version numbers
# Update "Last Updated" dates

# 4. Commit with docs
git add README.md PRD.md game_vs_computer.js
git commit -m "Add difficulty selector + update docs"
git push
```

---

### 5. AI Behavior Tuning

**Testing AI Decisions:**

```javascript
// Enable debug console (spel_vs_computer.html)
function logToConsole(message) {
    const debugConsole = document.getElementById('debugConsole');
    debugConsole.innerHTML += message + '\n';
}

// Add detailed logging
function computeRiskProfile(gameState) {
    const personality = determinePersonality(lives, rounds);
    logToConsole(`Personality: ${personality}`);

    let risk = RISK_MAP[personality];
    logToConsole(`Base risk: ${risk.toFixed(2)}`);

    // Log each adjustment
    if (isWinning) {
        logToConsole(`Loss aversion: × 0.4 (winning)`);
        risk *= 0.4;
    }

    logToConsole(`Final adjusted risk: ${risk.toFixed(2)}`);

    return { personality, baseRisk, adjustedRisk: risk };
}
```

**Tuning Parameters:**

```javascript
// In game_vs_computer.js

// 1. Personality thresholds
function determinePersonality(lives, roundsSurvived) {
    if (lives <= 1) return "desperate";
    if (lives <= 2) return "scared";      // Tune: 2 → 3?
    if (lives <= 3) return "defensive";   // Tune: 3 → 4?
    // ...
}

// 2. Risk tolerance values
const RISK_MAP = {
    "scared": 0.2,       // Tune: 0.2 → 0.15? (more cautious)
    "defensive": 0.35,   // Tune: 0.35 → 0.30?
    "neutral": 0.5,
    "aggressive": 0.7,   // Tune: 0.7 → 0.75? (more aggressive)
    "desperate": 0.9
};

// 3. Psychological effect strengths
function applyLossAversion(risk, isWinning) {
    if (isWinning) {
        return risk * 0.4;  // Tune: 0.4 → 0.3? (even more cautious)
    }
    return risk;
}

function applyOverconfidence(risk, recentWins) {
    if (recentWins > 0) {
        const boost = Math.min(0.1 * recentWins, 0.3);  // Tune: max 0.3 → 0.4?
        return risk * (1 + boost);
    }
    return risk;
}
```

**Testing Tuning Changes:**
1. Play 10-25 games with new parameters
2. Observe AI behavior patterns
3. Check win/loss ratio (target: 40-60% AI wins)
4. Verify AI doesn't feel "dumb" or "perfect"
5. Document changes in AI_PSYCHOLOGY.md

---

### 6. Deploying to Production

**GitHub Pages Auto-Deployment:**

```bash
# Simple: just push to master
git push origin master

# GitHub Actions (if configured) auto-builds and deploys
# Wait ~1 minute

# Verify deployment
curl https://yourdomain.com
# Or open in browser

# Check for errors
# Open DevTools Console
# Test all game modes
```

**Manual Deployment (Alternative Hosting):**

```bash
# 1. Build (if using build step — currently none)
# npm run build  (not needed for Koning Mexico)

# 2. Upload files to server
# Option A: FTP/SFTP
ftp yourdomain.com
# Upload all HTML, CSS, JS, assets

# Option B: rsync
rsync -avz --exclude '.git' \
    d:/repos/koningmexico.nl-website/ \
    user@server:/var/www/koningmexico/

# Option C: Vercel/Netlify
# Drag & drop folder to web interface
# Or connect GitHub repo for auto-deploy
```

**Deployment Checklist:**
- [ ] All changes committed
- [ ] Tests passed (manual testing)
- [ ] Documentation updated
- [ ] No console errors locally
- [ ] Mobile responsive checked
- [ ] Accessibility verified (WAVE)
- [ ] Push to master
- [ ] Wait for deployment
- [ ] Verify production site
- [ ] Test all game modes on production
- [ ] Check analytics (if configured)

---

## Testing Guidelines

### Manual Testing Checklist

**Landing Page (index.html):**
- [ ] Navigation links work (smooth scroll)
- [ ] Mobile menu toggles open/closed
- [ ] Dobbelstenen klikbaar (roll animatie)
- [ ] Scroll animations trigger (cards fade in)
- [ ] Back to top button appears/works
- [ ] Easter egg (5× logo click = confetti)
- [ ] All CTAs work (navigate to correct pages)
- [ ] Mobile responsive (test 375px, 768px, 1024px)

**Solo Mode (spel.html):**
- [ ] Setup controls work (2-6 spelers, 3-10 punten)
- [ ] Nieuw Spel starts game correctly
- [ ] Gooi Blind/Open generate throws
- [ ] Laat Zien reveals blind throws
- [ ] Opnieuw Gooien works (max 3 throws)
- [ ] Klaar ends turn
- [ ] Mexico detection & celebration
- [ ] Vastloper detection & overgooien
- [ ] Draaisteen updates correctly
- [ ] Winnaar bepaling correct
- [ ] Inzet pot tracking (if enabled)

**vs Computer (spel_vs_computer.html):**
- [ ] All solo mode features work
- [ ] Computer turn executes (no freeze)
- [ ] Computer decision logging in console
- [ ] AI personality displays correctly
- [ ] Computer reroll decisions varied
- [ ] Computer blind/open mix realistic
- [ ] Computer Mexico decisions strategic
- [ ] Statistics update correctly
- [ ] Action log updates in real-time
- [ ] Dice cups animate (3D flip)
- [ ] No JavaScript errors in console

**Spelregels & AI Docs:**
- [ ] Inhoudsopgave links work
- [ ] Scroll tracking highlights active section
- [ ] Code blocks readable (no overflow)
- [ ] Tables responsive on mobile
- [ ] Mobile menu (known issue: no JS)

---

### Edge Case Testing

**Critical Scenarios to Test:**

1. **Mexico Stacking:**
   ```
   Round 1: Player throws Mexico → Computer loses 2 pts
   Round 2: Computer throws Mexico → Player loses 4 pts (stacking!)
   Round 3: Player throws Mexico → Computer loses 6 pts (triple!)
   Expected: Cumulative stacking (2, 4, 6 not 2, 2, 2)
   ```

2. **Vastloper with 3+ Losers:**
   ```
   3 players all throw "32" (lowest)
   Expected: All 3 go to overgooien
   Not: Only 2 players
   ```

3. **Mexico as Slachtoffer:**
   ```
   Player A throws Mexico → chooses Player B as slachtoffer
   Player B is now at risk (2 pts)
   Player B's turn → throws Mexico!
   Expected: Both celebrations, Player B still loses 2 pts from A
   ```

4. **Blind First Throw Rule:**
   ```
   Eerste ronde: beide blind (enforced)
   Voorgooier: gooit blind first throw → kan daarna open
   Achterligger: moet exact patroon volgen
   ```

5. **Last Throw Auto-Lock:**
   ```
   Worplimiet = 3
   Player has thrown 3 times → auto "Klaar"
   Expected: No "Opnieuw Gooien" button enabled
   ```

6. **AI at 1 Life (Desperate Mode):**
   ```
   Computer: 1 life remaining
   Expected: Desperate personality (90% risk)
   Behavior: Takes big risks, rerolls aggressively
   ```

7. **AI with Big Lead (Aggressive Mode):**
   ```
   Computer: 8 lives, Player: 2 lives, 5+ rounds survived
   Expected: Aggressive personality (70% risk)
   Behavior: More blind throws, higher reroll threshold
   ```

---

### Performance Testing

**Lighthouse (Chrome DevTools):**
```bash
# 1. Open page in Chrome
# 2. Open DevTools (F12)
# 3. Go to "Lighthouse" tab
# 4. Select: Performance, Accessibility, Best Practices, SEO
# 5. Click "Analyze page load"

# Target Scores:
# Performance: > 90 (desktop), > 80 (mobile)
# Accessibility: > 95
# Best Practices: > 95
# SEO: > 95
```

**Network Throttling Test:**
```bash
# 1. Open DevTools → Network tab
# 2. Select throttling: "Slow 3G"
# 3. Hard refresh (Ctrl+Shift+R)
# 4. Measure load time

# Target: < 3 seconds total load
```

**Memory Leak Test:**
```bash
# 1. Open DevTools → Memory tab
# 2. Take heap snapshot
# 3. Play 50-100 rondes
# 4. Take another heap snapshot
# 5. Compare: Memory should be stable (~50KB game state)

# If memory grows significantly: investigate listeners, closures
```

---

### Cross-Browser Testing

**Required Browsers:**
| Browser | Version | Priority |
|---------|---------|----------|
| Chrome | Latest 2 | HIGH |
| Firefox | Latest 2 | HIGH |
| Safari | Latest 2 | MEDIUM |
| Edge | Latest 2 | MEDIUM |
| iOS Safari | Latest | HIGH (mobile) |
| Chrome Android | Latest | HIGH (mobile) |

**Testing Tools:**
- **BrowserStack** (paid): Test on real devices
- **Chrome DevTools Device Mode**: Emulate mobile
- **Firefox Responsive Design Mode**: Test breakpoints

**Common Issues:**
- Safari: 3D transforms may not work (check `transform-style: preserve-3d`)
- iOS Safari: Touch events differ from desktop
- Firefox: CSS Grid gaps may render differently

---

## Code Style Guide

### HTML

```html
<!-- 4 spaces indentation -->
<section id="game-container">
    <div class="player-panel">
        <h2>Jij</h2>
        <div class="dice-cup">
            <span class="die">⚀</span>
        </div>
    </div>
</section>

<!-- Semantic elements preferred -->
<header>, <nav>, <main>, <section>, <article>, <footer>
NOT: <div class="header">, <div class="nav">

<!-- Alt text on images -->
<img src="logo.png" alt="Koning Mexico logo" />
NOT: <img src="logo.png" />

<!-- ARIA labels when needed -->
<button aria-label="Gooi dobbelstenen blind">Gooi (Blind)</button>
```

---

### CSS

```css
/* Alfabetische property order (recommended) */
.player-card {
    background: var(--color-gold);
    border: 2px solid var(--color-gold-dark);
    border-radius: 8px;
    padding: 1rem;
    transition: transform 0.3s ease;
}

/* Use CSS custom properties for theming */
:root {
    --color-gold: #D4AF37;
    --space-md: 2rem;
}

.element {
    color: var(--color-gold);  /* NOT: color: #D4AF37; */
    padding: var(--space-md);
}

/* Mobile-first responsive design */
.container {
    width: 100%;  /* Mobile default */
}

@media (min-width: 768px) {
    .container {
        width: 768px;  /* Tablet */
    }
}

@media (min-width: 1024px) {
    .container {
        width: 1024px;  /* Desktop */
    }
}
```

---

### JavaScript

```javascript
// 4 spaces indentation
function computeRiskProfile(gameState) {
    const { computer, player } = gameState;

    // Early return for simple cases
    if (computer.lives <= 1) {
        return { personality: "desperate", risk: 0.9 };
    }

    // Clear variable names
    const isWinning = (computer.lives > player.lives);
    let riskTolerance = 0.5;

    // Single quotes for strings
    const personality = 'neutral';

    // Semicolons required
    return { personality, risk: riskTolerance };
}

// camelCase for variables and functions
const playerThrowCount = 0;
function handlePlayerThrow() { }

// PascalCase for classes (if used)
class GameEngine { }

// UPPER_SNAKE_CASE for constants
const MAX_THROWS_PER_TURN = 3;
const MEXICO_POINTS = 2;

// Descriptive function names (verb + noun)
function updatePlayerLives() { }      // Good
function update() { }                 // Bad (too vague)

// Comment complex logic
function compareThrows(throw1, throw2) {
    // Step 1: Check for Mexico (21) — always wins
    if (throw1 === "21") return -1;

    // Step 2: Check for Dubbels — beats gewone worpen
    const isDouble1 = (throw1[0] === throw1[1]);
    // ...
}
```

**Avoid:**
```javascript
// NO var (use const/let)
var count = 0;  // ❌

// NO magic numbers
if (lives < 2) { }  // ❌
// Use constants:
const DESPERATE_THRESHOLD = 2;
if (lives < DESPERATE_THRESHOLD) { }  // ✅

// NO deeply nested callbacks
doSomething(() => {
    doSomethingElse(() => {
        doAnotherThing(() => { /* ❌ callback hell */ });
    });
});
// Use async/await or break into separate functions

// NO global variables (unless necessary)
window.globalState = { };  // ❌ (except for easter eggs like luckyMode)
```

---

## Debugging Tips

### Console Logging

```javascript
// Useful debug patterns

// 1. Function entry/exit
function handlePlayerThrow(isBlind) {
    console.log('[handlePlayerThrow] called with isBlind:', isBlind);
    // ...
    console.log('[handlePlayerThrow] exit - throw:', gameState.player.currentThrow);
}

// 2. State snapshots
console.log('Game state:', JSON.stringify(gameState, null, 2));

// 3. Conditional logging
if (gameState.player.isMexico) {
    console.log('🎉 MEXICO detected!', gameState.player.currentThrow);
}

// 4. Performance timing
console.time('computeRiskProfile');
const risk = computeRiskProfile(gameState);
console.timeEnd('computeRiskProfile');  // Logs execution time

// 5. Group related logs
console.group('AI Decision');
console.log('Personality:', personality);
console.log('Risk:', risk);
console.log('Should reroll:', shouldReroll);
console.groupEnd();
```

---

### Chrome DevTools Tricks

```javascript
// 1. Debugger statement (pauses execution)
function criticalFunction() {
    debugger;  // Execution stops here (if DevTools open)
    // ...
}

// 2. Conditional breakpoint (in Sources tab)
// Right-click line number → Add conditional breakpoint
// Condition: gameState.player.isMexico === true

// 3. Watch expressions (in Sources tab → Watch panel)
// Add: gameState.player.currentThrow
// Add: gameState.aiPersonality
// Values update live during debugging

// 4. Live expression (Console)
// Type: live gameState.player.lives
// Shows live updates without console.log

// 5. Copy object to clipboard
copy(gameState);  // In console → copies JSON to clipboard
```

---

## Common Pitfalls

### 1. setTimeout Chains

**Problem:**
```javascript
// Multiple setTimeout chains can race
setTimeout(() => {
    finishThrow();
}, 1500);

function finishThrow() {
    setTimeout(() => {
        handlePlayerKeep();
    }, 1000);
}
```

**Solution:**
```javascript
// Add isProcessing flag
let isProcessing = false;

function handlePlayerThrow(isBlind) {
    if (isProcessing) {
        console.warn('[WARNING] Action blocked - already processing');
        return;
    }
    isProcessing = true;

    // ... do work ...

    setTimeout(() => {
        isProcessing = false;
    }, totalProcessingTime);
}
```

---

### 2. Blind Throw Reveal Timing

**Problem:**
```javascript
// Computer blind throw revealed too early
computerDice1.textContent = diceSymbols[die1];  // ❌ Visible immediately
```

**Solution:**
```javascript
// Keep blind throw hidden until comparison
if (isBlind) {
    computerDice1.textContent = "?";
    computerDice2.textContent = "?";
} else {
    computerDice1.textContent = diceSymbols[die1];
    computerDice2.textContent = diceSymbols[die2];
}

// Reveal during comparison (both players simultaneously)
function compareResults() {
    // Reveal both players
    revealDice('player');
    revealDice('computer');
    // Then compare...
}
```

---

### 3. Button State Management

**Problem:**
```javascript
// Buttons not actually disabled (only hidden)
throwBlindButton.style.display = 'none';  // ❌ Can still be triggered
```

**Solution:**
```javascript
// Properly disable buttons
function disableAllButtons() {
    throwBlindButton.disabled = true;
    throwOpenButton.disabled = true;
    revealButton.disabled = true;
    rerollButton.disabled = true;
    keepButton.disabled = true;

    // Optional: Also hide for cleaner UI
    throwBlindButton.style.display = 'none';
}
```

---

### 4. Element Reference Errors

**Problem:**
```javascript
// Old element references after refactoring
const dice1 = document.getElementById('dice1');  // ❌ ID changed
```

**Solution:**
```javascript
// Use const for all DOM references (top of file)
const elements = {
    playerDice1: document.getElementById('playerDice1'),
    playerDice2: document.getElementById('playerDice2'),
    computerDice1: document.getElementById('computerDice1'),
    computerDice2: document.getElementById('computerDice2'),
    // ... all elements
};

// Reference via elements object
elements.playerDice1.textContent = "⚅";

// Validate on page load
function validateElements() {
    Object.keys(elements).forEach(key => {
        if (!elements[key]) {
            console.error(`Element not found: ${key}`);
        }
    });
}
validateElements();
```

---

## Troubleshooting

### "Function not defined" Error

**Cause:** Function called before declaration, or typo in name

**Fix:**
```javascript
// Ensure functions are declared before use
// Or use function declarations (hoisted)

// ✅ Good (function declaration)
function handleThrow() { }

// ❌ Bad if called before declaration (function expression)
const handleThrow = function() { };

// Check spelling
handlePlayerThrow();  // ✅ Correct
handlePlayerThow();   // ❌ Typo
```

---

### "Cannot read property of null"

**Cause:** Element not found in DOM

**Fix:**
```javascript
// Check if element exists before using
const button = document.getElementById('myButton');
if (!button) {
    console.error('Button not found!');
    return;
}
button.addEventListener('click', handleClick);

// Or use optional chaining
button?.addEventListener('click', handleClick);
```

---

### Dice Not Animating

**Cause:** CSS class not applied, or animation timing

**Fix:**
```javascript
// Ensure class is added
diceCup.classList.add('flipped');

// Ensure CSS transition is defined
.dice-cup {
    transition: transform 0.6s ease;
}

// Check if class was removed prematurely
setTimeout(() => {
    diceCup.classList.remove('flipped');
}, 600);  // Must match transition duration
```

---

### AI Making Same Decision Every Time

**Cause:** Missing randomness in risk variance

**Fix:**
```javascript
// Add variance to risk calculation
function applyRiskVariance(risk) {
    const variance = (Math.random() - 0.5) * 0.3;  // ±15%
    return risk * (1 + variance);
}

// Ensure this is called in computeRiskProfile()
risk = applyRiskVariance(risk);
```

---

## Performance Optimization

### Minimize DOM Access

```javascript
// ❌ Bad (DOM access in loop)
for (let i = 0; i < 100; i++) {
    document.getElementById('log').innerHTML += 'Line ' + i + '\n';
}

// ✅ Good (build string first, one DOM update)
let logContent = '';
for (let i = 0; i < 100; i++) {
    logContent += 'Line ' + i + '\n';
}
document.getElementById('log').innerHTML = logContent;
```

---

### Use RequestAnimationFrame for Animations

```javascript
// ❌ Bad (setInterval for animation)
setInterval(() => {
    element.style.left = (parseFloat(element.style.left) + 1) + 'px';
}, 16);

// ✅ Good (requestAnimationFrame)
function animate() {
    element.style.left = (parseFloat(element.style.left) + 1) + 'px';
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

---

### Debounce Expensive Operations

```javascript
// Debounce resize handler
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Expensive operation here
        recalculateLayout();
    }, 250);  // Wait 250ms after last resize event
});
```

---

## Resources

### Essential Reading

- [MDN Web Docs](https://developer.mozilla.org/) — HTML, CSS, JS reference
- [Tailwind CSS Docs](https://tailwindcss.com/docs) — Utility classes
- [Kahneman & Tversky](https://en.wikipedia.org/wiki/Prospect_theory) — Behavioral economics

### Tools

- **VS Code** — Primary editor
- **Chrome DevTools** — Debugging, performance
- **WAVE** — Accessibility checker
- **Lighthouse** — Performance audits
- **Git** — Version control

### Documentation

- [README.md](d:/repos/koningmexico.nl-website/README.md) — Project overview
- [PRD.md](d:/repos/koningmexico.nl-website/PRD.md) — Product spec
- [SPELREGELS.md](d:/repos/koningmexico.nl-website/SPELREGELS.md) — Game rules
- [AI_PSYCHOLOGY.md](d:/repos/koningmexico.nl-website/AI_PSYCHOLOGY.md) — AI details
- [CODE_ANALYSIS.md](d:/repos/koningmexico.nl-website/CODE_ANALYSIS.md) — Code quality

---

**Document Version:** 1.0
**Last Updated:** 2025-12-28
**Maintained By:** Daniel van Melzen

*Complete developer guide for Koning Mexico project.*
