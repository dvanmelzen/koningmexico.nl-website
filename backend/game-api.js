// ============================================
// MEXICO GAME API SERVER
// ============================================
// REST API for Mexico game using unified GameEngine
// Allows playing via API/CLI and automated testing

const express = require('express');
const cors = require('cors');

// Note: GameEngine is defined in multiplayer.js (frontend)
// For now, we'll create a backend version
// TODO: Share GameEngine code between frontend and backend

// ============================================
// GAME ENGINE (Backend Version)
// ============================================
// Simplified version for API use

class GameEngine {
    constructor(mode) {
        this.mode = mode; // 'bot' only for API
        this.gameId = null;
        this.roundNumber = 1;
        this.isFirstRound = true;
        this.maxThrows = 3;
        this.voorgooierId = null;
        this.currentTurnId = null;

        this.player = {
            id: null,
            username: null,
            lives: 6,
            dice1: null,
            dice2: null,
            currentThrow: null,
            displayThrow: null,
            throwCount: 0,
            isBlind: false,
            isMexico: false,
            throwHistory: []
        };

        this.opponent = {
            id: 'bot-' + Date.now(),
            username: '🤖 Bot',
            lives: 6,
            currentThrow: null,
            displayThrow: null,
            isBlind: false,
            isMexico: false,
            throwHistory: []
        };
    }

    async initialize(config) {
        this.gameId = config.gameId || `game-${Date.now()}`;
        this.player.id = config.playerId;
        this.player.username = config.playerName || 'Player';
        this.voorgooierId = this.player.id;
        this.currentTurnId = this.player.id;

        console.log(`[GameEngine] Initialized: ${this.player.username} vs ${this.opponent.username}`);

        return this.getState();
    }

    async throwDice(isBlind) {
        if (!this.isPlayerTurn()) {
            throw new Error('Not your turn!');
        }

        // Roll dice locally
        const dice1 = Math.ceil(Math.random() * 6);
        const dice2 = Math.ceil(Math.random() * 6);

        this.player.throwCount++;
        this.player.dice1 = dice1;
        this.player.dice2 = dice2;
        this.player.currentThrow = this.calculateThrowValue(dice1, dice2);
        this.player.isBlind = isBlind;
        this.player.isMexico = (this.player.currentThrow === 1000);

        if (this.player.isBlind) {
            this.player.displayThrow = '???';
        } else {
            this.player.displayThrow = this.player.isMexico ? '🎉 Mexico!' : this.player.currentThrow.toString();
        }

        this.player.throwHistory.push({
            dice1, dice2,
            value: this.player.currentThrow,
            isBlind, wasBlind: isBlind
        });

        console.log(`[GameEngine] Player threw: ${dice1}-${dice2} = ${this.player.currentThrow} (${isBlind ? 'BLIND' : 'OPEN'})`);

        const canKeep = true;
        const canThrowAgain = this.player.throwCount < this.maxThrows;
        const isLastThrow = this.player.throwCount >= this.maxThrows;

        return {
            dice1, dice2,
            value: this.player.currentThrow,
            displayValue: this.player.displayThrow,
            isBlind: this.player.isBlind,
            isMexico: this.player.isMexico,
            throwCount: this.player.throwCount,
            canKeep, canThrowAgain, isLastThrow,
            message: isBlind ? '🙈 You threw blind!' : `🎲 You threw: ${this.player.displayThrow}`,
            state: this.getState()
        };
    }

    async keepThrow() {
        if (!this.isPlayerTurn()) {
            throw new Error('Not your turn!');
        }

        console.log(`[GameEngine] Player keeps: ${this.player.displayThrow}`);

        // Switch to bot turn
        this.currentTurnId = this.opponent.id;

        // Bot throws
        await this.botThrow();

        // Compare round
        await this.compareRound();

        return {
            roundComplete: true,
            message: 'Round complete!',
            state: this.getState()
        };
    }

    revealDice() {
        if (!this.player.isBlind) {
            throw new Error('Throw is not blind!');
        }

        console.log(`[GameEngine] Player reveals: ${this.player.currentThrow}`);

        this.player.isBlind = false;
        this.player.displayThrow = this.player.isMexico ? '🎉 Mexico!' : this.player.currentThrow.toString();

        if (this.player.throwHistory.length > 0) {
            this.player.throwHistory[this.player.throwHistory.length - 1].isBlind = false;
        }

        return {
            revealed: true,
            value: this.player.currentThrow,
            displayValue: this.player.displayThrow,
            dice1: this.player.dice1,
            dice2: this.player.dice2,
            message: `👁️ Revealed: ${this.player.displayThrow}`,
            state: this.getState()
        };
    }

    async botThrow() {
        // Simple bot AI: throw until threshold
        let botThrowCount = 0;
        let bestThrow = 0;
        const maxThrows = this.maxThrows;
        const threshold = 54; // Simple threshold

        while (botThrowCount < maxThrows) {
            botThrowCount++;
            const dice1 = Math.ceil(Math.random() * 6);
            const dice2 = Math.ceil(Math.random() * 6);
            const throwValue = this.calculateThrowValue(dice1, dice2);

            this.opponent.dice1 = dice1;
            this.opponent.dice2 = dice2;
            this.opponent.currentThrow = throwValue;
            this.opponent.isMexico = (throwValue === 1000);
            this.opponent.displayThrow = this.opponent.isMexico ? '🎉 Mexico!' : throwValue.toString();

            this.opponent.throwHistory.push({
                dice1, dice2, value: throwValue,
                isBlind: false, wasBlind: false
            });

            console.log(`[Bot] Throw ${botThrowCount}: ${dice1}-${dice2} = ${throwValue}`);

            bestThrow = throwValue;

            // Keep if good enough or last throw
            if (throwValue === 1000 || throwValue >= threshold || botThrowCount >= maxThrows) {
                break;
            }
        }

        this.opponent.isBlind = false;
        console.log(`[Bot] Keeps: ${this.opponent.displayThrow}`);
    }

    async compareRound() {
        console.log(`[GameEngine] Comparing round ${this.roundNumber}`);

        // Reveal blind throws
        if (this.player.isBlind) {
            this.player.isBlind = false;
            this.player.displayThrow = this.player.isMexico ? '🎉 Mexico!' : this.player.currentThrow.toString();
        }

        const winner = this.determineWinner();

        if (winner === this.player.id) {
            this.opponent.lives--;
            console.log(`[GameEngine] Player wins! Bot lives: ${this.opponent.lives}`);
        } else {
            this.player.lives--;
            console.log(`[GameEngine] Bot wins! Player lives: ${this.player.lives}`);
        }

        if (this.isGameOver()) {
            await this.endGame();
        } else {
            await this.startNextRound();
        }
    }

    determineWinner() {
        const playerThrow = this.player.currentThrow;
        const opponentThrow = this.opponent.currentThrow;

        if (playerThrow === 1000 && opponentThrow !== 1000) return this.player.id;
        if (opponentThrow === 1000 && playerThrow !== 1000) return this.opponent.id;
        if (playerThrow === 1000 && opponentThrow === 1000) return this.voorgooierId;

        if (playerThrow > opponentThrow) return this.player.id;
        if (opponentThrow > playerThrow) return this.opponent.id;

        return this.voorgooierId;
    }

    async startNextRound() {
        this.roundNumber++;
        this.isFirstRound = false;

        this.voorgooierId = (this.voorgooierId === this.player.id) ? this.opponent.id : this.player.id;
        this.currentTurnId = this.voorgooierId;

        this.player.throwCount = 0;
        this.player.dice1 = null;
        this.player.dice2 = null;
        this.player.currentThrow = null;
        this.player.displayThrow = null;
        this.player.isBlind = false;
        this.player.isMexico = false;
        this.player.throwHistory = [];

        this.opponent.throwHistory = [];

        console.log(`[GameEngine] Round ${this.roundNumber} started. Voorgooier: ${this.voorgooierId === this.player.id ? 'Player' : 'Bot'}`);
    }

    isGameOver() {
        return this.player.lives <= 0 || this.opponent.lives <= 0;
    }

    async endGame() {
        const winner = this.player.lives > 0 ? this.player.id : this.opponent.id;

        console.log(`[GameEngine] Game over! Winner: ${winner === this.player.id ? 'Player' : 'Bot'}`);

        return {
            gameId: this.gameId,
            winnerId: winner,
            winnerName: winner === this.player.id ? this.player.username : this.opponent.username,
            playerLives: this.player.lives,
            opponentLives: this.opponent.lives
        };
    }

    isPlayerTurn() {
        return this.currentTurnId === this.player.id;
    }

    calculateThrowValue(dice1, dice2) {
        if ((dice1 === 2 && dice2 === 1) || (dice1 === 1 && dice2 === 2)) return 1000;
        if (dice1 === dice2) return dice1 * 100;
        return Math.max(dice1, dice2) * 10 + Math.min(dice1, dice2);
    }

    getState() {
        return {
            gameId: this.gameId,
            mode: this.mode,
            roundNumber: this.roundNumber,
            isFirstRound: this.isFirstRound,
            maxThrows: this.maxThrows,
            voorgooierId: this.voorgooierId,
            voorgooierName: this.voorgooierId === this.player.id ? this.player.username : this.opponent.username,
            currentTurnId: this.currentTurnId,
            isPlayerTurn: this.isPlayerTurn(),
            player: {
                id: this.player.id,
                username: this.player.username,
                lives: this.player.lives,
                currentThrow: this.player.currentThrow,
                displayThrow: this.player.displayThrow,
                throwCount: this.player.throwCount,
                isBlind: this.player.isBlind,
                isMexico: this.player.isMexico,
                throwHistory: this.player.throwHistory
            },
            opponent: {
                id: this.opponent.id,
                username: this.opponent.username,
                lives: this.opponent.lives,
                currentThrow: this.opponent.currentThrow,
                displayThrow: this.opponent.displayThrow,
                throwHistory: this.opponent.throwHistory
            },
            isGameOver: this.isGameOver(),
            gameResult: this.isGameOver() ? {
                winner: this.player.lives > 0 ? this.player.username : this.opponent.username,
                playerLives: this.player.lives,
                opponentLives: this.opponent.lives
            } : null
        };
    }
}

// ============================================
// API ADAPTER
// ============================================

class APIAdapter {
    constructor() {
        this.games = new Map(); // gameId -> GameEngine
    }

    async createGame(options) {
        const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const engine = new GameEngine('bot');

        await engine.initialize({
            gameId,
            playerId: options.playerId || `player-${Date.now()}`,
            playerName: options.playerName || 'Player'
        });

        this.games.set(gameId, engine);

        console.log(`[API] Game created: ${gameId}`);

        return {
            gameId,
            message: '🎲 Game created! You start as voorgooier (must throw blind in round 1)',
            state: engine.getState()
        };
    }

    async throwDice(gameId, options) {
        const engine = this.games.get(gameId);
        if (!engine) throw new Error('Game not found');

        const result = await engine.throwDice(options.isBlind);
        return result;
    }

    async keepThrow(gameId) {
        const engine = this.games.get(gameId);
        if (!engine) throw new Error('Game not found');

        const result = await engine.keepThrow();
        return result;
    }

    async revealDice(gameId) {
        const engine = this.games.get(gameId);
        if (!engine) throw new Error('Game not found');

        const result = engine.revealDice();
        return result;
    }

    getState(gameId) {
        const engine = this.games.get(gameId);
        if (!engine) throw new Error('Game not found');

        return engine.getState();
    }

    deleteGame(gameId) {
        const deleted = this.games.delete(gameId);
        if (deleted) {
            console.log(`[API] Game deleted: ${gameId}`);
        }
        return deleted;
    }

    listGames() {
        return Array.from(this.games.keys()).map(gameId => {
            const engine = this.games.get(gameId);
            return {
                gameId,
                playerName: engine.player.username,
                roundNumber: engine.roundNumber,
                playerLives: engine.player.lives,
                opponentLives: engine.opponent.lives,
                isGameOver: engine.isGameOver()
            };
        });
    }
}

// ============================================
// EXPRESS API SERVER
// ============================================

const app = express();
const apiAdapter = new APIAdapter();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Mexico Game API',
        version: '1.0.0',
        activeGames: apiAdapter.games.size
    });
});

// Create game
app.post('/api/game/create', async (req, res) => {
    try {
        const result = await apiAdapter.createGame(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Throw dice
app.post('/api/game/:gameId/throw', async (req, res) => {
    try {
        const result = await apiAdapter.throwDice(req.params.gameId, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Keep throw
app.post('/api/game/:gameId/keep', async (req, res) => {
    try {
        const result = await apiAdapter.keepThrow(req.params.gameId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Reveal dice
app.post('/api/game/:gameId/reveal', async (req, res) => {
    try {
        const result = await apiAdapter.revealDice(req.params.gameId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get game state
app.get('/api/game/:gameId/state', (req, res) => {
    try {
        const state = apiAdapter.getState(req.params.gameId);
        res.json(state);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Delete game
app.delete('/api/game/:gameId', (req, res) => {
    try {
        const deleted = apiAdapter.deleteGame(req.params.gameId);
        if (deleted) {
            res.json({ message: 'Game deleted', gameId: req.params.gameId });
        } else {
            res.status(404).json({ error: 'Game not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// List all games
app.get('/api/games', (req, res) => {
    try {
        const games = apiAdapter.listGames();
        res.json({ games, count: games.length });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.GAME_API_PORT || 3002;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎲  MEXICO GAME API SERVER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅  Server running on port ${PORT}`);
        console.log(`📡  API: http://localhost:${PORT}/api`);
        console.log(`💚  Health: http://localhost:${PORT}/api/health`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('📚  API Endpoints:');
        console.log('   POST   /api/game/create');
        console.log('   POST   /api/game/:id/throw');
        console.log('   POST   /api/game/:id/keep');
        console.log('   POST   /api/game/:id/reveal');
        console.log('   GET    /api/game/:id/state');
        console.log('   DELETE /api/game/:id');
        console.log('   GET    /api/games');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
}

module.exports = { app, APIAdapter, GameEngine };
