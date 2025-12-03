# 🎲 Koning Mexico - Complete Spelregels
**Reverse-engineered vanuit de game logica**

---

## 📋 Inhoudsopgave

1. [Overzicht](#overzicht)
2. [Spel Setup](#spel-setup)
3. [Basis Concepten](#basis-concepten)
4. [Worp Waardes](#worp-waardes)
5. [Complete Game Flow](#complete-game-flow)
6. [Voorgooier Systeem](#voorgooier-systeem)
7. [Beslisbomen](#beslisbomen)
8. [Speciale Regels](#speciale-regels)
9. [Instellingen](#instellingen)

---

## 🎯 Overzicht

**Koning Mexico** is een digitaal dobbelspel waarbij je probeert te overleven door strategisch te gooien met twee dobbelstenen. Je start met **6 levens** en het doel is om zo lang mogelijk in het spel te blijven.

### Kern Mechanica
- **2 dobbelstenen** in een beker
- **Open** of **blind** gooien
- **Worplimiet** bepaalt maximum aantal worpen per ronde (1-3)
- **Voorgooier** bepaalt het patroon voor anderen
- **Resultaat keuze** na elke ronde: Gewonnen, Vast, of Verloren

---

## 🎮 Spel Setup

### Startpositie
```
Levens: 6 ● ● ● ● ● ●
Worpen: 0/3
Voorgooier: NEE
Eerste Ronde: JA
```

### Spel Elementen
- **Levens Display**: Toont huidige levens (kleurt rood bij ≤2)
- **Worpteller**: Huidige worp / Maximum worpen
- **Dobbelstenen**: Twee dobbelstenen met Unicode symbolen ⚀-⚅
- **Worp Resultaat**: Berekende waarde van de worp
- **Actie Knoppen**: Context-afhankelijke opties

---

## 🧩 Basis Concepten

### 1. Open vs Blind Gooien

#### Open Gooien 👁️
- Dobbelstenen zijn **direct zichtbaar** na de worp
- Je ziet meteen wat je hebt gegooid
- Je kunt beslissen: nog een keer gooien of stoppen

#### Blind Gooien 🙈
- Dobbelstenen blijven **verborgen** na de worp
- Je ziet alleen "🙈" als resultaat
- Acties:
  - **"Laten Zien"**: Onthul de dobbelstenen
  - **Bij eerste worp**: Na onthullen → DIRECT naar resultaat keuze (geen hergooien!)
  - **Bij latere worpen**: Na onthullen → normale opties (wel hergooien mogelijk)

### 2. Worplimiet
Het maximum aantal keer dat je mag gooien in één ronde:
- **1 worp**: Eén kans, daarna resultaat kiezen
- **2 worpen**: Twee kansen, dan stoppen
- **3 worpen** (standaard): Drie kansen

**Voorgooier override**: Als een voorgooier een patroon instelt, vervangt dat de worplimiet.

### 3. Voorgooier Rol
De **voorgooier** heeft speciale macht:
- ✅ Bepaalt het **patroon** van worpen (open/blind) voor anderen
- ✅ Stelt dit patroon in door zelf te gooien
- ✅ Anderen moeten dit patroon exact volgen
- ❌ Je wordt NOOIT voorgooier als je wint
- ✅ Je wordt ALTIJD voorgooier als je verliest

---

## 🎲 Worp Waardes

### Berekening Logica

```javascript
// Pseudo-code van worp berekening
if (beide dobbelstenen gelijk) {
    waarde = dobbelsteen × 100
    // 6-6 = 600, 5-5 = 500, ..., 1-1 = 100
}
else if ((hoog=2 EN laag=1) OF (hoog=1 EN laag=2)) {
    waarde = 21  // MEXICO! 👑
}
else {
    waarde = hoogste×10 + laagste
    // 6-5 = 65, 5-4 = 54, 4-1 = 41, etc.
}
```

### Rangorde (Hoog → Laag)

| Rank | Worp | Waarde | Type | Omschrijving |
|------|------|--------|------|--------------|
| 1 | 2-1 of 1-2 | **21** | **MEXICO** 👑 | De koning der worpen! |
| 2 | 6-6 | 600 | Dubbel | Hoogste dubbel |
| 3 | 5-5 | 500 | Dubbel | |
| 4 | 4-4 | 400 | Dubbel | |
| 5 | 3-3 | 300 | Dubbel | |
| 6 | 2-2 | 200 | Dubbel | |
| 7 | 1-1 | 100 | Dubbel | Laagste dubbel |
| 8 | 6-5 | 65 | Normaal | Hoogste normale worp |
| 9 | 6-4 | 64 | Normaal | |
| ... | ... | ... | ... | |
| 20 | 3-1 | 31 | Normaal | Laagste normale worp |

### Mexico Speciale Regel 🎉
**Mexico (21) is ALTIJD direct zichtbaar**, zelfs als je blind gooit!
- Automatische onthulling
- Confetti celebratie
- Speciale Mexico knoppen verschijnen

---

## 🔄 Complete Game Flow

### Fase 1: Start van de Ronde

```
┌─────────────────────────────┐
│  START NIEUWE RONDE         │
└─────────────────────────────┘
           ↓
    ┌──────────────┐
    │ Eerste Ronde?│
    └──────────────┘
         ↓           ↓
       JA           NEE
         ↓           ↓
  ┌──────────────┐  │
  │ Voorgooier?  │  │
  └──────────────┘  │
    ↓          ↓    │
   JA         NEE   │
    ↓          ↓    │
    │    [FORCE BLIND] ←─────┘
    │          ↓
    └─→ [Toon "Gooi Open" / "Gooi Blind" knoppen]
```

**Beslissing Tree:**
1. **Als eerste ronde EN geen voorgooier** → FORCE blind (geen keuze)
2. **Anders** → Keuze: Open of Blind gooien

### Fase 2: Gooien

```
     ┌───────────────┐
     │  GOOI DICE    │
     └───────────────┘
            ↓
     [Animatie: beker schudt]
            ↓
     [Dobbelstenen rollen]
            ↓
     ┌───────────────┐
     │ Bereken waarde│
     └───────────────┘
            ↓
    ┌───────────────────┐
    │ Check: Mexico?    │
    └───────────────────┘
      ↓              ↓
     JA             NEE
      ↓              ↓
[ONTHUL ALTIJD]   ┌────────┐
      ↓           │ Blind? │
[MEXICO PARTY!]   └────────┘
      ↓              ↓         ↓
[Mexico knoppen]  JA        NEE
                   ↓         ↓
         [Verberg dice]  [Toon dice]
                   ↓         ↓
         [Toon "Laten Zien"]  [Toon opties]
```

### Fase 3: Na de Worp

#### 3A. Open Worp Flow

```
┌─────────────────────────┐
│ Open worp: waarde = XX  │
└─────────────────────────┘
           ↓
    ┌──────────────────┐
    │ throwCount >= max?│
    └──────────────────┘
         ↓          ↓
        JA         NEE
         ↓          ↓
   [RESULTAAT    [KEUZE MENU]
    KNOPPEN]          ↓
         ↓       ┌────────────────┐
         │       │ 1. Gooi Opnieuw│
         │       │    - Open      │
         │       │    - Blind     │
         │       │ 2. Laten Staan │
         │       └────────────────┘
         ↓              ↓
    [GA NAAR FASE 4]   ↓
                  ┌────┴────┐
                  ↓         ↓
             [Opnieuw]  [Staan]
                  ↓         ↓
           [GA NAAR     [GA NAAR
            FASE 2]      FASE 4]
```

#### 3B. Blinde Worp Flow

```
┌─────────────────────────┐
│ Blinde worp: 🙈         │
└─────────────────────────┘
           ↓
    [Toon "Laten Zien"]
           ↓
    [Gebruiker klikt]
           ↓
    ┌──────────────────┐
    │ Onthul dobbelstenen│
    └──────────────────┘
           ↓
    ┌──────────────────┐
    │ throwCount == 1? │  ← NIEUWE REGEL!
    └──────────────────┘
         ↓          ↓
        JA         NEE
         ↓          ↓
   [RESULTAAT    [KEUZE MENU]
    KNOPPEN]      (zie Open Flow)
         ↓              ↓
    [GA NAAR      [Normale opties:
     FASE 4]       hergooien mogelijk]
```

**Belangrijke Regel**: Bij de **eerste blinde worp** mag je NIET meer hergooien na onthullen!

#### 3C. Mexico Flow

```
┌─────────────────────────┐
│ MEXICO! (21) 🎉         │
└─────────────────────────┘
           ↓
    [Altijd zichtbaar]
           ↓
    [Confetti animatie]
           ↓
    [Mexico celebratie]
           ↓
   ┌────────────────────┐
   │ MEXICO KEUZES:     │
   │ 1. Laten Staan     │
   │ 2. Vast            │
   └────────────────────┘
           ↓
    [GA NAAR FASE 4]
```

### Fase 4: Resultaat Keuze

```
┌──────────────────────────────┐
│  KIES RESULTAAT VAN RONDE    │
└──────────────────────────────┘
           ↓
   ┌───────────────────┐
   │  3 Opties:        │
   │  1. Ronde Gehaald │
   │  2. Vast          │
   │  3. Verloren      │
   └───────────────────┘
      ↓       ↓       ↓
      │       │       │
  ┌───┘   ┌───┘   └───┐
  ↓       ↓           ↓
[WON]   [VAST]      [LOST]
```

#### Optie 1: Ronde Gehaald (Won)

```
┌─────────────────────┐
│ RONDE GEHAALD! ✓    │
└─────────────────────┘
        ↓
  [Levens blijven gelijk]
        ↓
  [Kleine confetti]
        ↓
  [Voorgooier = OFF]
        ↓
  [Reset voor nieuwe ronde]
        ↓
  [START FASE 1]
```

**Effecten:**
- ✅ Levens blijven intact
- ❌ Je bent NIET de voorgooier
- 🎉 Kleine viering
- ♻️ Nieuwe ronde begint

#### Optie 2: Vast (Tie)

```
┌─────────────────────┐
│ VAST! ⚔️            │
└─────────────────────┘
        ↓
  [Tie-breaker mode]
        ↓
  [maxThrows = throwCount + 1]
        ↓
  [Exact 1 extra worp toegestaan]
        ↓
  [Toon "Gooi Open" / "Gooi Blind"]
        ↓
  [Gebruiker gooit]
        ↓
  [Direct naar RESULTAAT KEUZE]
```

**Effecten:**
- ⚡ Je krijgt **exact 1 extra worp**
- 🎲 Keuze: open of blind
- 🔄 Na die worp: direct weer resultaat kiezen

#### Optie 3: Verloren (Lost)

```
┌─────────────────────┐
│ VERLOREN! ❌        │
└─────────────────────┘
        ↓
  [lives = lives - 1]
        ↓
   ┌──────────────┐
   │ lives <= 0?  │
   └──────────────┘
      ↓          ↓
     JA         NEE
      ↓          ↓
  [GAME OVER]  [Vervolg]
      ↓          ↓
  [Confirm:]  [Voorgooier = ON] 👑
  [Restart?]    ↓
      ↓       [Reset voor nieuwe ronde]
      ↓          ↓
  [JA/NEE]   [START FASE 1]
```

**Effecten:**
- ❌ Verlies **1 leven**
- 👑 Je wordt **automatisch voorgooier**
- 💀 Bij 0 levens: Game Over
- ♻️ Anders: nieuwe ronde als voorgooier

---

## 👑 Voorgooier Systeem

### Wat is een Voorgooier?

De voorgooier heeft **controle** over hoe de ronde verloopt voor alle spelers:
- Bepaalt of worpen **open** of **blind** moeten zijn
- Stelt een **patroon** in door zelf te gooien
- Dit patroon wordt **verplicht** voor andere spelers

### Voorgooier Activeren

#### Handmatig
```
[Klik "Ben jij de Voorgooier?" toggle]
     ↓
[Voorgooier = ON] 👑
     ↓
[Pattern setting mode actief]
     ↓
[Worplimiet knoppen disabled]
```

#### Automatisch
```
[Je verliest een ronde]
     ↓
[Voorgooier = AUTOMATISCH ON] 👑
     ↓
[Nieuwe ronde start]
```

### Patroon Instellen

```
┌────────────────────────────────┐
│ VOORGOOIER PATROON INSTELLEN   │
└────────────────────────────────┘
           ↓
    [Voorgooier gooit]
           ↓
   ┌────────────────┐
   │ Kies: Open/Blind│
   └────────────────┘
           ↓
   [Keuze opgeslagen in patroon]
           ↓
    ┌──────────────┐
    │ Nog een worp?│
    └──────────────┘
         ↓       ↓
    [Gooi weer]  [Laten Staan]
         ↓            ↓
   [Voeg toe aan    [Patroon
    patroon]         compleet!]
         ↓            ↓
    [Herhaal]    [maxThrows =
                  patroon.length]
                      ↓
                 [Resultaat kiezen]
```

**Voorbeeld Patronen:**

| Patroon | Betekenis | Effect |
|---------|-----------|--------|
| `[blind]` | 1× blind | Iedereen moet 1× blind gooien |
| `[open, open]` | 2× open | Iedereen moet 2× open gooien |
| `[blind, open, blind]` | 1 blind, 2 open, 3 blind | Complexe volgorde |
| `[open, blind]` | 1 open, 2 blind | Mix van beide |

### Patroon Volgen (Niet-Voorgooier)

```
┌────────────────────────────┐
│ Voorgooier patroon actief  │
│ [blind, open, blind]       │
└────────────────────────────┘
           ↓
    ┌──────────────┐
    │ Worp 1       │
    └──────────────┘
           ↓
   [FORCE blind] 🙈
   [Geen keuze!]
           ↓
    ┌──────────────┐
    │ Worp 2       │
    └──────────────┘
           ↓
   [FORCE open] 👁️
   [Geen keuze!]
           ↓
    ┌──────────────┐
    │ Worp 3       │
    └──────────────┘
           ↓
   [FORCE blind] 🙈
   [Geen keuze!]
           ↓
   [Resultaat kiezen]
```

**Belangrijke regels:**
- ✅ Patroon is **verplicht**
- ❌ Geen afwijking mogelijk
- 🎯 Worplimiet knoppen zijn **uitgeschakeld**
- 📊 Patroon wordt getoond boven het spel

### Voorgooier Uitschakelen

```
[Voorgooier wint een ronde]
     ↓
[Voorgooier = AUTOMATISCH OFF]
     ↓
[Patroon gewist]
     ↓
[Worplimiet knoppen enabled]
```

OF:

```
[Klik "Ben jij de Voorgooier?" toggle UIT]
     ↓
[Voorgooier = OFF]
     ↓
[Patroon gewist]
     ↓
[Worplimiet knoppen enabled]
```

---

## 🌳 Beslisbomen

### Beslisboom 1: Welke Knoppen Verschijnen?

```
START WORP
    ↓
┌───────────────────┐
│ Mexico gegooid?   │
└───────────────────┘
    ↓           ↓
   JA          NEE
    ↓           ↓
[Mexico      ┌──────────┐
 knoppen]    │ Blind?   │
             └──────────┘
                ↓       ↓
               JA      NEE
                ↓       ↓
           [Laten    ┌────────────────┐
            Zien]    │ Max bereikt?   │
                     └────────────────┘
                        ↓           ↓
                       JA          NEE
                        ↓           ↓
                   [Resultaat]  [Gooi weer/
                                 Laten staan]
```

### Beslisboom 2: Na "Laten Zien" (Blind Reveal)

```
BLIND REVEAL
    ↓
┌───────────────────────┐
│ Voorgooier pattern?   │
└───────────────────────┘
    ↓               ↓
   JA              NEE
    ↓               ↓
[Patroon klaar]  ┌─────────────────┐
[→ Resultaat]    │ throwCount == 1?│
                 └─────────────────┘
                    ↓            ↓
                   JA           NEE
                    ↓            ↓
               [EERSTE BLINDE] [Later]
               [→ Resultaat]    ↓
               [GEEN HERGOOIEN!] │
                                 ↓
                          [Normale opties]
                          [Wel hergooien]
```

### Beslisboom 3: Wie wordt Voorgooier?

```
EINDE RONDE
    ↓
┌──────────────┐
│ Resultaat?   │
└──────────────┘
    ↓
┌────┬────┬────┐
│    │    │    │
WON  VAST LOST
│    │    │
↓    ↓    ↓
Voorgooier:
OFF  ONGEWIJZIGD  ON
```

---

## ⚙️ Speciale Regels

### Regel 1: Eerste Ronde Blind
```
IF (isFirstRound == true) AND (isVoorgooier == false)
THEN
    FORCE blind = true
    Bericht: "🔒 Eerste ronde zonder voorgooier is altijd blind!"
END
```

**Waarom?**
Om het spel eerlijk te beginnen zonder dat iemand een voordeel heeft.

### Regel 2: Eerste Blinde Worp - Geen Hergooien
```
IF (throwCount == 1) AND (was blind) AND (gebruiker klikt "Laten Zien")
THEN
    Toon alleen: [Ronde Gehaald] [Vast] [Verloren]
    Verberg: [Gooi Open/Blind opnieuw]
    Bericht: "Eerste blinde worp - kies het resultaat"
END
```

**Waarom?**
Dit is een kernregel van het spel: de eerste blinde worp is definitief.

### Regel 3: Mexico Altijd Zichtbaar
```
IF (throwValue == 21)
THEN
    isBlind = false (override!)
    Toon dobbelstenen ALTIJD
    Trigger celebratie
    Toon Mexico knoppen
END
```

**Waarom?**
Mexico is zo speciaal dat het altijd gevierd moet worden, zelfs bij blinde worp.

### Regel 4: Derde Worp Dicht (Optioneel)
```
IF (thirdThrowClosed == true) AND (throwCount == 2) AND (isVoorgooier == false)
THEN
    FORCE blind = true
    Bericht: "🙈 Derde worp is dicht!"
END
```

**Waarom?**
Dit is een optionele variant om spanning toe te voegen.

### Regel 5: Voorgooier Patroon Override
```
IF (voorgooierPattern.length > 0) AND (isVoorgooier == false)
THEN
    patternIndex = throwCount
    IF (patternIndex < voorgooierPattern.length)
    THEN
        FORCE type = voorgooierPattern[patternIndex]
        Worplimiet = DISABLED
    END
END
```

**Waarom?**
Het voorgooier patroon is altijd dominant over andere instellingen.

### Regel 6: Vast Tie-Breaker
```
IF (gebruiker kiest "Vast")
THEN
    maxThrows = throwCount + 1
    Toon: [Gooi Open] [Gooi Blind]
    Na worp: Direct naar [Resultaat Keuze]
END
```

**Waarom?**
Bij een tie krijg je exact 1 extra kans om te beslissen.

### Regel 7: Verliezer = Voorgooier
```
IF (gebruiker kiest "Verloren")
THEN
    lives = lives - 1
    IF (lives > 0)
    THEN
        isVoorgooier = true (automatisch!)
        Bericht: "👑 Jij bent nu de voorgooier!"
    END
END
```

**Waarom?**
De verliezer krijgt macht over de volgende ronde als compensatie.

### Regel 8: Winner ≠ Voorgooier
```
IF (gebruiker kiest "Ronde Gehaald")
THEN
    isVoorgooier = false (reset!)
    Levens blijven gelijk
END
```

**Waarom?**
Winnaar heeft geen macht nodig, verliezer wel.

---

## ⚙️ Instellingen

### Instelling 1: Worplimiet

```
┌─────────────────────────────┐
│ WORPLIMIET INSTELLEN        │
└─────────────────────────────┘
  ↓         ↓         ↓
[1 worp] [2 worpen] [3 worpen]
  ↓         ↓         ↓
maxThrows = 1/2/3
```

**Wanneer actief?**
- ✅ Als GEEN voorgooier patroon actief is
- ❌ Disabled als voorgooier patroon bestaat

**Effect:**
Bepaalt hoeveel keer je maximaal mag gooien per ronde.

### Instelling 2: Ben jij de Voorgooier?

```
┌──────────────────────────────┐
│ VOORGOOIER TOGGLE            │
└──────────────────────────────┘
         ↓
    [AAN/UIT]
         ↓
   ┌──────────┐
   │ Status?  │
   └──────────┘
    ↓        ↓
   AAN      UIT
    ↓        ↓
[Pattern   [Normale
 mode]      speler]
```

**Effect AAN:**
- Start patroon instellen mode
- Worplimiet disabled
- Jouw worpen bepalen het patroon voor anderen

**Effect UIT:**
- Patroon gewist
- Worplimiet enabled
- Normale speler modus

### Instelling 3: Derde Worp Dicht

```
┌──────────────────────────────┐
│ DERDE WORP DICHT TOGGLE      │
└──────────────────────────────┘
         ↓
    [AAN/UIT]
         ↓
IF (AAN) AND (throwCount == 2)
THEN
    FORCE blind op 3e worp
END
```

**Effect AAN:**
De derde worp is ALTIJD blind (tenzij voorgooier patroon anders zegt)

**Effect UIT:**
Derde worp kan open of blind (speler kiest)

### Instelling 4: Eerste Ronde Indicator

```
┌──────────────────────────────┐
│ EERSTE RONDE?                │
└──────────────────────────────┘
         ↓
    [Indicator zichtbaar]
         ↓
Na eerste ronde compleet:
    isFirstRound = false
    [Indicator verdwijnt]
```

**Effect:**
Visuele reminder dat speciale regels van toepassing zijn.

---

## 📊 State Machine Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     GAME STATES                         │
└─────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   INITIAL   │ ← roundActive = false
    │   (Start)   │   throwCount = 0
    └─────────────┘
         │
         │ [Gooi]
         ↓
    ┌─────────────┐
    │   THROWING  │ ← roundActive = true
    │  (Animatie) │   throwCount++
    └─────────────┘
         │
         │ [Finish Throw]
         ↓
    ┌─────────────┐
    │  THROWN     │ ← currentThrow = value
    │  (Gegooid)  │
    └─────────────┘
         │
         ├───[Mexico]───→ MEXICO_CELEBRATION
         │
         ├───[Blind]────→ BLIND_HIDDEN
         │                     │
         │                     │ [Laten Zien]
         │                     ↓
         │                REVEALED
         │                     │
         ↓                     ↓
    ┌─────────────┐       ┌────────────────┐
    │   CHOICE    │       │ throwCount==1? │
    │  (Keuzes)   │       └────────────────┘
    └─────────────┘            │        │
         │                    JA       NEE
         │                     │        │
         ├─[Gooi weer]────→ THROWING   │
         │                              │
         ├─[Laten Staan]──┐            │
         │                 ↓            ↓
         │            ┌─────────────┐  │
         └───────────→│  RESULT     │←─┘
                      │  (Keuze)    │
                      └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ↓                 ↓                 ↓
      [Won]             [Vast]           [Lost]
         │                 │                 │
         │                 ↓                 ↓
         │          [1 extra worp]    [lives--]
         │                 │                 │
         │                 ↓                 │
         │            [THROWING]       ┌──────────┐
         │                              │lives==0? │
         │                              └──────────┘
         │                                 │     │
         │                                JA    NEE
         │                                 │     │
         │                                 ↓     │
         │                           [GAME OVER] │
         │                                       │
         └───────────────────────────────────────┘
                              │
                              ↓
                         [INITIAL]
                      (Nieuwe ronde)
```

---

## 🎯 Strategische Tips

### Tip 1: Eerste Worp Strategie
**Als je MOET blind gooien (eerste ronde):**
- Bedenk vooraf: wat is acceptabel?
- Weet dat je niet kan hergooien
- Kies resultaat strategisch

### Tip 2: Voorgooier Tactiek
**Als je voorgooier bent:**
- `[blind]` = Makkelijk, maar weinig controle
- `[open, open]` = Veel info, maar geen verrassingen
- `[blind, open, blind]` = Complexe psychologische warfare

### Tip 3: Vast Gebruiken
**Wanneer "Vast" kiezen?**
- ✅ Als je niet zeker bent wie gewonnen heeft
- ✅ Om tie-breaker ronde te forceren
- ✅ Voor extra spanning

### Tip 4: Mexico Timing
**Als je Mexico gooit:**
- Altijd sterk resultaat
- Kies "Laten Staan" als je zeker wilt winnen
- Kies "Vast" voor extra drama (maar risico!)

---

## 📖 Samenvatting: Kern Regels

| # | Regel | Uitleg |
|---|-------|--------|
| 1 | **Start met 6 levens** | Verlies levens door te verliezen |
| 2 | **Worplimiet 1-3** | Maximum aantal worpen per ronde |
| 3 | **Open of Blind** | Kies hoe je gooit (of volg patroon) |
| 4 | **Eerste ronde blind** | Zonder voorgooier altijd blind |
| 5 | **Eerste blind = definitief** | Na onthullen GEEN hergooien |
| 6 | **Mexico = altijd zichtbaar** | 21 breekt alle blind regels |
| 7 | **3 resultaat opties** | Won, Vast, of Lost |
| 8 | **Verliezer = voorgooier** | Automatisch na verlies |
| 9 | **Winnaar ≠ voorgooier** | Reset na winst |
| 10 | **Voorgooier bepaalt patroon** | Anderen moeten volgen |

---

## 🎮 Quick Reference

### Worp Waardes Cheat Sheet
```
MEXICO: 21 (2-1 of 1-2)           👑 KONING

DUBBELS (als honderden):
6-6 = 600   5-5 = 500   4-4 = 400
3-3 = 300   2-2 = 200   1-1 = 100

NORMAAL (hoogste eerst):
6-5 = 65   6-4 = 64   6-3 = 63   ...
5-4 = 54   5-3 = 53   ...
4-3 = 43   4-2 = 42   4-1 = 41
3-2 = 32   3-1 = 31   (laagste)
```

### Knop Flows Cheat Sheet
```
START
  ↓
[Gooi Open] [Gooi Blind]
  ↓             ↓
OPEN          BLIND
  ↓             ↓
[Gooi weer]   [Laten Zien] → [Als 1e: Resultaat]
[Laten Staan]                [Anders: Gooi weer/Staan]
  ↓
RESULTAAT
  ↓
[Ronde Gehaald] [Vast] [Verloren]
  ↓               ↓         ↓
Nieuwe ronde    +1 worp   -1 leven + voorgooier
```

---

**Einde van Spelregels** - Versie 1.0 (Reverse-Engineered)

🎲 **Veel speelplezier met Koning Mexico!**
