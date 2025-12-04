# 🎲 Koning Mexico - Complete Spelregels
**Reverse-engineered vanuit de game logica**

---

## 📋 Inhoudsopgave

1. [Overzicht](#overzicht)
2. [Terminologie](#terminologie)
3. [Spel Setup](#spel-setup)
4. [Basis Concepten](#basis-concepten)
5. [Worp Waardes](#worp-waardes)
6. [Complete Game Flow](#complete-game-flow)
7. [Voorgooier Systeem](#voorgooier-systeem)
8. [Beslisbomen](#beslisbomen)
9. [Speciale Regels](#speciale-regels)
10. [Instellingen](#instellingen)

---

## 🎯 Overzicht

**Koning Mexico** is een digitaal dobbelspel waarbij je probeert te overleven door strategisch te gooien met twee dobbelstenen. Je start met **6 levens** en het doel is om de laatste overlevende te zijn.

### Kern Mechanica
- **2 dobbelstenen** in een beker
- **Open** of **blind** gooien
- **Worplimiet** bepaalt maximum aantal worpen per ronde (1-3)
- **Voorgooier** bepaalt het patroon voor anderen
- **Resultaat keuze** na elke ronde: Gewonnen, Vast, of Verloren

---

## 📚 Terminologie

**BELANGRIJK:** Duidelijk onderscheid tussen drie niveaus:

```
🎮 SPEL (Game)
   │
   ├─ 🔄 RONDE (Round) ← Een speler aan de beurt
   │  │
   │  ├─ 🎲 WORP (Throw) ← Eén dobbelstenen actie
   │  ├─ 🎲 WORP
   │  └─ 🎲 WORP (max 3)
   │
   ├─ 🔄 RONDE (volgende speler/beurt)
   │  └─ ...
   │
   └─ ... (tot 1 persoon over is)
```

### 🎮 SPEL (Game)
**Het complete spel van start tot finish**

**Start:**
- Alle spelers hebben 6 levens
- Niemand is voorgooier (eerste ronde = blind)

**Tijdens:**
- Bestaat uit meerdere **rondes**
- Elke ronde heeft een voorgooier (behalve eerste)
- Spelers verliezen levens bij verlies

**Einde:**
- Als nog maar **1 persoon levens heeft**
- Die persoon is de winnaar 🏆
- Daarna start een **nieuw spel**

### 🔄 RONDE (Round)
**Eén speler aan de beurt (één beurt)**

**Structuur:**
- Maximum **3 worpen** (afhankelijk van voorgooier/worplimiet)
- Speler kiest: open of blind (of volgt patroon)
- Eindigt met resultaat: Won/Vast/Lost

**Resultaat:**
- **Gewonnen**: Levens blijven gelijk, niet voorgooier
- **Vast**: Tie-breaker, +1 extra worp
- **Verloren**: -1 leven, wordt voorgooier van volgende ronde

### 🎲 WORP (Throw)
**Eén actie: dobbelstenen gooien**

**Types:**
- **Open** 👁️ = Dobbelstenen direct zichtbaar
- **Blind** 🙈 = Dobbelstenen verborgen (moet onthullen)

**Speciale regel:**
- **Eerste worp van een ronde** + **blind** = Geen hergooien na onthullen!

---

## 🎮 Spel Setup

### Startpositie (Nieuw Spel)
```
🎮 SPEL START
   │
Levens: 6 ● ● ● ● ● ●
Rondes gespeeld: 0
Voorgooier: NIEMAND
Status: Eerste ronde van nieuw spel
   │
   └─→ Eerste ronde = ALTIJD BLIND
```

### Tijdens Spel
```
🔄 RONDE [nummer]
   │
Levens: X ● ● ●
Worpen deze ronde: 0/3
Voorgooier: [Ja/Nee]
Patroon: [Open/Blind] of [Geen]
   │
   └─→ Speler gooit (max 3 worpen)
```

---

## 🧩 Basis Concepten

### 1. Open vs Blind Gooien

#### Open Gooien 👁️
- Dobbelstenen zijn **direct zichtbaar** na de worp
- Je ziet meteen wat je hebt gegooid
- Je kunt beslissen: nog een worp of stoppen

#### Blind Gooien 🙈
- Dobbelstenen blijven **verborgen** na de worp
- Je ziet alleen "🙈" als resultaat
- Acties na blind gooien:
  - **"Laten Zien"**: Onthul de dobbelstenen

**Speciale regel - Eerste worp blind:**
```
IF (eerste worp van deze ronde) AND (was blind)
THEN
    Na "Laten Zien" → DIRECT naar resultaat
    GEEN mogelijkheid om nog een worp te doen!
END
```

**Latere worpen blind:**
```
IF (worp 2 of 3) AND (was blind)
THEN
    Na "Laten Zien" → Normale opties
    WEL mogelijkheid om nog een worp te doen (als binnen limiet)
END
```

### 2. Worplimiet
Het maximum aantal **worpen** dat je mag doen in één **ronde**:
- **1 worp**: Eén kans, daarna resultaat kiezen
- **2 worpen**: Twee kansen, dan stoppen
- **3 worpen** (standaard): Drie kansen

**Voorgooier override**: Als een voorgooier een patroon instelt, vervangt dat de worplimiet.

### 3. Voorgooier Rol
De **voorgooier** heeft speciale macht binnen een **ronde**:
- ✅ Bepaalt het **patroon** van worpen (open/blind) voor anderen
- ✅ Stelt dit patroon in door zelf worpen te doen
- ✅ Anderen moeten dit patroon exact volgen
- ❌ Je wordt NOOIT voorgooier als je een ronde wint
- ✅ Je wordt ALTIJD voorgooier als je een ronde verliest

**Voorgooier blijft actief** tot:
- Je een ronde wint (dan ben je het niet meer)
- Iemand anders verliest (die wordt het)

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
**Mexico (21) wordt altijd gevierd bij onthulling!**
- Als je blind gooit en 21 hebt: zie je het pas bij "Laten Zien"
- Dan volgt automatisch: Confetti celebratie 🎉
- Speciale Mexico knoppen verschijnen
- Let op: Je kunt niet door de beker heen kijken! Mexico is pas zichtbaar na onthulling

---

## 🔄 Complete Game Flow

### Level 1: SPEL Flow

```
┌─────────────────────┐
│  🎮 NIEUW SPEL      │
│  Alle: 6 levens     │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  🔄 RONDE 1         │
│  (Altijd blind)     │
└─────────────────────┘
         ↓
    [Speler gooit]
         ↓
    [Resultaat]
         ↓
┌─────────────────────┐
│  🔄 RONDE 2         │
│  (Verliezer = voor) │
└─────────────────────┘
         ↓
    [Speler gooit]
         ↓
    [Resultaat]
         ↓
    ... (meer rondes)
         ↓
┌─────────────────────┐
│  Nog > 1 persoon?   │
└─────────────────────┘
    ↓              ↓
   JA             NEE
    ↓              ↓
[Volgende      ┌─────────────┐
 ronde]        │ SPEL EINDE  │
               │ Winnaar: X  │
               └─────────────┘
                     ↓
               [NIEUW SPEL]
```

### Level 2: RONDE Flow

```
┌─────────────────────────┐
│  START NIEUWE RONDE     │
└─────────────────────────┘
           ↓
    ┌──────────────────┐
    │ Eerste ronde van │
    │  nieuw spel?     │
    └──────────────────┘
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
    └─→ [Toon "Gooi Open" / "Gooi Blind"]
              ↓
       [Speler kiest]
              ↓
       ┌──────────────┐
       │  WORP FASE   │
       │  (zie Worp)  │
       └──────────────┘
              ↓
       [Max 3 worpen]
              ↓
       ┌──────────────┐
       │  RESULTAAT   │
       │  Won/Vast/   │
       │  Verloren    │
       └──────────────┘
              ↓
    ┌──────────────────┐
    │ Speler heeft nog │
    │    levens?       │
    └──────────────────┘
         ↓          ↓
        JA         NEE
         ↓          ↓
    [Volgende   [Speler UIT]
     ronde]          ↓
                [Nog >1 over?]
                     ↓
                   Zie Spel Flow
```

### Level 3: WORP Flow

```
     ┌───────────────┐
     │  GOOI DICE    │
     │  (Worp X/3)   │
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
                   ↓              ↓
            [Gebruiker klikt]  [Keuze menu]
                   ↓              ↓
            ┌──────────────┐    │
            │ Worp == 1?   │    │
            └──────────────┘    │
               ↓         ↓      │
              JA        NEE     │
               ↓         ↓      │
           [Direct   [Normaal] │
            Result]     │       │
               ↓         ↓      │
               └─────────┴──────┘
                       ↓
               ┌───────────────┐
               │ Nog worp over?│
               │ + Wil gooien? │
               └───────────────┘
                  ↓          ↓
                 JA         NEE
                  ↓          ↓
              [Nieuwe    [Kies
               worp]     Resultaat]
```

### Resultaat Fase

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
  [Reset voor volgende ronde]
        ↓
  ┌──────────────┐
  │ Nog >1 over? │
  └──────────────┘
     ↓         ↓
    JA        NEE
     ↓         ↓
[Volgende  [SPEL EINDE]
 ronde]         ↓
            [NIEUW SPEL]
```

**Effecten:**
- ✅ Levens blijven intact
- ❌ Je bent NIET de voorgooier (reset)
- 🎉 Kleine viering
- ♻️ Volgende ronde begint (of nieuw spel als laatste over)

#### Optie 2: Vast (Tie)

```
┌─────────────────────┐
│ VAST! ⚔️            │
└─────────────────────┘
        ↓
  [Tie-breaker mode]
        ↓
  [Exact +1 worp toegevoegd]
        ↓
  [Speler gooit nog 1×]
        ↓
  [Direct naar RESULTAAT KEUZE]
```

**Effecten:**
- ⚡ Je krijgt **exact 1 extra worp**
- 🎲 Keuze: open of blind
- 🔄 Na die worp: direct weer resultaat kiezen
- ⚠️ Voorgooier status blijft onveranderd

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
  [Speler UIT] [Vervolg]
      ↓          ↓
  ┌─────────┐  [Voorgooier = ON] 👑
  │Nog >1   │    ↓
  │over?    │  [Reset voor volgende ronde]
  └─────────┘    ↓
      ↓      [VOLGENDE RONDE]
    JA/NEE
      ↓
  [Volgende ronde
   of SPEL EINDE]
```

**Effecten:**
- ❌ Verlies **1 leven**
- 👑 Je wordt **automatisch voorgooier** van volgende ronde
- 💀 Bij 0 levens: UIT HET SPEL
  - Als nog >1 persoon over: Spel gaat door
  - Als nog 1 persoon over: **SPEL EINDIGT** → Winnaar!
- ♻️ Anders: volgende ronde als voorgooier

---

## 👑 Voorgooier Systeem

### Wat is een Voorgooier?

De voorgooier heeft **controle** over hoe de huidige **ronde** verloopt voor alle spelers:
- Bepaalt of worpen **open** of **blind** moeten zijn
- Stelt een **patroon** in door zelf worpen te doen
- Dit patroon wordt **verplicht** voor andere spelers in deze ronde

### Hoe word je Voorgooier?

#### Automatisch (meest voorkomend)
```
[Je verliest een ronde]
     ↓
[lives - 1]
     ↓
[Voorgooier = AUTOMATISCH ON] 👑
     ↓
[Volgende ronde: jij bepaalt patroon]
```

#### Handmatig (voor testen/single player)
```
[Klik "Ben jij de Voorgooier?" toggle]
     ↓
[Voorgooier = ON] 👑
     ↓
[Pattern setting mode actief]
```

### Hoe raak je het kwijt?

```
[Je wint een ronde]
     ↓
[Voorgooier = AUTOMATISCH OFF]
     ↓
[Volgende ronde: gewone speler]
```

OF:

```
[Iemand anders verliest]
     ↓
[Die persoon = nieuwe voorgooier]
     ↓
[Jij = gewone speler]
```

### Patroon Instellen

Als je voorgooier bent van een ronde:

```
┌────────────────────────────────┐
│ VOORGOOIER PATROON INSTELLEN   │
│ (Deze ronde)                   │
└────────────────────────────────┘
           ↓
    [Jij gooit worp 1]
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
    [Herhaal]    [Worplimiet voor
                  deze ronde =
                  patroon.length]
                      ↓
                 [Resultaat kiezen]
```

**Voorbeeld Patronen:**

| Patroon | Betekenis | Voorbeeld Ronde |
|---------|-----------|-----------------|
| `[blind]` | 1× blind | Iedereen moet 1× blind gooien |
| `[open, open]` | 2× open | Iedereen moet 2× open gooien |
| `[blind, open, blind]` | 3× afwisselend | Worp 1 blind, 2 open, 3 blind |
| `[open]` | 1× open | Iedereen moet 1× open gooien |

### Patroon Volgen (Niet-Voorgooier)

Als jij NIET de voorgooier bent, maar er is wel een patroon actief:

```
┌────────────────────────────┐
│ Voorgooier patroon actief  │
│ voor deze ronde:           │
│ [blind, open, blind]       │
└────────────────────────────┘
           ↓
    ┌──────────────┐
    │ Jouw Worp 1  │
    └──────────────┘
           ↓
   [FORCE blind] 🙈
   [Geen keuze!]
           ↓
    ┌──────────────┐
    │ Jouw Worp 2  │
    └──────────────┐
           ↓
   [FORCE open] 👁️
   [Geen keuze!]
           ↓
    ┌──────────────┐
    │ Jouw Worp 3  │
    └──────────────┘
           ↓
   [FORCE blind] 🙈
   [Geen keuze!]
           ↓
   [Resultaat kiezen]
```

**CRUCIALE REGEL - Exact Positie Matching:**
Als de voorgooier ervoor kiest om worp **N** blind te doen, moet de achterligger **ook worp N** blind doen (als ze zo ver gaan). Het patroon moet **per worp positie** gevolgd worden:

**Voorbeeld 1:**
- Voorgooier: Worp 1 OPEN → Worp 2 BLIND → Worp 3 OPEN
- Achterligger: **MOET** Worp 1 OPEN, Worp 2 BLIND, Worp 3 OPEN (als ze tot worp 3 gaan)
- Achterligger **MAG** wel vroeg stoppen (bijv. na worp 2)

**Voorbeeld 2:**
- Voorgooier: Worp 1 OPEN → Stopt (2 worpen niet gemaakt)
- Achterligger: **MOET** Worp 1 OPEN, daarna vrije keuze (voorgooier bereikte worp 2/3 niet)

**Belangrijke regels:**
- ✅ Patroon is **verplicht per positie** voor deze ronde
- ✅ Je **mag wel vroeg stoppen** (minder worpen dan voorgooier)
- ❌ Je **mag niet** afwijken van het patroon op een positie die voorgooier WEL bereikte
- ❌ Geen afwijking mogelijk op verplichte posities
- 🎯 Knoppen worden **automatisch disabled** (alleen de juiste knop werkt)
- 📊 Patroon wordt gelogd in debug console
- 🔄 Patroon geldt alleen voor **deze ronde**, niet het hele spel
- ⚠️ Validatie blokkeert foute worpen met error message

---

## 🌳 Beslisbomen

### Beslisboom 1: Start van Ronde - Blind of Keuze?

```
START VAN NIEUWE RONDE
    ↓
┌────────────────────────┐
│ Eerste ronde van       │
│ NIEUW SPEL?            │
│ (isFirstRound = true)  │
└────────────────────────┘
    ↓               ↓
   JA              NEE
    ↓               ↓
┌──────────────┐   │
│ Voorgooier?  │   │
└──────────────┘   │
  ↓         ↓      │
 JA        NEE     │
  ↓         ↓      │
  │   [FORCE      │
  │    BLIND]     │
  │    "🔒 Eerste │
  │    ronde van  │
  │    nieuw spel │
  │    = blind!"  │
  │         ↓      │
  └─────────┴──────┘
            ↓
    ┌──────────────────┐
    │ Voorgooier       │
    │ patroon actief?  │
    └──────────────────┘
        ↓           ↓
       JA          NEE
        ↓           ↓
   [VOLG        [KEUZE]
    PATROON]    [Open/Blind]
```

### Beslisboom 2: Na Worp - Welke Opties?

```
WORP COMPLEET
    ↓
┌───────────────────┐
│ Mexico gegooid?   │
└───────────────────┘
    ↓           ↓
   JA          NEE
    ↓           ↓
[Mexico      ┌──────────┐
 knoppen]    │ Blind?   │
 [Laten      └──────────┘
  Staan/        ↓       ↓
  Vast]        JA      NEE
               ↓       ↓
           [Laten   ┌────────────────┐
            Zien]   │ Max worpen     │
               ↓    │ bereikt?       │
        ┌──────────┐└────────────────┘
        │Worp == 1?│   ↓           ↓
        └──────────┘  JA          NEE
           ↓      ↓    ↓           ↓
          JA     NEE [Direct   [Gooi weer
           ↓      ↓   Result]   OF
       [Direct [Normaal        Laten staan]
        Result] knoppen]
               ↓
          [Gooi weer
           OF
           Laten staan]
```

### Beslisboom 3: Wie is Voorgooier van Volgende Ronde?

```
EINDE VAN RONDE
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

WON:
Voorgooier = OFF
(Je bent het niet meer)

VAST:
Voorgooier = ONGEWIJZIGD
(Blijft zoals het was)

LOST:
Voorgooier = ON
(Jij wordt het voor volgende ronde)
```

### Beslisboom 4: Wanneer Eindigt het Spel?

```
NA ELKE RONDE
    ↓
┌─────────────────────┐
│ Tel spelers met     │
│ levens > 0          │
└─────────────────────┘
    ↓
┌──────────┐
│ Aantal?  │
└──────────┘
    ↓
┌───┼────┬─────┐
│   │    │     │
0   1   >1    ?
│   │    │
↓   ↓    ↓

0: [Iedereen af]
   [SPEL EINDE]
   [Niemand wint]
   [Confirm restart?]

1: [ÉÉN WINNAAR! 🏆]
   [SPEL EINDE]
   [Toon winnaar]
   [Start NIEUW SPEL]

>1: [Spel gaat door]
    [Volgende ronde]
    [Verliezer = voorgooier]
```

---

## ⚙️ Speciale Regels

### Regel 1: Eerste Ronde van Nieuw Spel = Blind
```
IF (eerste ronde van nieuw spel) AND (geen voorgooier)
THEN
    FORCE blind = true
    Bericht: "🔒 Eerste ronde van nieuw spel is altijd blind!"
    Geen keuze mogelijk
END
```

**Waarom?**
Om elk nieuw spel eerlijk te beginnen zonder voordeel voor wie dan ook.

**Wanneer reset?**
- Na eerste ronde van nieuw spel: `isFirstRound = false`
- Blijft false tot spel eindigt en nieuw spel start

### Regel 2: Eerste Worp Blind = Geen Hergooien
```
IF (worp 1 van deze ronde) AND (was blind) AND (gebruiker klikt "Laten Zien")
THEN
    Toon alleen: [Ronde Gehaald] [Vast] [Verloren]
    Verberg: [Gooi Open/Blind opnieuw]
    Bericht: "Eerste blinde worp - kies het resultaat"
    Geen extra worpen toegestaan
END
ELSE IF (worp 2 of 3) AND (was blind)
THEN
    Normale opties: [Gooi weer] [Laten Staan]
    Extra worpen WEL toegestaan (binnen limiet)
END
```

**Waarom?**
Dit is een kernregel: de eerste blinde worp van een ronde is definitief en kan niet hergooid worden.

### Regel 3: Mexico Viering bij Onthulling
```
IF (worp waarde == 21) AND (speler onthult dobbelstenen)
THEN
    Trigger celebratie 🎉
    Toon Mexico knoppen (Laten Staan / Vast)
    Confetti animatie
END
```

**Waarom?**
Mexico is zo speciaal dat het altijd gevierd moet worden!

**Let op:** In het digitale spel zie je Mexico pas bij onthulling (net als in het echt - je kunt niet door de beker kijken!)

### Regel 4: Derde Worp Dicht (Optioneel)
```
IF (derde worp dicht setting == ON)
   AND (worp 3 van deze ronde)
   AND (NIET voorgooier patroon actief)
THEN
    FORCE blind = true
    Bericht: "🙈 Derde worp is dicht!"
    Geen keuze mogelijk
END
```

**Waarom?**
Dit is een optionele variant om spanning toe te voegen aan de laatste worp.

**Let op:** Voorgooier patroon overschrijft deze regel!

### Regel 5: Voorgooier Patroon Override Alles
```
IF (voorgooier patroon bestaat voor deze ronde)
   AND (jij bent niet voorgooier)
THEN
    worp_index = huidige_worp_nummer - 1
    IF (worp_index < patroon.length)
    THEN
        FORCE type = patroon[worp_index]
        Worplimiet knoppen = DISABLED
        Geen keuze open/blind mogelijk
    END
END
```

**Waarom?**
Het voorgooier patroon is de hoogste autoriteit binnen een ronde.

**Prioriteit:**
1. Voorgooier patroon (hoogste)
2. Eerste ronde blind regel
3. Derde worp dicht regel
4. Speler keuze (laagste)

### Regel 6: Vast = +1 Worp
```
IF (gebruiker kiest "Vast")
THEN
    worplimiet = huidige_worpen + 1
    Reset worp opties
    Toon: [Gooi Open] [Gooi Blind]
    Na die ene extra worp: Direct naar [Resultaat Keuze]
    Geen extra worpen meer mogelijk
END
```

**Waarom?**
Bij een tie krijg je exact 1 extra kans om het verschil te maken.

**Let op:** Na die ene worp ga je DIRECT naar resultaat, niet via "Laten Staan".

### Regel 7: Verliezer = Voorgooier van Volgende Ronde
```
IF (gebruiker kiest "Verloren")
THEN
    lives = lives - 1

    IF (lives > 0)
    THEN
        isVoorgooier = true (automatisch!)
        Bericht: "👑 Jij bent nu de voorgooier van de volgende ronde!"

        IF (nog >1 speler met levens)
        THEN
            Start volgende ronde
            Jij bepaalt patroon
        ELSE
            SPEL EINDE - jij verliest
        END
    ELSE
        Speler UIT HET SPEL
        IF (nog >1 speler over)
        THEN
            Spel gaat door zonder jou
        ELSE
            SPEL EINDE - laatste speler wint
        END
    END
END
```

**Waarom?**
De verliezer krijgt macht over de volgende ronde als compensatie.

### Regel 8: Winnaar ≠ Voorgooier
```
IF (gebruiker kiest "Ronde Gehaald")
THEN
    isVoorgooier = false (reset!)
    Levens blijven gelijk
    Bericht: "🎉 Ronde gehaald!"

    IF (nog >1 speler met levens)
    THEN
        Start volgende ronde
        Jij bent gewone speler
    ELSE
        SPEL EINDE - jij wint! 🏆
    END
END
```

**Waarom?**
Winnaar heeft geen macht nodig voor de volgende ronde - verliezer wel.

---

## ⚙️ Instellingen

### Instelling 1: Worplimiet

```
┌─────────────────────────────┐
│ WORPLIMIET INSTELLEN        │
│ (Voor normale rondes)       │
└─────────────────────────────┘
  ↓         ↓         ↓
[1 worp] [2 worpen] [3 worpen]
  ↓         ↓         ↓
maxThrows = 1/2/3
```

**Wanneer actief?**
- ✅ Als GEEN voorgooier patroon actief is voor deze ronde
- ❌ Disabled als voorgooier patroon bestaat

**Effect:**
Bepaalt hoeveel worpen je maximaal mag doen per ronde (standaard instelling).

**Scope:**
- Geldt voor ALLE rondes waar geen voorgooier patroon actief is
- Blijft actief gedurende hele spel (tot aangepast)

### Instelling 2: Ben jij de Voorgooier?

```
┌──────────────────────────────┐
│ VOORGOOIER TOGGLE            │
│ (Handmatige activatie)       │
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
 mode      speler
 voor      voor
 volgende  volgende
 ronde]    ronde]
```

**Effect AAN:**
- Start patroon instellen mode voor volgende ronde
- Worplimiet disabled
- Jouw worpen bepalen het patroon voor anderen

**Effect UIT:**
- Patroon gewist
- Worplimiet enabled
- Normale speler modus

**Let op:**
- Dit is een **handmatige** override (voor testen/single player)
- Normaal gesproken word je automatisch voorgooier na verlies
- Word je automatisch uit gezet na winst

### Instelling 3: Derde Worp Dicht

```
┌──────────────────────────────┐
│ DERDE WORP DICHT TOGGLE      │
│ (Optionele variant)          │
└──────────────────────────────┘
         ↓
    [AAN/UIT]
         ↓
IF (AAN) AND (worp 3 van ronde) AND (geen voorgooier patroon)
THEN
    FORCE blind op worp 3
END
```

**Effect AAN:**
De derde worp van elke ronde is ALTIJD blind (tenzij voorgooier patroon anders zegt)

**Effect UIT:**
Derde worp kan open of blind (speler kiest)

**Prioriteit:**
Voorgooier patroon > Derde worp dicht > Speler keuze

**Scope:**
Geldt voor alle rondes gedurende het spel

### Instelling 4: Eerste Ronde Indicator

```
┌──────────────────────────────┐
│ EERSTE RONDE INDICATOR       │
│ (Visuele reminder)           │
└──────────────────────────────┘
         ↓
    [Badge zichtbaar]
    "Eerste ronde van nieuw spel"
         ↓
Na eerste ronde compleet:
    isFirstRound = false
    [Badge verdwijnt]
         ↓
Blijft onzichtbaar tot NIEUW SPEL
```

**Effect:**
Visuele reminder dat speciale "eerste ronde blind" regel van toepassing is.

**Wanneer zichtbaar:**
- Bij start van nieuw spel
- Alleen tijdens eerste ronde

**Wanneer verdwijnt:**
- Na eerste ronde voltooid
- Reset bij nieuw spel

---

## 📊 State Machine Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     GAME STATES                         │
└─────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │ NEW_GAME    │ ← lives = 6
    │ (Spel start)│   isFirstRound = true
    └─────────────┘   voorgooier = none
         │
         │ [Start ronde 1]
         ↓
    ┌─────────────┐
    │ ROUND_START │ ← roundActive = false
    │ (Ronde      │   throwCount = 0
    │  start)     │
    └─────────────┘
         │
         │ [Gooi]
         ↓
    ┌─────────────┐
    │  THROWING   │ ← roundActive = true
    │  (Animatie) │   throwCount++
    └─────────────┘
         │
         │ [Finish Throw]
         ↓
    ┌─────────────┐
    │  THROWN     │ ← currentThrow = value
    │  (Gegooid)  │   (1 worp compleet)
    └─────────────┘
         │
         ├───[Mexico]───→ MEXICO_CELEBRATION
         │                     │
         │                     ↓
         │                [Mexico knoppen]
         │                     │
         ├───[Blind]────→ BLIND_HIDDEN
         │                     │
         │                     │ [Laten Zien]
         │                     ↓
         │                REVEALED
         │                     │
         │              ┌────────────────┐
         │              │ throwCount==1? │
         │              └────────────────┘
         │                  │        │
         │                 JA       NEE
         │                  │        │
         ↓                  ↓        ↓
    ┌─────────────┐   [Direct   [Normaal
    │   CHOICE    │    Result]   Choice]
    │  (Keuzes)   │        │        │
    └─────────────┘        │        │
         │                 │        │
         ├─[Gooi weer]─────┘────────┘
         │      │
         │      └──→ THROWING (nieuwe worp in ronde)
         │
         ├─[Laten Staan]──┐
         │                 ↓
         │            ┌─────────────┐
         └───────────→│  RESULT     │
                      │  (Keuze)    │
                      └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ↓                 ↓                 ↓
      [Won]             [Vast]           [Lost]
         │                 │                 │
         │                 ↓                 │
         │          [+1 worp]               │
         │                 │                 │
         │                 ↓                 ↓
         │            [THROWING]        [lives--]
         │                 │                 │
         │                 ↓           ┌──────────┐
         │          [Direct Result]    │lives==0? │
         │                             └──────────┘
         │                                 │     │
         │                                JA    NEE
         │                                 │     │
         │                                 ↓     ↓
         │                           [OUT]  [Voorgooier=ON]
         │                             │         │
         └─────────────────────────────┴─────────┘
                              │
                              ↓
                      ┌───────────────┐
                      │ Check: >1     │
                      │ persoon over? │
                      └───────────────┘
                           │      │
                          JA     NEE
                           │      │
                           ↓      ↓
                    [ROUND_START] [GAME_END]
                    (Volgende      │
                     ronde)        ↓
                                [NEW_GAME]
                                (Nieuw spel)
```

---

## 🎯 Strategische Tips

### Tip 1: Eerste Ronde Strategie (Nieuw Spel)
**Als je MOET blind gooien (eerste ronde van nieuw spel):**
- Bedenk vooraf: wat is acceptabel?
- Weet dat je niet kan hergooien na onthullen
- Kies resultaat strategisch
- Overweeg "Vast" als je twijfelt

### Tip 2: Voorgooier Tactiek
**Als je voorgooier bent van een ronde:**
- `[blind]` = Makkelijk, maar weinig controle
- `[open, open]` = Veel info voor iedereen
- `[blind, open, blind]` = Complexe psychologische warfare
- `[open]` = Snelle ronde, weinig spanning

**Onthoud:** Je patroon geldt voor deze ene ronde, niet het hele spel!

### Tip 3: Vast Gebruiken
**Wanneer "Vast" kiezen?**
- ✅ Als je niet zeker bent wie gewonnen heeft
- ✅ Om tie-breaker worp te forceren
- ✅ Voor extra spanning
- ⚠️ Risico: je krijgt maar 1 extra worp

### Tip 4: Mexico Timing
**Als je Mexico gooit:**
- Altijd sterk resultaat
- Kies "Laten Staan" als je zeker wilt winnen
- Kies "Vast" voor extra drama (maar risico!)
- Geniet van de confetti 🎉

### Tip 5: Levens Beheer
**Levens strategisch inzetten:**
- Bij 6 levens: Kan je riskant spelen
- Bij 3-4 levens: Wees voorzichtig
- Bij 1-2 levens: Maximale focus
- Bij 1 leven: Alles of niets!

---

## 📖 Samenvatting: Kern Regels

| # | Regel | Scope | Uitleg |
|---|-------|-------|--------|
| 1 | **Start met 6 levens** | SPEL | Begin van elk nieuw spel |
| 2 | **Worplimiet 1-3** | RONDE | Max worpen per ronde |
| 3 | **Open of Blind** | WORP | Elke worp kies je type |
| 4 | **Eerste ronde nieuw spel = blind** | SPEL | Altijd als geen voorgooier |
| 5 | **Eerste worp blind = definitief** | RONDE | Na onthullen geen hergooien |
| 6 | **Mexico = altijd zichtbaar** | WORP | 21 breekt blind regel |
| 7 | **3 resultaat opties** | RONDE | Won, Vast, of Lost |
| 8 | **Verliezer = voorgooier** | SPEL | Van volgende ronde |
| 9 | **Winnaar ≠ voorgooier** | RONDE | Reset na winst |
| 10 | **Voorgooier bepaalt patroon** | RONDE | Anderen moeten volgen |
| 11 | **Spel eindigt bij 1 over** | SPEL | Laatste = winnaar 🏆 |

---

## 🎮 Quick Reference

### Hiërarchie Cheat Sheet
```
🎮 SPEL
   └─ Van start tot 1 persoon over
   └─ Eindigt: winnaar bekend
   └─ Dan: NIEUW SPEL

🔄 RONDE
   └─ Eén speler aan de beurt
   └─ Max 3 worpen (of patroon)
   └─ Eindigt: Won/Vast/Lost

🎲 WORP
   └─ Eén dobbelstenen actie
   └─ Open of Blind
   └─ Max 3 per ronde
```

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

### Flow Cheat Sheet
```
NIEUW SPEL
  ↓
RONDE (eerste = blind)
  ↓
WORP 1 (max 3)
  ↓
[Open/Blind keuze]
  ↓
[Gooi weer / Laten Staan]
  ↓
RESULTAAT
  ↓
[Ronde Gehaald] [Vast] [Verloren]
  ↓               ↓         ↓
Volgende ronde  +1 worp   -1 leven
                           + voorgooier
                           volgende ronde
```

### Voorgooier Cheat Sheet
```
Hoe word je het?
→ Verlies een ronde
→ Of: handmatig toggle

Wat kun je?
→ Bepaal patroon voor deze ronde
→ Anderen moeten volgen

Hoe raak je het kwijt?
→ Win een ronde
→ Of: iemand anders verliest
```

---

**Einde van Spelregels** - Versie 2.0 (Correcte Terminologie)

🎲 **Veel speelplezier met Koning Mexico!**

*SPEL > RONDE > WORP - Nu glashelder! 🎯*
