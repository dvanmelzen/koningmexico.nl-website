# Koning Mexico Project Overview

**Last Updated:** 2025-12-28
**Version:** 2.0 (Complete Platform)
**Repository:** github.com/dvanmelzen/koningmexico.nl-website
**Location:** `d:\repos\koningmexico.nl-website\`
**Status:** ✅ Production (Live on GitHub Pages)

---

## What is Koning Mexico?

**Koning Mexico** is a complete digital platform for the Dutch dice game **Mexico** (also known as **Mexxen**). Het combineert educatieve content met speelbare implementaties en wetenschappelijk onderbouwde AI.

### The Core Problem

Het klassieke dobbelspel Mexico is populair in kroegen en bij vrienden, maar:
- Spelregels zijn vaak inconsistent
- Nieuwe spelers hebben moeite met het leren
- Er is geen manier om solo te oefenen
- Bestaande digitale versies hebben saaie, perfecte AI

### Koning Mexico's Solution

Het project biedt:

1. **Complete Digitale Spelregels** — Reverse-engineered vanuit game logica
2. **Solo Oefenmodus** — Speel tegen jezelf zonder druk
3. **Psychologische AI Tegenstander** — Menselijk realistisch gedrag (geen perfecte robot)
4. **Technische Documentatie** — Transparantie over AI implementatie
5. **Koninklijke Branding** — "Koning Mexico" als herkenbare huisstijl

---

## What Koning Mexico IS

✅ Een complete website met 5 pagina's
✅ Solo practice mode zonder tegenstander
✅ AI opponent met 8 psychologische principes
✅ Educatieve spelregels documentatie
✅ Open-source technische documentatie
✅ Mobile-responsive design
✅ Pure vanilla JavaScript (zero dependencies)

---

## What Koning Mexico IS NOT

❌ NIET een multiplayer platform (nog niet)
❌ NIET een casino/gokspel
❌ NIET een native mobile app (wel PWA-ready)
❌ NIET monetized (gratis, geen ads)
❌ NIET een perfecte optimal-strategy AI

---

## Target Audience

### Primary Users

1. **Nieuwe Spelers** (18-45 jaar)
   - Leren het spel via spelregels.html
   - Oefenen solo via spel.html
   - Uitdaging zoeken via spel_vs_computer.html

2. **Ervaren Spelers**
   - Checken specifieke regeldetails tijdens spelen
   - Testen strategieën tegen AI
   - Referentie voor edge cases

3. **Developers & AI Enthusiasts**
   - Technische documentatie van AI implementatie
   - Inzicht in psychologische gaming patterns
   - Reverse-engineered spellogica als referentie

---

## Project Goals & Results

### Primary Goals (✓ Achieved)

1. **Educatie**: Bezoekers leren Mexico via interactieve spelregels ✓
2. **Oefening**: Solo practice mode zonder tegenstander ✓
3. **AI Challenge**: Speel tegen menselijk realistische computer ✓
4. **Referentie**: Complete documentatie van spellogica en AI ✓
5. **Branding**: "Koning Mexico" als herkenbare huisstijl ✓

### Success Metrics (✓ Achieved)

- ✓ 5 volledige speelbare/informatieve pagina's
- ✓ Wetenschappelijk onderbouwde AI met 8 psychologische principes
- ✓ Complete spellogica met alle edge cases gedocumenteerd
- ✓ Consistent navigatie systeem over alle pagina's
- ✓ Mobile-responsive design
- ✓ Live deployment op GitHub Pages

---

## Core Features (Quick Reference)

### 1. Landing Page (index.html)

**Purpose:** Navigatie hub + introductie
**Features:**
- Hero section met koninklijk logo
- 3 strategische CTAs (Speel vs Computer, Solo Oefenen, Spelregels)
- Complete spel introductie (8 secties)
- Interactieve dobbelstenen met roll animatie
- Easter egg: 5× logo click = Mexico confetti celebration 🎉
- Mobile hamburger menu
- Smooth scroll navigation

### 2. Spelregels Handbook (spelregels.html)

**Purpose:** Complete digitale documentatie
**Features:**
- 16 hoofdstukken met volledige spellogica
- Sticky inhoudsopgave met scroll tracking
- Reverse-engineered regels vanuit game code
- Genummerde fase badges (4 fases per RONDE)
- Unicode dobbelstenen voorbeelden (⚀-⚅)
- Color-coded secties (gold, green, red)
- Quick reference cheat sheet
- FAQ met edge cases

**Key Sections:**
1. Terminologie (SPEL > RONDE > WORP > BEURT)
2. Rangorde (Mexico > Dubbels > Gewone worpen)
3. 4 Fases per RONDE (Inzetten, Voorgooien, De RONDE, Overgooien)
4. Mexico speciale regel ("wordt altijd gevierd bij onthulling")
5. Draaisteen mechaniek (punten/draaien terminologie)
6. Vastloper & overgooien details

### 3. Solo Oefenmodus (spel.html)

**Purpose:** Practice zonder tegenstander
**Features:**
- Setup panel (2-6 spelers, 3-10 startpunten)
- Blind vs Open gooien
- Mexico detection & celebration 🎉
- Vastloper detection & overgooien
- Draaisteen management
- Inzet pot tracking (optioneel)
- Dynamische player panels
- Real-time UI updates
- Volledige spellogica implementatie

**Game Engine:** game.js (~800 lines)

### 4. vs Computer Mode (spel_vs_computer.html)

**Purpose:** 1v1 tegen psychologisch realistische AI
**Features:**
- Alle solo mode features
- AI tegenstander met menselijk gedrag
- 8 psychologische principes geïmplementeerd
- 5 dynamische personality modes
- Computer turn animation ("Computer is aan het denken...")
- Actie log met transparency
- Difficulty balancing (reageert op je prestaties)

**AI Personality Modes:**
1. **Scared** — Zeer voorzichtig (1-2 punten over)
2. **Defensive** — Beschermend (voorsprong)
3. **Neutral** — Balanced rationeel
4. **Aggressive** — Risico-zoekend (achterstand)
5. **Desperate** — All-in (laatste punt)

**Game Engine:** game_vs_computer.js (~1200 lines)

### 5. AI Psychology Documentation (ai_psychology.html)

**Purpose:** Technische transparantie voor developers
**Features:**
- Executive summary van AI filosofie
- 8 uitgewerkte psychologische principes
- Wetenschappelijke research referenties
- Code snippets per principe
- AI personality system uitleg
- Testing & validation overview
- Future improvements roadmap

**8 Psychological Principles:**
1. **Loss Aversion** — 2.5× sterker gewicht aan verliezen
2. **Risk Tolerance Variance** — Niet altijd rationeel (±15%)
3. **Overconfidence Bias** — Overschat kansen na wins
4. **Anchoring Effect** — Eerste WORP beïnvloedt beslissingen
5. **Recency Bias** — Laatste events wegen zwaarder
6. **Hot Hand Fallacy** — Gelooft in lucky streaks
7. **Gamblers Fallacy** — Verwacht mean reversion
8. **Satisficing** — "Good enough" in plaats van optimaal

---

## Technology Overview

### Stack

**Frontend:**
- **HTML5** — Semantic markup (header, nav, main, section, footer)
- **Tailwind CSS (CDN)** — Utility-first, no build step
- **Custom CSS** — Animations, mobile menu, theming
- **Vanilla JavaScript** — Zero dependencies, pure performance

**Assets:**
- Logo variants (fixed, badge, oval)
- Favicon
- OG image (social media)
- King photo (unused in current design)

**Deployment:**
- **GitHub Pages** — Free hosting, automatic deploys
- **HTTPS** — Enforced via GitHub
- **No build step** — Direct deployable

### File Sizes
- index.html: ~30KB
- spelregels.html: ~85KB
- spel.html: ~25KB
- spel_vs_computer.html: ~28KB
- ai_psychology.html: ~95KB
- game_vs_computer.js: ~45KB
- styles.css: ~8KB
- **Total:** ~316KB (uncompressed)

---

## Design System

### Visual Identity

**Koninklijke Branding:**
- **Goud** (primary) — Macht, prestige, winnaar
- **Groen** (secondary) — Spel tafel, geluk
- **Rood** (accent) — Gevaar, Mexico, intensiteit
- **Bruin** (neutral) — Dobbelbeker, warmte

**Color Palette:**
```css
/* Primary */
--color-gold: #D4AF37
--color-gold-light: #FFD700
--color-gold-dark: #B8960F

/* Secondary */
--color-green: #0D5E3A
--color-green-light: #1B7A4B

/* Accent */
--color-red: #8B0000
--color-red-light: #B22222

/* Neutral */
--color-brown-dark: #3E2723
--color-cream: #F5E6D3
```

**Typography:**
- **Headings:** Cinzel (serif, koninklijk)
- **Body:** Open Sans (sans-serif, leesbaar)
- **Code:** Roboto Mono (monospace, technisch)

**Emoji System:**
- 👑 Mexico (21) - Koning der worpen
- 🎲 Dobbelstenen / Solo spelen
- 🤖 Computer AI / vs modus
- 📖 Spelregels / documentatie
- 🧠 AI psychologie / technical
- ⚫ Draaisteen punten
- 🎉 Celebrations / confetti
- 💰 Inzet / pot

---

## Key Differentiators

### 1. Psychologically Realistic AI

**Not Just Optimal Strategy:**
- Implementeert cognitive biases uit behavioral economics
- Voelt aan als spelen tegen menselijke tegenstander
- Transparante documentatie (ai_psychology.html)
- Wetenschappelijk onderbouwd (Kahneman & Tversky)

**Balance:**
- Niet te perfect (saai)
- Niet te dom (geen uitdaging)
- Menselijk realistisch (imperfect decisions)

### 2. Complete Documentation

**Reverse-Engineered Spelregels:**
- Beslisbomen voor alle scenario's
- Terminology glossary (SPEL/RONDE/WORP/BEURT)
- Edge cases gedocumenteerd
- FAQ sectie
- Quick reference cheat sheet

### 3. Progressive Complexity

**Learning Path:**
1. Start simpel: lees spelregels
2. Oefen alleen: solo modus
3. Uitdaging: vs AI
4. Deep dive: AI psychology docs

### 4. Clean Architecture

**Zero Dependencies:**
- No build step (statische site)
- Vanilla JS (no framework bloat)
- Fast load times (< 3s op 3G)
- Easy maintenance (edit → commit → push → live)

---

## Current Status

**Version:** 2.0 (Complete Platform)
**Status:** ✅ Production Ready
**Deployment:** Live on GitHub Pages
**Last Updated:** December 2025

### What's Working

✅ All 5 pages fully functional
✅ Complete game logic (all edge cases)
✅ AI psychology system (8 principles)
✅ Mobile-responsive design
✅ GitHub Pages deployment
✅ HTTPS enabled
✅ SEO optimized
✅ Accessibility (WCAG AA)

### Known Issues

⚠️ Mobile menu button (spelregels.html, ai_psychology.html) niet functioneel
- Visueel aanwezig maar geen JavaScript
- Workaround: Desktop navigatie werkt wel
- Priority: Low (inhoudsopgave alternatief aanwezig)

### Recent Updates

- **2025-12-05**: Button state management fix (v2.2.1)
- **2025-12-05**: Blind throw reveal timing fix
- **2025-12-05**: Critical bugs fixed (25-game test execution)
- **2025-12-04**: Exact pattern enforcement (voorgooier/achterligger)
- **2025-12-03**: Dark mode, collapsible debug, Easter eggs

---

## Development Workflow

### Local Development

```bash
# Clone repository
git clone https://github.com/dvanmelzen/koningmexico.nl-website.git
cd koningmexico.nl-website

# Start local server (option 1: Python)
python -m http.server 8000

# Start local server (option 2: npx)
npx serve -l 3000

# Open browser
# Python: http://localhost:8000
# npx: http://localhost:3000
```

### Deployment

```bash
# Stage changes
git add .

# Commit
git commit -m "Your commit message"

# Push (auto-deploys to GitHub Pages)
git push origin master

# Wait ~1 minute for deployment
# Verify at production URL
```

**No Build Step Required:**
- Static HTML/CSS/JS
- Tailwind via CDN
- No compilation
- Direct deployable

---

## Project Structure Quick View

```
koningmexico.nl-website/
├── index.html                 # Landing page
├── spelregels.html            # Spelregels handbook
├── spel.html                  # Solo mode
├── spel_vs_computer.html      # vs AI mode
├── ai_psychology.html         # AI docs
│
├── styles.css                 # Custom CSS
├── script.js                  # Landing page JS
├── game.js                    # Solo engine
├── game_vs_computer.js        # AI engine
│
├── assets/                    # Images
│   ├── logo-fixed.png         # Primary logo
│   ├── favicon.png            # Browser icon
│   └── ...
│
├── PRD.md                     # Product Requirements
├── SPELREGELS.md              # Markdown spelregels
├── AI_PSYCHOLOGY.md           # AI docs (markdown)
├── README.md                  # Developer guide
├── VERBETERPUNTEN.md          # Improvement ideas
├── CODE_ANALYSIS.md           # Code quality report
├── TESTPLAN.md                # Testing strategy
└── TEST_EXECUTION_REPORT.md   # Test results
```

---

## Future Roadmap

### Short-Term (Next Iteration)

**Priority: HIGH**
- [ ] Fix mobile menu JavaScript (spelregels.html, ai_psychology.html)
- [ ] Add difficulty selector (Easy/Medium/Hard AI)
- [ ] Add game statistics (wins/losses in localStorage)
- [ ] Add undo button (laatste actie terugdraaien)

**Priority: MEDIUM**
- [ ] Dark mode toggle (system preference + manual)
- [ ] Print-friendly spelregels (optimized @media print)
- [ ] Sound effects (dobbelstenen, Mexico celebration)
- [ ] Game history (laatste 10 worpen zichtbaar)

### Long-Term Vision

**Multiplayer:**
- [ ] Local hot-seat multiplayer (meerdere mensen op zelfde device)
- [ ] Online multiplayer (WebSocket server)
- [ ] Private rooms (speel met vrienden via link)
- [ ] Leaderboards (global rankings)

**AI Enhancements:**
- [ ] Machine learning AI (train op echte games)
- [ ] Multiple AI opponents (3+ spelers met AI)
- [ ] Custom AI personalities (configureer eigen AI)
- [ ] Difficulty levels (Easy: meer fouten, Hard: betere beslissingen)

**Platform Expansion:**
- [ ] Progressive Web App (installeerbaar, offline)
- [ ] Native mobile apps (iOS/Android via React Native)
- [ ] Multi-language (Engels, Duits, Frans)

---

## Testing & Quality

### Test Coverage

**Functional Testing:** ✓ Complete
- Landing page interactivity
- Solo mode full game flow
- vs AI mode (25+ games tested)
- Edge cases (Mexico stacking, vastloper, etc.)

**Cross-Browser Testing:** ✓ Passed
- Chrome, Firefox, Safari, Edge (laatste 2 versies)
- iOS Safari, Chrome Android
- No known browser-specific bugs

**Performance:** ✓ Optimized
- Lighthouse scores: 95+ (desktop), 85+ (mobile)
- Load time: < 3s (3G)
- No memory leaks (tested 100+ rondes)

**Accessibility:** ✓ WCAG AA
- Keyboard navigation
- Screen reader support
- Color contrast ratios > 4.5:1
- Reduced motion support

---

## Learning & Resources

### Essential Reading

**For New Contributors:**
1. [README.md](d:/repos/koningmexico.nl-website/README.md) — Getting started
2. [PRD.md](d:/repos/koningmexico.nl-website/PRD.md) — Complete product spec
3. [SPELREGELS.md](d:/repos/koningmexico.nl-website/SPELREGELS.md) — Game rules
4. [AI_PSYCHOLOGY.md](d:/repos/koningmexico.nl-website/AI_PSYCHOLOGY.md) — AI details

**For Developers:**
- [CODE_ANALYSIS.md](d:/repos/koningmexico.nl-website/CODE_ANALYSIS.md) — Code quality report
- [TESTPLAN.md](d:/repos/koningmexico.nl-website/TESTPLAN.md) — Testing strategy
- [VERBETERPUNTEN.md](d:/repos/koningmexico.nl-website/VERBETERPUNTEN.md) — Improvement ideas

### Key Technologies to Learn

1. **HTML5** — Semantic markup
2. **Tailwind CSS** — Utility-first CSS
3. **Vanilla JavaScript** — DOM manipulation, event listeners
4. **Game Logic** — State management, decision trees
5. **Behavioral Economics** — Cognitive biases, prospect theory
6. **Git** — Version control
7. **GitHub Pages** — Static site hosting

---

## Success Metrics (Post-Launch)

### Target KPIs

**User Engagement:**
- Daily Active Users (DAU): > 50 binnen 3 maanden
- Games Played: > 100 games/week
- Session Duration: > 5 minutes average
- Return Visitor Rate: > 30%

**Performance:**
- First Contentful Paint: < 1.5s
- Lighthouse scores: > 90
- JavaScript errors: < 0.1% van sessions

**Engagement Breakdown:**
| Metric | Target |
|--------|--------|
| Games vs AI | > 60% van total |
| Solo practice | > 30% van total |
| Spelregels reads | > 80% van new visitors |
| Mobile usage | 60% van traffic |

---

## Contributing

### Pull Requests Welcome

1. Fork het project
2. Maak feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push naar branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style

- **HTML**: 4 spaces indentation
- **CSS**: Alfabetische property order
- **JavaScript**:
  - 4 spaces indentation
  - Semicolons verplicht
  - Single quotes voor strings
  - camelCase voor variabelen

---

## Contact & Support

- **GitHub:** dvanmelzen/koningmexico.nl-website
- **Issues:** GitHub Issues voor bug reports
- **Discussions:** GitHub Discussions (toekomstig)

---

## Acknowledgments

**Technologies Used:**
- Tailwind CSS
- Google Fonts (Cinzel, Open Sans)
- GitHub Pages
- Claude Code (AI development assistant)

**Inspiration:**
- Real-world Mexico spel sessions met vrienden
- Behavioral economics research (Kahneman & Tversky)
- Classic board game AI (niet te perfect, niet te dom)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-28
**Maintained By:** Daniel van Melzen

**Repository:** github.com/dvanmelzen/koningmexico.nl-website
**Live URL:** TBD (GitHub Pages)

---

*Complete documentatie voor persistent context across Claude Code sessions.*
