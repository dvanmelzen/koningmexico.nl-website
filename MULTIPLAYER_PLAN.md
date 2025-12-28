# Koning Mexico - Real-Time Multiplayer Plan

**Datum:** 2025-12-28
**Versie:** 1.0
**Type:** Real-Time WebSocket Multiplayer met User Database

---

## 🎯 Project Overzicht

### Wat Bouwen We?

Een **real-time multiplayer versie** van Koning Mexico waarbij:
- Spelers kunnen registreren/inloggen
- Lobby systeem voor matchmaking
- Real-time game updates (WebSockets)
- Persistent user statistics
- Ranked leaderboards
- Game history tracking

### Tech Stack

#### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **WebSockets:** Socket.io
- **Database:** PostgreSQL 15
- **ORM:** Prisma (TypeScript-first)
- **Auth:** JWT tokens + bcrypt
- **Session Store:** Redis (optioneel voor production)

#### Frontend
- **Bestaande code:** HTML/CSS/JavaScript
- **Socket Client:** Socket.io-client
- **API Calls:** Fetch API
- **Storage:** localStorage voor JWT

#### DevOps
- **Hosting:** Fly.io (Europese regio's beschikbaar)
- **Database:** Fly.io Postgres (managed)
- **Monitoring:** Fly.io metrics + custom logging
- **CI/CD:** GitHub Actions → Fly.io deploy

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_emoji VARCHAR(10) DEFAULT '👤',
    elo_rating INTEGER DEFAULT 1000,
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_win_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_online BOOLEAN DEFAULT false
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_elo ON users(elo_rating DESC);
```

### Games Table
```sql
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL, -- 'waiting', 'active', 'finished', 'abandoned'
    game_mode VARCHAR(20) DEFAULT 'ranked', -- 'ranked', 'casual', 'private'
    max_players INTEGER DEFAULT 2,
    current_round INTEGER DEFAULT 1,
    voorgooier_id UUID,
    current_turn_user_id UUID,
    winner_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    FOREIGN KEY (voorgooier_id) REFERENCES users(id),
    FOREIGN KEY (current_turn_user_id) REFERENCES users(id),
    FOREIGN KEY (winner_id) REFERENCES users(id)
);

CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created ON games(created_at DESC);
```

### Game_Players Table (Junction)
```sql
CREATE TABLE game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL,
    user_id UUID NOT NULL,
    position INTEGER NOT NULL, -- 1, 2, 3, 4 (voor 4-player later)
    lives INTEGER DEFAULT 6,
    current_throw INTEGER,
    is_blind BOOLEAN DEFAULT false,
    throw_count INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(game_id, user_id),
    UNIQUE(game_id, position)
);

CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_user ON game_players(user_id);
```

### Throws Table (Game History)
```sql
CREATE TABLE throws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL,
    user_id UUID NOT NULL,
    round_number INTEGER NOT NULL,
    throw_number INTEGER NOT NULL, -- 1, 2, 3
    dice1 INTEGER NOT NULL,
    dice2 INTEGER NOT NULL,
    throw_value INTEGER NOT NULL, -- 21-65 or 100
    display_value VARCHAR(10), -- Voor Mexico: "21!"
    is_blind BOOLEAN NOT NULL,
    is_mexico BOOLEAN DEFAULT false,
    thrown_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_throws_game ON throws(game_id);
CREATE INDEX idx_throws_user ON throws(user_id);
```

### Friendships Table (Voor private games)
```sql
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    friend_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_friendships_user ON friendships(user_id);
```

---

## 🔌 WebSocket Events

### Client → Server

#### Authentication
```javascript
socket.emit('authenticate', { token: 'jwt_token_here' });
```

#### Lobby
```javascript
socket.emit('join_queue', { gameMode: 'ranked' });
socket.emit('leave_queue');
socket.emit('create_private_game', { maxPlayers: 2 });
socket.emit('join_private_game', { gameCode: 'ABC123' });
```

#### Game Actions
```javascript
socket.emit('throw_dice', { gameId: 'uuid', isBlind: true });
socket.emit('keep_throw', { gameId: 'uuid' });
socket.emit('reveal_dice', { gameId: 'uuid' });
socket.emit('leave_game', { gameId: 'uuid' });
```

#### Chat (Optioneel)
```javascript
socket.emit('send_message', { gameId: 'uuid', message: 'GG!' });
```

---

### Server → Client

#### Connection
```javascript
socket.on('authenticated', { userId, username, elo });
socket.on('auth_error', { message: 'Invalid token' });
```

#### Matchmaking
```javascript
socket.on('queue_joined', { position: 5, estimatedWait: 30 });
socket.on('match_found', { gameId, opponents: [...] });
socket.on('game_created', { gameId, gameCode: 'ABC123' });
```

#### Game State
```javascript
socket.on('game_started', { gameId, players: [...], firstPlayer: userId });
socket.on('game_state_update', {
    round: 1,
    currentTurn: userId,
    players: [
        { userId, lives: 6, throwCount: 0 },
        { userId, lives: 5, throwCount: 1 }
    ]
});
socket.on('opponent_throw', { userId, throwValue: 65, isBlind: false });
socket.on('round_end', { winner: userId, loser: userId, newLives: [...] });
socket.on('game_end', { winner: userId, eloChange: +15 });
```

#### Errors
```javascript
socket.on('error', { code: 'INVALID_ACTION', message: 'Not your turn' });
socket.on('player_disconnected', { userId, reconnectTimeout: 60 });
socket.on('player_reconnected', { userId });
```

---

## 🚀 API Endpoints (REST)

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh
```

### Users
```
GET    /api/users/:id
PATCH  /api/users/:id
GET    /api/users/:id/stats
GET    /api/users/:id/games
```

### Leaderboard
```
GET    /api/leaderboard/elo?limit=100
GET    /api/leaderboard/wins?limit=100
GET    /api/leaderboard/streak?limit=100
```

### Games
```
GET    /api/games/:id
GET    /api/games/:id/history
```

### Friends
```
GET    /api/friends
POST   /api/friends/add
DELETE /api/friends/:id
GET    /api/friends/online
```

---

## 📁 Project Structure

```
mexico-multiplayer-backend/
├── src/
│   ├── index.ts                 # Express + Socket.io setup
│   ├── config/
│   │   ├── database.ts          # Prisma client
│   │   └── redis.ts             # Redis client (optioneel)
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── games.routes.ts
│   │   └── leaderboard.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   └── games.controller.ts
│   ├── services/
│   │   ├── auth.service.ts      # JWT + bcrypt
│   │   ├── matchmaking.service.ts
│   │   └── game.service.ts      # Game logic
│   ├── socket/
│   │   ├── handlers/
│   │   │   ├── auth.handler.ts
│   │   │   ├── lobby.handler.ts
│   │   │   └── game.handler.ts
│   │   └── middleware/
│   │       └── socketAuth.ts
│   ├── models/
│   │   └── (Prisma generated)
│   └── utils/
│       ├── logger.ts
│       └── validation.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── fly.toml
```

---

## 🔐 Security Best Practices

### Authentication
- ✅ Bcrypt voor password hashing (cost factor 12)
- ✅ JWT met korte expiry (15 min access, 7 days refresh)
- ✅ HttpOnly cookies voor refresh tokens
- ✅ Rate limiting op login endpoints
- ✅ Email verification (optioneel voor beta)

### WebSocket Security
- ✅ JWT verification bij socket connect
- ✅ Action validation (is it your turn?)
- ✅ Rate limiting op game actions
- ✅ Disconnect timeouts (60 sec to reconnect)

### Database Security
- ✅ Prepared statements (Prisma handles this)
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention
- ✅ Cascade deletes configured

### GDPR Compliance
- ✅ User data export endpoint
- ✅ Account deletion met cascade
- ✅ Privacy policy link
- ✅ Cookie consent (indien EU hosted)

---

## 💰 Cost Estimate

### Development Phase (First 3 Months)
| Service | Plan | Cost/Month |
|---------|------|------------|
| **Fly.io Compute** | 2x shared-cpu-1x (256MB) | €5 |
| **Fly.io Postgres** | Development (Shared) | €0 (free tier) |
| **Redis** | Fly.io (optional) | €0 (skip for now) |
| **Domain** | Bestaand | €0 |
| **Total** | | **~€5/maand** |

### Production (Scaled)
| Service | Plan | Cost/Month |
|---------|------|------------|
| **Fly.io Compute** | 3x shared-cpu-1x (512MB) | €15 |
| **Fly.io Postgres** | Production (dedicated) | €10 |
| **Redis** | Upstash (serverless) | €5 |
| **Monitoring** | Sentry (free tier) | €0 |
| **Total** | | **~€30/maand** |

---

## 📅 Development Timeline

### Week 1-2: Backend Foundation
- [ ] Project setup (Node.js + Prisma + Socket.io)
- [ ] Database schema + migrations
- [ ] Basic REST API (auth, users)
- [ ] JWT authentication

### Week 3-4: WebSocket Core
- [ ] Socket.io server setup
- [ ] Authentication middleware
- [ ] Lobby system (matchmaking queue)
- [ ] Basic game state management

### Week 5-6: Game Logic
- [ ] Game rules implementation (server-side)
- [ ] Turn validation
- [ ] Round management
- [ ] Win/loss detection

### Week 7-8: Frontend Integration
- [ ] Socket.io client integration
- [ ] Login/Register UI
- [ ] Lobby UI
- [ ] Real-time game updates

### Week 9-10: Statistics & Leaderboard
- [ ] Elo rating system
- [ ] Statistics tracking
- [ ] Leaderboard endpoints
- [ ] User profile pages

### Week 11-12: Testing & Deploy
- [ ] End-to-end testing
- [ ] Load testing (100 concurrent users)
- [ ] Fly.io deployment
- [ ] Production monitoring

**Total:** ~3 maanden part-time (10-15 uur/week)

---

## 🎯 MVP Features (Launch)

### Must Have
- ✅ User registration/login
- ✅ Matchmaking (random opponent)
- ✅ Real-time 1v1 games
- ✅ Basic stats (W/L ratio)
- ✅ Leaderboard (top 100)

### Nice to Have (Later)
- ⏳ Friends system
- ⏳ Private games
- ⏳ Chat/emotes
- ⏳ Spectator mode
- ⏳ Game replay
- ⏳ Mobile app (PWA)

---

## 🚀 Next Steps

1. **Review this plan** - Any changes needed?
2. **Setup backend project** - I'll create starter template
3. **Deploy to Fly.io** - Setup free dev environment
4. **Build auth system** - Login/register first
5. **Socket.io basics** - Test real-time connection
6. **Incremental features** - One at a time

Klaar om te beginnen? 🎮

---

**Created:** 2025-12-28
**Author:** Claude Code + Daniel van Melzen
**Status:** Ready for review
