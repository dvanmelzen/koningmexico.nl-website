# Koning Mexico - Volledige Spelflow Documentatie

## 📋 Inhoudsopgave
1. [Spel Overzicht](#spel-overzicht)
2. [Initiële Setup](#initiële-setup)
3. [Spelregels](#spelregels)
4. [Eerste Ronde (Speciale Regels)](#eerste-ronde-speciale-regels)
5. [Normale Rondes](#normale-rondes)
6. [Voorgooier/Achterligger Systeem](#voorgooierachterligger-systeem)
7. [Worp Types (Blind vs Open)](#worp-types-blind-vs-open)
8. [Computer AI Beslissingen](#computer-ai-beslissingen)
9. [Vergelijking en Levens](#vergelijking-en-levens)
10. [Vastgooier (Gelijkspel)](#vastgooier-gelijkspel)
11. [Spel Einde](#spel-einde)
12. [Volledige Flow Diagram](#volledige-flow-diagram)

---

## Spel Overzicht

**Koning Mexico** is een dobbelspel voor 2 spelers waarbij elke speler probeert de ander te verslaan door hogere worpen te gooien.

### Basis Concept
- **Spelers**: 2 (Speler vs Computer of Speler vs Speler)
- **Doel**: Tegenstander verslaan door alle levens af te pakken
- **Start Levens**: Beide spelers beginnen met **6 levens**
- **Winnaar**: Eerste die de tegenstander naar 0 levens brengt

### Worp Waardes
Dobbelstenen worden als volgt gescoord (hoogste eerst):

| Worp Type | Voorbeeld | Score (intern) | Display Waarde |
|-----------|-----------|----------------|----------------|
| **Mexico** | 2-1 of 1-2 | 1000 | 21 |
| **Dubbel** | 6-6, 5-5, etc. | 600, 500, etc. | 600, 500, etc. |
| **Normaal** | 6-5, 6-4, etc. | 65, 64, etc. | 65, 64, etc. |

**Voorbeeld Ranking:**
1. Mexico (21) = 1000
2. Zes-Zes (66) = 600
3. Vijf-Vijf (55) = 500
4. Vier-Vier (44) = 400
5. Zes-Vijf (65) = 65
6. Drie-Twee (32) = 32
7. Twee-Een (21, niet Mexico als open) = 21

---

## Initiële Setup

### Game State Structuur
```javascript
gameState = {
    difficulty: 'medium',        // 'easy', 'medium', 'hard'

    player: {
        lives: 6,                // Start levens
        currentThrow: null,      // Huidige worp waarde (intern)
        displayThrow: null,      // Display waarde (21 voor Mexico, etc.)
        throwCount: 0,           // Aantal worpen deze ronde
        isBlind: false,          // Is huidige worp blind?
        dice1: 1,                // Dobbelsteen 1 waarde
        dice2: 1,                // Dobbelsteen 2 waarde
        isMexico: false,         // Is huidige worp een Mexico?
        threwBlindThisRound: false,  // Heeft blind gegooid deze ronde?
        throwHistory: []         // Alle worpen deze ronde
    },

    computer: {
        // Zelfde structuur als player
    },

    currentTurn: 'player',       // Wie is aan de beurt?
    roundNumber: 1,              // Huidige ronde nummer
    isFirstRound: true,          // Is dit de eerste ronde?
    playerToGoFirst: 'player',   // Wie begint deze ronde (voorgooier)
    gameOver: false,             // Is spel afgelopen?
    mexicoCount: 0,              // Aantal Mexico's deze ronde
    maxThrows: 3,                // Max aantal worpen (ingesteld door voorgooier)
    voorgooierPattern: [],       // Patroon van blind/open worpen [true=blind, false=open]

    aiPersonality: null,         // AI persoonlijkheid voor deze ronde
    aiPsychology: {              // AI psychologische staat
        isWinning: false,
        livesAdvantage: 0,
        consecutiveLosses: 0,
        wasDominantLastRound: false,
        playerThreatenedRecently: false,
        roundsSinceLastWin: 0
    }
}
```

---

## Spelregels

### 1. Worp Limieten
- **Standaard**: Maximaal 3 worpen per ronde
- **Voorgooier bepaalt**: Als voorgooier stopt na 2 worpen, mag achterligger ook maar 2 worpen
- **Vastgooier**: Bij gelijkspel → Beide spelers gooien opnieuw met **1 worp**

### 2. Blind vs Open Werpen
- **Blind worp**: Dobbelstenen blijven verborgen onder de beker
- **Open worp**: Dobbelstenen zijn direct zichtbaar
- **Onthullen**: Speler kan blinde worp onthullen met "Laten Zien" knop

### 3. Mexico Regels
- **Mexico waarde**: Altijd 1000 (intern), getoond als 21
- **Mexico teller**: Elke Mexico in een ronde verhoogt de penalty
- **Penalty**: Bij 1 Mexico = 2 levens verlies, bij 2 Mexicos = 4 levens, etc.
- **Blinde Mexico**: Blijft verborgen tot onthulling of vergelijking

### 4. Eerste Ronde (Speciale Regel)
- **VERPLICHT BLIND**: Eerste worp MOET blind zijn voor beide spelers
- **Doel**: Bepalen wie voorgooier wordt in volgende rondes
- **Verliezer**: Wordt voorgooier in ronde 2

---

## Eerste Ronde (Speciale Regels)

### Flow Eerste Ronde

```
START RONDE 1
│
├─> Speler gooit VERPLICHT BLIND
│   │
│   ├─> Dobbelstenen worden gegooid
│   ├─> Resultaat blijft VERBORGEN
│   └─> Worp wordt automatisch vastgezet (geen keuze)
│
├─> Computer gooit VERPLICHT BLIND
│   │
│   ├─> Dobbelstenen worden gegooid
│   ├─> Resultaat blijft VERBORGEN
│   └─> Worp wordt automatisch vastgezet (geen keuze)
│
├─> VERGELIJKING (Beide worpen worden onthuld)
│   │
│   ├─> Hoogste worp wint
│   ├─> Verliezer verliest leven(s)
│   └─> Verliezer wordt voorgooier voor ronde 2
│
└─> NAAR RONDE 2
```

### Code Flow Eerste Ronde

#### 1. Speler Gooit Blind
```javascript
// handlePlayerThrow(isBlind=true)
if (gameState.isFirstRound && player.throwCount === 0 && !isBlind) {
    // BLOKKEER open worp - eerste ronde MOET blind!
    showMessage('⚠️ Eerste ronde moet blind zijn!');
    return;
}

// Force blind
if (gameState.isFirstRound && player.throwCount === 0) {
    isBlind = true;
}

// Gooi dobbelstenen
throwDice('player', true);
```

#### 2. Na Worp (finishThrow)
```javascript
if (isBlind && who === 'player' && gameState.isFirstRound) {
    // Worp blijft verborgen
    showMessage("🙈 Blind gegooid! Worp blijft verborgen. Computer is aan de beurt...");

    // AUTO-KEEP na 1500ms (geen keuze)
    setTimeout(() => {
        handlePlayerKeep();  // Zet worp vast en ga naar computer
    }, 1500);
}
```

#### 3. Computer Beurt (computerFirstRoundTurn)
```javascript
function computerFirstRoundTurn() {
    // Computer gooit ook VERPLICHT blind
    logToConsole('[Computer] EERSTE RONDE - Verplichte blinde worp');

    // Gooi blind
    throwDice('computer', true);

    // Na worp: auto-keep (geen beslissing)
    setTimeout(() => {
        compareResults();  // Vergelijk resultaten
    }, 1500);
}
```

---

## Normale Rondes

### Ronde Setup (Na Eerste Ronde)
```javascript
function startNewRound() {
    gameState.roundNumber++;
    gameState.isFirstRound = false;

    // Reset voor nieuwe ronde
    gameState.mexicoCount = 0;
    gameState.maxThrows = 3;          // Standaard 3 worpen
    gameState.voorgooierPattern = []; // Leeg patroon

    // Reset beide spelers
    player.currentThrow = null;
    player.throwCount = 0;
    player.throwHistory = [];
    player.threwBlindThisRound = false;

    computer.currentThrow = null;
    computer.throwCount = 0;
    computer.throwHistory = [];
    computer.threwBlindThisRound = false;

    // Selecteer nieuwe AI persoonlijkheid (voor variatie)
    selectAIPersonality();

    // Voorgooier begint (verliezer van vorige ronde)
    if (gameState.playerToGoFirst === 'player') {
        showMessage(`🎲 Ronde ${gameState.roundNumber} - Jouw beurt!`);
        enablePlayerButtons();
    } else {
        showMessage(`🎲 Ronde ${gameState.roundNumber} - Computer begint...`);
        setTimeout(() => computerTurn(), 1000);
    }
}
```

---

## Voorgooier/Achterligger Systeem

### Concept
- **Voorgooier**: Speler die als eerste gooit (meestal verliezer van vorige ronde)
- **Achterligger**: Speler die als tweede gooit
- **Regel**: Achterligger MOET het worp-patroon van voorgooier volgen

### Voorgooier Rechten en Plichten

#### Voorgooier Bepaalt:
1. **Aantal Worpen**: Als voorgooier stopt na 2 worpen → achterligger mag maar 2 worpen
2. **Blind/Open Patroon**: Worp 1 blind, worp 2 open, worp 3 blind → achterligger MOET hetzelfde

#### Code: Voorgooier Pattern Recording
```javascript
// Speler is voorgooier
if (gameState.playerToGoFirst === 'player' && !gameState.isFirstRound) {
    // Registreer elke worp in patroon
    gameState.voorgooierPattern.push(isBlind);  // [true] = blind, [false] = open

    logToConsole(`[Voorgooier] Worp ${player.throwCount} - ${isBlind ? 'BLIND' : 'OPEN'}`);
}

// Bij "Laten Staan"
if (gameState.playerToGoFirst === 'player') {
    // Zet de worplimiet voor achterligger
    gameState.maxThrows = player.throwCount;  // Bijv. 2 worpen

    logToConsole(`[Voorgooier] Worplimiet: ${gameState.maxThrows}`);
    logToConsole(`[Voorgooier] Patroon: ${gameState.voorgooierPattern}`);
}
```

### Achterligger Regels

#### Achterligger MOET Volgen:
1. **Zelfde aantal worpen** (of minder als gewenst)
2. **Zelfde blind/open patroon** voor elke worp

#### Code: Pattern Enforcement
```javascript
// Speler is achterligger
if (!gameState.isFirstRound && gameState.playerToGoFirst === 'computer') {
    const throwIndex = player.throwCount;  // Huidige worp index (0-based)

    // Check of voorgooier deze worp heeft gemaakt
    if (throwIndex < gameState.voorgooierPattern.length) {
        const mustBeBlind = gameState.voorgooierPattern[throwIndex];

        // Controleer of speler het patroon volgt
        if (isBlind !== mustBeBlind) {
            const expectedType = mustBeBlind ? 'BLIND' : 'OPEN';
            showMessage(`⚠️ Je moet ${expectedType} gooien op worp ${throwIndex + 1}!`);
            return;  // BLOKKEER de worp
        }
    }
}

// Check worplimiet
if (player.throwCount >= gameState.maxThrows) {
    showMessage('⚠️ Maximum worpen bereikt (voorgooier limiet)!');
    return;  // BLOKKEER de worp
}
```

### Voorbeeld Scenario

**Voorgooier (Computer):**
```
Worp 1: OPEN  → gooit 43
Worp 2: BLIND → gooit 65 (verborgen)
LATEN STAAN

→ maxThrows = 2
→ voorgooierPattern = [false, true]  // [open, blind]
```

**Achterligger (Speler) MOET:**
```
Worp 1: OPEN  (verplicht, volgt patroon)
Worp 2: BLIND (verplicht, volgt patroon)
        OF
        LATEN STAAN na worp 1 (mag eerder stoppen)

❌ Speler mag NIET:
   - Worp 1 BLIND gooien (moet OPEN)
   - Worp 2 OPEN gooien (moet BLIND)
   - Worp 3 gooien (limiet is 2)
```

---

## Worp Types (Blind vs Open)

### Blind Worp Flow

```
SPELER KLIKT "GOOI BLIND"
│
├─> handlePlayerThrow(isBlind=true)
│   ├─> throwCount++
│   ├─> Registreer in voorgooierPattern (als voorgooier)
│   └─> throwDice('player', true)
│
├─> throwDice() - Animatie
│   ├─> Beker schudt
│   ├─> Dobbelstenen rollen (visueel)
│   └─> finishThrow('player', true)
│
├─> finishThrow() - Resultaat Genereren
│   ├─> Genereer random dice1 en dice2
│   ├─> Bereken throwValue en displayValue
│   ├─> VERBERG dobbelstenen (.classList.add('hidden'))
│   ├─> Draai beker om (.classList.add('flipped'))
│   └─> Voeg toe aan throwHistory
│
└─> Beslissing:
    │
    ├─> [Eerste Ronde?]
    │   └─> Auto-keep na 1500ms → handlePlayerKeep()
    │
    ├─> [Max worpen bereikt?]
    │   └─> Auto-keep na 1500ms → handlePlayerKeep()
    │
    └─> [Normale situatie]
        └─> Toon "Laten Zien" knop
            │
            ├─> [Speler klikt "Laten Zien"]
            │   └─> handlePlayerReveal()
            │       ├─> Onthul dobbelstenen
            │       ├─> Toon resultaat
            │       └─> Toon opties (Gooi Open/Blind/Laten Staan)
            │
            └─> [Speler klikt "Laten Staan"]
                └─> handlePlayerKeep() (blijft blind!)
```

### Open Worp Flow

```
SPELER KLIKT "GOOI OPEN"
│
├─> handlePlayerThrow(isBlind=false)
│   ├─> throwCount++
│   ├─> Registreer in voorgooierPattern (als voorgooier)
│   └─> throwDice('player', false)
│
├─> throwDice() - Animatie
│   └─> finishThrow('player', false)
│
├─> finishThrow() - Resultaat Tonen
│   ├─> Genereer dice waardes
│   ├─> Bereken throwValue
│   ├─> TOON dobbelstenen (blijven zichtbaar)
│   └─> Voeg toe aan throwHistory
│
└─> Beslissing:
    │
    ├─> [Max worpen bereikt?]
    │   └─> Auto-keep na 1200ms → handlePlayerKeep()
    │
    └─> [Normale situatie]
        └─> Toon opties:
            ├─> "Gooi Open" (opnieuw gooien)
            ├─> "Gooi Blind" (blinde worp)
            └─> "Laten Staan" → handlePlayerKeep()
```

### Onthullen (Reveal) Flow

```
SPELER KLIKT "LATEN ZIEN"
│
├─> handlePlayerReveal()
│   ├─> player.isBlind = false
│   ├─> Update throwHistory (mark as revealed)
│   ├─> Verwijder 'hidden' class van dobbelstenen
│   ├─> Draai beker terug (remove 'flipped')
│   └─> updateThrowDisplay()
│
├─> Check Mexico
│   └─> [Is Mexico?]
│       └─> celebrateMexico() 🎉
│
└─> Beslissing:
    │
    ├─> [Eerste ronde?]
    │   └─> Auto-keep na 1000ms → computerFirstRoundTurn()
    │
    ├─> [Worp 1 (eerste blinde worp)?]
    │   └─> Auto-keep na 1200ms → handlePlayerKeep()
    │       └─> Special regel: eerste blinde worp = direct vastleggen
    │
    ├─> [Max worpen bereikt?]
    │   └─> Auto-keep na 1200ms → handlePlayerKeep()
    │
    └─> [Normale situatie]
        └─> Toon opties:
            ├─> "Gooi Open"
            ├─> "Gooi Blind"
            └─> "Laten Staan"
```

---

## Computer AI Beslissingen

### AI Persoonlijkheden

De computer heeft 3 persoonlijkheden die elk ronde random gekozen worden:

```javascript
AI_PERSONALITIES = {
    SCARED: {
        name: 'Voorzichtig',
        thresholds: { 1: 61, 2: 61, 3: 31 },
        bluffChance: 0.05,          // 5% bluff kans
        psychologyFactor: 0,        // Geen psychologie
        description: 'Speelt veilig'
    },
    RATIONAL: {
        name: 'Rationeel',
        thresholds: { 1: 61, 2: 65, 3: 22 },
        bluffChance: 0.10,          // 10% bluff kans
        psychologyFactor: 3,        // Kleine psychologie factor
        description: 'Speelt volgens kansberekening'
    },
    AGGRESSIVE: {
        name: 'Agressief',
        thresholds: { 1: 54, 2: 54, 3: 31 },
        bluffChance: 0.20,          // 20% bluff kans
        psychologyFactor: 5,        // Grote psychologie factor
        description: 'Neemt risico'
    }
}
```

### Moeilijkheidsgraden

```javascript
DIFFICULTY_MODIFIERS = {
    easy: {
        psychologyTriggerRate: 0.50,    // 50% kans op psychologie
        thresholdAdjustment: 0.60,      // 40% zwakkere effecten
        bluffChanceMultiplier: 0.50,    // 50% minder bluffen
        mistakeChance: 0.15             // 15% kans op fouten
    },
    medium: {
        psychologyTriggerRate: 0.80,    // 80% kans
        thresholdAdjustment: 1.00,      // Normale effecten
        bluffChanceMultiplier: 1.00,    // Normaal bluffen
        mistakeChance: 0.05             // 5% fouten
    },
    hard: {
        psychologyTriggerRate: 0.95,    // 95% kans
        thresholdAdjustment: 1.30,      // 30% sterkere effecten
        bluffChanceMultiplier: 1.40,    // 40% beter bluffen
        mistakeChance: 0.00             // Geen fouten
    }
}
```

### Computer Beslissing Flow

```
COMPUTER BEURT START
│
├─> Selecteer AI Persoonlijkheid (random, 1x per ronde)
│
├─> EERSTE WORP
│   ├─> Bepaal blind of open
│   │   ├─> Voorgooier? → vrije keuze (meestal 60-80% open)
│   │   └─> Achterligger? → volg voorgooierPattern[0]
│   │
│   ├─> throwDice('computer', blind/open)
│   └─> Evalueer resultaat
│
├─> BESLISSING: STOPPEN OF DOORGOOIEN?
│   │
│   ├─> shouldComputerThrowAgain()
│   │   │
│   │   ├─> [Mexico?] → STOP (altijd)
│   │   │
│   │   ├─> [Max worpen bereikt?] → STOP (verplicht)
│   │   │
│   │   ├─> [Achterligger EN voorgooier gestopt?] → STOP (verplicht)
│   │   │
│   │   ├─> Bereken threshold op basis van:
│   │   │   ├─> AI persoonlijkheid
│   │   │   ├─> Worp nummer (1, 2, of 3)
│   │   │   ├─> Moeilijkheidsgraad
│   │   │   ├─> Psychologie (8 principes)
│   │   │   └─> Random variatie
│   │   │
│   │   ├─> [Huidige score >= threshold?] → STOP
│   │   └─> [Huidige score < threshold?] → GOOI DOOR
│   │
│   ├─> [STOP] → compareResults() of wacht op speler
│   │
│   └─> [GOOI DOOR]
│       ├─> VOLGENDE WORP
│       ├─> Bepaal blind of open (volg patroon als achterligger)
│       └─> Herhaal beslissing proces
│
└─> EINDE COMPUTER BEURT
```

### Psychologie Principes (8 Principes)

De AI gebruikt 8 psychologische principes voor menselijk gedrag:

#### 1. Loss Aversion (Verlies Aversie)
```javascript
if (computer.lives < player.lives) {
    // Computer is aan het verliezen → voorzichtiger
    threshold += 5;
    logToConsole('[Psychologie] Loss Aversion: +5 threshold (verliezend)');
}
```

#### 2. Tilt Mechanics
```javascript
if (consecutiveLosses >= 2) {
    // 2+ verlies op rij → gefrustreerd → riskanter
    threshold -= 8;
    logToConsole('[Psychologie] Tilt: -8 threshold (gefrustreerd)');
}
```

#### 3. Competence Doubt (After Dominant Loss)
```javascript
if (wasDominantLastRound && lostLastRound) {
    // Was dominant maar verloor toch → twijfel → voorzichtiger
    threshold += 6;
    logToConsole('[Psychologie] Competence Doubt: +6 threshold');
}
```

#### 4. Intimidation Effect
```javascript
if (playerThreatenedRecently) {
    // Speler gooide hoog → geïntimideerd → voorzichtiger
    threshold += 4;
    logToConsole('[Psychologie] Intimidatie: +4 threshold');
}
```

#### 5. Winning Complacency
```javascript
if (isWinning && livesAdvantage >= 3) {
    // Grote voorsprong → overmoedig → riskanter
    threshold -= 5;
    logToConsole('[Psychologie] Complacency: -5 threshold (overmoedig)');
}
```

#### 6. Desperation Effect
```javascript
if (computer.lives <= 2 && player.lives >= 4) {
    // Bijna game over → wanhopig → riskanter
    threshold -= 10;
    logToConsole('[Psychologie] Wanhoop: -10 threshold');
}
```

#### 7. Bandwagon Effect
```javascript
if (playerThreatenedRecently) {
    // Speler gooide hoog → "ik moet ook hoog gooien" → riskanter
    threshold -= 3;
    logToConsole('[Psychologie] Bandwagon: -3 threshold');
}
```

#### 8. Victory Rush
```javascript
if (roundsSinceLastWin === 0) {
    // Net gewonnen → zelfvertrouwen → riskanter
    threshold -= 4;
    logToConsole('[Psychologie] Victory Rush: -4 threshold');
}
```

---

## Vergelijking en Levens

### Compare Results Flow

```
VERGELIJKING START
│
├─> Onthul alle blinde worpen
│   ├─> player.isBlind = false
│   ├─> computer.isBlind = false
│   ├─> Toon dobbelstenen
│   └─> Update throwHistory (mark revealed)
│
├─> [Was er een blinde worp?]
│   ├─> JA: Toon onthullingsscherm (1800ms wachttijd)
│   └─> NEE: Ga direct verder
│
├─> Bereken Penalty
│   └─> penalty = mexicoCount > 0 ? mexicoCount * 2 : 1
│       Voorbeelden:
│       - 0 Mexico: 1 leven verlies
│       - 1 Mexico: 2 levens verlies
│       - 2 Mexicos: 4 levens verlies
│       - 3 Mexicos: 6 levens verlies
│
├─> Vergelijk Scores
│   │
│   ├─> [Speler > Computer]
│   │   ├─> computer.lives -= penalty
│   │   ├─> winner = 'player'
│   │   ├─> playerToGoFirst = 'computer' (voor volgende ronde)
│   │   └─> showMessage("🎉 Je wint!")
│   │
│   ├─> [Computer > Speler]
│   │   ├─> player.lives -= penalty
│   │   ├─> winner = 'computer'
│   │   ├─> playerToGoFirst = 'player' (voor volgende ronde)
│   │   └─> showMessage("😔 Computer wint!")
│   │
│   └─> [Gelijkspel]
│       └─> VASTGOOIER! (zie volgende sectie)
│
├─> Update AI Psychologie
│   └─> updatePsychologyAfterRound(computerWon)
│
├─> Update UI
│   ├─> Update levens display
│   └─> Update geschiedenis
│
└─> Check Game Over
    │
    ├─> [player.lives <= 0 OR computer.lives <= 0]
    │   └─> endGame()
    │
    └─> [Anders]
        └─> setTimeout(() => startNewRound(), 2000)
```

### Code: Compare Results
```javascript
function compareResults() {
    // Onthul blinde worpen
    if (player.isBlind) {
        player.isBlind = false;
        elements.playerDice1.classList.remove('hidden');
        elements.playerDice2.classList.remove('hidden');
        elements.playerDiceCup.classList.remove('flipped');
    }
    if (computer.isBlind) {
        computer.isBlind = false;
        elements.computerDice1.classList.remove('hidden');
        elements.computerDice2.classList.remove('hidden');
        elements.computerDiceCup.classList.remove('flipped');
    }

    // Bereken penalty
    const penalty = gameState.mexicoCount > 0
        ? gameState.mexicoCount * 2
        : 1;

    // Vergelijk
    if (player.currentThrow > computer.currentThrow) {
        computer.lives -= penalty;
        gameState.playerToGoFirst = 'computer';
        // Player wint
    }
    else if (computer.currentThrow > player.currentThrow) {
        player.lives -= penalty;
        gameState.playerToGoFirst = 'player';
        // Computer wint
    }
    else {
        // VASTGOOIER (gelijkspel)
        handleVastgooier();
    }

    // Check game over
    if (player.lives <= 0 || computer.lives <= 0) {
        endGame();
    } else {
        setTimeout(() => startNewRound(), 2000);
    }
}
```

---

## Vastgooier (Gelijkspel)

### Vastgooier Regels

Bij **gelijkspel** (beide spelers gooien exact dezelfde waarde):

1. **NIEMAND verliest levens** (nog niet)
2. **Mexico teller blijft staan** - alle Mexicos tellen mee voor penalty
3. **Beide spelers gooien opnieuw** met maximaal **1 worp**
4. **Zelfde voorgooier** blijft voorgooier
5. **Herhaalt tot iemand wint**

### Vastgooier Flow

```
GELIJKSPEL GEDETECTEERD
│
├─> Toon bericht: "🔄 VASTGOOIER! Beide: [score]"
│
├─> Mexico teller blijft STAAN
│   └─> logToConsole("Mexico teller blijft: X Mexicos")
│
├─> Reset voor overgooien:
│   ├─> maxThrows = 1 (BELANGRIJK!)
│   ├─> voorgooierPattern = []
│   ├─> player.currentThrow = null
│   ├─> player.throwCount = 0
│   ├─> computer.currentThrow = null
│   └─> computer.throwCount = 0
│
├─> Behoud:
│   ├─> gameState.mexicoCount (blijft staan!)
│   ├─> gameState.playerToGoFirst (zelfde voorgooier)
│   └─> player/computer.lives (geen levens verloren)
│
└─> Start overgooien:
    │
    ├─> [Voorgooier === 'player']
    │   └─> enablePlayerButtons()
    │       └─> Speler gooit (max 1 worp)
    │
    └─> [Voorgooier === 'computer']
        └─> computerTurn()
            └─> Computer gooit (max 1 worp)
```

### Vastgooier Code
```javascript
// In continueCompareResults()
if (player.currentThrow === computer.currentThrow) {
    // VASTGOOIER!
    showMessage(`🔄 VASTGOOIER! Beide: ${displayValue}`);

    // Mexico count blijft staan!
    logToConsole(`[VASTGOOIER] Mexico teller blijft: ${gameState.mexicoCount}`);

    // Stel worplimiet in op 1
    gameState.maxThrows = 1;
    gameState.voorgooierPattern = [];

    // Reset throws
    player.currentThrow = null;
    player.throwCount = 0;
    computer.currentThrow = null;
    computer.throwCount = 0;

    // Start overgooien (zelfde voorgooier)
    setTimeout(() => {
        if (gameState.playerToGoFirst === 'player') {
            showMessage('Overgooien! Jouw beurt (1 worp)!');
            enablePlayerButtons();
        } else {
            showMessage('Overgooien! Computer begint (1 worp)...');
            computerTurn();
        }
    }, 2000);
}
```

### Vastgooier Scenario Voorbeeld

```
RONDE START:
Speler gooit: 65
Computer gooit: 65
→ VASTGOOIER!

OVERGOOIEN (max 1 worp):
Speler gooit: Mexico (21) 🎉
Computer gooit: 54
→ Speler wint! Computer verliest 1 leven (geen Mexico penalty bij overgooien!)

---

RONDE START:
Speler gooit: Mexico (21)
Computer gooit: Mexico (21)
→ VASTGOOIER! (beide Mexicos tellen NOG NIET)

OVERGOOIEN (max 1 worp):
Speler gooit: 43
Computer gooit: 65
→ Computer wint! Speler verliest 1 leven (geen penalty - overgooien telt alleen hoogste score)
```

---

## Spel Einde

### Game Over Condities

```javascript
// Check na elke ronde vergelijking
if (player.lives <= 0 || computer.lives <= 0) {
    gameState.gameOver = true;
    endGame();
}
```

### End Game Flow

```
SPEL EINDE GEDETECTEERD
│
├─> Bepaal winnaar:
│   ├─> [player.lives <= 0] → Computer wint
│   └─> [computer.lives <= 0] → Speler wint
│
├─> Toon eindscherm:
│   ├─> Confetti animatie (bij speler winst)
│   ├─> "🎉 Je hebt gewonnen!" of "😔 Computer wint!"
│   ├─> Finalscore: Speler X - Y Computer
│   └─> Spel statistieken (optioneel)
│
├─> Disable alle knoppen
│
└─> Toon "Nieuw Spel" knop
    └─> onclick: location.reload()
```

### End Game Code
```javascript
function endGame() {
    gameState.gameOver = true;
    disablePlayerButtons();

    let message = '';

    if (player.lives <= 0) {
        // Computer wint
        message = `
            <h2>😔 Game Over!</h2>
            <p>Computer heeft gewonnen!</p>
            <p>Finalscore: Jij ${player.lives} - ${computer.lives} Computer</p>
        `;
    } else {
        // Speler wint
        message = `
            <h2>🎉 GEFELICITEERD!</h2>
            <p>Je hebt gewonnen!</p>
            <p>Finalscore: Jij ${player.lives} - ${computer.lives} Computer</p>
        `;

        // Confetti animatie
        celebrateVictory();
    }

    showMessage(message, 'success');

    // Toon "Nieuw Spel" knop
    elements.newGameBtn.classList.remove('hidden');
}
```

---

## Volledige Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      SPEL START                             │
│  - Beide spelers: 6 levens                                  │
│  - roundNumber = 1                                          │
│  - isFirstRound = true                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  EERSTE RONDE (Speciaal)                    │
├─────────────────────────────────────────────────────────────┤
│  1. Speler gooit VERPLICHT BLIND                            │
│     └─> Worp blijft verborgen, auto-keep                    │
│  2. Computer gooit VERPLICHT BLIND                          │
│     └─> Worp blijft verborgen, auto-keep                    │
│  3. VERGELIJKING (onthul beide)                             │
│     └─> Verliezer wordt voorgooier voor ronde 2            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               NORMALE RONDE (2+)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VOORGOOIER BEURT (verliezer vorige ronde)                 │
│  │                                                          │
│  ├─> Kies blind of open (vrije keuze)                      │
│  ├─> Gooi dobbelstenen                                     │
│  ├─> Evalueer: genoeg of doorgooien?                       │
│  │   └─> [Doorgooien] → Herhaal (max 3 worpen)            │
│  └─> [Laten staan] → Zet maxThrows en patroon              │
│                                                             │
│  ↓                                                          │
│                                                             │
│  ACHTERLIGGER BEURT (winnaar vorige ronde)                 │
│  │                                                          │
│  ├─> MOET voorgooier patroon volgen                        │
│  │   └─> Worp 1 blind? → achterligger MOET blind          │
│  │   └─> Voorgooier stopte na 2? → max 2 worpen           │
│  │                                                          │
│  ├─> Gooi dobbelstenen (volg patroon!)                     │
│  ├─> Evalueer: genoeg of doorgooien?                       │
│  │   └─> [Doorgooien] → Herhaal (tot maxThrows)           │
│  └─> [Laten staan] → Klaar voor vergelijking               │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERGELIJKING                             │
├─────────────────────────────────────────────────────────────┤
│  1. Onthul alle blinde worpen                               │
│  2. Bereken penalty (mexicoCount × 2 of 1)                  │
│  3. Vergelijk scores:                                       │
│     ├─> Speler > Computer → Computer -penalty levens       │
│     ├─> Computer > Speler → Speler -penalty levens         │
│     └─> Gelijkspel → VASTGOOIER (overgooien, 1 worp)       │
│  4. Update voorgooier voor volgende ronde (verliezer)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
              [Check Game Over?]
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
    [JA: Lives ≤ 0]          [NEE: Beide > 0]
         │                         │
         ▼                         ▼
  ┌─────────────┐          ┌──────────────┐
  │  SPEL EINDE │          │ NIEUWE RONDE │
  │  - Winnaar  │          │  roundNumber++│
  │  - Stats    │          │  Reset values │
  │  - Nieuw?   │          └──────┬───────┘
  └─────────────┘                 │
                                  │
                    ┌─────────────┘
                    │
                    └─> Terug naar "NORMALE RONDE"
```

---

## Aanvullende Details

### Throw History Tracking

Elke worp wordt opgeslagen in `throwHistory`:

```javascript
throwHistory: [
    {
        value: 65,           // Interne score
        displayValue: 65,    // Display waarde
        isBlind: false,      // Huidige staat (kan veranderen bij reveal)
        wasBlind: true,      // Originele staat (blijft)
        isMexico: false      // Is dit een Mexico?
    },
    // ... meer worpen
]
```

### Mexico Penalty Berekening

```javascript
// Aan het begin van ronde
gameState.mexicoCount = 0;

// Bij elke Mexico worp
if (isMexico) {
    gameState.mexicoCount++;
    logToConsole(`Mexico teller: ${gameState.mexicoCount}`);
}

// Bij vergelijking
const penalty = gameState.mexicoCount > 0
    ? gameState.mexicoCount * 2
    : 1;

// Voorbeelden:
// 0 Mexicos → penalty = 1
// 1 Mexico  → penalty = 2
// 2 Mexicos → penalty = 4
// 3 Mexicos → penalty = 6
```

### UI State Management

```javascript
// Enable/Disable buttons
function enablePlayerButtons() {
    elements.throwOpenBtn.disabled = false;
    elements.throwBlindBtn.disabled = false;
    elements.throwOpenBtn.classList.remove('hidden');
    elements.throwBlindBtn.classList.remove('hidden');
}

function disablePlayerButtons() {
    elements.throwOpenBtn.disabled = true;
    elements.throwBlindBtn.disabled = true;
    elements.keepBtn.disabled = true;
    elements.revealBtn.disabled = true;
}

// Show specific buttons
function showRevealButton() {
    elements.revealBtn.classList.remove('hidden');
    elements.revealBtn.disabled = false;
    elements.throwOpenBtn.classList.add('hidden');
    elements.throwBlindBtn.classList.add('hidden');
    elements.keepBtn.classList.add('hidden');
}
```

### Console Logging

Voor debugging heeft het spel uitgebreide logging:

```javascript
function logToConsole(message) {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

// Voorbeelden:
logToConsole('[Speler] Worp 1 - BLIND');
logToConsole('[Computer] Score 65 >= threshold 61 → STOP');
logToConsole('[Psychologie] Tilt: -8 threshold (2 losses)');
logToConsole('[VASTGOOIER] Mexico teller blijft: 2');
```

---

## Samenvatting Belangrijkste Regels

### ✅ MOET Regels
1. **Eerste ronde**: MOET blind zijn (beide spelers)
2. **Achterligger**: MOET voorgooier patroon volgen (blind/open per worp)
3. **Worplimiet**: Achterligger mag NIET meer worpen dan voorgooier
4. **Vastgooier**: Bij gelijkspel → overgooien met max 1 worp

### 🎲 Worp Regels
1. Maximum **3 worpen** per ronde (tenzij voorgooier eerder stopt)
2. **Blind worp**: Dobbelstenen blijven verborgen tot reveal of vergelijking
3. **Open worp**: Dobbelstenen direct zichtbaar
4. **Mexico**: Altijd hoogste worp (wint van alles)

### 💔 Leven Regels
1. Standaard verlies: **1 leven**
2. Bij Mexico: **2 levens** per Mexico in die ronde
3. Bij meerdere Mexicos: **mexicoCount × 2** levens
4. Vastgooier: Geen levens verloren tot iemand wint

### 🏆 Winnen
1. Eerste speler naar **0 levens** verliest
2. Andere speler wint het spel
3. Nieuwe ronde begint na elk vergelijking (tenzij game over)

---

## Multiplayer Aanpassingen

Voor een speler vs speler versie:

1. **Vervang `computer` object** met `player2` object
2. **Vervang AI beslissingen** met button inputs voor player 2
3. **Behoud alle regels** (voorgooier, achterligger, blind/open, etc.)
4. **Voeg turn indicator** toe (wie is aan de beurt)
5. **Optioneel**: Verberg scherm tussen beurten (privacy blind worpen)

```javascript
// Voorbeeld aanpassing:
gameState = {
    player1: { /* ... */ },
    player2: { /* ... */ },  // Was 'computer'
    currentTurn: 'player1',  // Wie is aan de beurt
    playerToGoFirst: 'player1'
}
```

---

**Einde documentatie**

Deze documentatie beschrijft het volledige spelverloop van Koning Mexico.
Voor code implementatie details, zie: `game_vs_computer.js`
