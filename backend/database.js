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

    // Create user_credits table (Phase 3: Credits System)
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_credits (
            userId TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 500,
            lifetimeEarned INTEGER DEFAULT 500,
            lifetimeSpent INTEGER DEFAULT 0,
            lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id)
        )
    `);

    // Create credit_transactions table (full audit trail)
    db.exec(`
        CREATE TABLE IF NOT EXISTS credit_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT NOT NULL,
            amount INTEGER NOT NULL,
            type TEXT NOT NULL,
            relatedId TEXT,
            description TEXT NOT NULL,
            balanceAfter INTEGER NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id)
        )
    `);

    // Create shop_items table (power-up catalog)
    db.exec(`
        CREATE TABLE IF NOT EXISTS shop_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            cost INTEGER NOT NULL,
            type TEXT NOT NULL,
            isActive INTEGER DEFAULT 1,
            metadata TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
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
        CREATE INDEX IF NOT EXISTS idx_credit_transactions_userId ON credit_transactions(userId);
        CREATE INDEX IF NOT EXISTS idx_credit_transactions_createdAt ON credit_transactions(createdAt);
    `);

    // Initialize shop items if table is empty
    initializeShopItems();

    console.log('✅ Database initialized (with credits system)');
}

// Initialize shop items with default power-ups
function initializeShopItems() {
    const count = db.prepare('SELECT COUNT(*) as count FROM shop_items').get();

    if (count.count === 0) {
        const stmt = db.prepare(`
            INSERT INTO shop_items (id, name, description, cost, type, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Draaisteen Plussen (Extra Leven)
        stmt.run(
            'penalty_reduction',
            'Draaisteen Plussen',
            'Verminder je penalty met 1 leven (mag je draaisteen plussen)',
            100,
            'powerup',
            JSON.stringify({ effect: 'reduce_penalty', amount: 1 })
        );

        // Mexico Shield
        stmt.run(
            'mexico_shield',
            'Mexico Shield',
            'Bescherming tegen de volgende Mexico (1 ronde)',
            200,
            'powerup',
            JSON.stringify({ effect: 'block_mexico', duration: 1 })
        );

        console.log('✅ Shop items initialized (2 power-ups)');
    }
}

// ============================================
// USER CRUD OPERATIONS
// ============================================

// Create user
function createUser(userData) {
    // Use transaction to ensure atomicity
    const insertUser = db.prepare(`
        INSERT INTO users (id, username, email, password, eloRating, avatarEmoji, wins, losses, gamesPlayed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCredits = db.prepare(`
        INSERT INTO user_credits (userId, balance, lifetimeEarned, lifetimeSpent)
        VALUES (?, 500, 500, 0)
    `);

    const insertTransaction = db.prepare(`
        INSERT INTO credit_transactions (userId, amount, type, description, balanceAfter)
        VALUES (?, 500, 'signup_bonus', 'Welkom bij Koning Mexico! 🎉', 500)
    `);

    // Execute transaction
    const transaction = db.transaction(() => {
        const result = insertUser.run(
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

        // Initialize credits (500 free credits on signup)
        insertCredits.run(userData.id);

        // Log transaction
        insertTransaction.run(userData.id);

        return result.changes > 0;
    });

    return transaction();
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
    if (!throwData.playerId || throwData.playerId.startsWith('guest-') ||
        !throwData.opponentId || throwData.opponentId.startsWith('guest-')) {
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
// CREDITS SYSTEM OPERATIONS (Phase 3)
// ============================================

// Get user credits
function getUserCredits(userId) {
    // Skip guests
    if (!userId || userId.startsWith('guest-')) {
        return null;
    }

    const stmt = db.prepare('SELECT * FROM user_credits WHERE userId = ?');
    return stmt.get(userId);
}

// Update credits with transaction logging (atomic operation)
function updateCredits(userId, amount, type, description, relatedId = null) {
    // Skip guests
    if (!userId || userId.startsWith('guest-')) {
        return false;
    }

    const updateBalance = db.prepare(`
        UPDATE user_credits
        SET balance = balance + ?,
            lifetimeEarned = lifetimeEarned + CASE WHEN ? > 0 THEN ? ELSE 0 END,
            lifetimeSpent = lifetimeSpent + CASE WHEN ? < 0 THEN ABS(?) ELSE 0 END,
            lastUpdated = CURRENT_TIMESTAMP
        WHERE userId = ?
    `);

    const insertTransaction = db.prepare(`
        INSERT INTO credit_transactions (userId, amount, type, relatedId, description, balanceAfter)
        VALUES (?, ?, ?, ?, ?, (SELECT balance FROM user_credits WHERE userId = ?))
    `);

    // Execute as transaction for atomicity
    const transaction = db.transaction(() => {
        const result = updateBalance.run(amount, amount, amount, amount, amount, userId);

        if (result.changes === 0) {
            throw new Error('User credits not found');
        }

        insertTransaction.run(userId, amount, type, relatedId, description, userId);
        return true;
    });

    try {
        return transaction();
    } catch (error) {
        console.error('❌ Credit update failed:', error);
        return false;
    }
}

// Get user transaction history
function getUserTransactions(userId, limit = 50) {
    // Skip guests
    if (!userId || userId.startsWith('guest-')) {
        return [];
    }

    const stmt = db.prepare(`
        SELECT
            id, userId, amount, type, relatedId, description, balanceAfter, createdAt
        FROM credit_transactions
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT ?
    `);

    return stmt.all(userId, limit);
}

// Get all active shop items
function getShopItems() {
    const stmt = db.prepare(`
        SELECT id, name, description, cost, type, metadata
        FROM shop_items
        WHERE isActive = 1
        ORDER BY cost ASC
    `);

    return stmt.all().map(item => ({
        ...item,
        metadata: item.metadata ? JSON.parse(item.metadata) : null
    }));
}

// Purchase power-up with validation
function purchasePowerup(userId, itemId) {
    // Skip guests
    if (!userId || userId.startsWith('guest-')) {
        return { success: false, error: 'Gasten kunnen geen power-ups kopen' };
    }

    const getItem = db.prepare('SELECT * FROM shop_items WHERE id = ? AND isActive = 1');
    const getCredits = db.prepare('SELECT balance FROM user_credits WHERE userId = ?');

    // Execute as transaction
    const transaction = db.transaction(() => {
        const item = getItem.get(itemId);
        if (!item) {
            throw new Error('Power-up niet gevonden');
        }

        const credits = getCredits.get(userId);
        if (!credits) {
            throw new Error('Credits account niet gevonden');
        }

        if (credits.balance < item.cost) {
            throw new Error('Onvoldoende credits');
        }

        // Deduct credits
        const success = updateCredits(
            userId,
            -item.cost,
            'purchase',
            `Power-up gekocht: ${item.name}`,
            itemId
        );

        if (!success) {
            throw new Error('Credits update mislukt');
        }

        return {
            success: true,
            item: {
                id: item.id,
                name: item.name,
                cost: item.cost,
                metadata: item.metadata ? JSON.parse(item.metadata) : null
            },
            newBalance: credits.balance - item.cost
        };
    });

    try {
        return transaction();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Award gambling pot to winner
function awardGamblingPot(winnerId, loserId, potAmount, gameId) {
    // Skip if guests
    if (!winnerId || winnerId.startsWith('guest-') ||
        !loserId || loserId.startsWith('guest-')) {
        return false;
    }

    // Winner gets the pot
    return updateCredits(
        winnerId,
        potAmount,
        'gambling_win',
        `Gambling game gewonnen! 🎰`,
        gameId
    );
}

// Freeze credits for gambling (deduct from balance)
function freezeGamblingCredits(userId, amount, gameId) {
    // Skip guests
    if (!userId || userId.startsWith('guest-')) {
        return false;
    }

    const credits = getUserCredits(userId);
    if (!credits || credits.balance < amount) {
        return false;
    }

    return updateCredits(
        userId,
        -amount,
        'gambling_freeze',
        `Credits ingezet voor gambling game 🎲`,
        gameId
    );
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
    // Phase 3: Credits system functions
    getUserCredits,
    updateCredits,
    getUserTransactions,
    getShopItems,
    purchasePowerup,
    awardGamblingPot,
    freezeGamblingCredits,
    db // Export db instance for direct queries if needed
};
