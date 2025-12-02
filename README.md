# Koning Mexico Website

Website voor het dobbelspel Mexico (Mexxen) - koningmexico.nl

## Overzicht

Een single-page website die het klassieke dobbelspel Mexico/Mexxen uitlegt met duidelijke spelregels, rangorde van worpen, spelverloop en populaire varianten.

## Features

- Responsive design (mobiel-eerst)
- Koninklijke huisstijl met goud, groen en rood
- Interactieve elementen (klikbare dobbelstenen, scroll animaties)
- Duidelijke fase-indeling van het spelverloop
- Overzicht van populaire spelvarianten
- SEO geoptimaliseerd
- Snelle laadtijden

## Technologie

- **HTML5** - Semantische markup
- **CSS3** - Modern responsive design met CSS Grid en Flexbox
- **Vanilla JavaScript** - Geen frameworks, pure performance
- **Google Fonts** - Cinzel (headings) en Open Sans (body)

## Project Structuur

```
koningmexico.nl-website/
├── index.html          # Hoofdpagina
├── styles.css          # Alle styling
├── script.js           # Interactieve features
├── assets/             # Afbeeldingen en media
│   ├── logo.png        # Hoofdlogo (transparant)
│   ├── logo-badge.png  # Cirkel badge variant
│   ├── logo-oval.png   # Ovaal variant
│   ├── king-photo.jpg  # Koning foto
│   ├── favicon.png     # Browser icoon
│   └── og-image.jpg    # Social media preview
├── PRD.md              # Product Requirements Document
└── README.md           # Dit bestand
```

## Lokaal Testen

### Optie 1: Python (aanbevolen)
```bash
cd koningmexico.nl-website
python -m http.server 8000
```
Open http://localhost:8000 in je browser

### Optie 2: Node.js met npx
```bash
cd koningmexico.nl-website
npx serve -l 3000
```
Open http://localhost:3000 in je browser

### Optie 3: Live Server (VS Code extensie)
- Installeer "Live Server" extensie in VS Code
- Right-click op index.html → "Open with Live Server"

## Deployment

### Netlify (Aanbevolen)

1. **Via Netlify CLI:**
```bash
# Installeer Netlify CLI (eenmalig)
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd koningmexico.nl-website
netlify deploy --prod
```

2. **Via Netlify Dashboard:**
- Ga naar https://app.netlify.com
- Klik "Add new site" → "Import an existing project"
- Selecteer GitHub repository
- Build settings: geen (statische site)
- Publish directory: `.` (root)
- Deploy!

3. **Domain Instellen:**
- In Netlify dashboard → Domain settings
- Add custom domain: `koningmexico.nl`
- Update DNS bij je domain provider:
  - Voeg CNAME record toe: `www` → `[jouw-site].netlify.app`
  - Voeg A record toe: `@` → Netlify IP (of gebruik Netlify DNS)

## Design Tokens

### Kleuren
- **Goud**: #D4AF37, #FFD700 (primary accent)
- **Groen**: #0D5E3A, #1B7A4B (secondary)
- **Rood**: #8B0000, #B22222 (accenten, Mexico)
- **Bruin**: #3E2723 (tekst)
- **Cream**: #F5E6D3, #FFF8E7 (backgrounds)

### Typografie
- **Headings**: Cinzel (serif, koninklijk)
- **Body**: Open Sans (sans-serif, leesbaar)

### Spacing
- xs: 0.5rem
- sm: 1rem
- md: 2rem
- lg: 3rem
- xl: 4rem

## Browser Support

- Chrome (laatste 2 versies)
- Firefox (laatste 2 versies)
- Safari (laatste 2 versies)
- Edge (laatste 2 versies)
- iOS Safari
- Chrome Android

## Performance Targets

- Lighthouse Performance: >90
- Lighthouse Accessibility: >95
- Lighthouse Best Practices: >95
- Lighthouse SEO: >95
- First Contentful Paint: <1.8s
- Largest Contentful Paint: <2.5s

## Interactieve Features

### Easter Eggs
- Klik 5× snel op het hero logo voor een Mexico viering
- Klik op dobbelstenen om ze te "gooien"

### Animaties
- Smooth scroll tussen secties
- Scroll-triggered fade-in animaties
- Hover effects op cards
- Floating dice animatie
- Back-to-top button (verschijnt bij scrollen)

## SEO

### Meta Tags
- Title: "Koning Mexico | Het Dobbelspel Mexxen - Spelregels en Varianten"
- Description: Optimized voor zoekwoorden
- Open Graph tags voor social sharing
- Favicon en app icons

### Structured Data
Optioneel toe te voegen:
- Game schema
- HowTo schema voor spelregels

## Toekomstige Features (Post-MVP)

- [ ] Interactieve variant selector (checkboxes)
- [ ] Print-vriendelijke versie
- [ ] Score tracker app/tool
- [ ] Video tutorial
- [ ] Community submitted varianten
- [ ] PWA (Progressive Web App) functionaliteit
- [ ] Multi-taal support (Engels?)

## Updates & Maintenance

### Content Updates
Wijzig `index.html` voor content aanpassingen. Alle tekst staat in duidelijke secties.

### Styling Updates
Pas `styles.css` aan. Gebruik CSS custom properties (`:root`) voor consistente theming.

### Feature Updates
Voeg interactiviteit toe via `script.js`. Alle features zijn gemodulariseerd.

## Contact & Support

Voor vragen, bugs of feature requests:
- GitHub Issues (na publicatie)
- Email: info@koningmexico.nl (na setup)

## Licentie

© 2025 Koning Mexico. Alle rechten voorbehouden.

---

**Veel speelplezier!** 🎲👑
