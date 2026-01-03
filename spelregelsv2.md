# Mexico Spelregels v2 - Zoals Geïmplementeerd in Code

**Gegenereerd:** 2026-01-03 (Updated met correcties)
**Bron:** `multiplayer.js` (GameEngine class + Bot logica)
**Doel:** Verifiëren dat de code-logica de spelregels correct implementeert

---

## ⚠️ BELANGRIJKE DISCLAIMER

Dit document beschrijft hoe de code **momenteel** werkt, inclusief **bekende bugs** die niet overeenkomen met de officiële spelregels. Bugs zijn gemarkeerd met 🚨.

---

## 📖 Glossary

### Menselijke Termen

| Term | Betekenis |
|------|-----------|
| **Spel** | Een volledige wedstrijd tussen 2+ spelers, van start (6 levens elk) tot einde (1 speler op 0 levens) |
| **Ronde** | Een onderdeel van een spel waarin beide spelers worpen maken en vergelijken wie wint |
| **Worp** | Een enkele dobbelsteenworp (2 dobbelstenen tegelijk) |
| **Voorgooier** | De speler die als eerste gooit in een ronde en max worpen + patroon vorm bepaalt |
| **Nagooier/Achterligger** | De speler die als tweede gooit; mag patroon volgen of blind escape |
| **Blind gooien** | Gooien zonder de uitkomst te zien (???); **beurt verzegeld** (mag niet meer doorgooien) |
| **Open gooien** | Gooien en de uitkomst direct zien |
| **Vasthouden** | Beslissen om niet meer te gooien en je huidige worp te houden |
| **Onthullen** | Een blinde worp zichtbaar maken (gebeurt altijd na alle worpen) |
| **Mexico** | De hoogste worp: 2-1 of 1-2 (waarde: 1000 punten) |
| **Paar** | Twee dezelfde dobbelstenen (bijv. 6-6, waarde: 600) |
| **Normaal** | Twee verschillende dobbelstenen (niet Mexico, bijv. 6-4 = 64) |
| **Vastloper** | Beide spelers gooien exact hetzelfde → **Overgooien** (mini-game) |
| **Overgooien** | Mini-game na vastloper: simultaan 1x blind; verliezer = verliezer van ronde |
| **Leven** | Een speler begint met 6 levens; bij verlies: -1 (normaal) of -2 (Mexico in ronde) of -(aantal_spelers × 2) bij Mexico vastloper |
| **Dobbelstenen resetten** | Na elke ronde gaan dobbelstenen terug in beker; worpen gaan NOOIT naar volgende ronde |

### Technische Termen (Code)

| Term | Code Locatie | Betekenis |
|------|--------------|-----------|
| `GameEngine` | Line 5594 | Centrale game logica class voor beide modes (bot + multiplayer) |
| `mode` | Line 5596 | `'bot'` of `'multiplayer'` |
| `roundNumber` | Line 5601 | Huidig rondenummer (start bij 1) |
| `isFirstRound` | Line 5602 | `true` voor ronde 1, `false` daarna |
| `maxThrows` | Line 5603 | Max aantal worpen: 1 voor ronde 1, 3 daarna (kan minder als voorgooier eerder vasthoudt) |
| `voorgooierId` | Line 5604 | ID van de speler die voorgooier is |
| `currentTurnId` | Line 5605 | ID van de speler die nu aan de beurt is |
| `isSimultaneous` | Line 5606 | `true` voor ronde 1 (beide gooien tegelijk), `false` daarna (turn-based) |
| `isOvergooien` | **ONTBREEKT** | 🚨 Zou moeten aangeven of we in overgooien mini-game zitten |
| `player` | Line 5611-5623 | State object voor de menselijke speler |
| `opponent` | Line 5626-5634 | State object voor de tegenstander (bot of andere speler) |
| `throwCount` | Line 5619 | Aantal worpen in deze ronde (0, 1, 2, of 3) |
| `currentThrow` | Line 5617 | Numerieke waarde van huidige worp (bijv. 65, 1000 voor Mexico) |
| `displayThrow` | Line 5618 | Weergave voor UI: `'???'` (blind), `'65'`, `'🎉 Mexico!'` |
| `isBlind` | Line 5620 | `true` als worp blind is (niet onthuld) |
| `isMexico` | Line 5621 | `true` als worp Mexico is (2-1 of 1-2) |
| `lives` | Line 5614 | Aantal levens (start: 6, eindigt bij 0) |
| `BotAdapter` | Line 5463 | Adapter voor bot mode (lokale AI) |
| `MultiplayerAdapter` | - | Adapter voor multiplayer mode (server) |
| `botGame.botState` | Line 6357 | Bot's state (throwCount, currentThrow, etc.) |
| `botGame.voorgooier` | Line 6360 | `'bot'` of `'player'` |
| `botGame.voorgooierPattern` | Line 6419 | Array van blind/open flags (bijv. `[false, true]` = open, blind) |

---

## 🎮 Game Structure (CORRECTE SPELREGELS)

```
SPEL (Game)
├── Start: 2+ spelers, elk 6 levens
├── RONDE 1 (First Round - Speciale regels)
│   ├── Beide spelers gooien SIMULTAAN (niet turn-based)
│   ├── Beide spelers MOETEN BLIND gooien
│   ├── Beide spelers mogen MAAR 1x gooien
│   ├── Na beiden gegooid: vergelijking
│   │   ├── Bij vastloper → OVERGOOIEN (zie hieronder)
│   │   └── Verliezer → wordt voorgooier in ronde 2
│   └── Dobbelstenen resetten (worpen verdwijnen)
│
├── RONDE 2+ (Normal Rounds)
│   ├── VOORGOOIER gooit eerst
│   │   ├── Mag 1-3x gooien (max 3)
│   │   ├── Bepaalt MAX WORPEN + PATROON VORM (blind/open)
│   │   ├── Bij BLIND gooien → BEURT VERZEGELD (mag niet meer doorgooien)
│   │   └── Houdt vast → maxThrows wordt gezet
│   │
│   ├── NAGOOIER gooit daarna
│   │   ├── Mag max EVENVEEL worpen als voorgooier
│   │   ├── OPTIE A: Volg patroon van voorgooier
│   │   ├── OPTIE B: BLIND ESCAPE (gooi blind en stop direct)
│   │   ├── Bij BLIND gooien → BEURT VERZEGELD
│   │   └── Houdt vast → vergelijking
│   │
│   ├── VERGELIJKING
│   │   ├── Mexico (1000) wint altijd (tenzij beide Mexico)
│   │   ├── Beide Mexico → VASTLOPER → Overgooien
│   │   ├── Hoogste worp wint
│   │   └── Bij gelijk (niet-Mexico) → VASTLOPER → Overgooien
│   │
│   ├── PENALTY (normale ronde)
│   │   ├── Normale worp: verliezer -1 leven
│   │   └── Mexico worp in ronde: verliezer -2 levens
│   │
│   └── Verliezer → wordt voorgooier in volgende ronde
│   └── Dobbelstenen resetten
│
├── OVERGOOIEN (Mini-game bij vastloper)
│   ├── Treedt op bij VASTLOPER (beide gelijke worp)
│   ├── Dit is GEEN nieuwe ronde, maar zijsprong
│   ├── Beide spelers gooien SIMULTAAN 1x BLIND
│   ├── Onthullen → vergelijk
│   │   ├── Bij nogmaals vastloper → Herhaal overgooien (recursief)
│   │   └── Hoogste worp wint overgooien
│   ├── PENALTY overgooien:
│   │   ├── Als ronde-worp Mexico was → Verliezer -2 levens
│   │   ├── Als ronde-worp BEIDE Mexico → Verliezer -(aantal_spelers × 2) levens
│   │   │   └── 2 spelers: -4 levens, 3 spelers: -6 levens
│   │   ├── Mexico IN overgooien telt NIET dubbel (gewoon winnen)
│   │   └── Normale ronde-worp → Verliezer -1 leven
│   └── Verliezer overgooien = Verliezer van ronde
│   └── Dobbelstenen resetten
│
└── Einde: Als 1 speler 0 levens heeft → ander speler wint
```

---

## 🔄 State Machine (CORRECTE SPELREGELS)

```
┌──────────────────────────────────────────────────────────────┐
│                     GAME START                               │
│  • 2+ players initialized (6 lives each)                    │
│  • roundNumber = 1                                           │
│  • isFirstRound = true                                       │
│  • maxThrows = 1 (first round only!)                        │
│  • isSimultaneous = true                                     │
│  • voorgooierId = random/player                             │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                  ROUND START (First Round)                   │
│  • Both players throw simultaneously                         │
│  • Both MUST throw BLIND (enforced)                         │
│  • Auto-keep after 1 throw                                   │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
                   ┌────┴─────┐
                   │  BOTH    │
                   │  THROW   │
                   │  BLIND   │
                   └────┬─────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                      COMPARISON                              │
│  • Reveal blind throws (500ms delay)                        │
│  • Check for VASTLOPER                                       │
│    ├─ If same (incl. both Mexico) → OVERGOOIEN             │
│    └─ If different → Determine winner                       │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
                 ┌──────┴──────┐
                 │  VASTLOPER? │
                 └──────┬──────┘
                   ↙         ↘
                 YES        NO
                  ↓          ↓
       ┌──────────────┐   ┌─────────────┐
       │  OVERGOOIEN  │   │ APPLY       │
       │  (see below) │   │ PENALTY     │
       └──────┬───────┘   │ • Normal: -1│
              ↓           │ • Mexico: -2│
         (see mini       └─────┬───────┘
          game flow)            ↓
                           Game Over?
                           (lives <= 0)
                           ↙        ↘
                         YES       NO
                          ↓         ↓
                    ┌─────┴───┐  ┌─────────────────────┐
                    │ END     │  │ START NEXT ROUND    │
                    │ GAME    │  │ • roundNumber++     │
                    └─────────┘  │ • isFirstRound=false│
                                 │ • maxThrows=3       │
                                 │ • Loser→voorgooier  │
                                 │ • RESET DICE/STATE  │
                                 └──────┬──────────────┘
                                        ↓
              ┌────────────────────────────────────────┐
              │     NORMAL ROUND (Turn-Based)          │
              │  • Voorgooier throws first (1-3x)      │
              │  • BLIND = SEALED (stop immediately)   │
              │  • Determines maxThrows & pattern      │
              │  • Nagooier follows or blind escape    │
              └──────────────┬─────────────────────────┘
                             ↓
                       ┌─────┴──────┐
                       │ VOORGOOIER │
                       │   TURN     │
                       └─────┬──────┘
                             ↓
                  Throw Open or Blind?
                             ↓
                   ┌─────────┴─────────┐
                   ↓                   ↓
              OPEN THROW          BLIND THROW
                   ↓                   ↓
           canThrowAgain?      SEALED! (auto-keep)
         (if throwCount < 3)          ↓
                   ↓              keepThrow()
         ┌─────────┴─────────┐       ↓
         ↓                   ↓    Switch to
    Throw Again        Keep Throw  Nagooier
         ↓                   ↓
         ↑─(loop)            ↓
                       ┌─────┴──────┐
                       │  NAGOOIER  │
                       │   TURN     │
                       └─────┬──────┘
                             ↓
                  Follow Pattern or Blind Escape?
                             ↓
              ┌──────────────┴──────────────┐
              ↓                             ↓
        FOLLOW PATTERN               BLIND ESCAPE
    (match voorgooier)            (throw blind & stop)
              ↓                             ↓
      Throw according               Immediate keepThrow()
      to pattern                            ↓
              ↓                             ↓
      BLIND = SEALED ←──────────────────────┘
              ↓
        keepThrow()
              ↓
       ┌──────┴──────┐
       │ COMPARISON  │
       └──────┬──────┘
              ↓
         VASTLOPER?
         ↙        ↘
       YES        NO
        ↓          ↓
   OVERGOOIEN   PENALTY
      (mini)     & NEXT
       game      ROUND

┌──────────────────────────────────────────────────────────────┐
│             OVERGOOIEN MINI-GAME (Vastloper)                 │
│  • Triggered by: Same throws (incl. both Mexico)            │
│  • NOT a new round, but side quest                          │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
              ┌─────────────────┐
              │ Store ronde     │
              │ throws (for     │
              │ penalty calc)   │
              └────────┬────────┘
                       ↓
              ┌─────────────────┐
              │ isOvergooien =  │
              │ true            │
              │ isSimultaneous= │
              │ true            │
              └────────┬────────┘
                       ↓
              ┌─────────────────┐
              │ BOTH PLAYERS    │
              │ THROW 1x BLIND  │
              │ (simultaneous)  │
              └────────┬────────┘
                       ↓
              ┌─────────────────┐
              │ REVEAL          │
              └────────┬────────┘
                       ↓
              ┌─────────────────┐
              │ Same throw?     │
              └────────┬────────┘
                  ↙         ↘
               YES         NO
                ↓           ↓
         ┌──────────┐  ┌──────────────┐
         │ REPEAT   │  │ DETERMINE    │
         │OVERGOOIEN│  │ WINNER       │
         └────┬─────┘  └──────┬───────┘
              ↑                ↓
              └───(recursion)  ┌──────────────┐
                               │ APPLY PENALTY│
                               │ • If ronde=  │
                               │   Mexico: -2 │
                               │ • If ronde=  │
                               │   both Mex:  │
                               │   -(N×2)     │
                               │ • Else: -1   │
                               └──────┬───────┘
                                      ↓
                               ┌──────────────┐
                               │isOvergooien= │
                               │false         │
                               └──────┬───────┘
                                      ↓
                               Continue to
                               next round
                               (loser = voorgooier)
```

---

## 📋 Detailed Rules (CORRECTE SPELREGELS)

### 1. Worp Waardes (Line 6155-6163) ✅

**Code:** CORRECT

```javascript
calculateThrowValue(dice1, dice2) {
    if ((dice1 === 2 && dice2 === 1) || (dice1 === 1 && dice2 === 2)) {
        return 1000; // Mexico
    }
    if (dice1 === dice2) {
        return dice1 * 100; // Pair
    }
    return Math.max(dice1, dice2) * 10 + Math.min(dice1, dice2); // Normal
}
```

**Regels:**
- **Mexico (2-1 of 1-2):** Waarde = 1000 (altijd hoogste)
- **Paar (bijv. 6-6, 5-5):** Waarde = `dobbelsteen × 100` (bijv. 6-6 = 600, 5-5 = 500)
- **Normaal (bijv. 6-4, 5-3):** Waarde = `hoogste × 10 + laagste` (bijv. 6-4 = 64, 5-3 = 53)

---

### 2. Dobbelstenen Resetten (Line 6030-6058) ✅

**Code:** CORRECT

**Regel:** Na elke ronde gaan dobbelstenen terug in beker. Alle worp state wordt gereset:
- `throwCount = 0`
- `dice1 = null`, `dice2 = null`
- `currentThrow = null`, `displayThrow = null`
- `isBlind = false`, `isMexico = false`
- `throwHistory = []`

**Belangrijk:** Worpen gaan NOOIT naar volgende ronde.

---

### 3. Blind = Verzegeld 🚨

**CORRECTE REGEL:**
```
Na BLIND gooien MAG JE NIET MEER DOORGOOIEN
Blind = beurt verzegeld
Buttons moeten verdwijnen
```

**CODE BUG:** Line 5745
```javascript
// ❌ FOUT: Alleen check voor eerste ronde
canThrowAgain: this.isFirstRound && isBlind ? false : canThrowAgain
```

**MOET ZIJN:**
```javascript
// ✅ CORRECT: Na elke blind throw = verzegeld
canThrowAgain: isBlind ? false : (this.player.throwCount < this.maxThrows)
```

**Mogelijke Patronen:**
- ✅ Open (stop)
- ✅ Blind (stop - verzegeld)
- ✅ Open, Open (stop)
- ✅ Open, Blind (stop - verzegeld)
- ✅ Open, Open, Open (stop)
- ✅ Open, Open, Blind (stop - verzegeld)
- ❌ Blind, Blind (ONMOGELIJK - eerste blind verzegelt)
- ❌ Open, Blind, Blind (ONMOGELIJK - eerste blind verzegelt)

---

### 4. Patroon Enforcement + Blind Escape 🚨

**CORRECTE REGEL:**

**Voorgooier bepaalt:**
1. **Max aantal worpen** (door vast te houden)
2. **Patroon vorm** (blind/open volgorde)

**Nagooier opties:**
1. **OPTIE A: Volg patroon** - Gooi exact hetzelfde patroon als voorgooier
2. **OPTIE B: Blind escape** - Gooi blind en stop (ongeacht voorgooier patroon)

**Voorbeelden:**

| Voorgooier | Nagooier Optie A (Follow) | Nagooier Optie B (Escape) |
|------------|---------------------------|---------------------------|
| Open (stop) | Open (stop) | Blind (stop) ✅ |
| Blind (stop) | Blind (stop) | Blind (stop) (zelfde) |
| Open, Open (stop) | Open, Open (stop) | Blind (stop) ✅ |
| Open, Blind (stop) | Open, Blind (stop) | Blind (stop) ✅ |
| Open, Open, Open (stop) | Open, Open, Open (stop) | Blind (stop) ✅ |
| Open, Open, Blind (stop) | Open, Open, Blind (stop) | Blind (stop) ✅ |

**CODE STATUS:** Line 6418-6443
- ✅ Pattern enforcement voor bot is geïmplementeerd
- 🚨 Blind escape is NIET geïmplementeerd
- 🚨 Player UI laat mogelijk niet blinde escape toe

---

### 5. Winnaar Bepaling 🚨

**CORRECTE REGEL:**
1. **Mexico wint altijd** (tenzij beide Mexico hebben)
2. **Beide Mexico:** VASTLOPER → Overgooien (NIET voorgooier wint!)
3. **Hoogste worp wint**
4. **Bij gelijk (niet-Mexico):** VASTLOPER → Overgooien

**CODE BUG:** Line 5993-5996
```javascript
// ❌ FOUT: Beide Mexico = voorgooier wint
if (playerThrow === 1000 && opponentThrow === 1000) {
    return this.voorgooierId; // FOUT!
}
```

**MOET ZIJN:**
```javascript
// ✅ CORRECT: Beide Mexico = VASTLOPER (behandel via line 5859 check)
// Deze speciale check moet VERWIJDERD worden
// Laat vastloper check (line 5859) ook Mexico's afhandelen
```

---

### 6. Vastloper → Overgooien 🚨

**CORRECTE REGEL:**

**Definitie:** Beide spelers gooien exact hetzelfde (incl. beide Mexico)

**Actie:**
1. **NIET** hele ronde hergooien
2. **WEL** overgooien mini-game:
   - Sla ronde-worpen op (voor penalty berekening)
   - Beide spelers gooien SIMULTAAN 1x BLIND
   - Onthullen → vergelijk
   - Bij nogmaals vastloper → herhaal overgooien (recursief, geen limiet)
   - Verliezer overgooien = verliezer van ronde

**CODE BUG:** Line 5859-5902
```javascript
// ❌ FOUT: Reset throwCount en start hele ronde opnieuw
this.player.throwCount = 0;
this.opponent.throwCount = 0;

// ❌ FOUT: Turn-based (voorgooier eerst)
if (this.mode === 'bot' && this.voorgooierId === this.opponent.id) {
    // Bot is voorgooier, auto-play bot turn
}
```

**MOET ZIJN:**
```javascript
// ✅ CORRECT: Overgooien = SIMULTAAN 1x blind
this.isOvergooien = true;
this.rondeThrows = {
    player: this.player.currentThrow,
    opponent: this.opponent.currentThrow
};

// Start simultaan overgooien (zoals ronde 1)
this.isSimultaneous = true;
// Force blind, maxThrows = 1
await this.startOvergooien();
```

---

### 7. Penalty System 🚨

**CORRECTE REGEL:**

**Normale ronde (geen vastloper):**
- Normale worp: verliezer -1 leven
- Mexico worp: verliezer -2 levens

**Overgooien (na vastloper):**
- Als ronde-worp normaal was: verliezer -1 leven
- Als ronde-worp Mexico was (1 speler): verliezer -2 levens
- Als ronde-worp BEIDE Mexico: verliezer -(aantal_spelers × 2) levens
  - 2 spelers: -4 levens
  - 3 spelers: -6 levens
  - etc.
- **BELANGRIJK:** Mexico IN overgooien telt NIET dubbel (gewoon winnen)

**CODE STATUS:**
- ✅ Normale ronde penalty correct (line 5909-5932)
- 🚨 Overgooien penalty NIET geïmplementeerd (geen overgooien functie)
- 🚨 Mexico vastloper penalty formule ontbreekt

**Voorbeelden:**

| Scenario | Penalty |
|----------|---------|
| Player 65 vs Bot 54 | Bot -1 leven |
| Player Mexico vs Bot 65 | Bot -2 levens |
| Player 65 vs Bot 65 → Overgooien → Player 54 vs Bot 43 | Bot -1 leven (ronde was normaal) |
| Player Mexico vs Bot 65 → Vastloper? | NEE, Player wint direct, Bot -2 |
| Player Mexico vs Bot Mexico → Overgooien → Player 54 vs Bot 43 | Bot -4 levens (2 spelers × 2) |

---

### 8. Onthullen Timing ✅

**CORRECTE REGEL:**
```
Onthullen gebeurt ALTIJD nadat alle spelers klaar zijn met gooien
Zolang bot/tegenstander gooit → niet onthullen
Dit is het idee achter blind gooien
```

**CODE:** Line 5794-5819 (revealDice)
- ⚠️ Geen check dat opponent klaar is
- Speler kan mogelijk te vroeg onthullen

**AANBEVELING:**
```javascript
revealDice() {
    if (!this.player.isBlind) {
        throw new Error('Throw is not blind!');
    }

    // ✅ ADD: Block reveal tijdens opponent turn
    if (!this.isSimultaneous && this.currentTurnId !== this.player.id) {
        throw new Error('Wacht tot tegenstander klaar is!');
    }

    // ... rest
}
```

---

## 🚨 CODE BUGS SAMENVATTING

### Bug 1: Mexico Vastloper (KRITIEK)
**Locatie:** Line 5993-5996
**Probleem:** Beide Mexico → voorgooier wint
**Correct:** Beide Mexico → VASTLOPER → Overgooien
**Impact:** 🔴 Kritiek - incorrecte spelregel

### Bug 2: Blind = Verzegeld (KRITIEK)
**Locatie:** Line 5745
**Probleem:** Na blind gooien kan speler nog doorgooien (behalve ronde 1)
**Correct:** Na elke blind throw → beurt verzegeld, STOP
**Impact:** 🔴 Kritiek - incorrecte spelregel

### Bug 3: Vastloper = Hele Ronde Hergooien (KRITIEK)
**Locatie:** Line 5859-5902
**Probleem:** Reset throwCount, turn-based hergooi
**Correct:** Overgooien mini-game (simultaan 1x blind)
**Impact:** 🔴 Kritiek - incorrecte spelregel

### Bug 4: Overgooien Penalty (KRITIEK)
**Locatie:** Geen implementatie
**Probleem:** Mexico vastloper penalty formule ontbreekt
**Correct:** aantal_spelers × 2 levens (bijv. 2 spelers = 4 levens)
**Impact:** 🔴 Kritiek - incorrecte penalty

### Bug 5: Blind Escape (MEDIUM)
**Locatie:** Pattern enforcement code
**Probleem:** Nagooier moet exact patroon volgen
**Correct:** Nagooier MAG blind escape (gooi blind en stop)
**Impact:** 🟡 Medium - beperkt strategische opties

### Bug 6: Reveal Timing (LAAG)
**Locatie:** Line 5794-5819
**Probleem:** Geen check dat opponent klaar is
**Correct:** Blokkeer reveal tijdens opponent turn
**Impact:** 🟢 Laag - alleen timing issue

---

## 🔧 IMPLEMENTATIE VOORSTEL

### Fix 1: Mexico Vastloper

**Actie:** Verwijder speciale Mexico check (line 5993-5996)

```javascript
// DELETE LINES 5993-5996
// Both Mexico = tie (voorgooier wins)
// if (playerThrow === 1000 && opponentThrow === 1000) {
//     return this.voorgooierId;
// }
```

**Effect:** Mexico vastloper wordt nu behandeld door vastloper check (line 5859)

---

### Fix 2: Blind = Verzegeld

**Locatie:** Line 5745

**Voor:**
```javascript
canThrowAgain: this.isFirstRound && isBlind ? false : canThrowAgain
```

**Na:**
```javascript
canThrowAgain: isBlind ? false : (this.player.throwCount < this.maxThrows)
```

---

### Fix 3 & 4: Overgooien Mini-Game

**Dit is een GROTE wijziging** die nieuwe functionaliteit vereist:

**Nieuwe properties in GameEngine:**
```javascript
this.isOvergooien = false;
this.rondeThrows = null; // Stores original round throws for penalty calc
```

**Nieuwe functies:**
```javascript
async startOvergooien() {
    // Start simultaan 1x blind mini-game
}

async compareOvergooien() {
    // Compare overgooien throws
    // Check for vastloper (recursive)
    // Apply penalty based on rondeThrows
}
```

**Uitgebreide implementatie vereist:**
1. State management (isOvergooien flag)
2. UI updates (toon "Overgooien!" bericht)
3. Force simultaan blind
4. Penalty berekening met rondeThrows
5. Recursieve vastloper handling

---

## 📊 Status: Code vs Spelregels

| Regel | Code Status | Correct? |
|-------|-------------|----------|
| Worp waardes | Line 6155-6163 | ✅ |
| Dobbelstenen reset | Line 6030-6058 | ✅ |
| Eerste ronde blind | Line 5669-5671 | ✅ |
| Mexico penalty -2 | Line 5912 | ✅ |
| Normale penalty -1 | Line 5912 | ✅ |
| Verliezer→voorgooier | Line 5974 | ✅ |
| **Blind = verzegeld** | Line 5745 | 🚨 BUG |
| **Mexico vastloper** | Line 5993-5996 | 🚨 BUG |
| **Vastloper → Overgooien** | Line 5859-5902 | 🚨 BUG |
| **Overgooien penalty** | Niet geïmplementeerd | 🚨 BUG |
| **Blind escape** | Niet geïmplementeerd | 🚨 BUG |
| Reveal timing | Line 5794 | ⚠️ Check ontbreekt |

---

## ✅ Aanbevolen Volgorde Fixes

### Prioriteit 1: Kritieke Bugs
1. **Blind = Verzegeld** (line 5745) - Eenvoudige 1-line fix
2. **Mexico Vastloper** (line 5993-5996) - Eenvoudige delete

### Prioriteit 2: Overgooien Systeem
3. **Vastloper → Overgooien** (line 5859-5902) - Grote refactor
4. **Overgooien Penalty** - Nieuwe functionaliteit

### Prioriteit 3: Strategie Uitbreiding
5. **Blind Escape** - Medium wijziging
6. **Reveal Timing** - Kleine check toevoegen

---

## 🎯 Next Steps

1. **Akkoord op fixes?**
2. **Begin met Prioriteit 1** (eenvoudige fixes)
3. **Ontwerp Overgooien systeem** (Prioriteit 2)
4. **Test grondig** na elke fix

---

**Generated by:** Claude Sonnet 4.5
**Date:** 2026-01-03 (Updated with corrections)
**Source:** multiplayer.js + User feedback
