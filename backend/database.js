const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
// Use /app/data directory which is mounted as a Docker volume for persistence
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'mexico.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// ============================================
// SCHEMA INITIALIZATION
// ============================================

function initializeDatabase() {
    // Create users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password TEXT NOT NULL,
            eloRating INTEGER DEFAULT 1200,
            avatarEmoji TEXT DEFAULT '👤',
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            gamesPlayed INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create game_history table
    db.exec(`
        CREATE TABLE IF NOT EXISTS game_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gameId TEXT NOT NULL,
            winnerId TEXT NOT NULL,
            loserId TEXT NOT NULL,
            winnerUsername TEXT NOT NULL,
            loserUsername TEXT NOT NULL,
            winnerEloChange INTEGER NOT NULL,
            loserEloChange INTEGER NOT NULL,
            winnerFinalElo INTEGER NOT NULL,
            loserFinalElo INTEGER NOT NULL,
            playedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (winnerId) REFERENCES users(id),
            FOREIGN KEY (loserId) REFERENCES users(id)
        )
    `);

    // Create game_details table for detailed throw-by-throw logging
    db.exec(`
        CREATE TABLE IF NOT EXISTS game_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gameId TEXT NOT NULL,
            roundNumber INTEGER NOT NULL,
            playerId TEXT NOT NULL,
            opponentId TEXT NOT NULL,
            throwType TEXT NOT NULL,
            dice1 INTEGER,
            dice2 INTEGER,
            wasMexico INTEGER DEFAULT 0,
            wasVastgooier INTEGER DEFAULT 0,
            vastgooierPenalty INTEGER DEFAULT 0,
            roundWinner TEXT,
            livesRemaining INTEGER,
            throwTimestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (playerId) REFERENCES users(id),
            FOREIGN KEY (opponentId) REFERENCES users(id)
        )
    `);

    // Create indexes for faster queries
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_game_history_winner ON game_history(winnerId);
        CREATE INDEX IF NOT EXISTS idx_game_history_loser ON game_history(loserId);
        CREATE INDEX IF NOT EXISTS idx_game_history_played_at ON game_history(playedAt);
        CREATE INDEX IF NOT EXISTS idx_game_details_gameId ON game_details(gameId);
        CREATE INDEX IF NOT EXISTS idx_game_details_playerId ON game_details(playerId);
        CREATE INDEX IF NOT EXISTS idx_game_details_timestamp ON game_details(throwTimestamp);
    `);

    console.log('✅ Database initialized (with game_details table)');
}

// ============================================
// USER CRUD OPERATIONS
// ============================================

// Create user
function createUser(userData) {
    const stmt = db.prepare(`
        INSERT INTO users (id, username, email, password, eloRating, avatarEmoji, wins, losses, gamesPlayed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        userData.id,
        userData.username,
        userData.email.toLowerCase(),
        userData.password,
        userData.eloRating || 1200,
        userData.avatarEmoji || '👤',
        0, // wins
        0, // losses
        0  // gamesPlayed
    );

    return result.changes > 0;
}

// Find user by ID
function findUserById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id);

    if (!user) return null;

    // Convert to format expected by server
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
        eloRating: user.eloRating,
        avatarEmoji: user.avatarEmoji,
        stats: {
            wins: user.wins,
            losses: user.losses,
            gamesPlayed: user.gamesPlayed
        },
        createdAt: new Date(user.createdAt)
    };
}

// Find user by username (case-insensitive)
function findUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
    const user = stmt.get(username);

    if (!user) return null;

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
        eloRating: user.eloRating,
        avatarEmoji: user.avatarEmoji,
        stats: {
            wins: user.wins,
            losses: user.losses,
            gamesPlayed: user.gamesPlayed
        },
        createdAt: new Date(user.createdAt)
    };
}

// Find user by email (case-insensitive)
function findUserByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
    const user = stmt.get(email);

    if (!user) return null;

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
        eloRating: user.eloRating,
        avatarEmoji: user.avatarEmoji,
        stats: {
            wins: user.wins,
            losses: user.losses,
            gamesPlayed: user.gamesPlayed
        },
        createdAt: new Date(user.createdAt)
    };
}

// Update user stats and Elo
function updateUserStats(userId, updates) {
    const fields = [];
    const values = [];

    if (updates.eloRating !== undefined) {
        fields.push('eloRating = ?');
        values.push(updates.eloRating);
    }
    if (updates.wins !== undefined) {
        fields.push('wins = ?');
        values.push(updates.wins);
    }
    if (updates.losses !== undefined) {
        fields.push('losses = ?');
        values.push(updates.losses);
    }
    if (updates.gamesPlayed !== undefined) {
        fields.push('gamesPlayed = ?');
        values.push(updates.gamesPlayed);
    }

    if (fields.length === 0) return false;

    values.push(userId);

    const stmt = db.prepare(`
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
}

// Get all users (for leaderboard)
function getAllUsers() {
    const stmt = db.prepare(`
        SELECT id, username, eloRating, avatarEmoji, wins, losses, gamesPlayed
        FROM users
        ORDER BY eloRating DESC
    `);

    const users = stmt.all();

    return users.map(user => ({
        id: user.id,
        username: user.username,
        eloRating: user.eloRating,
        avatarEmoji: user.avatarEmoji,
        stats: {
            wins: user.wins,
            losses: user.losses,
            gamesPlayed: user.gamesPlayed
        }
    }));
}

// Get user count
function getUserCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const result = stmt.get();
    return result.count;
}

// ============================================
// GAME HISTORY OPERATIONS
// ============================================

// Save game result to history
function saveGameHistory(gameData) {
    const stmt = db.prepare(`
        INSERT INTO game_history (
            gameId, winnerId, loserId, winnerUsername, loserUsername,
            winnerEloChange, loserEloChange, winnerFinalElo, loserFinalElo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        gameData.gameId,
        gameData.winnerId,
        gameData.loserId,
        gameData.winnerUsername,
        gameData.loserUsername,
        gameData.winnerEloChange,
        gameData.loserEloChange,
        gameData.winnerFinalElo,
        gameData.loserFinalElo
    );

    return result.changes > 0;
}

// Get recent games for a user
function getRecentGames(userId, limit = 10) {
    const stmt = db.prepare(`
        SELECT
            id,
            gameId,
            winnerId,
            loserId,
            winnerUsername,
            loserUsername,
            winnerEloChange,
            loserEloChange,
            winnerFinalElo,
            loserFinalElo,
            playedAt,
            CASE
                WHEN winnerId = ? THEN 'win'
                ELSE 'loss'
            END as result,
            CASE
                WHEN winnerId = ? THEN loserUsername
                ELSE winnerUsername
            END as opponent,
            CASE
                WHEN winnerId = ? THEN winnerEloChange
                ELSE loserEloChange
            END as eloChange
        FROM game_history
        WHERE winnerId = ? OR loserId = ?
        ORDER BY playedAt DESC
        LIMIT ?
    `);

    return stmt.all(userId, userId, userId, userId, userId, limit);
}

// Get recently registered users
function getRecentUsers(limit = 3) {
    const stmt = db.prepare(`
        SELECT id, username, eloRating, avatarEmoji, createdAt
        FROM users
        ORDER BY createdAt DESC
        LIMIT ?
    `);

    const users = stmt.all(limit);

    return users.map(user => ({
        id: user.id,
        username: user.username,
        eloRating: user.eloRating,
        avatarEmoji: user.avatarEmoji,
        createdAt: new Date(user.createdAt)
    }));
}

// ============================================
// GAME DETAILS OPERATIONS (Phase 2)
// ============================================

// Save throw details (NOT for guest players)
function saveThrowDetails(throwData) {
    // Skip if either player is a guest
    if (!throwData.playerId || throwData.playerId.startsWith('guest_') ||
        !throwData.opponentId || throwData.opponentId.startsWith('guest_')) {
        return false;
    }

    const stmt = db.prepare(`
        INSERT INTO game_details (
            gameId, roundNumber, playerId, opponentId, throwType,
            dice1, dice2, wasMexico, wasVastgooier, vastgooierPenalty,
            roundWinner, livesRemaining
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        throwData.gameId,
        throwData.roundNumber,
        throwData.playerId,
        throwData.opponentId,
        throwData.throwType, // 'open', 'blind', 'vast'
        throwData.dice1,
        throwData.dice2,
        throwData.wasMexico ? 1 : 0,
        throwData.wasVastgooier ? 1 : 0,
        throwData.vastgooierPenalty || 0,
        throwData.roundWinner || null,
        throwData.livesRemaining
    );

    return result.changes > 0;
}

// Get all throw details for a specific game
function getGameDetails(gameId) {
    const stmt = db.prepare(`
        SELECT
            id, gameId, roundNumber, playerId, opponentId, throwType,
            dice1, dice2, wasMexico, wasVastgooier, vastgooierPenalty,
            roundWinner, livesRemaining, throwTimestamp
        FROM game_details
        WHERE gameId = ?
        ORDER BY roundNumber ASC, throwTimestamp ASC
    `);

    return stmt.all(gameId);
}

// Get aggregated throw statistics for a user
function getUserThrowStats(userId) {
    const stmt = db.prepare(`
        SELECT
            COUNT(*) as totalThrows,
            SUM(CASE WHEN wasMexico = 1 THEN 1 ELSE 0 END) as mexicoCount,
            SUM(CASE WHEN wasVastgooier = 1 THEN 1 ELSE 0 END) as vastgooierCount,
            SUM(CASE WHEN throwType = 'blind' THEN 1 ELSE 0 END) as blindThrows,
            SUM(CASE WHEN throwType = 'open' THEN 1 ELSE 0 END) as openThrows,
            SUM(CASE WHEN vastgooierPenalty = 2 THEN 1 ELSE 0 END) as mexicoInVastgooier,
            AVG(CASE WHEN roundWinner = playerId THEN 1.0 ELSE 0.0 END) as roundWinRate
        FROM game_details
        WHERE playerId = ?
    `);

    return stmt.get(userId);
}

// Get recent games with round count for a user
function getRecentGamesWithDetails(userId, limit = 10) {
    const stmt = db.prepare(`
        SELECT
            gh.id,
            gh.gameId,
            gh.winnerId,
            gh.loserId,
            gh.winnerUsername,
            gh.loserUsername,
            gh.winnerEloChange,
            gh.loserEloChange,
            gh.winnerFinalElo,
            gh.loserFinalElo,
            gh.playedAt,
            CASE
                WHEN gh.winnerId = ? THEN 'win'
                ELSE 'loss'
            END as result,
            CASE
                WHEN gh.winnerId = ? THEN gh.loserUsername
                ELSE gh.winnerUsername
            END as opponent,
            CASE
                WHEN gh.winnerId = ? THEN gh.winnerEloChange
                ELSE gh.loserEloChange
            END as eloChange,
            (SELECT MAX(roundNumber) FROM game_details WHERE gameId = gh.gameId) as totalRounds
        FROM game_history gh
        WHERE gh.winnerId = ? OR gh.loserId = ?
        ORDER BY gh.playedAt DESC
        LIMIT ?
    `);

    return stmt.all(userId, userId, userId, userId, userId, limit);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    initializeDatabase,
    createUser,
    findUserById,
    findUserByUsername,
    findUserByEmail,
    updateUserStats,
    getAllUsers,
    getUserCount,
    saveGameHistory,
    getRecentGames,
    getRecentUsers,
    // Phase 2: Game details functions
    saveThrowDetails,
    getGameDetails,
    getUserThrowStats,
    getRecentGamesWithDetails,
    db // Export db instance for direct queries if needed
};
