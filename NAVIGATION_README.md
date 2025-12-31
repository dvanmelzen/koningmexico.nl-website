# 🎯 Koning Mexico - Unified Navigation System

## Overzicht

Een moderne, mobiel-vriendelijke navigatie component die consistent is over alle pagina's.

### ✨ Features

- **Consistent** - Zelfde navigatie op alle pagina's
- **Responsive** - Werkt perfect op desktop, tablet én mobiel
- **Hamburger Menu** - Smooth animatie op mobiele devices
- **Auto-highlight** - Actieve pagina wordt automatisch gemarkeerd
- **Modern Design** - Clean en professioneel uiterlijk
- **Easy to Update** - Wijzig navigatie op één plek, updatet overal

---

## 📦 Installatie

### Stap 1: Voeg het script toe aan je pagina

Voeg dit toe in de `<head>` of aan het einde van `<body>` op **elke pagina**:

```html
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jouw Pagina</title>

    <!-- Tailwind CSS (required) -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Tailwind Config (required voor kleuren) -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        green: '#0D5E3A',
                        'green-light': '#1B7A4B',
                    }
                }
            }
        }
    </script>

    <!-- ✅ NAVIGATION COMPONENT -->
    <script src="navigation.js"></script>
</head>
<body>
    <!-- Navigatie wordt hier automatisch ingevoegd -->

    <!-- Jouw content -->
    <main>
        <h1>Welkom!</h1>
    </main>
</body>
</html>
```

### Stap 2: Verwijder oude navigatie

Als je pagina al een `<header>` of `<nav>` heeft, **verwijder deze**! De nieuwe navigatie wordt automatisch ingevoegd.

**Verwijder dit soort code:**
```html
<!-- ❌ VERWIJDEREN -->
<header>
    <nav>
        <a href="index.html">Home</a>
        ...
    </nav>
</header>
```

---

## 🎨 Hoe het eruit ziet

### Desktop (> 1024px)
- Logo links
- Navigatie items met iconen EN tekst in het midden
- Multiplayer knop heeft speciale gouden highlight

### Tablet (768px - 1024px)
- Logo links
- Navigatie items met ALLEEN iconen (tekst verborgen)
- Hamburger menu rechts

### Mobiel (< 768px)
- Logo links
- Hamburger menu rechts
- Uitklapbaar menu met grote klikbare items
- Smooth animaties

---

## 📱 Mobiele Functies

### Hamburger Menu
- 3 horizontale lijntjes transformeren tot een X
- Menu schuift smooth omlaag
- Sluit automatisch bij klikken op link
- Sluit bij klikken buiten menu

### Touch-Friendly
- Grote klikbare oppervlakken (min. 44x44px)
- Duidelijke hover/active states
- Swipe-friendly spacing

---

## 🎯 Navigatie Items

Huidige items:
1. 🏠 Home (`/`)
2. 📖 Spelregels (`spelregels.html`)
3. 🎲 Solo Spelen (`spel.html`)
4. 🤖 vs Computer (`spel_vs_computer.html`)
5. 🎮 Multiplayer (`multiplayer.html`) - **Featured** (gouden highlight)

---

## 🔧 Customization

### Nieuwe pagina toevoegen

Bewerk `navigation.js` en voeg toe aan beide menu's:

```javascript
// Desktop menu (regel ~30)
<a href="nieuwe-pagina.html" class="nav-link">
    <span class="nav-icon">🆕</span>
    <span class="nav-text">Nieuwe Pagina</span>
</a>

// Mobiel menu (regel ~65)
<a href="nieuwe-pagina.html" class="mobile-nav-link">
    <span class="text-2xl">🆕</span>
    <span>Nieuwe Pagina</span>
</a>
```

### Kleuren aanpassen

In `navigation.js` bij de styles (regel ~125):

```css
.nav-link-primary {
    border: 2px solid #FFD700;  /* Gouden rand */
    color: #FFD700;             /* Gouden tekst */
}
```

### Animaties aanpassen

Hamburger snelheid (regel ~175):
```css
.hamburger-line {
    transition: all 0.3s ease;  /* Verander 0.3s naar gewenste snelheid */
}
```

Menu slide snelheid (regel ~195):
```css
.mobile-menu {
    transition: max-height 0.3s ease-in-out;
}
```

---

## 🐛 Troubleshooting

### Navigatie verschijnt niet
- ✅ Check of `navigation.js` correct is gelinkt
- ✅ Check of Tailwind CSS is geladen
- ✅ Open browser console voor errors (F12)

### Hamburger menu werkt niet
- ✅ Check of JavaScript errors zijn in console
- ✅ Ververs pagina (CTRL + F5)
- ✅ Check of er geen conflicterende JavaScript is

### Styling ziet er verkeerd uit
- ✅ Check of Tailwind config is geladen
- ✅ Check of er geen conflicterende CSS is
- ✅ Clear browser cache

### Mobiele weergave werkt niet
- ✅ Check viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- ✅ Test in echte mobiele browser (niet alleen desktop resize)

---

## 📊 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Minimum:** ES6 JavaScript support required

---

## 🚀 Performance

- **JavaScript:** ~8KB uncompressed
- **CSS:** Inline in JavaScript (no external file)
- **Load Time:** < 50ms (instant on modern devices)
- **No Dependencies:** Alleen Tailwind CSS (CDN)

---

## 📝 Changelog

### v1.0 (2025-12-30)
- ✅ Initial release
- ✅ Responsive design (desktop/tablet/mobile)
- ✅ Hamburger menu met animaties
- ✅ Auto-highlight actieve pagina
- ✅ Touch-friendly mobile interface
- ✅ Multiplayer featured highlight

---

## 🤝 Support

Bij vragen of problemen, check de code in `navigation.js` regel voor regel. Alles is gedocumenteerd!

**Happy coding! 🎲**
