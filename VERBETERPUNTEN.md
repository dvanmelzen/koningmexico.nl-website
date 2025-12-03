# 🎯 Verbeterpunten Mexico Spel

Dit document verzamelt ideeën en suggesties voor toekomstige verbeteringen aan het Mexico dobbelspel.

---

## 📊 Patroon Visualisatie (UI/UX Verbetering)

**Status:** 💡 Idee voor later
**Prioriteit:** 🟢 Nice-to-have
**Datum toegevoegd:** 2025-12-03

### Beschrijving

Momenteel zien spelers niet welk patroon de voorgooier heeft gegooid. Dit zou duidelijker kunnen met visuele feedback.

### Huidige situatie

- Achterligger krijgt alleen feedback via:
  - Disabled knop (Gooi Blind knop wordt grijs)
  - Error message als ze het fout proberen
- Geen overzicht van het exacte patroon van de voorgooier

### Voorgestelde verbetering

**Optie 1: Patroon indicator boven dobbelstenen**
```
Voorgooier patroon: [🙈 blind] [👁️ open] [👁️ open]
                      ✓ gedaan   ✓ gedaan   ← nu
```

**Optie 2: Badge systeem**
```
┌─────────────────────────────┐
│ Voorgooier gooide:          │
│ Worp 1: 👁️ Open             │
│ Worp 2: 🙈 Blind            │
│ Worp 3: 👁️ Open             │
│                             │
│ Jouw beurt - volg patroon!  │
└─────────────────────────────┘
```

**Optie 3: Inline indicator bij knoppen**
```
[🎲 Gooi Open]   ← Je bent bij worp 2, voorgooier gooide open
[🙈 Gooi Blind]  (disabled) ← Moet open gooien
```

### Voordelen

✅ Duidelijker voor nieuwe spelers
✅ Voorkomt frustratie ("waarom kan ik niet blind gooien?")
✅ Maakt het leerproces sneller
✅ Educatief - spelers begrijpen de regel beter

### Technische implementatie

- Voeg `voorgooierPattern` array toe aan gameState
  - Voorbeeld: `['blind', 'open', 'open']`
- Render pattern in UI component
- Highlight huidige worp positie
- Toon locked/required indicator

### Geschatte effort

🕐 2-3 uur werk:
- 1 uur: Pattern array implementatie
- 1 uur: UI component design & rendering
- 30 min: Styling & responsive design
- 30 min: Testing

---

## 🎨 Toekomstige ideeën

_(Voeg hier meer verbeterpunten toe)_

### Multiplayer (meer dan 2 spelers)

**Status:** 💭 Brainstorm
**Datum:** TBD

Huidige vs_computer is 1-op-1. Voor echte Mexico heb je vaak 3-10 spelers.

### Statistieken tracking

**Status:** 💭 Brainstorm
**Datum:** TBD

- Win/loss ratio
- Meeste Mexico's in één ronde
- Langste winning streak
- Opslaan in localStorage

### Sound effects

**Status:** 💭 Brainstorm
**Datum:** TBD

- Dobbelstenen rollen geluid
- Mexico! viering geluid
- Win/loss sounds

### Mobile app versie

**Status:** 💭 Brainstorm
**Datum:** TBD

Progressive Web App (PWA) maken voor offline spelen.

---

## ✅ Gerealiseerde verbeteringen

_(Hier komen verbeteringen die zijn geïmplementeerd)_

- **2025-12-04**: **Exacte pattern enforcement** - Achterligger moet voorgooier patroon per worp positie volgen
  - Pattern array implementatie: `[false, true, false]` = `[open, blind, open]`
  - Computer AI volgt exact pattern als achterligger
  - Speler knoppen worden disabled op basis van verplichte worp
  - Validatie blokkeert foute worpen met error messages
  - Pattern wordt gelogd in debug console voor transparantie
  - Vroeg stoppen is toegestaan (minder worpen dan voorgooier)
- **2025-12-03**: Collapsible debug console
- **2025-12-03**: Lucky Mode Easter egg (70% Mexico kans)
- **2025-12-03**: Auto dark mode detection
- **2025-12-03**: Blue "Nieuw Spel" button na game over
- **2025-12-03**: Voorgooier/achterligger blind throw rule enforcement (basis versie)
