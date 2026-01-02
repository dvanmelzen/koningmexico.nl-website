// Multiplayer Mexico Backend Server - CORRECTE SPELREGELS IMPLEMENTATIE
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dev.koningmexico.nl';
const CORS_ORIGIN = process.env.CORS_ORIGIN || FRONTEND_URL;

// JWT Secret is REQUIRED - no fallback for security
if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set!');
    console.error('   Generate one with: openssl rand -base64 64');
    console.error('   Add it to .env.production file');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Rate limiting for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // max 5 attempts per window
    message: { message: 'Te veel login pogingen. Probeer het over 15 minuten opnieuw.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for purchase endpoints (prevent abuse)
const purchaseLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // max 10 purchases per minute
    message: { message: 'Te veel aankopen. Wacht even voordat je opnieuw probeert.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Initialize Express & Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Trust proxy (required for rate limiting behind Caddy reverse proxy)
// Only trust loopback (Caddy runs on same server)
app.set('trust proxy', 'loopback');

// Middleware
app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true
}));
app.use(express.json());
app.use(express.static('../')); // Serve frontend files

// ============================================
// DATABASE & IN-MEMORY STATE
// ============================================

// Initialize database
db.initializeDatabase();

// In-memory caches (for active sessions)
const userCache = new Map(); // userId -> user object (cached from DB) + { lastActivity: timestamp }
const games = new Map(); // gameId -> game object + { createdAt: timestamp }
const matchmakingQueue = []; // Array of { userId, eloRating, socketId }
const activeSockets = new Map(); // socketId -> userId

// ============================================
// GAME LOGGING HELPERS (Phase 2)
// ============================================

/**
 * Log throw details to database (skips guests)
 */
function logThrowDetails(game, playerId, throwData) {
    // Skip if either player is a guest
    if (!playerId || playerId.startsWith('guest_') ||
        !game.player1Id || game.player1Id.startsWith('guest_') ||
        !game.player2Id || game.player2Id.startsWith('guest_')) {
        return;
    }

    const opponentId = playerId === game.player1Id ? game.player2Id : game.player1Id;

    try {
        db.saveThrowDetails({
            gameId: game.gameId,
            roundNumber: game.roundNumber || 1,
            playerId,
            opponentId,
            throwType: throwData.isVast ? 'vast' : (throwData.isBlind ? 'blind' : 'open'),
            dice1: throwData.dice1,
            dice2: throwData.dice2,
            wasMexico: throwData.isMexico || false,
            wasVastgooier: game.isVastgooier || false,
            vastgooierPenalty: throwData.vastgooierPenalty || 0,
            roundWinner: null, // Will be updated when round ends
            livesRemaining: game[playerId === game.player1Id ? 'player1Lives' : 'player2Lives']
        });
    } catch (err) {
        console.error('❌ Failed to log throw details:', err);
    }
}

/**
 * Update round winner in database (skips guests)
 */
function updateRoundWinner(game, roundNumber, winnerId) {
    // Skip if either player is a guest
    if (!game.player1Id || game.player1Id.startsWith('guest_') ||
        !game.player2Id || game.player2Id.startsWith('guest_')) {
        return;
    }

    try {
        // Update all throws from this round with the winner
        const stmt = db.db.prepare(`
            UPDATE game_details
            SET roundWinner = ?
            WHERE gameId = ? AND roundNumber = ?
        `);
        stmt.run(winnerId, game.gameId, roundNumber);
    } catch (err) {
        console.error('❌ Failed to update round winner:', err);
    }
}

// ============================================
// CLEANUP FUNCTIONS (Prevent memory leaks)
// ============================================

// Cleanup old games (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [gameId, game] of games.entries()) {
        // Remove games older than 2 hours
        const gameAge = now - (game.createdAt || 0);
        if (gameAge > 2 * 60 * 60 * 1000) {
            games.delete(gameId);
            cleanedCount++;
            console.log(`🧹 Cleaned up old game: ${gameId} (age: ${Math.round(gameAge / 60000)} min)`);
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Game cleanup: Removed ${cleanedCount} old games`);
    }
}, 10 * 60 * 1000); // Run every 10 minutes

// Cleanup inactive guest users (every 30 minutes)
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, user] of userCache.entries()) {
        // Only cleanup guest users
        if (user.isGuest) {
            const inactiveTime = now - (user.lastActivity || now);
            // Remove guests inactive for > 24 hours
            if (inactiveTime > 24 * 60 * 60 * 1000) {
                userCache.delete(userId);
                cleanedCount++;
                console.log(`🧹 Cleaned up inactive guest: ${user.username} (inactive: ${Math.round(inactiveTime / 3600000)} hrs)`);
            }
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Guest cleanup: Removed ${cleanedCount} inactive guests`);
    }
}, 30 * 60 * 1000); // Run every 30 minutes

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
    // Mexico (2-1 or 1-2) = 1000 (hoogste waarde, display als 21)
    if ((dice1 === 2 && dice2 === 1) || (dice1 === 1 && dice2 === 2)) {
        return { value: 1000, name: 'Mexico', isMexico: true };
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

// Broadcast live stats to all connected clients
function broadcastStats() {
    const stats = {
        totalUsers: db.getUserCount(),
        onlinePlayers: activeSockets.size,
        playersInQueue: matchmakingQueue.length,
        activeGames: games.size
    };
    io.emit('statsUpdate', stats);
}

// ============================================
// MIDDLEWARE
// ============================================

// JWT Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Add user info to request
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// ============================================
// REST API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', players: db.getUserCount(), games: games.size });
});

// Live stats endpoint
app.get('/api/stats', (req, res) => {
    res.json({
        totalUsers: db.getUserCount(),
        onlinePlayers: activeSockets.size,
        playersInQueue: matchmakingQueue.length,
        activeGames: games.size
    });
});

// Get recent games for a user
app.get('/api/games/recent', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const games = db.getRecentGames(userId, limit);
        res.json({ games });
    } catch (error) {
        console.error('Error fetching recent games:', error);
        res.status(500).json({ error: 'Failed to fetch recent games' });
    }
});

// Register (with rate limiting)
app.post('/api/auth/register', authLimiter, async (req, res) => {
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
        if (db.findUserByUsername(username)) {
            return res.status(400).json({ message: 'Gebruikersnaam bestaat al' });
        }

        // Check if email exists (always lowercase)
        if (db.findUserByEmail(email)) {
            return res.status(400).json({ message: 'Email bestaat al' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const userData = {
            id: uuidv4(),
            username, // Keep original case for display
            email, // Already lowercase
            password: hashedPassword,
            eloRating: 1200,
            avatarEmoji: '👤'
        };

        // Save to database
        db.createUser(userData);

        // Load from database to get full user object with stats
        const user = db.findUserById(userData.id);

        // Cache user
        userCache.set(user.id, user);

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

// Login (with rate limiting)
app.post('/api/auth/login', authLimiter, async (req, res) => {
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
        const user = db.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ message: 'Ongeldige inloggegevens' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Ongeldige inloggegevens' });
        }

        // Cache user
        userCache.set(user.id, user);

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

// Guest Login (temporary, in-memory only, with rate limiting)
app.post('/api/auth/guest', authLimiter, async (req, res) => {
    try {
        let { username } = req.body;

        // Validation
        if (!username || !username.startsWith('Gast')) {
            return res.status(400).json({ message: 'Ongeldige gast gebruikersnaam' });
        }

        username = username.trim();

        // Create guest user (saved to database for game_history foreign keys)
        const guestUser = {
            id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            username: username,
            email: `${username.toLowerCase()}@guest.temporary`,
            password: 'GUEST_NO_PASSWORD', // Guest users don't need real passwords
            eloRating: 1200,
            avatarEmoji: '👤',
            stats: {
                wins: 0,
                losses: 0,
                gamesPlayed: 0
            },
            isGuest: true, // Flag to identify guest users
            lastActivity: Date.now() // Track activity for cleanup
        };

        // Save guest user to database (required for game_history foreign keys)
        db.createUser(guestUser);

        // Cache guest user (temporary)
        userCache.set(guestUser.id, guestUser);

        // Generate token (same as regular users)
        const accessToken = generateToken(guestUser);

        console.log(`👤 Guest user joined: ${guestUser.username} (${guestUser.id})`);

        res.status(200).json({
            user: guestUser,
            accessToken
        });

    } catch (error) {
        console.error('Guest login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
    // Get query parameters
    const minGames = parseInt(req.query.minGames) || 0;
    const sortBy = req.query.sortBy || 'elo'; // 'elo', 'winrate', 'games'
    const limit = parseInt(req.query.limit) || 100;

    // Get all users and filter/sort
    let players = db.getAllUsers()
        // Exclude guests
        .filter(user => !user.id.startsWith('guest_'))
        // Filter by minimum games
        .filter(user => user.stats.gamesPlayed >= minGames)
        // Calculate win rate
        .map(user => ({
            ...user,
            winRate: user.stats.gamesPlayed > 0
                ? Math.round((user.stats.wins / user.stats.gamesPlayed) * 100)
                : 0
        }));

    // Sort based on parameter
    if (sortBy === 'winrate') {
        players.sort((a, b) => {
            // Sort by win rate, then by games played as tiebreaker
            if (b.winRate !== a.winRate) {
                return b.winRate - a.winRate;
            }
            return b.stats.gamesPlayed - a.stats.gamesPlayed;
        });
    } else if (sortBy === 'games') {
        players.sort((a, b) => b.stats.gamesPlayed - a.stats.gamesPlayed);
    } else {
        // Default: sort by ELO (already sorted in getAllUsers)
        players.sort((a, b) => b.eloRating - a.eloRating);
    }

    // Limit results
    players = players.slice(0, limit);

    res.json({ players, filters: { minGames, sortBy, limit } });
});

// Recent Users
app.get('/api/users/recent', (req, res) => {
    const limit = parseInt(req.query.limit) || 3;
    const users = db.getRecentUsers(limit);
    res.json(users);
});

// User Stats (Phase 2)
app.get('/api/user/stats', authenticateToken, (req, res) => {
    const userId = req.userId;

    // Skip if guest
    if (!userId || userId.startsWith('guest_')) {
        return res.json({
            isGuest: true,
            message: 'Registreer om statistieken te bekijken'
        });
    }

    try {
        const user = db.findUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get throw stats from game_details
        const throwStats = db.getUserThrowStats(userId);

        // Calculate win rate
        const totalGames = user.stats.gamesPlayed || 0;
        const wins = user.stats.wins || 0;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

        res.json({
            isGuest: false,
            winRate: `${winRate}%`,
            totalGames,
            wins,
            losses: user.stats.losses || 0,
            mexicoCount: throwStats?.mexicoCount || 0,
            totalThrows: throwStats?.totalThrows || 0,
            blindThrows: throwStats?.blindThrows || 0,
            vastgooierCount: throwStats?.vastgooierCount || 0,
            mexicoInVastgooier: throwStats?.mexicoInVastgooier || 0
        });
    } catch (error) {
        console.error('❌ Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ============================================
// CREDITS SYSTEM API ENDPOINTS (Phase 3)
// ============================================

// Get user credit balance
app.get('/api/credits/balance', authenticateToken, (req, res) => {
    const userId = req.user.id;

    // Skip guests
    if (!userId || userId.startsWith('guest_')) {
        return res.json({
            isGuest: true,
            balance: 0,
            message: 'Registreer om credits te verdienen'
        });
    }

    try {
        const credits = db.getUserCredits(userId);

        if (!credits) {
            return res.status(404).json({ error: 'Credits account niet gevonden' });
        }

        res.json({
            isGuest: false,
            balance: credits.balance,
            lifetimeEarned: credits.lifetimeEarned,
            lifetimeSpent: credits.lifetimeSpent,
            lastUpdated: credits.lastUpdated
        });
    } catch (error) {
        console.error('❌ Error fetching credits:', error);
        res.status(500).json({ error: 'Failed to fetch credits' });
    }
});

// Get user transaction history
app.get('/api/credits/transactions', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    // Skip guests
    if (!userId || userId.startsWith('guest_')) {
        return res.json({
            isGuest: true,
            transactions: [],
            message: 'Registreer om je transacties te bekijken'
        });
    }

    try {
        const transactions = db.getUserTransactions(userId, limit);
        res.json({
            isGuest: false,
            transactions
        });
    } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Get shop items (power-ups catalog)
app.get('/api/shop/items', (req, res) => {
    try {
        const items = db.getShopItems();
        res.json({ items });
    } catch (error) {
        console.error('❌ Error fetching shop items:', error);
        res.status(500).json({ error: 'Failed to fetch shop items' });
    }
});

// Purchase power-up
app.post('/api/credits/purchase', authenticateToken, purchaseLimiter, async (req, res) => {
    const userId = req.user.id;
    const { itemId } = req.body;

    // Skip guests
    if (!userId || userId.startsWith('guest_')) {
        return res.status(403).json({ error: 'Gasten kunnen geen power-ups kopen' });
    }

    // Validate input
    if (!itemId) {
        return res.status(400).json({ error: 'Item ID is verplicht' });
    }

    try {
        const result = db.purchasePowerup(userId, itemId);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        console.log(`✅ User ${userId} purchased ${result.item.name} for ${result.item.cost} credits`);

        res.json({
            success: true,
            message: `${result.item.name} gekocht! 🎉`,
            item: result.item,
            newBalance: result.newBalance
        });
    } catch (error) {
        console.error('❌ Error purchasing power-up:', error);
        res.status(500).json({ error: 'Purchase mislukt. Probeer het opnieuw.' });
    }
});

// ============================================
// INPUT VALIDATION HELPERS (Socket.IO)
// ============================================

function validateSocketInput(data, rules) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
        const value = data[field];

        // Required check
        if (rule.required && (value === undefined || value === null)) {
            errors.push(`${field} is required`);
            continue;
        }

        // Skip validation if not required and not provided
        if (!rule.required && (value === undefined || value === null)) {
            continue;
        }

        // Type check
        if (rule.type && typeof value !== rule.type) {
            errors.push(`${field} must be of type ${rule.type}`);
        }

        // Enum check
        if (rule.enum && !rule.enum.includes(value)) {
            errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
        }

        // String length check
        if (rule.type === 'string' && rule.maxLength && value.length > rule.maxLength) {
            errors.push(`${field} must be max ${rule.maxLength} characters`);
        }

        // Number range check
        if (rule.type === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                errors.push(`${field} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && value > rule.max) {
                errors.push(`${field} must be at most ${rule.max}`);
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

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

    // Get user from cache or database
    let user = userCache.get(userId);
    if (!user) {
        user = db.findUserById(userId);
        if (user) {
            userCache.set(userId, user);
        }
    }

    if (!user) {
        socket.disconnect();
        return;
    }

    console.log(`✅ User connected: ${user.username} (${socket.id})`);
    activeSockets.set(socket.id, userId);

    socket.emit('authenticated', { username: user.username });

    // Broadcast updated stats to all clients
    broadcastStats();

    // ============================================
    // MATCHMAKING
    // ============================================

    socket.on('join_queue', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            gameMode: { type: 'string', enum: ['ranked', 'casual'], required: true }
        });

        if (!validation.valid) {
            console.log(`❌ Invalid join_queue input from ${user.username}:`, validation.errors);
            return socket.emit('error', { message: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { gameMode } = data;
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

        // Broadcast updated stats
        broadcastStats();

        // Try to find a match
        tryMatchmaking();
    });

    socket.on('leave_queue', () => {
        const index = matchmakingQueue.findIndex(p => p.userId === userId);
        if (index !== -1) {
            matchmakingQueue.splice(index, 1);

            // Broadcast updated stats
            broadcastStats();
            console.log(`❌ ${user.username} left matchmaking queue`);
        }
    });

    // ============================================
    // GAME RECONNECTION
    // ============================================

    socket.on('rejoin_game', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            gameId: { type: 'string', required: true, maxLength: 100 }
        });

        if (!validation.valid) {
            console.log(`❌ Invalid rejoin_game input from ${user.username}:`, validation.errors);
            return socket.emit('rejoin_failed', { reason: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { gameId } = data;
        const game = games.get(gameId);

        // Check if game exists
        if (!game) {
            console.log(`❌ ${user.username} tried to rejoin non-existent game: ${gameId}`);
            return socket.emit('rejoin_failed', { reason: 'Game niet gevonden' });
        }

        // Check if user is part of this game
        const isPlayer = game.players.some(p => p.userId === userId);
        if (!isPlayer) {
            console.log(`❌ ${user.username} not part of game: ${gameId}`);
            return socket.emit('rejoin_failed', { reason: 'Je bent geen speler in deze game' });
        }

        // Check if game is still active
        if (game.isFinished) {
            console.log(`❌ ${user.username} tried to rejoin finished game: ${gameId}`);
            return socket.emit('rejoin_failed', { reason: 'Game is al afgelopen' });
        }

        // Update socket reference for this player
        const playerIndex = game.players.findIndex(p => p.userId === userId);
        if (playerIndex !== -1) {
            game.players[playerIndex].socketId = socket.id;
        }

        // Join socket room for this game
        socket.join(gameId);

        console.log(`✅ ${user.username} successfully rejoined game: ${gameId}`);

        // Determine current dice state for UI restoration
        const playerState = game.players[playerIndex];
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponentState = game.players[opponentIndex];

        const currentDice = {
            player: playerState.currentThrow ? {
                dice1: playerState.currentThrow.dice1,
                dice2: playerState.currentThrow.dice2,
                isBlind: playerState.currentThrow.isBlind
            } : null,
            opponent: opponentState.currentThrow ? {
                dice1: opponentState.currentThrow.isBlind ? '?' : opponentState.currentThrow.dice1,
                dice2: opponentState.currentThrow.isBlind ? '?' : opponentState.currentThrow.dice2,
                isBlind: opponentState.currentThrow.isBlind
            } : null
        };

        // Determine available actions based on game state
        const availableActions = [];
        const isPlayerTurn = game.currentTurn === userId;

        if (isPlayerTurn) {
            if (!playerState.hasThrown) {
                availableActions.push('throwOpen', 'throwBlind');
            } else if (playerState.throwsLeft > 0) {
                availableActions.push('reThrow', 'keepThrow');
                if (playerState.currentThrow?.isBlind && !playerState.hasRevealed) {
                    availableActions.push('reveal');
                }
            }
        }

        // Send full game state to reconnecting player
        socket.emit('game_rejoined', {
            game: {
                gameId: game.gameId,
                players: game.players.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    lives: p.lives,
                    eloRating: p.eloRating
                })),
                currentRound: game.currentRound,
                isFirstRound: game.isFirstRound,
                isVastgooier: game.isVastgooier || false
            },
            isYourTurn: isPlayerTurn,
            currentDice,
            availableActions,
            playerHistory: playerState.throwHistory || [],
            opponentHistory: opponentState.throwHistory || []
        });

        // Notify opponent that player reconnected
        socket.to(gameId).emit('opponent_reconnected', {
            username: user.username
        });
    });

    // ============================================
    // GAME EVENTS - CORRECTE SPELREGELS!
    // ============================================

    socket.on('throw_dice', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            gameId: { type: 'string', required: true, maxLength: 100 },
            isBlind: { type: 'boolean', required: true }
        });

        if (!validation.valid) {
            console.log(`❌ Invalid throw_dice input from ${user.username}:`, validation.errors);
            return socket.emit('error', { message: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { gameId, isBlind } = data;
        const game = games.get(gameId);
        if (!game) {
            return socket.emit('error', { message: 'Game not found' });
        }

        // Ronde 1: Simultaan (geen turn check)
        // Vastgooier: Simultaan (geen turn check)
        // Ronde 2+: Turn-based (wel turn check)
        if (!game.isFirstRound && !game.isVastgooier && game.currentTurn !== userId) {
            return socket.emit('error', { message: 'Not your turn' });
        }

        handleThrow(game, userId, isBlind);
    });

    socket.on('reveal_dice', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            gameId: { type: 'string', required: true, maxLength: 100 }
        });

        if (!validation.valid) {
            return socket.emit('error', { message: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { gameId } = data;
        const game = games.get(gameId);
        if (!game || game.currentTurn !== userId) {
            return socket.emit('error', { message: 'Not your turn' });
        }

        handleReveal(game, userId);
    });

    socket.on('keep_throw', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            gameId: { type: 'string', required: true, maxLength: 100 }
        });

        if (!validation.valid) {
            return socket.emit('error', { message: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { gameId } = data;
        const game = games.get(gameId);
        if (!game || game.currentTurn !== userId) {
            return socket.emit('error', { message: 'Not your turn' });
        }

        handleKeep(game, userId);
    });

    // choose_result systeem VERWIJDERD - automatische vergelijking via compareThrows()

    socket.on('return_to_lobby', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            gameId: { type: 'string', required: true, maxLength: 100 }
        });

        if (!validation.valid) {
            return socket.emit('error', { message: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { gameId } = data;
        const game = games.get(gameId);
        if (game) {
            games.delete(gameId);
        }
    });

    // ============================================
    // REMATCH FUNCTIONALITY
    // ============================================

    socket.on('request_rematch', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            gameId: { type: 'string', required: true, maxLength: 100 },
            opponentId: { type: 'string', required: true, maxLength: 100 }
        });

        if (!validation.valid) {
            return socket.emit('error', { message: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { gameId, opponentId } = data;
        console.log(`🔄 Rematch request from ${user.username} to opponent ${opponentId}`);

        // Find opponent socket
        const opponentSocketId = Array.from(activeSockets.entries())
            .find(([_, id]) => id === opponentId)?.[0];

        if (opponentSocketId) {
            const requestId = `rematch_${Date.now()}_${userId}_${opponentId}`;

            // Send rematch request to opponent
            io.to(opponentSocketId).emit('rematch_request', {
                requestId,
                fromUserId: userId,
                fromUsername: user.username,
                gameId
            });

            console.log(`✅ Rematch request sent to ${opponentId}`);
        } else {
            socket.emit('error', { message: 'Opponent not online' });
        }
    });

    socket.on('accept_rematch', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            requestId: { type: 'string', required: true, maxLength: 100 },
            fromUserId: { type: 'string', required: true, maxLength: 100 }
        });

        if (!validation.valid) {
            return socket.emit('error', { message: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { requestId, fromUserId } = data;
        console.log(`✅ Rematch accepted by ${user.username} from ${fromUserId}`);

        // Find both players
        const player1SocketId = Array.from(activeSockets.entries())
            .find(([_, id]) => id === fromUserId)?.[0];
        const player2SocketId = socket.id;

        if (!player1SocketId) {
            return socket.emit('error', { message: 'Original player not online' });
        }

        const player1 = users.get(fromUserId);
        const player2 = user;

        // Start a new game immediately
        const gameId = `game_${Date.now()}_${player1.id}_${player2.id}`;
        const game = createGame(gameId, player1, player2);
        games.set(gameId, game);

        console.log(`🎮 Rematch game created: ${gameId}`);

        // Notify both players
        io.to(player1SocketId).emit('rematch_accepted', {
            requestId,
            gameId
        });

        io.to(player2SocketId).emit('rematch_accepted', {
            requestId,
            gameId
        });

        // Start the game for both players
        setTimeout(() => {
            io.to(player1SocketId).emit('game_start', {
                gameId: game.gameId,
                opponent: {
                    id: player2.id,
                    username: player2.username,
                    eloRating: player2.eloRating,
                    avatarEmoji: player2.avatarEmoji
                },
                yourLives: game.player1Lives,
                opponentLives: game.player2Lives,
                roundNumber: game.roundNumber
            });

            io.to(player2SocketId).emit('game_start', {
                gameId: game.gameId,
                opponent: {
                    id: player1.id,
                    username: player1.username,
                    eloRating: player1.eloRating,
                    avatarEmoji: player1.avatarEmoji
                },
                yourLives: game.player2Lives,
                opponentLives: game.player1Lives,
                roundNumber: game.roundNumber
            });

            console.log(`▶️  Rematch game started between ${player1.username} and ${player2.username}`);
        }, 500);

        // Broadcast updated stats
        broadcastStats();
    });

    socket.on('decline_rematch', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            requestId: { type: 'string', required: true, maxLength: 100 },
            fromUserId: { type: 'string', required: true, maxLength: 100 }
        });

        if (!validation.valid) {
            return socket.emit('error', { message: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { requestId, fromUserId } = data;
        console.log(`❌ Rematch declined by ${user.username}`);

        // Find requester socket
        const requesterSocketId = Array.from(activeSockets.entries())
            .find(([_, id]) => id === fromUserId)?.[0];

        if (requesterSocketId) {
            io.to(requesterSocketId).emit('rematch_declined', {
                requestId,
                declinedBy: user.username
            });
        }
    });

    // ============================================
    // LEAVE GAME (Voluntary)
    // ============================================

    socket.on('leave_game', (data) => {
        // Input validation
        const validation = validateSocketInput(data, {
            gameId: { type: 'string', required: true, maxLength: 100 }
        });

        if (!validation.valid) {
            return socket.emit('error', { message: 'Invalid input: ' + validation.errors.join(', ') });
        }

        const { gameId } = data;
        console.log(`🚪 ${user.username} left game ${gameId}`);

        const game = games.get(gameId);
        if (!game) {
            return socket.emit('error', { message: 'Game not found' });
        }

        // Verify user is in this game
        if (game.player1Id !== userId && game.player2Id !== userId) {
            return socket.emit('error', { message: 'You are not in this game' });
        }

        // Determine winner (the other player)
        const winnerId = game.player1Id === userId ? game.player2Id : game.player1Id;
        const loser = userCache.get(userId);
        const winner = userCache.get(winnerId);

        console.log(`   🏆 ${winner.username} wins by forfeit (opponent left)`);
        console.log(`   💔 ${loser.username} left the game`);

        // End game with reason 'player_left'
        endGame(game, winnerId, 'player_left');
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

        // Broadcast updated stats to all clients
        broadcastStats();
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

    const player1 = userCache.get(player1Data.userId);
    const player2 = userCache.get(player2Data.userId);

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
        startedAt: new Date(),
        createdAt: Date.now() // For cleanup tracking
    };

    games.set(gameId, game);

    // Broadcast updated stats (game started, queue reduced)
    broadcastStats();

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
    const player1 = userCache.get(game.player1Id);
    const player2 = userCache.get(game.player2Id);

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
    const player1 = userCache.get(game.player1Id);
    const player2 = userCache.get(game.player2Id);
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
    // VASTGOOIER: SIMULTANEOUS OVERGOOIEN (1x blind, hoogste wint)
    // ==========================================

    if (game.isVastgooier) {
        const playerKey = isPlayer1 ? 'player1' : 'player2';

        // Check if player already threw in vastgooier
        if (game.vastgooierThrows[playerKey] !== null) {
            const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
            return io.to(playerSocketId).emit('error', {
                message: 'Je hebt al gegooid in deze overgooien ronde!'
            });
        }

        // Must be blind in vastgooier
        if (!isBlind) {
            const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
            return io.to(playerSocketId).emit('error', {
                message: 'Overgooien moet blind zijn!'
            });
        }

        console.log(`🎲 ${currentPlayer} (${currentPlayerName}) throws BLIND in VASTGOOIER`);

        // Roll dice
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const throwResult = calculateThrowValue(dice1, dice2);

        // Store throw
        game.vastgooierThrows[playerKey] = {
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
            canKeep: false, // No keep option in vastgooier
            canThrowAgain: false,
            message: 'Overgooien worp verborgen - wachten op tegenstander...'
        });

        // Notify opponent
        const opponentSocketId = isPlayer1 ? game.player2SocketId : game.player1SocketId;
        io.to(opponentSocketId).emit('opponent_throw', {
            isBlind: true,
            message: `${currentPlayerName} heeft gegooid (verborgen)`
        });

        console.log(`   Result verborgen: ${throwResult.value} (${throwResult.name})`);

        // Check if both players have thrown
        if (game.vastgooierThrows.player1 !== null && game.vastgooierThrows.player2 !== null) {
            console.log(`   ✅ Beide spelers hebben overgegood!`);
            console.log(`   Player1 (${player1.username}): ${game.vastgooierThrows.player1.value} (${game.vastgooierThrows.player1.name})`);
            console.log(`   Player2 (${player2.username}): ${game.vastgooierThrows.player2.value} (${game.vastgooierThrows.player2.name})`);

            // Auto-reveal and compare after 1 second
            setTimeout(() => compareVastgooierThrows(game), 1000);
        }

        return;
    }

    // ==========================================
    // RONDE 2+: SEQUENTIAL (VOORGOOIER EERST ALLE WORPEN, DAN ACHTERLIGGER)
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
        // BELANGRIJKE REGEL: Achterligger mag MAXIMAAL evenveel worpen doen als voorgooier
        const maxThrowsAllowed = game.voorgooierThrowCount; // Voorgooier heeft X worpen gedaan
        if (game.achterliggerThrowCount >= maxThrowsAllowed) {
            const playerSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
            return io.to(playerSocketId).emit('error', {
                message: `Je hebt al ${maxThrowsAllowed}x gegooid (max aantal worpen van voorgooier)`
            });
        }

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
        // For achterligger: max throws = voorgooier's throw count
        // For voorgooier: max throws = game.maxThrows (3 by default)
        const effectiveMaxThrows = isAchterligger ? game.voorgooierThrowCount : game.maxThrows;
        const currentThrowCount = isVoorgooier ? game.voorgooierThrowCount : game.achterliggerThrowCount;

        // SPECIALE REGEL: Als voorgooier BLIND gooit op eerste worp → AUTO-KEEP
        // Dit betekent: voorgooier commits aan blinde worp zonder opties
        const isFirstBlindByVoorgooier = isVoorgooier && currentThrowCount === 1;

        if (isFirstBlindByVoorgooier) {
            // Auto-keep: geen keuze, automatisch doorgan
            console.log(`   🎯 EERSTE BLINDE WORP VOORGOOIER → AUTO-KEEP`);

            io.to(playerSocketId).emit('throw_result', {
                isBlind: true,
                dice1,
                dice2,
                throwCount: currentThrowCount,
                maxThrows: currentThrowCount, // Effectief laatste worp
                canKeep: false, // Geen opties
                canThrowAgain: false, // Geen opties
                message: 'Eerste blinde worp - automatisch doorgaan...'
            });

            // Opponent sees BLIND
            io.to(opponentSocketId).emit('opponent_throw', {
                isBlind: true,
                throwCount: currentThrowCount,
                message: `${currentPlayerName} gooit BLIND (verborgen) - wacht op jouw beurt`
            });

            // Auto-keep na korte delay (zodat speler het bericht ziet)
            setTimeout(() => {
                // Simuleer "laten staan" actie
                console.log(`   ⏱️  Auto-keep voor ${currentPlayerName} - switch turn`);

                // Switch turn naar achterligger
                game.currentTurn = game.player1Id === userId ? game.player2Id : game.player1Id;
                const nextPlayer = userCache.get(game.currentTurn);

                // Notify both players
                io.to(game.player1SocketId).emit('turn_changed', {
                    gameId: game.gameId,
                    currentTurn: game.currentTurn,
                    currentPlayerName: nextPlayer.username,
                    voorgooierPattern: game.voorgooierPattern,
                    mustBlind: game.voorgooierPattern[game.achterliggerThrowCount] || false,
                    message: `${nextPlayer.username} is nu aan de beurt`
                });

                io.to(game.player2SocketId).emit('turn_changed', {
                    gameId: game.gameId,
                    currentTurn: game.currentTurn,
                    currentPlayerName: nextPlayer.username,
                    voorgooierPattern: game.voorgooierPattern,
                    mustBlind: game.voorgooierPattern[game.achterliggerThrowCount] || false,
                    message: `${nextPlayer.username} is nu aan de beurt`
                });

                console.log(`   👤 Turn → ${nextPlayer.username}`);
            }, 1500);

            console.log(`   Result verborgen: ${throwResult.value} (${throwResult.name})`);
            return; // Stop hier - auto-keep geactiveerd
        }

        // Normale blinde worp (niet eerste worp voorgooier)
        // Player sees hidden result (? marks)
        // BELANGRIJK: Geen "Laten Zien" knop! Alleen "Laten Staan" en eventueel "Gooi Opnieuw"
        io.to(playerSocketId).emit('throw_result', {
            isBlind: true,
            dice1,
            dice2,
            throwCount: currentThrowCount,
            maxThrows: effectiveMaxThrows,
            canKeep: true, // Altijd mogelijk om blind worp te houden
            canThrowAgain: currentThrowCount < effectiveMaxThrows, // Alleen als nog niet max bereikt
            message: 'Blinde worp - kies "Laten Staan" of "Gooi Opnieuw"'
        });

        // Opponent sees BLIND (no values)
        io.to(opponentSocketId).emit('opponent_throw', {
            isBlind: true,
            throwCount: currentThrowCount,
            message: `${currentPlayerName} gooit BLIND (verborgen)`
        });

        console.log(`   Result verborgen: ${throwResult.value} (${throwResult.name})`);

    } else {
        // Open throw - BOTH players see values!
        // For achterligger: max throws = voorgooier's throw count
        // For voorgooier: max throws = game.maxThrows (3 by default)
        const effectiveMaxThrows = isAchterligger ? game.voorgooierThrowCount : game.maxThrows;
        const currentThrowCount = isVoorgooier ? game.voorgooierThrowCount : game.achterliggerThrowCount;

        io.to(playerSocketId).emit('throw_result', {
            ...throwData,
            isBlind: false,
            throwCount: currentThrowCount,
            maxThrows: effectiveMaxThrows,
            canKeep: true,
            canThrowAgain: currentThrowCount < effectiveMaxThrows
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

    // BELANGRIJK: GEEN turn switch hier!
    // Turn blijft bij huidige speler totdat die "laten staan" kiest
    // Turn switch gebeurt in handleResultChoice() wanneer voorgooier klaar is

    console.log(`   ⏸️  Turn blijft bij ${currentPlayerName} (moet alle worpen afmaken)`);
}

// ==========================================
// EERSTE RONDE VERGELIJKING (AUTOMATISCH)
// ==========================================
function compareFirstRoundThrows(game) {
    const player1 = userCache.get(game.player1Id);
    const player2 = userCache.get(game.player2Id);
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

        const winner = userCache.get(winnerId);
        const loser = userCache.get(loserId);

        console.log(`   🏆 WINNAAR: ${winner.username} (${winnerThrow.value})`);
        console.log(`   💔 VERLIEZER: ${loser.username} (${loserThrow.value})`);

        // Determine penalty (Mexico = -2, normal = -1)
        // BELANGRIJK: Als de WINNAAR Mexico gooit, krijgt de verliezer 2x penalty!
        const penalty = winnerThrow.isMexico ? 2 : 1;

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

// ==========================================
// VASTGOOIER VERGELIJKING (AUTOMATISCH)
// ==========================================
function compareVastgooierThrows(game) {
    const player1 = userCache.get(game.player1Id);
    const player2 = userCache.get(game.player2Id);
    const throw1 = game.vastgooierThrows.player1;
    const throw2 = game.vastgooierThrows.player2;

    console.log(`\n🔍 AUTOMATISCHE VERGELIJKING VASTGOOIER:`);
    console.log(`   ${player1.username}: ${throw1.value} (${throw1.name})`);
    console.log(`   ${player2.username}: ${throw2.value} (${throw2.name})`);

    // Reveal both throws to both players
    io.to(game.player1SocketId).emit('vastgooier_reveal', {
        yourThrow: throw1,
        opponentThrow: throw2,
        yourName: player1.username,
        opponentName: player2.username
    });

    io.to(game.player2SocketId).emit('vastgooier_reveal', {
        yourThrow: throw2,
        opponentThrow: throw1,
        yourName: player2.username,
        opponentName: player1.username
    });

    // Wait 2 seconds then determine result
    setTimeout(() => {
        // Check for tie AGAIN
        if (throw1.value === throw2.value) {
            console.log(`   ⚔️ OPNIEUW VAST! Herhaal overgooien!`);

            // Reset vastgooier throws for another round
            game.vastgooierThrows.player1 = null;
            game.vastgooierThrows.player2 = null;

            // Notify both players to throw again
            io.to(game.player1SocketId).emit('vastgooier', {
                message: 'Opnieuw gelijkspel! Gooi nog een keer blind.',
                voorgooierValue: throw1.value,
                achterliggerValue: throw2.value
            });
            io.to(game.player2SocketId).emit('vastgooier', {
                message: 'Opnieuw gelijkspel! Gooi nog een keer blind.',
                voorgooierValue: throw1.value,
                achterliggerValue: throw2.value
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

        const winner = userCache.get(winnerId);
        const loser = userCache.get(loserId);

        console.log(`   🏆 WINNAAR: ${winner.username} (${winnerThrow.value})`);
        console.log(`   💔 VERLIEZER: ${loser.username} (${loserThrow.value})`);

        // BELANGRIJK: Check of ORIGINELE worp (voor vastgooier) Mexico was!
        // Als beide spelers Mexico gooiden → vastgooier → winnaar krijgt 2x penalty
        const wasMexico = game.vastgooierOriginalVoorgooierThrow?.isMexico ||
                         game.vastgooierOriginalAchterliggerThrow?.isMexico;
        const penalty = wasMexico ? 2 : 1;

        // Apply penalty
        if (loserId === game.player1Id) {
            game.player1Lives -= penalty;
        } else {
            game.player2Lives -= penalty;
        }

        const loserLivesLeft = loserId === game.player1Id ? game.player1Lives : game.player2Lives;

        console.log(`   Penalty: -${penalty} ${wasMexico ? '(MEXICO vastgooier! Originele worp was Mexico)' : '(normale vastgooier)'}`);
        console.log(`   ${loser.username} lives left: ${loserLivesLeft}`);

        // Check if game over
        if (loserLivesLeft <= 0) {
            console.log(`   💀 ${loser.username} is OUT - game over!`);

            // Notify both players
            io.to(game.player1SocketId).emit('vastgooier_result', {
                winnerId,
                loserId,
                winnerThrow,
                loserThrow,
                penalty,
                loserLivesLeft: 0,
                gameOver: true
            });
            io.to(game.player2SocketId).emit('vastgooier_result', {
                winnerId,
                loserId,
                winnerThrow,
                loserThrow,
                penalty,
                loserLivesLeft: 0,
                gameOver: true
            });

            setTimeout(() => endGame(game, winnerId, 'vastgooier_knockout'), 2000);
            return;
        }

        // Loser becomes voorgooier
        game.voorgooier = loserId;
        console.log(`   👑 ${loser.username} wordt voorgooier voor volgende ronde`);

        // Reset vastgooier mode
        game.isVastgooier = false;
        game.vastgooierThrows = null;
        game.vastgooierOriginalVoorgooier = null;
        game.vastgooierOriginalVoorgooierThrow = null;
        game.vastgooierOriginalAchterliggerThrow = null;

        // Notify both players
        io.to(game.player1SocketId).emit('vastgooier_result', {
            winnerId,
            loserId,
            winnerThrow,
            loserThrow,
            penalty,
            loserLivesLeft,
            newVoorgooier: loserId,
            gameOver: false
        });
        io.to(game.player2SocketId).emit('vastgooier_result', {
            winnerId,
            loserId,
            winnerThrow,
            loserThrow,
            penalty,
            loserLivesLeft,
            newVoorgooier: loserId,
            gameOver: false
        });

        // Start next round after delay
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

    // Eerste ronde: Automatische vergelijking gebeurt in compareFirstRoundThrows()
    // Normale rondes: Speler kan keep/reveal/rethrow kiezen
}

function handleKeep(game, userId) {
    const isPlayer1 = userId === game.player1Id;
    const currentPlayer = isPlayer1 ? 'Player1' : 'Player2';
    const isVoorgooier = game.voorgooier === userId;

    console.log(`✓ ${currentPlayer} keeps their throw`);

    // SEQUENTIAL FLOW:
    // - Voorgooier keeps → Switch turn to achterligger
    // - Achterligger keeps → Compare results automatically

    if (isVoorgooier) {
        console.log(`   👑 Voorgooier keeps throw - switching to achterligger`);

        // BELANGRIJKE REGEL: Blinde worpen blijven VERBORGEN tot einde van ronde!
        // Pas in compareThrows() worden ALLE blinde worpen tegelijk onthuld aan beide spelers.

        // Switch turn to achterligger
        const achterliggerId = isPlayer1 ? game.player2Id : game.player1Id;
        const achterliggerSocketId = isPlayer1 ? game.player2SocketId : game.player1SocketId;
        const achterligger = userCache.get(achterliggerId);

        game.currentTurn = achterliggerId;
        console.log(`   🔄 Turn switched to achterligger: ${achterligger.username}`);

        // Notify voorgooier to wait
        const voorgooierSocketId = isPlayer1 ? game.player1SocketId : game.player2SocketId;
        io.to(voorgooierSocketId).emit('waiting_for_opponent', {
            message: 'Wachten op tegenstander...'
        });

        // Notify achterligger it's their turn
        io.to(achterliggerSocketId).emit('your_turn', {
            message: `Jouw beurt! Volg het patroon van de voorgooier (max ${game.voorgooierThrowCount} worpen)`,
            mustFollowPattern: true,
            voorgooierPattern: game.voorgooierPattern,
            achterliggerThrowCount: game.achterliggerThrowCount,
            maxThrows: game.voorgooierThrowCount // Achterligger mag max evenveel worpen als voorgooier
        });

    } else {
        console.log(`   🎯 Achterligger keeps throw - both have thrown, comparing...`);

        // BELANGRIJKE REGEL: Blinde worpen blijven VERBORGEN tot einde van ronde!
        // Pas in compareThrows() worden ALLE blinde worpen tegelijk onthuld aan beide spelers.

        // Both players have now thrown - compare results automatically
        compareThrows(game);
    }
}

function compareThrows(game) {
    console.log(`\n🔍 AUTOMATISCHE VERGELIJKING:`);

    // Get both players' final throws
    const voorgooierThrowData = game.voorgooierThrows[game.voorgooierThrows.length - 1];
    const achterliggerThrowData = game.achterliggerThrows[game.achterliggerThrows.length - 1];

    if (!voorgooierThrowData || !achterliggerThrowData) {
        console.log(`   ⚠️  ERROR: Missing throw data!`);
        return;
    }

    const voorgooierId = game.voorgooier;
    const achterliggerId = voorgooierId === game.player1Id ? game.player2Id : game.player1Id;
    const voorgooierIsPlayer1 = voorgooierId === game.player1Id;

    const voorgooierSocketId = voorgooierIsPlayer1 ? game.player1SocketId : game.player2SocketId;
    const achterliggerSocketId = voorgooierIsPlayer1 ? game.player2SocketId : game.player1SocketId;

    // BELANGRIJKE REGEL: Onthul ALLE blinde worpen VOORDAT vergelijking plaatsvindt!
    console.log(`\n👁️  ONTHULLEN BLINDE WORPEN:`);

    // Voorgooier's throw onthullen (als blind)
    if (voorgooierThrowData.isBlind) {
        console.log(`   Voorgooier worp was blind → onthuld: ${voorgooierThrowData.value} (${voorgooierThrowData.name})`);

        // Toon aan voorgooier zelf
        io.to(voorgooierSocketId).emit('throw_revealed', {
            dice1: voorgooierThrowData.dice1,
            dice2: voorgooierThrowData.dice2,
            value: voorgooierThrowData.value,
            name: voorgooierThrowData.name,
            message: `Jouw blinde worp: ${voorgooierThrowData.name}`
        });

        // Toon aan achterligger
        io.to(achterliggerSocketId).emit('opponent_throw_revealed', {
            dice1: voorgooierThrowData.dice1,
            dice2: voorgooierThrowData.dice2,
            value: voorgooierThrowData.value,
            name: voorgooierThrowData.name,
            message: `Tegenstander blinde worp: ${voorgooierThrowData.name}`
        });
    }

    // Achterligger's throw onthullen (als blind)
    if (achterliggerThrowData.isBlind) {
        console.log(`   Achterligger worp was blind → onthuld: ${achterliggerThrowData.value} (${achterliggerThrowData.name})`);

        // Toon aan achterligger zelf
        io.to(achterliggerSocketId).emit('throw_revealed', {
            dice1: achterliggerThrowData.dice1,
            dice2: achterliggerThrowData.dice2,
            value: achterliggerThrowData.value,
            name: achterliggerThrowData.name,
            message: `Jouw blinde worp: ${achterliggerThrowData.name}`
        });

        // Toon aan voorgooier
        io.to(voorgooierSocketId).emit('opponent_throw_revealed', {
            dice1: achterliggerThrowData.dice1,
            dice2: achterliggerThrowData.dice2,
            value: achterliggerThrowData.value,
            name: achterliggerThrowData.name,
            message: `Tegenstander blinde worp: ${achterliggerThrowData.name}`
        });
    }

    console.log(``);

    const voorgooier = userCache.get(voorgooierId);
    const achterligger = userCache.get(achterliggerId);
    const player1 = userCache.get(game.player1Id);
    const player2 = userCache.get(game.player2Id);

    const voorgooierValue = voorgooierThrowData.value;
    const achterliggerValue = achterliggerThrowData.value;

    console.log(`   ${voorgooier.username}: ${voorgooierValue} (${voorgooierThrowData.name})`);
    console.log(`   ${achterligger.username}: ${achterliggerValue} (${achterliggerThrowData.name})`);

    // === DIRECT VALUE COMPARISON ===
    // Higher value wins, lower value loses
    // BELANGRIJK: De VERLIEZER krijgt de penalty, NIET de Mexico gooier!
    // Als verliezer Mexico heeft: -2, anders -1
    let winnerId = null;
    let loserId = null;
    let loserLives = null;
    let penalty = -1; // Default penalty

    // Check for Mexico (special case: value 21, penalty -2)
    const voorgooierIsMexico = voorgooierThrowData.isMexico;
    const achterliggerIsMexico = achterliggerThrowData.isMexico;

    if (voorgooierValue > achterliggerValue) {
        // Voorgooier wins, achterligger loses
        winnerId = voorgooierId;
        loserId = achterliggerId;
        console.log(`   🏆 WINNAAR: ${voorgooier.username} (${voorgooierValue})`);
        console.log(`   💔 VERLIEZER: ${achterligger.username} (${achterliggerValue})`);

        // WINNAAR bepaalt penalty (als winnaar Mexico gooit, dubbele penalty!)
        if (voorgooierIsMexico) {
            penalty = -2;
            console.log(`   Penalty: -2 (WINNAAR gooide MEXICO!)`);
        } else {
            penalty = -1;
            console.log(`   Penalty: -1`);
        }

        // Pas penalty toe op VERLIEZER (achterligger)
        if (voorgooierIsPlayer1) {
            // Achterligger is player2
            game.player2Lives += penalty;
            loserLives = game.player2Lives;
        } else {
            // Achterligger is player1
            game.player1Lives += penalty;
            loserLives = game.player1Lives;
        }

    } else if (achterliggerValue > voorgooierValue) {
        // Achterligger wins, voorgooier loses
        winnerId = achterliggerId;
        loserId = voorgooierId;
        console.log(`   🏆 WINNAAR: ${achterligger.username} (${achterliggerValue})`);
        console.log(`   💔 VERLIEZER: ${voorgooier.username} (${voorgooierValue})`);

        // WINNAAR bepaalt penalty (als winnaar Mexico gooit, dubbele penalty!)
        if (achterliggerIsMexico) {
            penalty = -2;
            console.log(`   Penalty: -2 (WINNAAR gooide MEXICO!)`);
        } else {
            penalty = -1;
            console.log(`   Penalty: -1`);
        }

        // Pas penalty toe op VERLIEZER (voorgooier)
        if (voorgooierIsPlayer1) {
            // Voorgooier is player1
            game.player1Lives += penalty;
            loserLives = game.player1Lives;
        } else {
            // Voorgooier is player2
            game.player2Lives += penalty;
            loserLives = game.player2Lives;
        }

    } else {
        // Equal values - VASTGOOIER! (overgooien)
        console.log(`   🤝 GELIJKSPEL (${voorgooierValue}) - VASTGOOIER!`);
        console.log(`   ⚔️  Overgooien: beide spelers gooien 1x, hoogste wint`);

        // Mark game as in vastgooier mode
        game.isVastgooier = true;
        game.vastgooierOriginalVoorgooier = voorgooierId; // Remember who was voorgooier

        // BELANGRIJK: Bewaar originele worpen voor Mexico penalty check!
        game.vastgooierOriginalVoorgooierThrow = voorgooierThrowData;
        game.vastgooierOriginalAchterliggerThrow = achterliggerThrowData;

        // Emit vastgooier event to both players
        io.to(game.player1SocketId).emit('vastgooier', {
            message: 'Gelijkspel! Overgooien - beide spelers gooien 1x blind',
            voorgooierValue: voorgooierValue,
            achterliggerValue: achterliggerValue
        });
        io.to(game.player2SocketId).emit('vastgooier', {
            message: 'Gelijkspel! Overgooien - beide spelers gooien 1x blind',
            voorgooierValue: voorgooierValue,
            achterliggerValue: achterliggerValue
        });

        // Reset for vastgooier round (similar to first round but both already threw)
        game.voorgooierPattern = [];
        game.voorgooierThrows = [];
        game.achterliggerThrows = [];
        game.voorgooierThrowCount = 0;
        game.achterliggerThrowCount = 0;

        // Start vastgooier - both players throw blind simultaneously
        game.vastgooierThrows = {
            player1: null,
            player2: null
        };

        return; // Don't continue to next round, wait for vastgooier throws
    }

    // CORRECTE LOGS: toon elke speler met hun eigen lives
    console.log(`   ${player1.username} lives left: ${game.player1Lives}`);
    console.log(`   ${player2.username} lives left: ${game.player2Lives}`);

    // Set loser as new voorgooier (if there's a loser)
    const newVoorgooier = loserId;
    if (newVoorgooier) {
        const newVoorgooierPlayer = userCache.get(newVoorgooier);
        console.log(`   👑 ${newVoorgooierPlayer.username} wordt voorgooier voor volgende ronde`);
    }

    // Check game over
    if (loserLives !== null && loserLives <= 0) {
        const loserName = userCache.get(loserId).username;
        console.log(`   💀 ${loserName} is uitgeschakeld - game over!`);

        // Emit round results
        io.to(game.player1SocketId).emit('round_result', {
            voorgooierThrow: voorgooierThrowData,
            voorgooierId: voorgooierId,
            achterliggerThrow: achterliggerThrowData,
            achterliggerId: achterliggerId,
            winnerId: winnerId,
            loserId: loserId,
            livesLeft: loserLives,
            penalty: penalty,
            gameOver: true
        });
        io.to(game.player2SocketId).emit('round_result', {
            voorgooierThrow: voorgooierThrowData,
            voorgooierId: voorgooierId,
            achterliggerThrow: achterliggerThrowData,
            achterliggerId: achterliggerId,
            winnerId: winnerId,
            loserId: loserId,
            livesLeft: loserLives,
            penalty: penalty,
            gameOver: true
        });

        setTimeout(() => endGame(game, winnerId, 'lives_depleted'), 2000);
        return;
    }

    // Update voorgooier for next round
    game.voorgooier = newVoorgooier;

    // Emit round results
    io.to(game.player1SocketId).emit('round_result', {
        voorgooierThrow: voorgooierThrowData,
        voorgooierId: voorgooierId,
        achterliggerThrow: achterliggerThrowData,
        achterliggerId: achterliggerId,
        winnerId: winnerId,
        loserId: loserId,
        livesLeft: loserLives,
        penalty: penalty,
        gameOver: false
    });
    io.to(game.player2SocketId).emit('round_result', {
        voorgooierThrow: voorgooierThrowData,
        voorgooierId: voorgooierId,
        achterliggerThrow: achterliggerThrowData,
        achterliggerId: achterliggerId,
        winnerId: winnerId,
        loserId: loserId,
        livesLeft: loserLives,
        penalty: penalty,
        gameOver: false
    });

    // Start next round after delay
    setTimeout(() => startNextRound(game), 3000);
}

// ============================================
// OUDE CODE VERWIJDERD: handleResultChoice()
// ============================================
// Deze functie is verwijderd omdat spelers NIET zelf moeten kiezen of ze gewonnen/verloren hebben.
// In plaats daarvan vergelijkt compareThrows() automatisch de dobbelsteenwaarden.
// Dit was het grootste probleem in de multiplayer versie!

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

    const player1 = userCache.get(game.player1Id);
    const player2 = userCache.get(game.player2Id);

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
        resetDice: true, // Reset dice displays for new round
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
    const winner = userCache.get(winnerId);
    const loser = userCache.get(loserId);

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

    // Save to database
    db.updateUserStats(winnerId, {
        eloRating: winner.eloRating,
        wins: winner.stats.wins,
        gamesPlayed: winner.stats.gamesPlayed
    });

    db.updateUserStats(loserId, {
        eloRating: loser.eloRating,
        losses: loser.stats.losses,
        gamesPlayed: loser.stats.gamesPlayed
    });

    // Save game history
    db.saveGameHistory({
        gameId: game.gameId,
        winnerId,
        loserId,
        winnerUsername: winner.username,
        loserUsername: loser.username,
        winnerEloChange: winnerChange,
        loserEloChange: loserChange,
        winnerFinalElo: winner.eloRating,
        loserFinalElo: loser.eloRating
    });

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

    // Broadcast updated stats (game ended)
    broadcastStats();
}

// ============================================
// START SERVER
// ============================================

server.listen(PORT, () => {
    console.log(`\n🎲 Multiplayer Mexico Backend Server - CORRECTE SPELREGELS`);
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Socket.io ready for connections`);
    console.log(`\n📊 Stats: ${db.getUserCount()} users, ${games.size} active games\n`);
});
