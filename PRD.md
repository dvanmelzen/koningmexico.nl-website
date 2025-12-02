# Product Requirements Document (PRD)
## Koning Mexico Website

**Project:** koningmexico.nl
**Version:** 1.0 (Implemented)
**Datum:** December 2025
**Status:** Live & Deployed
**Owner:** Daniel van Melzen

---

## 1. Executive Summary

Een single-page website die het dobbelspel Mexico (Mexxen) introduceert en uitlegt aan spelers. De site combineert duidelijke spelregels met een speelse, koninklijke branding en presenteert de specifieke spelvarianten die wij spelen met inzetregels en optionele huisregels.

### Wat is Geïmplementeerd

De huidige versie is een volledig functionele, responsive website met:
- Complete spelregels van onze specifieke Mexico-variant
- Interactieve elementen (klikbare dobbelstenen, smooth scroll, animaties)
- Mobile-first responsive design
- Koninklijke huisstijl met goud, groen en rood kleurenpalet
- SEO optimalisatie
- Deployed op Netlify

---

## 2. Doelen & Resultaten

### Primary Goals (✓ Bereikt)
- **Educatie**: Bezoekers kunnen het spel Mexico leren via duidelijke, gestructureerde uitleg
- **Referentie**: Dient als naslagwerk voor spelregels tijdens het spelen (vooral mobiel)
- **Branding**: "Koning Mexico" is gevestigd als herkenbare naam/merk

### Success Metrics
- ✓ Duidelijke navigatie door alle secties
- ✓ Mobiel-vriendelijke ervaring (responsive design)
- ✓ Snelle laadtijd (CDN-based Tailwind + lightweight custom CSS)
- ✓ Interactiviteit via vanilla JavaScript (geen frameworks)

---

## 3. Target Audience

### Primary Users
- **Nieuwe spelers**: 18-45 jaar, leren het spel voor het eerst
- **Ervaren spelers**: Checken specifieke regeldetails tijdens het spelen
- **Onze vriendengroep**: Referentie voor de exacte huisregels die wij hanteren

### User Needs (Vervuld)
- ✓ Snelle toegang tot spelregels vanaf mobiel tijdens het spelen
- ✓ Overzichtelijke presentatie van worprangorde
- ✓ Duidelijke uitleg van de vier fases van het spel
- ✓ Inzicht in optionele huisregels

---

## 4. Geïmplementeerde Features

### 4.1 Core Features (✓ Compleet)

#### Hero Section
- ✓ "Koning Mexico" logo (logo-fixed.png)
- ✓ Tagline: "Het snelste, gemeenste en meest verslavende dobbelspel"
- ✓ Visuele dobbelstenen met floating animatie
- ✓ CTA button naar "Leer het spel"
- ✓ Gradient background (rood naar goud)

#### Intro Sectie: "Wat is Mexico?"
- ✓ Korte uitleg van het spel
- ✓ Vermelding van Mexico (21) als koning der worpen
- ✓ Uitleg dat er veel varianten bestaan

#### Benodigdheden Sectie
- ✓ 5 requirement cards met emoji's:
  - Dobbelbeker 🥃
  - 2 Dobbelstenen 🎲
  - Draaistenen ⚫
  - Startpunten (6) 6️⃣
  - Inzet (optioneel) 💰
- ✓ Hover animaties op cards
- ✓ Scroll-triggered fade-in animaties

#### Doel van het Spel
- ✓ Bullet points met key objectives
- ✓ Kroon emoji animatie (pulse)

#### Mexico als Kroegspel - Inzet Sectie
- ✓ **Goud gradient section** (opvallend!)
- ✓ Twee inzetopties:
  1. **Rondje drinken** 🍻
  2. **De Pot** 💰 (meest gangbaar)
- ✓ Duidelijke uitleg dat onze regels met inzetten per ronde werken
- ✓ Visueel onderscheid met border en emphasis

#### Rangorde Worpen
- ✓ **Mexico (21)** - prominente gold card met kroon 👑
- ✓ **Dubbels (als honderden)** - 6x6=600 tot 1x1=100
- ✓ **Gewone worpen** - hoogste cijfer vooraan (65 → 31)
- ✓ Alle dobbelstenen zijn klikbaar (dice animation)
- ✓ Visuele dobbelstenen Unicode symbolen (⚀ t/m ⚅)
- ✓ Color-coded cards (groene header section)

#### Spelverloop - Onze Variant (4 Fases)
- ✓ **Fase 1: Inzetten** (border-gold)
  - Elke ronde begint met inzetten in de pot
  - Afgesproken bedrag of tokens
  - Winnaar pakt volledige pot
- ✓ **Fase 2: Voorgooien** (border-green)
  - Verliezer vorige ronde is voorgooier
  - Eerste ronde: iedereen blind 1x
  - Voorgooier bepaalt worplimiet (1, 2 of 3 worpen)
- ✓ **Fase 3: De Ronde Zelf** (border-gold)
  - Iedereen gooit
  - Laagste score moet draaien
  - Mexico stacking: 1× Mexico = 2 punten, 2× = 4, 3× = 6
- ✓ **Fase 4: Overgooien (bij vastloper)** (border-green)
  - Definitie vastloper (minimaal 2× laagste op tafel)
  - Mexico in fase 4 telt niet mee voor extra straf
- ✓ Genummerde badges (1, 2, 3, 4) met gold gradient
- ✓ Alternerende kleuren voor visuele hiërarchie

#### Optionele Huisregels
- ✓ **Winnaar van 6 = Dubbele Pot** 💎
  - Als je wint zonder te draaien, dubbelt de pot
  - Voorbeeld met €20 → €40
- ✓ **Dobbelsteen van Tafel = Draaien** 🎲
  - Straf voor slordigheid: 1 punt verliezen
  - Spel gaat door
- ✓ Beide als variant-cards (klikbaar, hover effecten)

#### Waarom dit Spel zo Leuk Is
- ✓ Storytelling sectie (rode gradient background)
- ✓ 3 strategy cards:
  - 🎯 Strategie (wanneer stop/doorgooien)
  - ⚡ Macht (voorgooier bepaalt tempo)
  - 🧠 Psychologie (bluffen en risico)

#### Call-to-Action Section
- ✓ Gold gradient background
- ✓ Slogan: "Klaar om te spelen?"
- ✓ Subtext: "Mexico is in vijf minuten uitgelegd — daarna wil niemand meer stoppen"
- ✓ "Terug naar boven" button

#### Footer
- ✓ Logo (opacity 90%)
- ✓ Copyright 2025
- ✓ Donkere achtergrond (brown-dark)

### 4.2 Interactieve Features (✓ Volledig Werkend)

#### JavaScript Functionaliteit
- ✓ **Smooth scrolling** voor alle anchor links
- ✓ **Dice animation**: Click om dobbelstenen te laten "rollen" (10 rolls, 50ms interval)
- ✓ **Scroll animations**: Fade-in voor alle cards (Intersection Observer)
- ✓ **Header shadow**: Verhoogt bij scrollen voor depth
- ✓ **Variant cards**: Klikbaar met active state toggle
- ✓ **Mobile menu**: Hamburger toggle met animatie
- ✓ **Back to top button**: Verschijnt na 300px scroll
- ✓ **Easter egg**: 5× klikken op hero logo = Mexico celebration met confetti 🎉
- ✓ **Lazy loading**: Fallback voor oudere browsers

#### CSS Animaties
- ✓ `diceFloat`: Floating dobbelstenen in hero (3s infinite)
- ✓ `pulse`: Kroon emoji animatie (2s infinite)
- ✓ `diceRoll`: Rotatie animatie bij klikken (0.5s)
- ✓ Hover transitions op alle cards (translateY, shadow)
- ✓ Smooth transitions overal (0.3s ease standaard)

### 4.3 Mobile Navigation (✓ Werkend)
- ✓ Hamburger menu button (3 lijnen)
- ✓ Toggle animatie (X vorm bij open)
- ✓ Overlay navigation (slide down van boven)
- ✓ Click buiten menu = close
- ✓ Resize handler (auto-close bij desktop size)
- ✓ Accessibility: aria-expanded attributes

---

## 5. Design Implementatie

### 5.1 Visual Style (✓ Volledig Toegepast)

**Koninklijke Branding:**
- ✓ Goud (primary), Groen (secondary), Rood (accenten)
- ✓ Cinzel font voor headings (koninklijk, serif)
- ✓ Open Sans voor body tekst (leesbaar, sans-serif)
- ✓ Emoji's voor visuele interesse
- ✓ Gradient backgrounds voor belangrijke secties

**Color Palette (CSS Custom Properties):**
```css
--color-gold: #D4AF37
--color-gold-light: #FFD700
--color-gold-dark: #B8960F
--color-green: #0D5E3A
--color-green-light: #1B7A4B
--color-red: #8B0000
--color-red-light: #B22222
--color-brown-dark: #3E2723
--color-brown-medium: #5D4037
--color-cream: #F5E6D3
--color-cream-light: #FFF8E7
```

**Tailwind Config:**
- ✓ Custom colors geïntegreerd in Tailwind
- ✓ Font families gedefinieerd
- ✓ Via CDN geladen (geen build step)

### 5.2 Layout & Composition (✓ Responsive)

**Structure:**
- ✓ Single-page met smooth scroll
- ✓ Sticky header met logo en navigatie
- ✓ Duidelijke section dividers via kleuren
- ✓ Alternerende backgrounds (wit, cream, gradients)
- ✓ Max-width containers (container mx-auto px-8)

**Grid System:**
- ✓ Tailwind Grid & Flexbox
- ✓ Desktop: 2-5 kolommen (afhankelijk van sectie)
- ✓ Tablet: 2 kolommen
- ✓ Mobile: single column, stacked

**Responsive Breakpoints:**
- ✓ Mobile: < 768px
- ✓ Tablet: 768px - 1024px
- ✓ Desktop: > 1024px
- ✓ Tailwind sm:, md:, lg:, xl: classes

---

## 6. Technische Implementatie

### 6.1 Technology Stack (✓ Zoals Gepland)

**Frontend:**
- ✓ **HTML5**: Semantische markup (header, nav, section, footer)
- ✓ **Tailwind CSS (CDN)**: Geen build step, direct vanuit CDN
- ✓ **styles.css**: Custom CSS met:
  - CSS Custom Properties voor consistente theming
  - Mobile menu styles
  - Dice en card animations
  - Back to top button
  - Accessibility (focus states, reduced motion)
  - Print styles
- ✓ **Vanilla JavaScript (script.js)**: 437 regels, zero dependencies
  - Gestructureerd in modules (IIFE pattern)
  - Event listeners
  - Intersection Observer API
  - DOM manipulatie

**Assets:**
- ✓ Logo files (PNG): logo-fixed.png (gebruikt), logo.png, logo-badge.png, logo-oval.png
- ✓ Favicon: favicon.png
- ✓ King photo: king-photo.jpg (niet gebruikt in huidige versie)
- ✓ OG image: logo-badge.png (voor social media)

### 6.2 Browser Support (✓ Modern Browsers)
- ✓ Chrome, Firefox, Safari, Edge (laatste 2 versies)
- ✓ Mobile browsers: iOS Safari, Chrome Android
- ✓ Graceful degradation:
  - Lazy loading fallback (lazysizes.js)
  - CSS transitions met vendor prefixes niet nodig (modern browsers)
  - Intersection Observer polyfill niet nodig (breed ondersteund)

### 6.3 Hosting & Deployment (✓ Live)
- ✓ **Hosting**: Netlify
- ✓ **Domain**: koningmexico.nl (te configureren)
- ✓ **Repository**: Git geïnitialiseerd, pushed naar GitHub
- ✓ **Deployment**: Netlify connected
- ✓ **Build settings**: Geen (statische site, geen build)
- ✓ **Publish directory**: `.` (root)

**Deployment Status:**
- ✓ Git repository aanwezig (.git folder)
- ✓ Netlify config (.netlify folder)
- ✓ netlify.toml met build settings
- ✓ Clean working tree (geen uncommitted changes op moment van documentatie)

### 6.4 Performance (✓ Geoptimaliseerd)

**Optimalisaties:**
- ✓ Tailwind via CDN (gecached)
- ✓ Google Fonts met preconnect
- ✓ Vanilla JS (geen framework overhead)
- ✓ Inline critical CSS in Tailwind config
- ✓ Lazy loading support
- ✓ Geen render-blocking resources
- ✓ Lightweight: totaal ~50KB HTML + ~15KB JS

**Verwachte Lighthouse Scores:**
- Performance: 90+ (CDN, geen build, minimaal JS)
- Accessibility: 95+ (semantisch HTML, ARIA labels, focus states)
- Best Practices: 95+ (HTTPS via Netlify, moderne standaarden)
- SEO: 95+ (meta tags, semantic HTML, Open Graph)

---

## 7. Content & Copy (✓ Volledig)

### 7.1 Copy
- ✓ **Taal**: Nederlands
- ✓ **Tone of Voice**: Vriendelijk, enthousiast, duidelijk
- ✓ **Humor**: Subtiel ("gemeenste dobbelspel", Easter egg)
- ✓ **Structuur**: Korte paragrafen, bullet points, scanbaar

### 7.2 SEO (✓ Geïmplementeerd)
```html
<title>Koning Mexico | Het Dobbelspel Mexxen - Spelregels en Varianten</title>
<meta name="description" content="Leer het verslavende dobbelspel Mexico...">
<meta name="keywords" content="mexico spel, mexxen, dobbelspel...">
<meta property="og:title" content="Koning Mexico | Het Dobbelspel Mexxen">
<meta property="og:image" content=".../logo-badge.png">
```

### 7.3 Accessibility (✓ Compleet)
- ✓ Semantic HTML (header, nav, section, footer, h1-h4)
- ✓ Alt text op logo images
- ✓ ARIA labels (menu button: aria-expanded, aria-label)
- ✓ Keyboard navigatie mogelijk (tab door links)
- ✓ Focus states (outline via styles.css)
- ✓ Color contrast voldoet aan WCAG AA
- ✓ Reduced motion support (@media prefers-reduced-motion)

---

## 8. Bestandsstructuur

```
koningmexico.nl-website/
├── .git/                    # Git repository
├── .netlify/                # Netlify deployment config
├── assets/                  # Media files
│   ├── logo-fixed.png       # Primary logo (GEBRUIKT)
│   ├── logo.png             # Original logo
│   ├── logo-badge.png       # Badge variant (OG image)
│   ├── logo-oval.png        # Oval variant
│   ├── king-photo.jpg       # King photo (not used)
│   ├── favicon.png          # Browser icon
│   └── og-image.jpg         # Duplicate (gebruik logo-badge.png)
├── index.html               # Main page (30KB, 452 regels)
├── styles.css               # Custom CSS (NEW - was missing!)
├── script.js                # Interactive features (15KB, 437 regels)
├── netlify.toml             # Netlify configuration
├── .gitignore               # Git ignore rules
├── PRD.md                   # This document (UPDATED)
├── README.md                # Developer documentation (TO UPDATE)
├── index-vanilla.html.backup # Backup van eerdere versie
└── styles-old.css.backup    # Backup van oude CSS
```

---

## 9. Known Issues & Future Improvements

### Current Limitations
- Geen server-side functionaliteit (pure static site)
- Geen gebruikersaccounts of personalisatie
- Geen community features (comments, ratings)
- Geen meertalige ondersteuning (alleen Nederlands)
- King-photo.jpg niet gebruikt (kan verwijderd of toegevoegd worden)

### Post-MVP Features (Optioneel)
- [ ] **Interactieve variant selector**: Checkboxes om eigen regels samen te stellen
- [ ] **Print-vriendelijke versie**: CSS @media print optimalisatie
- [ ] **Score tracker app**: JavaScript calculator voor live spel
- [ ] **Video tutorial**: Embedded YouTube video
- [ ] **Community varianten**: Backend + database voor user submissions
- [ ] **PWA functionaliteit**: Service worker, offline support, installeerbaar
- [ ] **Analytics**: Google Analytics of Plausible voor traffic insights
- [ ] **Multi-taal**: Engels versie (vooral voor internationale spelers)
- [ ] **Dark mode**: Toggle voor dark theme

---

## 10. Testing & Quality Assurance

### Testing Checklist (✓ Gedaan)
- ✓ Cross-browser testing (Chrome, Firefox, Safari, Edge)
- ✓ Mobile device testing (iOS Safari, Chrome Android)
- ✓ Responsive breakpoints (320px, 768px, 1024px, 1440px)
- ✓ Keyboard navigation (tab door alle links)
- ✓ Smooth scrolling werkt
- ✓ Dice animations werken (click om te rollen)
- ✓ Mobile menu toggle werkt
- ✓ Back to top button verschijnt
- ✓ Easter egg werkt (5× click = confetti)
- ✓ Alle links werken (anchor links naar secties)
- ✓ Images laden correct

### Known Bugs
- Geen bekende bugs op moment van documentatie

---

## 11. Deployment Checklist

### Pre-Launch (✓ Compleet)
- ✓ Content compleet en gecontroleerd
- ✓ Alle images geoptimaliseerd
- ✓ Meta tags ingesteld (SEO, OG)
- ✓ Favicon aanwezig
- ✓ Git repository aangemaakt
- ✓ .gitignore geconfigureerd
- ✓ Netlify geconnecteerd
- ✓ netlify.toml configuratie

### Post-Launch (To Do)
- [ ] Domain koningmexico.nl koppelen aan Netlify
- [ ] DNS records configureren
- [ ] SSL certificaat verifiëren (automatisch via Netlify)
- [ ] Google Search Console toevoegen
- [ ] Analytics toevoegen (optioneel)
- [ ] Social media testing (Open Graph preview)
- [ ] Performance audit (Lighthouse in production)

---

## 12. Maintenance & Updates

### Content Updates
Om content te wijzigen:
1. Edit `index.html` (alle tekst staat in duidelijke secties)
2. Test lokaal met `python -m http.server 8000` of `npx serve`
3. Commit changes: `git add . && git commit -m "Update content"`
4. Push naar GitHub: `git push`
5. Netlify deployt automatisch

### Styling Updates
Om design te wijzigen:
1. Edit `styles.css` voor custom styles
2. Of: pas Tailwind classes aan in `index.html`
3. CSS custom properties staan in `:root` in styles.css
4. Test en deploy (zie boven)

### JavaScript Updates
Om functionaliteit toe te voegen:
1. Edit `script.js`
2. Voeg nieuwe functie toe in init() aan einde van bestand
3. Test en deploy

---

## 13. Success Metrics (Post-Launch)

### KPIs om te Monitoren
- **Traffic**: Unieke bezoekers per maand
- **Engagement**: Gemiddelde tijd op pagina (target: >2 minuten)
- **Bounce rate**: Percentage dat meteen weggaat (target: <50%)
- **Device breakdown**: Mobile vs Desktop ratio
- **Most viewed sections**: Welke secties worden meest bezocht
- **Scroll depth**: Hoeveel mensen scrollen naar beneden

### User Feedback
- Directe feedback van vrienden die het gebruiken tijdens spellen
- Observatie: wordt de site gebruikt als referentie tijdens het spelen?
- Vragen: zijn de regels duidelijk genoeg?

---

## 14. Conclusie

### Project Status: ✓ VOLTOOID & DEPLOYED

De Koning Mexico website is **volledig functioneel** en klaar voor gebruik. Alle core features zijn geïmplementeerd:
- ✅ Complete spelregels (onze specifieke variant met 4 fases)
- ✅ Interactieve elementen (klikbare dobbelstenen, animaties)
- ✅ Responsive design (mobile-first)
- ✅ Koninklijke branding (goud/groen/rood)
- ✅ SEO optimalisatie
- ✅ Deployed op Netlify

### Next Steps
1. **Domain koppelen** (koningmexico.nl → Netlify)
2. **Testen met echte gebruikers** (tijdens het spelen)
3. **Feedback verzamelen** en itereren
4. **Optioneel**: Post-MVP features toevoegen

---

**Document Version:**
v2.0 (2025-12-02) - Herschreven om exacte implementatie te reflecteren

**Maintained by:**
Daniel van Melzen

**Last Updated:**
December 2, 2025
