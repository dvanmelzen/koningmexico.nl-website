class GameEngine {
    constructor(mode) {
        this.mode = mode; // 'bot' or 'multiplayer'
        this.gameId = null;
        this.roundNumber = 1;
        this.isFirstRound = true;
        this.maxThrows = 1; // First round: 1 blind throw only!
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
    }

    async initialize(config) {
        this.gameId = config.gameId || `game-${Date.now()}`;
        this.player.id = config.playerId;
        this.player.username = config.playerName || 'Player';

        // Configure opponent (real player or bot)
        if (config.opponentId && config.opponentName) {
            this.opponent.id = config.opponentId;
            this.opponent.username = config.opponentName;
        } else {
            // Default to bot
            this.opponent.id = 'bot-' + Date.now();
            this.opponent.username = '🤖 Bot';
        }

        this.voorgooierId = this.player.id;
        this.currentTurnId = this.player.id;

        console.log(`[GameEngine] Initialized (${this.mode}): ${this.player.username} vs ${this.opponent.username}`);

        return this.getState();
    }

    async throwDice(isBlind) {
        if (!this.isPlayerTurn()) {
            throw new Error('Not your turn!');
        }

        // First round must be blind!
        if (this.isFirstRound && !isBlind) {
            throw new Error('First round must be blind!');
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

    async throwDiceForOpponent(isBlind) {
        if (this.currentTurnId !== this.opponent.id) {
            throw new Error('Not opponent turn!');
        }

        // Roll dice for opponent
        const dice1 = Math.ceil(Math.random() * 6);
        const dice2 = Math.ceil(Math.random() * 6);

        this.opponent.throwCount++;
        this.opponent.dice1 = dice1;
        this.opponent.dice2 = dice2;
        this.opponent.currentThrow = this.calculateThrowValue(dice1, dice2);
        this.opponent.isBlind = isBlind;
        this.opponent.isMexico = (this.opponent.currentThrow === 1000);

        if (this.opponent.isBlind) {
            this.opponent.displayThrow = '???';
        } else {
            this.opponent.displayThrow = this.opponent.isMexico ? '🎉 Mexico!' : this.opponent.currentThrow.toString();
        }

        this.opponent.throwHistory.push({
            dice1, dice2,
            value: this.opponent.currentThrow,
            isBlind, wasBlind: isBlind
        });

        console.log(`[GameEngine] Opponent threw: ${dice1}-${dice2} = ${this.opponent.currentThrow} (${isBlind ? 'BLIND' : 'OPEN'})`);

        const canKeep = true;
        const canThrowAgain = this.opponent.throwCount < this.maxThrows;
        const isLastThrow = this.opponent.throwCount >= this.maxThrows;

        return {
            dice1, dice2,
            value: this.opponent.currentThrow,
            displayValue: this.opponent.displayThrow,
            isBlind: this.opponent.isBlind,
            isMexico: this.opponent.isMexico,
            throwCount: this.opponent.throwCount,
            canKeep, canThrowAgain, isLastThrow,
            message: isBlind ? '🙈 Opponent threw blind!' : `🎲 Opponent threw: ${this.opponent.displayThrow}`,
            state: this.getState()
        };
    }

    async keepThrow() {
        if (!this.isPlayerTurn()) {
            throw new Error('Not your turn!');
        }

        console.log(`[GameEngine] Player keeps: ${this.player.displayThrow}`);

        // Switch to opponent turn
        this.currentTurnId = this.opponent.id;

        // In bot mode: auto-play bot and compare
        if (this.mode === 'bot') {
            await this.botThrow();
            await this.compareRound();

            return {
                roundComplete: true,
                message: 'Round complete!',
                state: this.getState()
            };
        }

        // In multiplayer mode: just switch turn (server handles rest)
        return {
            roundComplete: false,
            message: 'Waiting for opponent...',
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
        this.maxThrows = 3; // After first round: 3 throws allowed

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

        this.opponent.throwCount = 0;
        this.opponent.dice1 = null;
        this.opponent.dice2 = null;
        this.opponent.currentThrow = null;
        this.opponent.displayThrow = null;
        this.opponent.isBlind = false;
        this.opponent.isMexico = false;
        this.opponent.throwHistory = [];

        console.log(`[GameEngine] Round ${this.roundNumber} started. Voorgooier: ${this.voorgooierId === this.player.id ? 'Player' : 'Opponent'}, MaxThrows: ${this.maxThrows}`);
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

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameEngine };
}
