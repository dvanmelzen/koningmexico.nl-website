# Product Requirements Document (PRD)
## Koning Mexico Website

**Project:** koningmexico.nl
**Version:** 1.0
**Date:** December 2025
**Owner:** Daniel van Melzen

---

## 1. Executive Summary

Een single-page website die het dobbelspel Mexico (Mexxen) introduceert en uitlegt aan nieuwe en ervaren spelers. De site combineert duidelijke spelregels met een speelse, koninklijke branding en biedt flexibiliteit door verschillende spelvarianten te presenteren.

---

## 2. Goals & Objectives

### Primary Goals
- **Educatie**: Bezoekers leren het spel Mexico spelen via duidelijke, gestructureerde uitleg
- **Referentie**: Dienen als naslagwerk voor spelregels en varianten tijdens het spelen
- **Branding**: Etableren van "Koning Mexico" als herkenbare naam/merk voor het spel

### Success Metrics
- Duidelijke navigatie door alle secties
- Mobiel-vriendelijke ervaring (>90% mobile usability score)
- Snelle laadtijd (<3 seconden)
- Engagement: gemiddelde tijd op pagina >2 minuten

---

## 3. Target Audience

### Primary Users
- **Nieuwe spelers**: 18-45 jaar, op zoek naar speluitleg
- **Ervaren spelers**: Zoeken naar variantenregels of willen hun huisregels delen
- **Feest/borrel organisatoren**: Op zoek naar gezelschapsspellen

### User Needs
- Snelle toegang tot spelregels vanaf mobiel tijdens het spelen
- Overzichtelijke presentatie van worprangorde
- Makkelijk begrijpen van de verschillende fases
- Ontdekken van nieuwe varianten

---

## 4. Feature Requirements

### 4.1 Core Features (MVP)

#### Hero Section
- **Logo**: "Koning Mexico" met koninklijke uitstraling
- **Tagline**: Korte pakkende intro over het spel
- **Visual**: Dobbelstenen, beker, koninklijke elementen
- **CTA**: Scroll naar spelregels of "Speel nu"

#### Benodigdheden Sectie
- Lijst met visuele iconen:
  - 1 dobbelbeker
  - 2 dobbelstenen
  - Scorestenen/lucifers
  - Aantal startlevens
- Compact en scanbaar

#### Doel van het Spel
- Korte, bondige uitleg
- Visual: laatste speler blijft over

#### Rangorde Worpen
- **Critical**: Overzichtelijke tabel/lijst van hoog naar laag:
  - Mexico (21) - gemarkeerd als koning
  - Dubbels als honderden (66=600, etc.)
  - Gewone worpen (65 t/m 31)
- Visual: dobbelstenen bij voorbeelden
- Color-coding voor verschillende categorieën

#### Spelverloop - Onze Variant
Opgedeeld in duidelijke fases:
- **Fase 1: Voorgooien**
  - Wie is voorgooier
  - Worplimiet regels (1, 2, of 3 worpen)
- **Fase 2: De Ronde**
  - Iedereen gooit
  - Levensverlies berekening
  - Mexico straf-stacking
- **Fase 3: Overgooien**
  - Wanneer (vastloper)
  - Tie-breaker regels

Elke fase met:
- Nummer indicator (1, 2, 3)
- Korte titel
- Bullet points met regels
- Optional: icoon/illustratie

#### Waarom dit Spel zo Leuk Is
- Storytelling sectie
- Focus op: strategie, spanning, macht voorgooier
- Emotionele hook voor nieuwe spelers

#### Variaties Sectie
- **Layout**: Cards of toggle lijst
- Per variant:
  - Naam
  - Korte beschrijving
  - "Populair" badge waar van toepassing
- Voorbeelden:
  - Mexico kost altijd 2 levens
  - Mexico reset
  - Blind gooien vaker
  - Andere tie-breakers
  - Variabel startlevens
  - Doorrollen onder beker

#### Call-to-Action (Footer)
- Slogan: "Kies een variant, pak een beker, en speel"
- Subtext: "In vijf minuten uitgelegd — daarna wil niemand meer stoppen"
- Optional: social sharing buttons

### 4.2 Nice-to-Have Features (Post-MVP)
- Interactieve variant selector (checkboxes om je eigen regels samen te stellen)
- Print-vriendelijke versie van spelregels
- Score tracker app
- Video tutorial
- Community submitted varianten

---

## 5. Design Requirements

### 5.1 Visual Style

**Brand Identity: "Koning Mexico"**
- **Thema**: Middeleeuwse royalty meets speelse dobbelspel
- **Tone**: Elegant maar toegankelijk, speels maar niet kinderachtig

**Color Palette:**
- **Primary**: Goud/Geel (#D4AF37, #FFD700) - voor accenten, headings, CTAs
- **Secondary**:
  - Koninklijk Groen (#0D5E3A, #1B7A4B)
  - Koninklijk Rood (#8B0000, #B22222)
- **Neutral**:
  - Donkerbruin (#3E2723) - voor tekst
  - Beige/Cream (#F5E6D3) - voor backgrounds
  - Wit (#FFFFFF) - voor cards/content
- **Accent**: Goud voor highlights en belangrijke elementen (Mexico worp!)

**Typography:**
- **Headings**: Decoratief maar leesbaar (bijv. Cinzel, Playfair Display, of Lora)
- **Body**: Schreefloos, zeer leesbaar (bijv. Open Sans, Lato, Roboto)
- **Hierarchy**: H1 > H2 > H3 duidelijk onderscheiden

**Visual Elements:**
- Logo: "Koning Mexico" transparent PNG (geleverd)
- Dobbelstenen illustraties (vooral 2-1 voor Mexico)
- Dobbelbeker icoon
- Kroon/scepter decoratieve elementen
- Subtiele texturen (leder, hout, fluweel) voor rijke uitstraling

### 5.2 Layout & Composition

**Structure:**
- Single-page met smooth scroll tussen secties
- Fixed/sticky header met logo en mogelijk mini-menu
- Duidelijke section dividers
- White space voor leesbaarheid

**Grid System:**
- Responsive grid (CSS Grid of Flexbox)
- Desktop: 2-3 kolommen waar logisch
- Tablet: 2 kolommen of full-width
- Mobile: single column, stacked

**Section Patterns:**
- Alternerend lichte/donkere backgrounds voor contrast
- Hero: Full-height met centered content
- Content secties: max-width container (1200px) centered
- Cards voor varianten: grid layout

### 5.3 Responsive Design

**Breakpoints:**
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

**Mobile-First Approach:**
- Touch-friendly buttons (min 44x44px)
- Geen hover states als primary interaction
- Hamburger menu indien nodig
- Gestackte content, geen side-scrolling
- Leesbare font sizes (16px+ body text)

**Performance:**
- Lazy loading voor images
- Optimized images (WebP met fallback)
- Minimized CSS/JS
- Critical CSS inline voor above-the-fold

---

## 6. Technical Requirements

### 6.1 Technology Stack

**Frontend:**
- **HTML5**: Semantic markup
- **CSS3**:
  - Modern layout (Flexbox, Grid)
  - CSS Custom Properties voor theming
  - Animations/transitions voor interactiviteit
  - Optional: CSS preprocessor (SCSS) indien complexiteit dat vraagt
- **JavaScript (Vanilla)**:
  - Smooth scrolling
  - Variant toggles/cards interactie
  - Optional: simple state management voor variant selector
  - NO frameworks nodig voor MVP (keep it simple)

**Assets:**
- Afbeeldingen: PNG (logo transparent), JPG/WebP (photos)
- Icons: SVG (inline of sprite)
- Fonts: Google Fonts of self-hosted

### 6.2 Browser Support
- **Modern browsers**: Chrome, Firefox, Safari, Edge (laatste 2 versies)
- **Mobile browsers**: iOS Safari, Chrome Android
- **Graceful degradation**: Basis content leesbaar in oudere browsers

### 6.3 Hosting & Deployment
- **Hosting**: Netlify
- **Domain**: koningmexico.nl
- **Version Control**: Git + GitHub (repository: koningmexico.nl-website)
- **Deployment**:
  - Netlify auto-deploy van main branch
  - Branch previews voor testing
  - Custom domain configuratie

### 6.4 Performance Targets
- **Lighthouse scores**:
  - Performance: >90
  - Accessibility: >95
  - Best Practices: >95
  - SEO: >95
- **Load time**: <3 seconden op 3G
- **FCP**: <1.8 seconden
- **LCP**: <2.5 seconden

---

## 7. Content Requirements

### 7.1 Copy
- **Taal**: Nederlands
- **Tone of Voice**:
  - Vriendelijk en enthousiast
  - Duidelijk en direct
  - Een tikje humor waar gepast
  - Geen jargon, wel specifiek over spelregels

### 7.2 Images
**Required:**
- Logo (geleverd): Gemini_Generated_Image_6anxcj6anxcj6anx.png
- Hero background of decoratieve elementen
- Dobbelstenen illustraties voor rangorde
- Iconen voor benodigdheden

**Optional:**
- Foto's van het spel in actie
- Sfeerbeelden (tavern, speeltafel)

### 7.3 SEO
- **Title**: "Koning Mexico | Het Dobbelspel Mexxen - Spelregels en Varianten"
- **Meta Description**: "Leer het verslavende dobbelspel Mexico (Mexxen) spelen. Complete spelregels, rangorde, fases en populaire varianten. Simpel te leren, tactisch om te meesteren!"
- **Keywords**: mexico spel, mexxen, dobbelspel, spelregels mexico, dobbelstenen spel, koning mexico
- **Open Graph**: Voor social sharing
- **Structured Data**: Game/HowTo schema waar mogelijk

---

## 8. User Flows

### 8.1 First-Time Visitor
1. Lands op hero → ziet direct wat het is (Mexico dobbelspel)
2. Scroll/click naar benodigdheden → checkt of ze kunnen spelen
3. Leest doel en rangorde → begrijpt basis
4. Leest spelverloop fase voor fase → kan nu spelen
5. Bekijkt varianten → kiest hun huisregels
6. CTA: Gaat spelen of bookmark voor later

### 8.2 Returning Visitor (During Game)
1. Opent site op mobiel tijdens het spelen
2. Scroll naar rangorde → checkt specifieke worp
3. Of naar spelverloop → check of Mexico straft of reset
4. Snel antwoord, terug naar spel

### 8.3 Variant Explorer
1. Heeft basisregels al gespeeld
2. Scroll direct naar varianten sectie
3. Bekijkt opties, bespreekt met groep
4. Probeert nieuwe variant

---

## 9. Acceptance Criteria

### Definition of Done (MVP)
- [ ] Alle secties aanwezig en gevuld met content
- [ ] Logo en branding consistent toegepast
- [ ] Responsive op mobile, tablet, desktop
- [ ] Alle links en navigatie werken
- [ ] Images geoptimaliseerd en laden snel
- [ ] Cross-browser getest (Chrome, Firefox, Safari, Edge)
- [ ] Mobile getest op echte devices (iOS + Android)
- [ ] Lighthouse scores halen targets (>90/95/95/95)
- [ ] Deployed op Netlify met custom domain
- [ ] Git repository opgezet en gecommit

### Quality Checks
- **Accessibility**:
  - Semantic HTML
  - Alt text op alle images
  - Keyboard navigatie werkt
  - ARIA labels waar nodig
  - Contrast ratios voldoen aan WCAG AA
- **Performance**:
  - Geen render-blocking resources
  - Images lazy loaded
  - Minimale file sizes
- **SEO**:
  - Meta tags compleet
  - Heading hierarchy logisch
  - Mobile-friendly test passed

---

## 10. Project Phases

### Phase 1: Development (Huidig)
- PRD finalization ✓ (dit document)
- Design system setup (colors, typography, spacing)
- HTML structure
- CSS styling (mobile-first)
- Content integration
- JavaScript interactions
- Image optimization and integration
- Local testing

### Phase 2: Deployment
- Git repository setup
- GitHub push
- Netlify configuration
- Domain connection (koningmexico.nl)
- DNS setup
- SSL certificate
- Production testing

### Phase 3: Post-Launch
- Monitor analytics
- Gather user feedback
- Performance monitoring
- Bug fixes
- Content updates based on feedback

### Phase 4: Future Enhancements (Optional)
- Interactive variant builder
- Score tracker tool
- Video tutorial production
- Community features (submit variants)
- Multi-language support (Engels?)

---

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Content te lang voor single-page | Medium | Low | Collapsible sections, sticky nav, duidelijke hierarchy |
| Images te zwaar voor mobile | High | Medium | WebP format, responsive images, lazy loading, compression |
| Unclear spelregels voor nieuwelingen | High | Medium | User testing, clear examples, visual aids per fase |
| Browser compatibility issues | Medium | Low | Progressive enhancement, testing, graceful degradation |
| Domain/DNS setup delays | Low | Medium | Prepare alternatieven, test op Netlify subdomain first |

---

## 12. Future Considerations

### Potential Features
1. **Interactive Elements:**
   - Dobbelstenen animator (click to roll)
   - Live score calculator
   - Variant rule generator

2. **Community:**
   - User-submitted varianten
   - Rating system voor populaire varianten
   - Comments or discussion board

3. **Expansion:**
   - Print-ready PDF van regels
   - App version (PWA)
   - Tournament mode met bracket

4. **Monetization (optional):**
   - Affiliate links naar dobbelstenen sets
   - Premium variant packs
   - Branded merchandise

### Analytics to Track
- Most visited sections
- Average time on page
- Bounce rate
- Device breakdown (mobile vs desktop)
- Popular variants (if interactive selector added)
- Traffic sources

---

## 13. Appendix

### Design Inspiration
- Geleverde afbeeldingen tonen koninklijk thema
- Medieval/tavern aesthetics
- Luxury gaming (poker, casino) maar accessible
- Board game websites (clear rule explanations)

### Similar Projects
- Speluitleg.nl (structure inspiration)
- Board game rule sites (clarity)
- Casino game tutorials (visual hierarchy)

### Resources
- Logo assets (provided in Downloads folder)
- Content (provided in Dutch)
- Color references from existing images
- Font pairings: Google Fonts library

---

**Sign-off:**
- [ ] Content Owner Approval
- [ ] Technical Feasibility Confirmed
- [ ] Design Direction Approved
- [ ] Ready for Development

---

*Document Version History:*
- v1.0 (2025-12-02): Initial PRD creation
