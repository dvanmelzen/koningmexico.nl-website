// Multiplayer Mexico Backend Server - CORRECTE SPELREGELS IMPLEMENTATIE
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'mexico-secret-key-change-in-production';

// Initialize Express & Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../')); // Serve frontend files

// ============================================
// IN-MEMORY DATABASE
// ============================================

const users = new Map(); // userId -> user object
const usersByUsername = new Map(); // username (lowercase) -> userId
const usersByEmail = new Map(); // email (lowercase) -> userId
const games = new Map(); // gameId -> game object
const matchmakingQueue = []; // Array of { userId, eloRating, socketId }
const activeSockets = new Map(); // socketId -> userId

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Calculate Elo rating change
function calculateEloChange(winnerElo, loserElo, K = 32) {
    const expectedWin = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const winnerChange = Math.round(K * (1 - expectedWin));
    const loserChange = Math.round(K * (0 - (1 - expectedWin)));
    return { winnerChange, loserChange };
}

// Mexico throw value calculation (EXACT volgens spelregels)
function calculateThrowValue(dice1, dice2) {
    // Mexico (2-1 or 1-2) = 21 (hoogste waarde)
    if ((dice1 === 2 && dice2 === 1) || (dice1 === 1 && dice2 === 2)) {
        return { value: 21, name: 'Mexico', isMexico: true };
    }

    // Pairs (dubbelen) = dobbelsteenwaarde × 100
    if (dice1 === dice2) {
        return { value: dice1 * 100, name: `Dubbel ${dice1}`, isMexico: false };
    }

    // Regular throws (higher die first × 10 + lower)
    const high = Math.max(dice1, dice2);
    const low = Math.min(dice1, dice2);
    return { value: high * 10 + low, name: `${high}-${low}`, isMexico: false };
}

// ============================================
// REST API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', players: users.size, games: games.size });
});

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        let { username, email, password } = req.body;

        // Trim and normalize inputs
        username = username?.trim();
        email = email?.trim().toLowerCase(); // Email always lowercase
        password = password?.trim();

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Alle velden zijn verplicht' });
        }
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ message: 'Gebruikersnaam moet 3-50 karakters zijn' });
        }

        // Strong password validation
        if (password.length < 8) {
            return res.status(400).json({ message: 'Wachtwoord moet minimaal 8 karakters zijn' });
        }
        if (!/[a-z]/.test(password)) {
            return res.status(400).json({ message: 'Wachtwoord moet minimaal 1 kleine letter bevatten' });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ message: 'Wachtwoord moet minimaal 1 hoofdletter bevatten' });
        }
        if (!/\d/.test(password)) {
            return res.status(400).json({ message: 'Wachtwoord moet minimaal 1 cijfer bevatten' });
        }
        if (!/[!@#$%.,]/.test(password)) {
            return res.status(400).json({ message: 'Wachtwoord moet minimaal 1 speciaal teken bevatten (!@#$%.,)' });
        }

        // Check if username exists (case-insensitive)
        if (usersByUsername.has(username.toLowerCase())) {
            return res.status(400).json({ message: 'Gebruikersnaam bestaat al' });
        }

        // Check if email exists (always lowercase)
        if (usersByEmail.has(email)) {
            return res.status(400).json({ message: 'Email bestaat al' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = {
            id: uuidv4(),
            username, // Keep original case for display
            email, // Already lowercase
            password: hashedPassword,
            eloRating: 1200,
            avatarEmoji: '👤',
            stats: {
                wins: 0,
                losses: 0,
                gamesPlayed: 0
            },
            createdAt: new Date()
        };

        users.set(user.id, user);
        usersByUsername.set(username.toLowerCase(), user.id);
        usersByEmail.set(email, user.id); // Email is already lowercase

        // Generate token
        const accessToken = generateToken(user);

        // Return user (without password)
        const { password: _, ...userResponse } = user;
        res.status(201).json({
            user: userResponse,
            accessToken
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        let { username, password } = req.body;

        // Trim and normalize username (case-insensitive)
        username = username?.trim();
        password = password?.trim();

        // Validation
        if (!username || !password) {
            return res.status(400).json({ message: 'Gebruikersnaam en wachtwoord verplicht' });
        }

        // Find user (case-insensitive username lookup)
        const userId = usersByUsername.get(username.toLowerCase());
        if (!userId) {
            return res.status(401).json({ message: 'Ongeldige inloggegevens' });
        }

        const user = users.get(userId);

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Ongeldige inloggegevens' });
        }

        // Generate token
        const accessToken = generateToken(user);

        // Return user (without password)
        const { password: _, ...userResponse } = user;
        res.status(200).json({
            user: userResponse,
            accessToken
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
    const players = Array.from(users.values())
        .map(({ password, ...user }) => user)
        .sort((a, b) => b.eloRating - a.eloRating)
        .slice(0, 100);

    res.json({ players });
});

// ============================================
// SOCKET.IO CONNECTION & AUTHENTICATION
// ============================================

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return next(new Error('Invalid token'));
    }

    socket.userId = decoded.id;
    next();
});

io.on('connection', (socket) => {
    const userId = socket.userId;
    const user = users.get(userId);

    if (!user) {
        socket.disconnect();
        return;
    }

    console.log(`✅ User connected: ${user.username} (${socket.id})`);
    activeSockets.set(socket.id, userId);

    socket.emit('authenticated', { username: user.username });

    // ============================================
    // MATCHMAKING
    // ============================================

    socket.on('join_queue', ({ gameMode }) => {
        console.log(`🔍 ${user.username} joined matchmaking queue`);

        // Remove from queue if already there
        const existingIndex = matchmakingQueue.findIndex(p => p.userId === userId);
        if (existingIndex !== -1) {
            matchmakingQueue.splice(existingIndex, 1);
        }

        // Add to queue
        matchmakingQueue.push({
            userId,
            username: user.username,
            eloRating: user.eloRating,
            socketId: socket.id,
            gameMode
        });

        socket.emit('queue_joined', { queueSize: matchmakingQueue.length });

        // Try to find a match
        tryMatchmaking();
    });

    socket.on('leave_queue', () => {
        const index = matchmakingQueue.findIndex(p => p.userId === userId);
        if (index !== -1) {
            matchmakingQueue.splice(index, 1);
            console.log(`❌ ${user.username} left matchmaking queue`);
        }
    });

    // ============================================
    // GAME EVENTS - CORRECTE SPELREGELS!
    // ============================================

    socket.on('throw_dice', ({ gameId, isBlind }) => {
        const game = games.get(gameId);
        if (!game) {
            return socket.emit('error', { message: 'Game not found' });
        }

        // Ronde 1: Simultaan (geen turn check)
        // Ronde 2+: Turn-based (wel turn check)
        if (!game.isFirstRound && game.currentTurn !== userId) {
            return socket.emit('error', { message: 'Not your turn' });
        }

        handleThrow(game, userId, isBlind);
    });

    socket.on('reveal_dice', ({ gameId }) => {
        const game = games.get(gameId);
        if (!game || game.currentTurn !== userId) {
            return socket.emit('error', { message: 'Not your turn' });
        }

        handleReveal(game, userId);
    });

    socket.on('keep_throw', ({ gameId }) => {
        const game = games.get(gameId);
        if (!game || game.currentTurn !== userId) {
            return socket.emit('error', { message: 'Not your turn' });
        }

        handleKeep(game, userId);
    });

    socket.on('choose_result', ({ gameId, result }) => {
        const game = games.get(gameId);
        if (!game || game.currentTurn !== userId) {
            return socket.emit('error', { message: 'Not your turn' });
        }

        handleResultChoice(game, userId, result);
    });

    socket.on('return_to_lobby', ({ gameId }) => {
        const game = games.get(gameId);
        if (game) {
            games.delete(gameId);
        }
    });

    // ============================================
    // DISCONNECT
    // ============================================

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${user.username}`);
        activeSockets.delete(socket.id);

        // Remove from queue
        const queueIndex = matchmakingQueue.findIndex(p => p.userId === userId);
        if (queueIndex !== -1) {
            matchmakingQueue.splice(queueIndex, 1);
        }

        // Handle active games (forfeit)
        for (const [gameId, game] of games.entries()) {
            if (game.player1Id === userId || game.player2Id === userId) {
                const winnerId = game.player1Id === userId ? game.player2Id : game.player1Id;
                endGame(game, winnerId, 'opponent_disconnected');
            }
        }
    });
});

// ============================================
// MATCHMAKING LOGIC
// ============================================

function tryMatchmaking() {
    if (matchmakingQueue.length < 2) return;

    // Sort by Elo for better matching
    matchmakingQueue.sort((a, b) => a.eloRating - b.eloRating);

    // Match first two players
    const player1 = matchmakingQueue.shift();
    const player2 = matchmakingQueue.shift();

    createGame(player1, player2);
}

function createGame(player1Data, player2Data) {
    const gameId = uuidv4();

    const player1 = users.get(player1Data.userId);
    const player2 = users.get(player2Data.userId);

    const game = {
        gameId,
        player1Id: player1.id,
        player2Id: player2.id,
        player1SocketId: player1Data.socketId,
        player2SocketId: player2Data.socketId,
        player1Lives: 6,
        player2Lives: 6,
        roundNumber: 1,
        voorgooier: null, // Geen voorgooier in eerste ronde!
        currentTurn: null, // NULL in ronde 1 (simultaan), vanaf ronde 2 turn-based
        isFirstRound: true, // BELANGRIJK!
        // Ronde 1 simultaan tracking
        firstRoundThrows: {
            player1: null, // Will store throw data when player1 throws
            player2: null  // Will store throw data when player2 throws
        },
        // Ronde 2+ INTERLEAVED turn-based tracking
        maxThrows: 3,
        voorgooierPattern: [], // [true, false, true] = [blind, open, blind] - gebouwd terwijl voorgooier gooit
        voorgooierThrows: [], // Array van alle worpen van voorgooier deze ronde
        achterliggerThrows: [], // Array van alle worpen van achterligger deze ronde
        voorgooierThrowCount: 0,  // Aantal worpen voorgooier heeft gedaan
        achterliggerThrowCount: 0, // Aantal worpen achterligger heeft gedaan
        waitingForResult: false, // Wacht op resultaat keuze
        // Result choices (beide spelers moeten kiezen)
        voorgooierResult: null, // 'won', 'lost', or 'vast'
        achterliggerResult: null, // 'won', 'lost', or 'vast'
        status: 'active',
        startedAt: new Date()
    };

    games.set(gameId, game);

    console.log(`🎮 Game created: ${player1.username} vs ${player2.username}`);

    // Notify both players of match found
    io.to(player1Data.socketId).emit('match_found', {
        opponent: {
            username: player2.username,
            eloRating: player2.eloRating,
            avatarEmoji: player2.avatarEmoji
        }
    });

    io.to(player2Data.socketId).emit('match_found', {
        opponent: {
            username: player1.username,
            eloRating: player1.eloRating,
            avatarEmoji: player1.avatarEmoji
        }
    });

    // Start game after short delay
    setTimeout(() => startGame(game), 2000);
}

function startGame(game) {
    const player1 = users.get(game.player1Id);
    const player2 = users.get(game.player2Id);

    const gameStartData = {
        gameId: game.gameId,
        players: [
            {
                id: player1.id,
                username: player1.username,
                eloRating: player1.eloRating,
                lives: game.player1Lives
            },
            {
                id: player2.id,
                username: player2.username,
                eloRating: player2.eloRating,
                lives: game.player2Lives
            }
        ],
        roundNumber: game.roundNumber,
        voorgooier: game.voorgooier,
        currentTurn: game.currentTurn, // null voor ronde 1 (simultaan)
        isFirstRound: game.isFirstRound,
        maxThrows: 1, // Ronde 1 = 1 blinde worp per speler
        mustBlind: game.isFirstRound, // Eerste ronde = verplicht blind!
        isSimultaneous: game.isFirstRound // Beide spelers tegelijk!
    };

    io.to(game.player1SocketId).emit('game_start', gameStartData);
    io.to(game.player2SocketId).emit('game_start', gameStartData);

    console.log(`▶️  Game started: ${player1.username} vs ${player2.username}`);
    console.log(`   Ronde ${game.roundNumber}: SIMULTAAN - beide spelers gooien tegelijk blind!`);
    console.log(`   Eerste ronde = BLIND verplicht!`);
}

// ============================================
// GAME LOGIC - CORRECTE MEXICO SPELREGELS!
// ============================================

function handleThrow(game, userId, isBlind) {
    const isPlayer1 = userId === game.player1Id;
    const currentPlayer = isPlayer1 ? 'Player1' : 'Player2';
    const playerKey = isPlayer1 ? 'player1' : 'player2';
    const player1 = users.get(game.player1Id);
    const player2 = users.get(game.player2Id);
    const currentPlayerName = isPlayer1 ? player1.username : player2.username;

    // ==========================================
    // RONDE 1: SIMULTAAN - BEIDE SPELERS TEGELIJK BLIND
    // ==========================================
    if (game.isFirstRound) {
        // Check if player already threw
        if (game.firstRoundThrows[playerKey] !== null) {
            const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
            return io.to(playerSocketId).emit('error', {
                message: 'Je hebt al gegooid in deze ronde!'
            });
        }

        // Must be blind in first round
        if (!isBlind) {
            const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
            return io.to(playerSocketId).emit('error', {
                message: 'Eerste ronde moet blind zijn!'
            });
        }

        console.log(`🎲 ${currentPlayer} (${currentPlayerName}) throws BLIND in round 1`);

        // Roll dice
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const throwResult = calculateThrowValue(dice1, dice2);

        // Store throw
        game.firstRoundThrows[playerKey] = {
            dice1,
            dice2,
            ...throwResult,
            userId,
            username: currentPlayerName
        };

        // Send confirmation to player (hidden result)
        const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
        io.to(playerSocketId).emit('throw_result', {
            isBlind: true,
            throwCount: 1,
            maxThrows: 1,
            message: 'Worp verborgen - wachten op tegenstander...'
        });

        // Notify opponent
        const opponentSocketId = isPlayer1 ? game.player2SocketId : game.player1SocketId;
        io.to(opponentSocketId).emit('opponent_throw', {
            isBlind: true,
            message: `${currentPlayerName} heeft gegooid (verborgen)`
        });

        console.log(`   Result verborgen: ${throwResult.value} (${throwResult.name})`);

        // Check if both players have thrown
        if (game.firstRoundThrows.player1 !== null && game.firstRoundThrows.player2 !== null) {
            console.log(`   ✅ Beide spelers hebben gegooid!`);
            console.log(`   Player1 (${player1.username}): ${game.firstRoundThrows.player1.value} (${game.firstRoundThrows.player1.name})`);
            console.log(`   Player2 (${player2.username}): ${game.firstRoundThrows.player2.value} (${game.firstRoundThrows.player2.name})`);

            // Auto-reveal and compare after 1 second
            setTimeout(() => compareFirstRoundThrows(game), 1000);
        }

        return;
    }

    // ==========================================
    // RONDE 2+: INTERLEAVED TURN-BASED (OM DE BEURT!)
    // ==========================================

    const isVoorgooier = game.voorgooier === userId;
    const isAchterligger = !isVoorgooier;

    console.log(`🎲 ${currentPlayer} (${currentPlayerName}) ${isVoorgooier ? '👑 VOORGOOIER' : '🎯 ACHTERLIGGER'} throws ${isBlind ? 'BLIND' : 'OPEN'}`);
    console.log(`   Status: Voorgooier ${game.voorgooierThrowCount} worpen, Achterligger ${game.achterliggerThrowCount} worpen`);

    // VOORGOOIER: bouwt het patroon op
    if (isVoorgooier) {
        // Voorgooier mag altijd kiezen (blind of open)
        game.voorgooierPattern.push(isBlind);
        game.voorgooierThrowCount++;
        console.log(`   👑 Voorgooier pattern: [${game.voorgooierPattern.map(b => b ? 'blind' : 'open').join(', ')}]`);
    }

    // ACHTERLIGGER: moet patroon volgen
    if (isAchterligger) {
        // Check if must follow pattern
        const patternIndex = game.achterliggerThrowCount;
        if (patternIndex < game.voorgooierPattern.length) {
            const expectedBlind = game.voorgooierPattern[patternIndex];
            if (isBlind !== expectedBlind) {
                const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
                const expectedText = expectedBlind ? 'blind' : 'open';
                return io.to(playerSocketId).emit('error', {
                    message: `Je moet ${expectedText} gooien! (volg het patroon van de voorgooier)`
                });
            }
        }
        game.achterliggerThrowCount++;
    }

    // Roll dice
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const throwResult = calculateThrowValue(dice1, dice2);

    const throwData = {
        dice1,
        dice2,
        ...throwResult,
        isBlind,
        userId,
        username: currentPlayerName
    };

    // Store throw
    if (isVoorgooier) {
        game.voorgooierThrows.push(throwData);
    } else {
        game.achterliggerThrows.push(throwData);
    }

    const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
    const opponentSocketId = isPlayer1 ? game.player2SocketId : game.player1SocketId;

    // Handle blind throw
    if (isBlind) {
        // Player sees hidden result
        io.to(playerSocketId).emit('throw_result', {
            isBlind: true,
            dice1,
            dice2,
            throwCount: isVoorgooier ? game.voorgooierThrowCount : game.achterliggerThrowCount,
            maxThrows: game.maxThrows,
            canReveal: true,
            message: 'Worp verborgen - klik "Laten Zien" om te onthullen'
        });

        // Opponent sees BLIND (no values)
        io.to(opponentSocketId).emit('opponent_throw', {
            isBlind: true,
            throwCount: isVoorgooier ? game.voorgooierThrowCount : game.achterliggerThrowCount,
            message: `${currentPlayerName} gooit BLIND (verborgen)`
        });

        console.log(`   Result verborgen: ${throwResult.value} (${throwResult.name})`);

    } else {
        // Open throw - BOTH players see values!
        io.to(playerSocketId).emit('throw_result', {
            ...throwData,
            isBlind: false,
            throwCount: isVoorgooier ? game.voorgooierThrowCount : game.achterliggerThrowCount,
            maxThrows: game.maxThrows,
            canKeep: true,
            canThrowAgain: (isVoorgooier ? game.voorgooierThrowCount : game.achterliggerThrowCount) < game.maxThrows
        });

        // Opponent SEES the dice values!
        io.to(opponentSocketId).emit('opponent_throw', {
            ...throwData,
            isBlind: false,
            throwCount: isVoorgooier ? game.voorgooierThrowCount : game.achterliggerThrowCount,
            message: `${currentPlayerName} gooit OPEN: ${throwResult.name}`
        });

        console.log(`   Open worp: ${throwResult.value} (${throwResult.name}) - BEIDE SPELERS ZIEN DIT!`);
    }

    // Switch turn to opponent
    const opponentId = isPlayer1 ? game.player2Id : game.player1Id;
    game.currentTurn = opponentId;

    const opponentUser = users.get(opponentId);
    console.log(`   🔄 Turn switched to: ${opponentUser.username}`);

    // Notify opponent it's their turn
    io.to(opponentSocketId).emit('your_turn', {
        message: `Jouw beurt! (${currentPlayerName} heeft gegooid)`,
        mustFollowPattern: isVoorgooier, // If voorgooier just threw, achterligger must follow
        voorgooierPattern: game.voorgooierPattern
    });
}

// ==========================================
// EERSTE RONDE VERGELIJKING (AUTOMATISCH)
// ==========================================
function compareFirstRoundThrows(game) {
    const player1 = users.get(game.player1Id);
    const player2 = users.get(game.player2Id);
    const throw1 = game.firstRoundThrows.player1;
    const throw2 = game.firstRoundThrows.player2;

    console.log(`\n🔍 AUTOMATISCHE VERGELIJKING RONDE 1:`);
    console.log(`   ${player1.username}: ${throw1.value} (${throw1.name})`);
    console.log(`   ${player2.username}: ${throw2.value} (${throw2.name})`);

    // Reveal both throws to both players
    io.to(game.player1SocketId).emit('first_round_reveal', {
        yourThrow: throw1,
        opponentThrow: throw2,
        yourName: player1.username,
        opponentName: player2.username
    });

    io.to(game.player2SocketId).emit('first_round_reveal', {
        yourThrow: throw2,
        opponentThrow: throw1,
        yourName: player2.username,
        opponentName: player1.username
    });

    // Wait 2 seconds then determine result
    setTimeout(() => {
        // Check for tie
        if (throw1.value === throw2.value) {
            console.log(`   ⚔️ VAST! Beide spelers gooien opnieuw!`);

            // Reset first round throws
            game.firstRoundThrows.player1 = null;
            game.firstRoundThrows.player2 = null;

            // Notify both players
            io.to(game.player1SocketId).emit('first_round_tie', {
                message: 'Gelijkspel! Gooi opnieuw blind.'
            });
            io.to(game.player2SocketId).emit('first_round_tie', {
                message: 'Gelijkspel! Gooi opnieuw blind.'
            });

            return;
        }

        // Determine winner and loser
        let winnerId, loserId, winnerThrow, loserThrow;
        if (throw1.value > throw2.value) {
            winnerId = game.player1Id;
            loserId = game.player2Id;
            winnerThrow = throw1;
            loserThrow = throw2;
        } else {
            winnerId = game.player2Id;
            loserId = game.player1Id;
            winnerThrow = throw2;
            loserThrow = throw1;
        }

        const winner = users.get(winnerId);
        const loser = users.get(loserId);

        console.log(`   🏆 WINNAAR: ${winner.username} (${winnerThrow.value})`);
        console.log(`   💔 VERLIEZER: ${loser.username} (${loserThrow.value})`);

        // Determine penalty (Mexico = -2, normal = -1)
        const penalty = loserThrow.isMexico ? 2 : 1;

        // Apply penalty
        if (loserId === game.player1Id) {
            game.player1Lives -= penalty;
        } else {
            game.player2Lives -= penalty;
        }

        const loserLivesLeft = loserId === game.player1Id ? game.player1Lives : game.player2Lives;

        console.log(`   Penalty: -${penalty} ${penalty === 2 ? '(MEXICO!)' : ''}`);
        console.log(`   ${loser.username} lives left: ${loserLivesLeft}`);

        // Check if game over
        if (loserLivesLeft <= 0) {
            console.log(`   💀 ${loser.username} is OUT - game over!`);

            // Notify both players
            io.to(game.player1SocketId).emit('first_round_result', {
                winnerId,
                loserId,
                winnerThrow,
                loserThrow,
                penalty,
                loserLivesLeft: 0,
                gameOver: true
            });
            io.to(game.player2SocketId).emit('first_round_result', {
                winnerId,
                loserId,
                winnerThrow,
                loserThrow,
                penalty,
                loserLivesLeft: 0,
                gameOver: true
            });

            setTimeout(() => endGame(game, winnerId, 'first_round_knockout'), 2000);
            return;
        }

        // Loser becomes voorgooier
        game.voorgooier = loserId;
        console.log(`   👑 ${loser.username} wordt voorgooier voor ronde 2`);

        // Notify both players
        io.to(game.player1SocketId).emit('first_round_result', {
            winnerId,
            loserId,
            winnerThrow,
            loserThrow,
            penalty,
            loserLivesLeft,
            newVoorgooier: loserId,
            gameOver: false
        });
        io.to(game.player2SocketId).emit('first_round_result', {
            winnerId,
            loserId,
            winnerThrow,
            loserThrow,
            penalty,
            loserLivesLeft,
            newVoorgooier: loserId,
            gameOver: false
        });

        // Start round 2 after delay
        setTimeout(() => startNextRound(game), 3000);
    }, 2000);
}

function handleReveal(game, userId) {
    if (!game.currentThrowHidden) {
        return; // Al revealed
    }

    const isPlayer1 = userId === game.player1Id;
    const currentPlayer = isPlayer1 ? 'Player1' : 'Player2';
    const lastThrow = game.currentPlayerThrows[game.currentPlayerThrows.length - 1];

    console.log(`👁️  ${currentPlayer} reveals throw: ${lastThrow.value} (${lastThrow.name})`);

    game.currentThrowHidden = false;

    // Send revealed result to player
    const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;

    // REGEL: Eerste worp blind = GEEN hergooien mogelijk na reveal!
    const isFirstThrow = game.currentPlayerThrowCount === 1;
    const canThrowAgain = !isFirstThrow && game.currentPlayerThrowCount < game.maxThrows;

    io.to(playerSocketId).emit('dice_revealed', {
        ...lastThrow,
        throwCount: game.currentPlayerThrowCount,
        maxThrows: game.maxThrows,
        canKeep: true,
        canThrowAgain: canThrowAgain,
        mustChooseResult: isFirstThrow // Als eerste worp: direct resultaat kiezen!
    });

    // Notify opponent
    const opponentSocketId = isPlayer1 ? game.player2SocketId : game.player1SocketId;
    io.to(opponentSocketId).emit('opponent_dice_revealed', {
        ...lastThrow,
        throwCount: game.currentPlayerThrowCount
    });

    // Als eerste worp blind in eerste ronde: Direct naar resultaat keuze!
    if (game.isFirstRound && isFirstThrow) {
        console.log(`   🔒 EERSTE RONDE REGEL: Direct naar resultaat keuze (geen hergooien)`);
        game.waitingForResult = true;

        setTimeout(() => {
            io.to(playerSocketId).emit('choose_result_prompt', {
                message: 'Eerste ronde - kies het resultaat van deze worp'
            });
        }, 1000);
    }
}

function handleKeep(game, userId) {
    const isPlayer1 = userId === game.player1Id;
    const currentPlayer = isPlayer1 ? 'Player1' : 'Player2';

    console.log(`✓ ${currentPlayer} keeps their throw`);

    // Speler heeft gegooid en wil laten staan - nu resultaat kiezen!
    game.waitingForResult = true;

    const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
    io.to(playerSocketId).emit('choose_result_prompt', {
        message: 'Kies het resultaat van deze ronde'
    });
}

function handleResultChoice(game, userId, result) {
    // result = 'won', 'vast', of 'lost'
    const isPlayer1 = userId === game.player1Id;
    const currentPlayer = isPlayer1 ? 'Player1' : 'Player2';
    const isVoorgooier = game.voorgooier === userId;

    console.log(`📊 ${currentPlayer} chooses: ${result.toUpperCase()} (Voorgooier: ${isVoorgooier})`);

    // Get last throw from correct array
    const throwArray = isVoorgooier ? game.voorgooierThrows : game.achterliggerThrows;
    const lastThrow = throwArray[throwArray.length - 1];

    // Special case: VAST gives extra throw (current player continues)
    if (result === 'vast') {
        console.log(`   ⚔️  ${currentPlayer} chooses VAST - gets +1 extra worp`);

        // Increase max throws for this player
        game.maxThrows++;

        // Notify player
        const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
        const currentThrowCount = isVoorgooier ? game.voorgooierThrowCount : game.achterliggerThrowCount;
        io.to(playerSocketId).emit('vast_extra_throw', {
            message: 'Je krijgt 1 extra worp!',
            throwCount: currentThrowCount,
            maxThrows: game.maxThrows
        });

        // Notify opponent
        const opponentSocketId = isPlayer1 ? game.player2SocketId : game.player1SocketId;
        io.to(opponentSocketId).emit('opponent_vast', {
            playerId: userId,
            message: 'Tegenstander koos VAST - krijgt 1 extra worp'
        });

        // Turn stays with current player (no turn switch!)
        return;
    }

    // === INTERLEAVED RESULT CHOICE ===
    // Store result for this player
    if (isVoorgooier) {
        game.voorgooierResult = result;
        console.log(`   👑 Voorgooier chooses: ${result}`);
    } else {
        game.achterliggerResult = result;
        console.log(`   🎯 Achterligger chooses: ${result}`);
    }

    // Check if BOTH players have chosen
    if (!game.voorgooierResult || !game.achterliggerResult) {
        console.log(`   ⏳ Waiting for other player to choose result...`);

        // Notify player that their choice is registered
        const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
        io.to(playerSocketId).emit('waiting_for_opponent', {
            message: 'Keuze geregistreerd - wachten op tegenstander...'
        });

        return; // Wait for other player
    }

    // === BOTH PLAYERS HAVE CHOSEN - COMPARE RESULTS ===
    console.log(`\n🔍 COMPARING RESULTS:`);
    console.log(`   Voorgooier: ${game.voorgooierResult}`);
    console.log(`   Achterligger: ${game.achterliggerResult}`);

    const voorgooierResult = game.voorgooierResult;
    const achterliggerResult = game.achterliggerResult;
    const voorgooierId = game.voorgooier;
    const achterliggerId = isVoorgooier ? (isPlayer1 ? game.player2Id : game.player1Id) : userId;
    const voorgooierIsPlayer1 = voorgooierId === game.player1Id;

    // Get last throws for comparison
    const voorgooierThrowData = game.voorgooierThrows[game.voorgooierThrows.length - 1];
    const achterliggerThrowData = game.achterliggerThrows[game.achterliggerThrows.length - 1];

        // === RESULT COMPARISON ===
        let loserId = null;
        let loserLives = null;
        let newVoorgooier = null;

        if (voorgooierResult === 'won' && achterliggerResult === 'won') {
            // Both won → nobody loses, voorgooier stays OFF
            console.log(`   ✅ Both won - no lives lost, voorgooier = OFF`);
            newVoorgooier = null;

        } else if (voorgooierResult === 'won' && achterliggerResult === 'lost') {
            // Voorgooier won, achterligger lost → achterligger loses life
            console.log(`   ❌ Achterligger lost - loses 1 life`);
            loserId = userId;
            if (isPlayer1) {
                game.player1Lives--;
                loserLives = game.player1Lives;
            } else {
                game.player2Lives--;
                loserLives = game.player2Lives;
            }
            newVoorgooier = userId; // Loser becomes voorgooier

        } else if (voorgooierResult === 'lost' && achterliggerResult === 'won') {
            // Voorgooier lost, achterligger won → voorgooier loses life
            console.log(`   ❌ Voorgooier lost - loses 1 life`);
            loserId = voorgooierId;
            if (voorgooierIsPlayer1) {
                game.player1Lives--;
                loserLives = game.player1Lives;
            } else {
                game.player2Lives--;
                loserLives = game.player2Lives;
            }
            newVoorgooier = voorgooierId; // Loser stays voorgooier

        } else if (voorgooierResult === 'lost' && achterliggerResult === 'lost') {
            // Both lost → compare throw values (lower value loses)
            const voorgooierValue = voorgooierThrowData.value;
            const achterliggerValue = achterliggerThrowData.value;

            console.log(`   ⚔️  Both lost - comparing values: Voorgooier ${voorgooierValue} vs Achterligger ${achterliggerValue}`);

            if (voorgooierValue < achterliggerValue) {
                // Voorgooier has lower value → voorgooier loses
                console.log(`   ❌ Voorgooier has lower value - loses 1 life`);
                loserId = voorgooierId;
                if (voorgooierIsPlayer1) {
                    game.player1Lives--;
                    loserLives = game.player1Lives;
                } else {
                    game.player2Lives--;
                    loserLives = game.player2Lives;
                }
                newVoorgooier = voorgooierId;

            } else if (achterliggerValue < voorgooierValue) {
                // Achterligger has lower value → achterligger loses
                console.log(`   ❌ Achterligger has lower value - loses 1 life`);
                loserId = userId;
                if (isPlayer1) {
                    game.player1Lives--;
                    loserLives = game.player1Lives;
                } else {
                    game.player2Lives--;
                    loserLives = game.player2Lives;
                }
                newVoorgooier = userId;

            } else {
                // Equal values → nobody loses (tie)
                console.log(`   🤝 Equal values - tie, no lives lost`);
                newVoorgooier = null;
            }
        }

        // Check game over
        if (loserLives !== null && loserLives <= 0) {
            const winnerId = loserId === game.player1Id ? game.player2Id : game.player1Id;
            console.log(`   💀 ${loserId === game.player1Id ? 'Player1' : 'Player2'} is OUT - game over!`);

            // Notify both players with full results
            io.to(game.player1SocketId).emit('round_result', {
                voorgooierResult: voorgooierResult,
                voorgooierThrow: voorgooierThrowData,
                voorgooierId: voorgooierId,
                achterliggerResult: achterliggerResult,
                achterliggerThrow: achterliggerThrowData,
                achterliggerId: userId,
                loserId: loserId,
                livesLeft: loserLives,
                gameOver: true
            });
            io.to(game.player2SocketId).emit('round_result', {
                voorgooierResult: voorgooierResult,
                voorgooierThrow: voorgooierThrowData,
                voorgooierId: voorgooierId,
                achterliggerResult: achterliggerResult,
                achterliggerThrow: achterliggerThrowData,
                achterliggerId: userId,
                loserId: loserId,
                livesLeft: loserLives,
                gameOver: true
            });

            setTimeout(() => endGame(game, winnerId, 'lives_depleted'), 2000);
            return;
        }

        // Update voorgooier for next round
        game.voorgooier = newVoorgooier;
        console.log(`   👑 Next voorgooier: ${newVoorgooier ? (newVoorgooier === game.player1Id ? 'Player1' : 'Player2') : 'NONE'}`);

        // Notify both players with full results
        io.to(game.player1SocketId).emit('round_result', {
            voorgooierResult: voorgooierResult,
            voorgooierThrow: voorgooierThrowData,
            voorgooierId: voorgooierId,
            achterliggerResult: achterliggerResult,
            achterliggerThrow: achterliggerThrowData,
            achterliggerId: userId,
            loserId: loserId,
            player1Lives: game.player1Lives,
            player2Lives: game.player2Lives,
            newVoorgooier: newVoorgooier
        });
        io.to(game.player2SocketId).emit('round_result', {
            voorgooierResult: voorgooierResult,
            voorgooierThrow: voorgooierThrowData,
            voorgooierId: voorgooierId,
            achterliggerResult: achterliggerResult,
            achterliggerThrow: achterliggerThrowData,
            achterliggerId: userId,
            loserId: loserId,
            player1Lives: game.player1Lives,
            player2Lives: game.player2Lives,
            newVoorgooier: newVoorgooier
        });

        // Clear voorgooier tracking
        game.voorgooierResult = null;
        game.voorgooierThrowData = null;

        // Start next round
        setTimeout(() => startNextRound(game), 2000);
    }
}

function startNextRound(game) {
    game.roundNumber++;
    game.isFirstRound = false; // Niet meer eerste ronde!

    // Vanaf ronde 2: turn-based systeem begint
    // Als er een voorgooier is, begint die
    // Anders begint player2 (switch van player1 die in eerste ronde "begon")
    if (game.voorgooier) {
        game.currentTurn = game.voorgooier;
    } else {
        // Fallback: switch turn (mocht voorgooier niet gezet zijn)
        game.currentTurn = game.currentTurn ?
            (game.currentTurn === game.player1Id ? game.player2Id : game.player1Id) :
            game.player2Id;
    }

    // Reset throw tracking voor INTERLEAVED systeem
    game.voorgooierThrows = [];
    game.achterliggerThrows = [];
    game.voorgooierThrowCount = 0;
    game.achterliggerThrowCount = 0;
    game.voorgooierPattern = []; // Reset pattern - voorgooier bouwt nieuw patroon
    game.voorgooierResult = null;
    game.achterliggerResult = null;
    game.waitingForResult = false;
    game.maxThrows = 3; // Reset to default

    const player1 = users.get(game.player1Id);
    const player2 = users.get(game.player2Id);

    const currentPlayerName = game.currentTurn === game.player1Id ? player1.username : player2.username;
    const isVoorgooier = game.voorgooier === game.currentTurn;

    console.log(`⚡ New round ${game.roundNumber}`);
    console.log(`   Current turn: ${currentPlayerName}`);
    console.log(`   Voorgooier: ${isVoorgooier ? currentPlayerName : 'niemand'}`);

    const newRoundData = {
        gameId: game.gameId,
        roundNumber: game.roundNumber,
        voorgooier: game.voorgooier,
        currentTurn: game.currentTurn,
        isFirstRound: false,
        mustBlind: false, // Geen verplicht blind meer na eerste ronde
        maxThrows: game.maxThrows,
        player1Lives: game.player1Lives,
        player2Lives: game.player2Lives,
        players: [
            { id: player1.id, username: player1.username, eloRating: player1.eloRating, lives: game.player1Lives },
            { id: player2.id, username: player2.username, eloRating: player2.eloRating, lives: game.player2Lives }
        ]
    };

    io.to(game.player1SocketId).emit('new_round', newRoundData);
    io.to(game.player2SocketId).emit('new_round', newRoundData);
}

function endGame(game, winnerId, reason) {
    console.log(`🏁 Game over - Winner: ${winnerId === game.player1Id ? 'Player1' : 'Player2'} (${reason})`);

    const loserId = winnerId === game.player1Id ? game.player2Id : game.player1Id;
    const winner = users.get(winnerId);
    const loser = users.get(loserId);

    // Update stats
    winner.stats.wins++;
    winner.stats.gamesPlayed++;
    loser.stats.losses++;
    loser.stats.gamesPlayed++;

    // Update Elo ratings
    const { winnerChange, loserChange } = calculateEloChange(winner.eloRating, loser.eloRating);
    winner.eloRating += winnerChange;
    loser.eloRating += loserChange;

    console.log(`  Elo changes: Winner +${winnerChange}, Loser ${loserChange}`);
    console.log(`  New Elos: ${winner.username}=${winner.eloRating}, ${loser.username}=${loser.eloRating}`);

    // Send game over
    const gameOverData = {
        winner: winnerId,
        loser: loserId,
        winnerUsername: winner.username,
        loserUsername: loser.username,
        winnerElo: winner.eloRating,
        loserElo: loser.eloRating,
        eloChange: winnerChange,
        reason,
        finalLives: {
            player1: game.player1Lives,
            player2: game.player2Lives
        }
    };

    io.to(game.player1SocketId).emit('game_over', gameOverData);
    io.to(game.player2SocketId).emit('game_over', gameOverData);

    // Remove game
    games.delete(game.gameId);
}

// ============================================
// START SERVER
// ============================================

server.listen(PORT, () => {
    console.log(`\n🎲 Multiplayer Mexico Backend Server - CORRECTE SPELREGELS`);
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Socket.io ready for connections`);
    console.log(`\n📊 Stats: ${users.size} users, ${games.size} active games\n`);
});
