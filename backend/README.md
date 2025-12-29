# 🎲 Multiplayer Mexico Backend

Backend server voor het Multiplayer Mexico dobbelspel met real-time gameplay via Socket.io.

## ✨ Features

- ✅ **Authenticatie**: JWT-based register/login systeem
- ✅ **Matchmaking**: Automatische matchmaking op basis van Elo rating
- ✅ **Real-time Gameplay**: Socket.io voor instant game updates
- ✅ **Mexico Spelregels**: Volledige implementatie van alle regels:
  - Voorgooier/achterligger mechanisme
  - Blind/open throws met patroon enforcement
  - Eerste ronde verplicht blind
  - Vastgooier (tie) detectie en resolution
  - Lives systeem met penalty calculation
- ✅ **Elo Rating System**: Dynamische rating updates na elk spel
- ✅ **Leaderboard**: Top 100 spelers
- ✅ **Statistics**: Wins, losses, games played tracking

## 🚀 Quick Start

### 1. Installeer Dependencies

```bash
cd backend
npm install
```

### 2. Configureer Environment

```bash
# Kopieer .env.example naar .env
copy .env.example .env

# (Optioneel) Pas JWT_SECRET aan in .env voor productie
```

### 3. Start de Server

**Productie:**
```bash
npm start
```

**Development (met auto-restart):**
```bash
npm run dev
```

De server draait nu op: **http://localhost:8080**

### 4. Test de Server

Open je browser en ga naar:
- **Frontend**: http://localhost:8080/multiplayer.html
- **Health Check**: http://localhost:8080/api/health

## 📡 API Endpoints

### REST API

| Endpoint | Method | Beschrijving |
|----------|--------|--------------|
| `/api/health` | GET | Server health check |
| `/api/auth/register` | POST | Registreer nieuwe gebruiker |
| `/api/auth/login` | POST | Login bestaande gebruiker |
| `/api/leaderboard` | GET | Top 100 spelers |

### Socket.io Events

**Client → Server:**
- `join_queue` - Join matchmaking queue
- `leave_queue` - Leave matchmaking queue
- `throw_dice` - Gooi dobbelstenen
- `keep_throw` - Laat worp staan
- `give_up` - Pas (worp = 0)
- `return_to_lobby` - Terug naar lobby

**Server → Client:**
- `authenticated` - Succesvolle authenticatie
- `queue_joined` - Toegevoegd aan queue
- `match_found` - Tegenstander gevonden
- `game_start` - Spel begint
- `throw_result` - Resultaat van jouw worp
- `opponent_throw` - Tegenstander heeft gegooid
- `turn_switched` - Beurt gewisseld
- `round_result` - Ronde afgelopen
- `new_round` - Nieuwe ronde begint
- `vastgooier` - Gelijke worpen (tie)
- `rethrow_needed` - Opnieuw gooien nodig
- `player_gave_up` - Speler heeft gepast
- `game_over` - Spel afgelopen
- `error` - Foutmelding

## 🎮 Spelregels Implementatie

### Throw Values

- **Mexico (2-1 of 1-2)**: 1000 punten (hoogste waarde)
- **Dubbel (6-6, 5-5, etc.)**: 100 + dobbelsteenwaarde
- **Regulier (6-5, 4-3, etc.)**: Hoogste dobbelsteenwaarde × 10 + laagste

### Round Flow

1. **Eerste ronde**: Beide spelers MOETEN blind gooien (1 worp, automatisch laten staan)
2. **Volgende rondes**:
   - Voorgooier (verliezer vorige ronde) gooit eerst (max 3 worpen)
   - Achterligger moet voorgooier's patroon volgen (blind/open per worp)
   - Spelers kunnen laten staan of doorgooien (max 3 worpen)
3. **Vastgooier**: Bij gelijke worpen gooien beide spelers opnieuw (1 worp)
4. **Penalty**: Verliezer verliest levens:
   - Mexico = 2 levens
   - Andere worpen = 1 leven
5. **Win condition**: Eerste speler die 0 levens heeft verliest

### Elo Rating

- Nieuwe spelers starten op 1200 Elo
- K-factor: 32 (standaard chess rating)
- Dynamische updates na elk spel

## 🗄️ Data Storage

**Huidige versie**: In-memory storage (data gaat verloren bij server restart)

**Voor productie**: Implementeer database (SQLite, MongoDB, PostgreSQL)
- Users persisteren
- Game history
- Leaderboard persistence

## 🛠️ Development

### Project Structure

```
backend/
├── server.js           # Main server file (alle logica)
├── package.json        # Dependencies
├── .env.example        # Environment variables template
├── .env                # Jouw configuratie (niet in git)
└── README.md           # Deze file
```

### Debugging

De server logt alle belangrijke events naar console:
- ✅ User connections/disconnections
- 🔍 Matchmaking events
- 🎮 Game creation
- 🎲 Throws en round results
- 🏁 Game over

### Poorten Wijzigen

Pas `PORT` aan in `.env`:
```env
PORT=3000
```

**Let op**: Pas ook de frontend aan ([multiplayer.js:2-3](multiplayer.js#L2-L3)):
```javascript
const API_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3000';
```

## 🧪 Testen

### Multiplayer Testen (Lokaal)

1. Start de server: `npm start`
2. Open 2 browser tabs:
   - Tab 1: http://localhost:8080/multiplayer.html
   - Tab 2: http://localhost:8080/multiplayer.html (of incognito mode)
3. Registreer 2 verschillende accounts
4. Join queue in beide tabs
5. Spel start automatisch! 🎉

### API Testen

```bash
# Health check
curl http://localhost:8080/api/health

# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"test123\"}"

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"test123\"}"

# Leaderboard
curl http://localhost:8080/api/leaderboard
```

## 🚨 Troubleshooting

### Port already in use

Als poort 8080 al in gebruik is:
1. Stop het andere proces
2. Of pas de poort aan in `.env`

### CORS errors

De server staat CORS toe van alle origins (`*`). Voor productie: beperk dit tot je frontend domain.

### Socket disconnects

Check of:
- JWT token geldig is
- Backend draait
- Firewall blocking niet actief is

## 📝 TODO voor Productie

- [ ] Database integratie (SQLite/MongoDB/PostgreSQL)
- [ ] Rate limiting op API endpoints
- [ ] Input validation & sanitization verbeteren
- [ ] CORS configuratie aanscherpen
- [ ] Logging naar file (niet alleen console)
- [ ] Game reconnection functionaliteit
- [ ] Chat moderatie (als chat wordt toegevoegd)
- [ ] Admin dashboard
- [ ] Unit tests & integration tests

## 🎯 Game Balance

Huidige settings (aanpasbaar in server.js):
- Starting lives: 6
- Starting Elo: 1200
- Elo K-factor: 32
- Max throws per round: 3
- First round: Mandatory blind (1 throw, auto-keep)

## 📄 License

MIT (of jouw gewenste license)

---

**Veel plezier met het spelen! 🎲🇲🇽**
