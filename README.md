# 👑 Koning Mexico Website

**Website voor het dobbelspel Mexico (Mexxen) - koningmexico.nl**

Een interactieve single-page website die het klassieke dobbelspel Mexico/Mexxen uitlegt met duidelijke spelregels, rangorde van worpen, spelverloop in 4 fases, en optionele huisregels.

---

## 📋 Overzicht

Deze website presenteert **onze specifieke variant** van Mexico met:
- ✅ Complete spelregels (4 fases: Inzetten, Voorgooien, De Ronde, Overgooien)
- ✅ Inzetregels (pot systeem met afgesproken bedrag)
- ✅ Duidelijke rangorde van worpen (Mexico, Dubbels, Gewone worpen)
- ✅ Optionele huisregels (Winnaar van 6, Dobbelsteen van tafel)
- ✅ Responsive design (mobile-first)
- ✅ Interactieve elementen (klikbare dobbelstenen, animaties, Easter eggs)

---

## ✨ Features

### Core Functionaliteit
- **Responsive design** - Optimaal op mobiel, tablet en desktop
- **Koninklijke huisstijl** - Goud, groen en rood kleurenpalet
- **Interactieve dobbelstenen** - Klik om te "rollen"
- **Smooth scroll navigatie** - Vlotte navigatie tussen secties
- **Mobile menu** - Hamburger menu met animatie
- **Scroll animaties** - Cards faden in bij scrollen
- **Back-to-top button** - Verschijnt na scrollen
- **Easter egg** - 5× klikken op hero logo = Mexico viering 🎉
- **SEO geoptimaliseerd** - Meta tags, Open Graph, semantisch HTML
- **Snelle laadtijden** - Vanilla JS, geen frameworks

### Secties
1. **Hero** - Logo, tagline, floating dobbelstenen
2. **Wat is Mexico?** - Introductie van het spel
3. **Benodigdheden** - 5 items met emoji's
4. **Doel van het Spel** - Key objectives
5. **Mexico als Kroegspel** - Inzetopties (rondje drinken, de pot)
6. **Rangorde Worpen** - Mexico, Dubbels, Gewone worpen
7. **Spelverloop** - 4 fases met genummerde badges
8. **Optionele Huisregels** - 2 populaire varianten
9. **Waarom zo Leuk** - 3 redenen (Strategie, Macht, Psychologie)
10. **Call-to-Action** - Klaar om te spelen?
11. **Footer** - Logo en copyright

---

## 🛠️ Technologie

### Stack
- **HTML5** - Semantische markup
- **Tailwind CSS (CDN)** - Utility-first CSS framework
- **styles.css** - Custom CSS met:
  - CSS Custom Properties (design tokens)
  - Mobile menu styles
  - Animaties (dice, cards, floating)
  - Accessibility (focus states, reduced motion)
- **Vanilla JavaScript** - Zero dependencies, pure performance
- **Google Fonts** - Cinzel (headings) en Open Sans (body)

### Geen Build Step
Deze site heeft **geen build proces** nodig:
- Tailwind via CDN
- Vanilla JavaScript (geen transpiling)
- Plain CSS
- Direct deploybaar

---

## 📁 Project Structuur

```
koningmexico.nl-website/
├── .git/                     # Git repository
├── .gitignore                # Git ignore rules
│
├── assets/                   # Media bestanden
│   ├── logo-fixed.png        # 🎯 Primary logo (GEBRUIKT)
│   ├── logo.png              # Original logo
│   ├── logo-badge.png        # Badge variant (OG image)
│   ├── logo-oval.png         # Oval variant
│   ├── favicon.png           # Browser icon
│   ├── king-photo.jpg        # Koning foto (niet gebruikt)
│   └── og-image.jpg          # Duplicate (kan weg)
│
├── index.html                # 🎯 Main page (30KB, 452 lines)
├── styles.css                # 🎯 Custom CSS (added to fix issues)
├── script.js                 # 🎯 Interactive features (15KB, 437 lines)
│
├── PRD.md                    # Product Requirements Document
├── README.md                 # 🎯 This file
│
└── backups/                  # Oude versies
    ├── index-vanilla.html.backup
    └── styles-old.css.backup
```

**🎯 = Essential files** voor de website

---

## 🚀 Lokaal Testen

### Optie 1: Python (Aanbevolen)
```bash
cd koningmexico.nl-website
python -m http.server 8000
```
Open http://localhost:8000

### Optie 2: Node.js met npx serve
```bash
cd koningmexico.nl-website
npx serve -l 3000
```
Open http://localhost:3000

### Optie 3: VS Code Live Server
1. Installeer "Live Server" extensie
2. Right-click op `index.html`
3. Kies "Open with Live Server"

---

## 🌐 Deployment

Deze website is een statische site die eenvoudig gehost kan worden op elk platform dat statische HTML ondersteunt.

### Deployment Opties
- **GitHub Pages**: Gratis hosting voor statische sites
- **Vercel**: Gratis tier met automatische deploys
- **Cloudflare Pages**: Snelle CDN met gratis tier
- **Eigen server**: Upload naar je eigen webserver via FTP/SFTP

### Handmatige Deployment
1. Commit je changes:
```bash
git add .
git commit -m "Your commit message"
git push origin master
```

2. Upload de volgende bestanden naar je hosting:
   - `index.html`
   - `spel.html`
   - `script.js`
   - `game.js`
   - `styles.css`
   - `assets/` directory

---

## 🎨 Design Tokens

### Kleuren (CSS Custom Properties)
```css
/* Primary */
--color-gold: #D4AF37
--color-gold-light: #FFD700
--color-gold-dark: #B8960F

/* Secondary */
--color-green: #0D5E3A
--color-green-light: #1B7A4B

/* Accenten */
--color-red: #8B0000
--color-red-light: #B22222

/* Neutrals */
--color-brown-dark: #3E2723
--color-brown-medium: #5D4037
--color-cream: #F5E6D3
--color-cream-light: #FFF8E7
--color-white: #FFFFFF
```

### Typografie
- **Headings**: Cinzel (serif, koninklijk)
- **Body**: Open Sans (sans-serif, leesbaar)
- **Sizes**: Responsive (14px mobile → 16px desktop)

### Spacing
```css
--space-xs: 0.5rem   /* 8px */
--space-sm: 1rem     /* 16px */
--space-md: 2rem     /* 32px */
--space-lg: 3rem     /* 48px */
--space-xl: 4rem     /* 64px */
```

### Animaties
```css
--transition-fast: 0.2s ease
--transition-normal: 0.3s ease
--transition-slow: 0.6s ease
```

---

## 🎯 Interactieve Features

### JavaScript Modules (script.js)

#### 1. Smooth Scrolling
- Alle anchor links (`#intro`, `#rangorde`, etc.)
- Header offset: 80px
- Smooth behavior

#### 2. Dice Animation
- **Trigger**: Click op `.die` of `.die-mini` elementen
- **Effect**: 10× rollen met random symbols (50ms interval)
- **Symbols**: ⚀ ⚁ ⚂ ⚃ ⚄ ⚅

#### 3. Scroll Animations
- **Intersection Observer** voor:
  - `.requirement-card` (Benodigdheden)
  - `.variant-card` (Huisregels)
  - `.phase-card` (Spelverloop fases)
  - `.rangorde-item` (Worpen rangorde)
  - `.strategy-item` (Waarom leuk)
- **Effect**: Fade-in + translateY(20px → 0)

#### 4. Header Shadow
- **Trigger**: Scroll > 50px
- **Effect**: Shadow verhoogt voor depth

#### 5. Variant Cards
- **Click**: Toggle active state
- **Visual**: Border color + background change

#### 6. Mobile Menu
- **Hamburger button**: 3 lijnen → X animatie
- **Menu**: Slide down van boven
- **Close**: Click buiten menu of op link
- **Resize**: Auto-close bij desktop width

#### 7. Back to Top Button
- **Trigger**: Scroll > 300px
- **Position**: Fixed bottom-right
- **Effect**: Smooth scroll naar top
- **Style**: Gold gradient, round

#### 8. Easter Egg 🎉
- **Trigger**: 5× snel klikken op hero logo
- **Effect**:
  - 50 confetti particles (gold, green, red)
  - "🎉 MEXICO! 🎉" message
  - 2s animatie

#### 9. Lazy Loading
- Fallback voor browsers zonder native lazy loading
- CDN: lazysizes.js

---

## 📱 Browser Support

### ✅ Tested & Supported
- Chrome (laatste 2 versies)
- Firefox (laatste 2 versies)
- Safari (laatste 2 versies)
- Edge (laatste 2 versies)
- iOS Safari
- Chrome Android

### Graceful Degradation
- Intersection Observer: Breed ondersteund (geen polyfill nodig)
- CSS Grid & Flexbox: Moderne browsers
- CSS Custom Properties: Alle moderne browsers
- Smooth scroll: Fallback naar instant scroll

---

## ♿ Accessibility

### Geïmplementeerd
- ✅ Semantic HTML (header, nav, section, footer, h1-h4)
- ✅ Alt text op alle logo images
- ✅ ARIA labels (menu: aria-expanded, aria-label)
- ✅ Keyboard navigatie (tab door alle links)
- ✅ Focus states (gold outline, 3px, offset 2px)
- ✅ Color contrast WCAG AA compliant
- ✅ Reduced motion support (@media prefers-reduced-motion)
- ✅ Touch-friendly buttons (min 44x44px)

---

## 🔧 Content Aanpassen

### Tekst Wijzigen
1. Open `index.html`
2. Zoek de sectie die je wilt aanpassen (duidelijke comments)
3. Pas de tekst aan
4. Test lokaal
5. Commit en push

**Voorbeeld:**
```html
<!-- Hero Section -->
<section id="home">
    <h1>Mexico</h1>  <!-- ← Wijzig hier de titel -->
    <p>Het snelste, gemeenste...</p>  <!-- ← Of hier de tagline -->
</section>
```

### Kleuren Aanpassen
Wijzig CSS custom properties in `styles.css`:
```css
:root {
    --color-gold: #D4AF37;  /* ← Wijzig naar jouw kleur */
}
```

Of pas Tailwind colors aan in `index.html`:
```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                gold: '#D4AF37',  // ← Wijzig hier
            }
        }
    }
}
```

### Nieuwe Sectie Toevoegen
1. Kopieer een bestaande section in `index.html`
2. Pas ID, klassen en content aan
3. Voeg link toe in navigatie (header)
4. Test smooth scroll

---

## 🐛 Debugging

### JavaScript Console
Open Developer Tools (F12) en check console voor:
```
🎲 Koning Mexico website loaded! Veel speelplezier!
```

### Common Issues

#### Mobile menu werkt niet
- Check of `styles.css` is gelinkt in HTML
- Verify `.mobile-menu-toggle` en `#main-navigation` in HTML
- Console errors checken

#### Dice animatie werkt niet
- Check of elementen `.die` of `.die-mini` class hebben
- JavaScript errors checken
- Verify script.js is geladen

#### Scroll animaties werken niet
- Check of elements correct classes hebben:
  - `.requirement-card`
  - `.variant-card`
  - `.phase-card`
  - `.rangorde-item`
  - `.strategy-item`
- Intersection Observer support checken

---

## 📊 Performance

### Lighthouse Targets
- **Performance**: > 90
- **Accessibility**: > 95
- **Best Practices**: > 95
- **SEO**: > 95

### Optimalisaties
✅ Tailwind via CDN (gecached)
✅ Google Fonts preconnect
✅ Vanilla JS (geen framework overhead)
✅ Lazy loading images
✅ Geen render-blocking resources
✅ Minimale file sizes (~50KB HTML + ~15KB JS)

### Meten
```bash
# Lighthouse CLI
npm install -g lighthouse
lighthouse https://koningmexico.nl --view

# Of gebruik Chrome DevTools → Lighthouse tab
```

---

## 🔐 Security

### Best Practices
- ✅ HTTPS (configureer SSL bij je hosting provider)
- ✅ No inline scripts (CSP-friendly)
- ✅ No external dependencies (security surface = 0)
- ✅ Sanitized user input (geen forms, geen input)

---

## 📝 Git Workflow

### Branches
- `master` - Production branch
- Feature branches optioneel

### Commits
```bash
# Stage changes
git add .

# Commit
git commit -m "descriptive message"

# Push
git push origin master
```

### .gitignore
Huidige setup:
```
node_modules/
.DS_Store
*.log
.env
.vscode/
```

---

## 🎓 Leercurve

### Voor Beginners
Dit project is **perfect voor beginners** omdat:
- ✅ Vanilla JavaScript (geen frameworks)
- ✅ Geen build tools (geen webpack, geen npm scripts)
- ✅ Duidelijke code structuur
- ✅ Uitgebreide comments
- ✅ Modern maar simpel

### Technologieën om te Leren
1. **HTML5** - Semantische markup
2. **CSS3** - Flexbox, Grid, Custom Properties
3. **Vanilla JavaScript** - DOM manipulation, Event listeners
4. **Intersection Observer API** - Scroll animations
5. **Git** - Version control
6. **Static Site Hosting** - Deployment (GitHub Pages, Vercel, etc.)

---

## 🚀 Toekomstige Features

### Post-MVP Ideas
- [ ] **Interactieve variant selector** - Checkboxes om eigen regels te kiezen
- [ ] **Print-vriendelijke versie** - @media print optimalisatie
- [ ] **Score tracker app** - Live score calculator
- [ ] **Video tutorial** - Embedded YouTube uitleg
- [ ] **Community varianten** - Backend voor user-submitted rules
- [ ] **PWA functionaliteit** - Offline support, installeerbaar
- [ ] **Dark mode** - Toggle voor dark theme
- [ ] **Multi-taal** - Engels versie

### Analytics (Optioneel)
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>

<!-- Of Plausible (privacy-friendly) -->
<script defer data-domain="koningmexico.nl" src="https://plausible.io/js/script.js"></script>
```

---

## 🤝 Contributing

### Pull Requests Welkom
1. Fork het project
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je changes (`git commit -m 'Add AmazingFeature'`)
4. Push naar de branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

### Code Style
- **HTML**: 4 spaces indentation
- **CSS**: Alfabetische property order
- **JavaScript**:
  - 4 spaces indentation
  - Semicolons verplicht
  - Single quotes voor strings
  - camelCase voor variabelen

---

## 📄 Licentie

© 2025 Koning Mexico. Alle rechten voorbehouden.

---

## 📞 Contact & Support

- **Website**: https://koningmexico.nl (na domain setup)
- **GitHub**: [Repository link na publicatie]
- **Email**: info@koningmexico.nl (na setup)

Voor bugs, feature requests of vragen:
- Open een GitHub Issue (na repo publicatie)
- Of contacteer direct via email

---

## 🎲 Veel Speelplezier!

**Mexico is in vijf minuten uitgelegd — en daarna wil niemand meer stoppen.**

👑 Kies een variant, pak een beker, en speel!

---

**Last Updated:** December 2, 2025
**Version:** 1.0 (Production Ready)
