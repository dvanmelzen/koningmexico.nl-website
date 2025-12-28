# 🎮 Multiplayer Mexico - Spelershandleiding

**Laatste update:** 2025-12-28
**Status:** ✅ Volledig operationeel

---

## 📋 Wat je nodig hebt

### 1. Backend Server (Moet draaien!)
```bash
cd d:/repos/mexico-multiplayer-backend
npm run dev
```

De server draait op **http://localhost:3000**

**Check of het werkt:**
```bash
curl http://localhost:3000/health
```
Moet `{"status":"ok"}` geven.

### 2. Website
Open in je browser:
- http://localhost:8080/multiplayer.html (als je live-server gebruikt)
- Of via https://koningmexico.nl/multiplayer.html (na deployment)

---

## 🎯 Hoe spelen (Stap voor stap)

### Stap 1: Account Aanmaken

1. Open **multiplayer.html** in je browser
2. Je ziet het login/registratie scherm
3. Klik op **"Registreren"** tab
4. Vul in:
   - Gebruikersnaam (3-50 karakters)
   - Email adres
   - Wachtwoord (minimaal 6 karakters)
5. Klik **"Account Aanmaken"**

✅ Je krijgt: "Account aangemaakt! Welkom [username]"

### Stap 2: Inloggen (volgende keren)

1. Open multiplayer.html
2. Gebruikersnaam en wachtwoord invullen
3. Klik **"Inloggen"**

✅ Je bent nu in de **lobby**!

### Stap 3: Tegenstander Zoeken

In de lobby zie je:
- **Jouw stats** (Elo rating, wins, losses)
- **Leaderboard** (top spelers)
- **"Zoek Tegenstander"** knop

Klik op **🔍 Zoek Tegenstander**

⏳ De server zoekt naar een speler met vergelijkbare Elo rating...

### Stap 4: Match Gevonden!

Als een tegenstander is gevonden:
- Je ziet tegenstander naam en Elo
- "Het spel begint zo..."
- Automatisch doorgestuurd naar game scherm

### Stap 5: Spelen!

#### Jouw Beurt
- Indicator toont: **🎯 Jouw beurt!**
- Klik **🎲 Gooi Dobbelstenen**
- Je ziet je worp (bijv. 6-4 = 64)
- Keuze:
  - **✅ Houd Worp** - Beurt eindigt
  - **🔄 Gooi Opnieuw** - Probeer hoger

#### Tegenstander Beurt
- Indicator toont: **⏳ Wachten op tegenstander...**
- Je ziet wanneer tegenstander gooit
- Chat blijft actief!

#### Winnen
- Hoogste worp per ronde wint
- Mexico (2-1) is hoogste!
- Bij gelijk: beurt sla je over

### Stap 6: Chat & Emotes

Tijdens het spelen:
- **Snelle reacties:** Klik emoji (👍 😄 🔥 💪 etc.)
- **Type bericht:** Max 100 karakters
- Druk Enter of klik 📤

### Stap 7: Game Afgelopen

Bij einde:
- 🏆 **"Je hebt gewonnen!"** (groen)
- 😔 **"Helaas, je hebt verloren"** (rood)
- Elo verandering: +15 / -10 (voorbeeld)
- Klik **🏠 Terug naar Lobby**

Klaar voor next game!

---

## 🏆 Elo Rating Systeem

### Wat is Elo?
Rating systeem zoals chess:
- **Start:** 1000 Elo
- **Win:** +10 tot +30 (afhankelijk van tegenstander)
- **Verlies:** -10 tot -30

### Ranglijst
- **1000-1200:** Beginner 🟢
- **1200-1500:** Gemiddeld 🟡
- **1500-1800:** Gevorderd 🟠
- **1800+:** Expert 🔴

Check leaderboard voor top 10!

---

## 💬 Chat Regels

### Allowed
- ✅ "GG!" (Good Game)
- ✅ "Mooie worp!"
- ✅ Emojis
- ✅ Tactische bluf

### Not Allowed
- ❌ Schelden
- ❌ Spam
- ❌ Onzin

*Moderatie komt later.*

---

## ⚙️ Instellingen

### Uitloggen
Klik **"Uitloggen"** rechts bovenin.

### Account Verwijderen
(Nog niet beschikbaar)

### Avatar Emoji
Komt in toekomstige update!

---

## 🐛 Problemen Oplossen

### "Kan niet verbinden met server"

**Oorzaak:** Backend draait niet.

**Oplossing:**
```bash
cd d:/repos/mexico-multiplayer-backend
npm run dev
```

Check: http://localhost:3000/health

---

### "Invalid credentials" bij login

**Oorzaak:** Verkeerde wachtwoord of gebruikersnaam bestaat niet.

**Oplossing:**
- Check spelling
- Of registreer nieuw account

---

### "Geen tegenstander gevonden"

**Oorzaak:** Je bent de enige speler online.

**Oplossing:**
- Open tweede browser (incognito)
- Maak tweede account aan
- Zoek tegenstander in beide browsers
- Server koppelt jullie!

**Test Setup:**
1. Browser 1: Account "speler1"
2. Browser 2 (incognito): Account "speler2"
3. Beide: Klik "Zoek Tegenstander"
4. Match! 🎉

---

### Chat werkt niet

**Oorzaak:** Moet in game zijn.

**Oplossing:**
Chat is alleen tijdens game, niet in lobby.

---

### Leaderboard leeg

**Oorzaak:** Nog geen spelers.

**Oplossing:**
Speel een paar games, leaderboard vult zich!

---

## 🎮 Game Regels (Herinnering)

### Worp Rangorde (Hoog naar Laag)
1. **Mexico** 2-1 = 21 🏆
2. **Dubbelen:**
   - 1-1 = 11
   - 2-2 = 22
   - 3-3 = 33
   - 4-4 = 44
   - 5-5 = 55
   - 6-6 = 66
3. **Normaal:** Hoogste dobbelsteen eerst
   - 6-5 = 65
   - 6-4 = 64
   - ...
   - 3-1 = 31

### Tactiek
- **Goede worp (60+):** Meestal houden
- **Slechte worp (40-):** Gooi opnieuw!
- **Mexico:** ALTIJD houden!

---

## 📊 Stats Tracking

Automatisch bijgehouden:
- **Total Games:** Aantal gespeelde games
- **Wins / Losses:** Win/verlies ratio
- **Current Streak:** Huidige win streak
- **Longest Win Streak:** Beste streak ooit
- **Elo Rating:** Ranking systeem

Check stats in lobby!

---

## 🚀 Sneltoetsen

(Komen later)
- Space: Gooi dobbelstenen
- Enter: Verstuur chat
- Escape: Terug naar lobby

---

## 🎯 Tips voor Winnen

### 1. Elo Strategie
- Speel vaak: Meer games = stabiele Elo
- Leer van verliezen: Check je worpen
- Bluf slim met chat!

### 2. Worp Strategie
- **65+ Keep altijd**
- **55-64:** Afhankelijk van situatie
- **54-:** Opnieuw gooien
- **Mexico:** Party time! 🎉

### 3. Mental Game
- Gebruik emotes strategisch
- "👍" na tegenstander slechte worp = tilting
- Stay cool bij verlies!

---

## 📱 Mobile Support

**Status:** Desktop first, mobile komt later.

**Workaround:**
- Gebruik Chrome/Firefox desktop mode
- Werkt, maar niet optimaal

---

## 🔮 Toekomstige Features

### Week 1-2
- ✅ Basic multiplayer (DONE!)
- ⏳ Game logic improvements
- ⏳ Better matchmaking algorithm

### Week 3-4
- ⏳ Friends list
- ⏳ Private games (uitnodigen)
- ⏳ Spectator mode

### Maand 2
- ⏳ Tournaments
- ⏳ Achievements
- ⏳ Custom avatars
- ⏳ Sound effects

### Later
- ⏳ Mobile app
- ⏳ Voice chat
- ⏳ Replay system
- ⏳ Coaching mode

---

## 📞 Support

### Probleem melden
1. Beschrijf probleem
2. Include error message (console F12)
3. Steps to reproduce

### Feedback geven
Suggesties welkom!

---

## 🎉 Quick Start Checklist

Volg deze stappen om te beginnen:

- [ ] Backend server draaien (`npm run dev`)
- [ ] Health check OK (`curl http://localhost:3000/health`)
- [ ] Open multiplayer.html in browser
- [ ] Account aanmaken (registreren)
- [ ] Inloggen
- [ ] Tweede browser (incognito) openen voor test
- [ ] Tweede account aanmaken
- [ ] Beide: "Zoek Tegenstander"
- [ ] Match gevonden!
- [ ] Eerste game spelen
- [ ] Chat proberen
- [ ] Leaderboard checken

**Klaar om te spelen! 🎲**

---

## 📸 Screenshots Guide

### Lobby Screen
```
┌─────────────────────────────────────────┐
│  [Logo]  Koning Mexico    [Username] 💎│
│                                          │
│  ┌────────────────┐  ┌──────────────┐  │
│  │   Jouw Stats   │  │  Leaderboard │  │
│  │ Elo: 1000      │  │  1. Pro      │  │
│  │ 5W - 3L        │  │  2. Gamer    │  │
│  │                │  │  3. Noob     │  │
│  │ [🔍 Zoek      │  │              │  │
│  │  Tegenstander] │  │              │  │
│  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────┘
```

### Game Screen
```
┌─────────────────────────────────────────┐
│ Speler1 (1050)    VS    Speler2 (980)  │
│     Score: 2              Score: 1      │
│ ─────────────────────────────────────── │
│         🎯 Jouw beurt!                  │
│                                          │
│           🎲 6  🎲 4                    │
│         Worp: 64 (Normaal)              │
│                                          │
│      [🎲 Gooi]  [✅ Houd]  [🔄 Opnieuw] │
│ ─────────────────────────────────────── │
│  Jouw worpen    │   Tegenstander      │
│  • 6-4: 64      │   • 5-3: 53        │
│  • 5-5: 55      │   • 6-2: 62        │
└─────────────────────────────────────────┘
```

---

**Veel speelplezier! 🎲🏆**

*Voor vragen: Check de troubleshooting sectie of vraag hulp!*
