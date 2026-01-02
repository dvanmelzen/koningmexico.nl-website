// ============================================
// MEXICO GAME API SERVER
// ============================================
// REST API for Mexico game using unified GameEngine
// Allows playing via API/CLI and automated testing

const express = require('express');
const cors = require('cors');

// ✅ UNIFIED: Using shared GameEngine implementation
const { GameEngine } = require('./game-engine-shared');

// Old GameEngine class removed - now using game-engine-shared.js
// This ensures all game modes (bot, multiplayer, API) use the same rules

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
