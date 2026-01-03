// ========================================
// ⚠️ DEPRECATED - DO NOT USE
// ========================================
// This file is LEGACY CODE from an older project.
// It has been replaced by the modern bot mode in multiplayer.js
// which uses the same AI psychology but with consistent game rules.
//
// Use multiplayer.html?mode=bot instead of spel_vs_computer.html
//
// This file is kept for reference only and will be removed in the future.
// Last updated: 2026-01-03 (marked as deprecated)
// ========================================

// ========================================
// Koning Mexico vs Computer - Game Logic
// ========================================

(function() {
    'use strict';

    // AI Personalities for human-like behavior
    const AI_PERSONALITIES = {
        SCARED: {
            name: 'Voorzichtig',
            thresholds: { 1: 61, 2: 61, 3: 31 },  // Safe: 50% grens
            bluffChance: 0.05,  // Blufft bijna nooit (5%)
            psychologyFactor: 0,  // Geen psychologische aanpassing
            description: 'Speelt veilig, wil niet verliezen'
        },
        RATIONAL: {
            name: 'Rationeel',
            thresholds: { 1: 61, 2: 65, 3: 22 },  // Exact volgens PDF tabel
            bluffChance: 0.10,  // Blufft soms (10%)
            psychologyFactor: 3,  // Kleine aanpassing bij speler blind
            description: 'Speelt volgens kansberekening'
        },
        AGGRESSIVE: {
            name: 'Agressief',
            thresholds: { 1: 54, 2: 54, 3: 31 },  // Riskant: veel lager
            bluffChance: 0.20,  // Blufft vaak (20%)
            psychologyFactor: 5,  // Grote aanpassing bij speler blind
            description: 'Speelt riskant, neemt risico'
        }
    };

    // Difficulty modifiers
    const DIFFICULTY_MODIFIERS = {
        easy: {
            name: 'Makkelijk',
            description: 'AI maakt meer fouten en speelt minder optimaal',
            psychologyTriggerRate: 0.50, // 50% chance to trigger psychology (vs 80% medium)
            thresholdAdjustment: 0.60, // Psychology effects 40% weaker
            bluffChanceMultiplier: 0.50, // 50% less likely to bluff intelligently
            mistakeChance: 0.15 // 15% chance to make random mistakes
        },
        medium: {
            name: 'Normaal',
            description: 'Normale AI met realistische psychologie',
            psychologyTriggerRate: 0.80, // 80% chance (default)
            thresholdAdjustment: 1.00, // Full psychology effects
            bluffChanceMultiplier: 1.00, // Normal bluff intelligence
            mistakeChance: 0.05 // 5% chance for minor mistakes
        },
        hard: {
            name: 'Moeilijk',
            description: 'Slimme AI die bijna perfect speelt',
            psychologyTriggerRate: 0.95, // 95% chance to trigger psychology
            thresholdAdjustment: 1.30, // Psychology effects 30% stronger
            bluffChanceMultiplier: 1.40, // 40% better at bluffing
            mistakeChance: 0.00 // No mistakes
        }
    };

    // Game State
    let gameState = {
        difficulty: 'medium', // Current difficulty: 'easy', 'medium', 'hard'
        player: {
            lives: 6,
            currentThrow: null,
            throwCount: 0,
            isBlind: false,
            dice1: 1,
            dice2: 1,
            threwBlindThisRound: false, // Track if player threw any blind throws this round
            throwHistory: [] // Track all throws this round: [{value, displayValue, isBlind, isMexico}]
        },
        computer: {
            lives: 6,
            currentThrow: null,
            throwCount: 0,
            isBlind: false,
            dice1: 1,
            dice2: 1,
            threwBlindThisRound: false, // Track if computer threw any blind throws this round
            throwHistory: [] // Track all throws this round: [{value, displayValue, isBlind, isMexico}]
        },
        currentTurn: 'player', // 'player' or 'computer'
        roundNumber: 1,
        isFirstRound: true,
        playerToGoFirst: 'player', // Who goes first this round (loser from previous round)
        gameOver: false,
        mexicoCount: 0, // Number of Mexico's thrown this round
        maxThrows: 3, // Maximum throws this round (set by voorgooier)
        voorgooierPattern: [], // Array tracking blind/open for each throw: [false, true, false] = [open, blind, open]
        aiPersonality: null, // Current AI personality for this round

        // AI Psychology State (8 psychological principles)
        aiPsychology: {
            // Loss Aversion tracking
            isWinning: false,
            livesAdvantage: 0,

            // Tilt Mechanics tracking
            tiltLevel: 0, // 0-3: none, mild, moderate, severe
            consecutiveLosses: 0,
            roundsSinceLoss: 0,

            // Gambler's Fallacy tracking
            recentBadThrows: 0, // Count of throws < 40 in last 5 throws
            recentThrowHistory: [], // Last 5 throw values

            // Hot Hand Fallacy tracking
            consecutiveGoodThrows: 0, // Count of good throws (>50) in a row

            // Recency Bias tracking
            lastRoundOutcome: null, // 'win' or 'loss'
            lastThrowQuality: 0, // 0-100 quality of last throw

            // Anchoring Effect tracking
            firstThrowOfRound: null, // Value of first throw this round

            // Overconfidence Bias tracking
            recentWins: 0, // Wins in last 3 rounds
            confidenceMultiplier: 1.0,

            // Satisficing tracking
            satisficingThreshold: 0.65 // "Good enough" threshold (65%)
        }
    };

    // DOM Elements
    const elements = {
        playerLives: document.getElementById('playerLives'),
        computerLives: document.getElementById('computerLives'),
        playerCard: document.getElementById('playerCard'),
        computerCard: document.getElementById('computerCard'),

        // Player dice
        playerDice1: document.getElementById('playerDice1'),
        playerDice2: document.getElementById('playerDice2'),
        playerDiceCup: document.getElementById('playerDiceCup'),

        // Computer dice
        computerDice1: document.getElementById('computerDice1'),
        computerDice2: document.getElementById('computerDice2'),
        computerDiceCup: document.getElementById('computerDiceCup'),

        gameInfo: document.getElementById('gameInfo'),

        // Buttons
        throwOpenBtn: document.getElementById('throwOpenBtn'),
        throwBlindBtn: document.getElementById('throwBlindBtn'),
        keepBtn: document.getElementById('keepBtn'),
        revealBtn: document.getElementById('revealBtn'),
        newGameBtn: document.getElementById('newGameBtn'),

        // Difficulty buttons
        difficultyEasy: document.getElementById('difficultyEasy'),
        difficultyMedium: document.getElementById('difficultyMedium'),
        difficultyHard: document.getElementById('difficultyHard'),
        difficultyDescription: document.getElementById('difficultyDescription'),

        // New UI Elements
        statsWins: document.getElementById('statsWins'),
        statsLosses: document.getElementById('statsLosses'),
        statsWinRate: document.getElementById('statsWinRate'),
        statsStreak: document.getElementById('statsStreak'),
        throwHistoryDisplay: document.getElementById('throwHistoryDisplay'),
        playerThrowHistoryItems: document.getElementById('playerThrowHistoryItems'),
        computerThrowHistoryItems: document.getElementById('computerThrowHistoryItems'),
        gameInfoInHistory: document.getElementById('gameInfoInHistory')
    };

    // ========================================
    // Game Statistics System (localStorage)
    // ========================================
    const STATS_KEY = 'mexicoVsComputerStats';

    function loadStats() {
        try {
            const stored = localStorage.getItem(STATS_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load stats:', e);
        }

        // Default stats
        return {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            currentStreak: 0, // Positive = win streak, Negative = loss streak
            longestWinStreak: 0,
            highestRoundReached: 0
        };
    }

    function saveStats(stats) {
        try {
            localStorage.setItem(STATS_KEY, JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to save stats:', e);
        }
    }

    function updateStatsUI() {
        const stats = loadStats();

        elements.statsWins.textContent = stats.wins;
        elements.statsLosses.textContent = stats.losses;

        // Win rate calculation
        const winRate = stats.gamesPlayed > 0
            ? Math.round((stats.wins / stats.gamesPlayed) * 100)
            : 0;
        elements.statsWinRate.textContent = winRate;

        // Streak display
        if (stats.currentStreak > 0) {
            elements.statsStreak.textContent = `+${stats.currentStreak}`;
            elements.statsStreak.style.color = 'var(--color-green)';
        } else if (stats.currentStreak < 0) {
            elements.statsStreak.textContent = stats.currentStreak;
            elements.statsStreak.style.color = 'var(--color-red)';
        } else {
            elements.statsStreak.textContent = '0';
            elements.statsStreak.style.color = 'var(--text-secondary)';
        }
    }

    function recordGameResult(didPlayerWin) {
        const stats = loadStats();

        stats.gamesPlayed++;

        if (didPlayerWin) {
            stats.wins++;
            stats.currentStreak = stats.currentStreak >= 0 ? stats.currentStreak + 1 : 1;
            stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentStreak);
        } else {
            stats.losses++;
            stats.currentStreak = stats.currentStreak <= 0 ? stats.currentStreak - 1 : -1;
        }

        // Track highest round reached
        stats.highestRoundReached = Math.max(stats.highestRoundReached, gameState.roundNumber);

        saveStats(stats);
        updateStatsUI();

        logToConsole(`[Stats] Game ${stats.gamesPlayed}: ${didPlayerWin ? 'WIN' : 'LOSS'}, Streak: ${stats.currentStreak}, Win Rate: ${Math.round((stats.wins / stats.gamesPlayed) * 100)}%`);
    }

    // ========================================
    // Difficulty System (localStorage)
    // ========================================
    const DIFFICULTY_KEY = 'mexicoVsComputerDifficulty';

    function loadDifficulty() {
        try {
            const stored = localStorage.getItem(DIFFICULTY_KEY);
            if (stored && DIFFICULTY_MODIFIERS[stored]) {
                return stored;
            }
        } catch (e) {
            console.error('Failed to load difficulty:', e);
        }
        return 'medium'; // Default
    }

    function saveDifficulty(difficulty) {
        try {
            localStorage.setItem(DIFFICULTY_KEY, difficulty);
            logToConsole(`[Difficulty] Saved: ${difficulty}`);
        } catch (e) {
            console.error('Failed to save difficulty:', e);
        }
    }

    function setDifficulty(difficulty) {
        if (!DIFFICULTY_MODIFIERS[difficulty]) {
            console.error(`Invalid difficulty: ${difficulty}`);
            return;
        }

        gameState.difficulty = difficulty;
        saveDifficulty(difficulty);
        updateDifficultyUI();

        const modifier = DIFFICULTY_MODIFIERS[difficulty];
        logToConsole(`[Difficulty] Set to ${modifier.name}: ${modifier.description}`);
        logToConsole(`[Difficulty] Psychology trigger rate: ${Math.round(modifier.psychologyTriggerRate * 100)}%`);
        logToConsole(`[Difficulty] Threshold adjustment: ${Math.round(modifier.thresholdAdjustment * 100)}%`);
        logToConsole(`[Difficulty] Bluff multiplier: ${Math.round(modifier.bluffChanceMultiplier * 100)}%`);
        logToConsole(`[Difficulty] Mistake chance: ${Math.round(modifier.mistakeChance * 100)}%`);
    }

    function updateDifficultyUI() {
        const difficulty = gameState.difficulty;
        const modifier = DIFFICULTY_MODIFIERS[difficulty];

        // Update button states
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'var(--bg-secondary)';
            btn.style.color = 'var(--text-primary)';
            btn.style.border = '2px solid transparent';
        });

        // Highlight active button
        const activeBtn = elements[`difficulty${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`];
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.background = 'var(--color-gold)';
            activeBtn.style.color = '#000';
            activeBtn.style.border = '2px solid var(--color-gold)';
        }

        // Update description
        if (elements.difficultyDescription) {
            elements.difficultyDescription.textContent = modifier.description;
        }
    }

    function initDifficultyUI() {
        // Load saved difficulty
        gameState.difficulty = loadDifficulty();
        updateDifficultyUI();

        // Add event listeners
        if (elements.difficultyEasy) {
            elements.difficultyEasy.addEventListener('click', () => setDifficulty('easy'));
        }
        if (elements.difficultyMedium) {
            elements.difficultyMedium.addEventListener('click', () => setDifficulty('medium'));
        }
        if (elements.difficultyHard) {
            elements.difficultyHard.addEventListener('click', () => setDifficulty('hard'));
        }

        logToConsole(`[Difficulty] Initialized to: ${gameState.difficulty}`);
    }

    // Dice symbols
    const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    // ========================================
    // Throw History & Game Info Display
    // ========================================
    function updateThrowHistory() {
        // Always show the throw history panel (it now includes game info)
        elements.throwHistoryDisplay.classList.remove('hidden');
        const playerHistory = gameState.player.throwHistory;
        const computerHistory = gameState.computer.throwHistory;

        // Build player column
            let playerHtml = '';
            if (playerHistory.length === 0) {
                playerHtml = '<div class="text-xs opacity-50" style="color: var(--text-secondary);">Nog geen worpen</div>';
            } else {
                playerHistory.forEach((throwData, index) => {
                    // Check if this is the current throw and still blind
                    const isCurrentAndBlind = (index === playerHistory.length - 1) && throwData.isBlind && gameState.player.isBlind;

                    let displayValue, typeLabel, mexicoLabel;

                    if (isCurrentAndBlind) {
                        // Current throw is still blind - don't reveal!
                        displayValue = '???';
                        typeLabel = '🙈 Verborgen';
                        mexicoLabel = '';
                    } else {
                        // Throw has been revealed (or was open from start)
                        displayValue = throwData.displayValue;
                        typeLabel = throwData.wasBlind ? '🙈→👁️' : '👁️';
                        mexicoLabel = throwData.isMexico ? ' <span class="text-gold-light font-bold">🎉</span>' : '';
                    }

                    playerHtml += `<div class="text-xs" style="color: var(--text-primary);">
                        <span class="opacity-75">${index + 1}.</span>
                        <span class="font-bold text-gold">${displayValue}</span>
                        <span class="opacity-60 text-[0.65rem]">${typeLabel}</span>
                        ${mexicoLabel}
                    </div>`;
                });
            }

            // Build computer column
            let computerHtml = '';
            if (computerHistory.length === 0) {
                computerHtml = '<div class="text-xs opacity-50" style="color: var(--text-secondary);">Nog geen worpen</div>';
            } else {
                computerHistory.forEach((throwData, index) => {
                    // Check if this throw is still blind (not revealed yet)
                    const isStillBlind = throwData.isBlind;

                    let displayValue, typeLabel, mexicoLabel;

                    if (isStillBlind) {
                        // Computer throw is still blind - don't reveal until end of round!
                        displayValue = '???';
                        typeLabel = '🙈 Verborgen';
                        mexicoLabel = '';
                    } else {
                        // Throw has been revealed
                        displayValue = throwData.displayValue;
                        typeLabel = throwData.wasBlind ? '🙈→👁️' : '👁️';
                        mexicoLabel = throwData.isMexico ? ' <span class="text-gold-light font-bold">🎉</span>' : '';
                    }

                    computerHtml += `<div class="text-xs" style="color: var(--text-primary);">
                        <span class="opacity-75">${index + 1}.</span>
                        <span class="font-bold text-gold">${displayValue}</span>
                        <span class="opacity-60 text-[0.65rem]">${typeLabel}</span>
                        ${mexicoLabel}
                    </div>`;
                });
            }

        elements.playerThrowHistoryItems.innerHTML = playerHtml;
        elements.computerThrowHistoryItems.innerHTML = computerHtml;
    }

    // ========================================
    // Initialize Game
    // ========================================
    function init() {
        // Event Listeners
        elements.throwOpenBtn.addEventListener('click', () => handlePlayerThrow(false));
        elements.throwBlindBtn.addEventListener('click', () => handlePlayerThrow(true));
        elements.keepBtn.addEventListener('click', handlePlayerKeep);
        elements.revealBtn.addEventListener('click', handlePlayerReveal);
        elements.newGameBtn.addEventListener('click', startNewGame);

        // Easter egg keyboard cheat codes
        let typedKeys = '';
        document.addEventListener('keydown', (e) => {
            // Only track alphanumeric keys
            if (e.key.length === 1) {
                typedKeys += e.key.toLowerCase();

                // Keep only last 15 characters to check for codes
                if (typedKeys.length > 15) {
                    typedKeys = typedKeys.slice(-15);
                }

                // Check for cheat codes
                if (typedKeys.includes('resetstats')) {
                    typedKeys = ''; // Reset to prevent multiple triggers

                    // Reset all statistics
                    const defaultStats = {
                        gamesPlayed: 0,
                        wins: 0,
                        losses: 0,
                        currentStreak: 0,
                        longestWinStreak: 0,
                        highestRoundReached: 0
                    };
                    saveStats(defaultStats);
                    updateStatsUI();
                    showMessage('📊 Alle statistieken zijn gewist!', 'warning');
                    logToConsole('[CHEAT] Statistics reset via keyboard command');

                } else if (typedKeys.includes('iamking')) {
                    typedKeys = ''; // Reset to prevent multiple triggers

                    // Instant win!
                    gameState.computer.lives = 0;
                    gameState.player.lives = Math.max(1, gameState.player.lives);

                    // Update UI to show skull at computer
                    updateUI();

                    logToConsole('[CHEAT] Instant win activated via keyboard command');
                    showMessage('👑 Je bent de koning! Instant win!', 'success');

                    // Trigger game over after short delay for dramatic effect
                    setTimeout(() => {
                        handleGameOver();
                    }, 500);
                }
            }
        });

        // Load and display stats
        updateStatsUI();

        // Initialize difficulty UI
        initDifficultyUI();

        updateUI();
        enablePlayerButtons(); // Initialize button states
        showMessage('🎮 Jouw beurt! Eerste ronde is altijd blind', 'info');
        console.log('🎲 Mexico vs Computer geladen!');
    }

    // ========================================
    // Player Actions
    // ========================================
    function handlePlayerThrow(isBlind) {
        const player = gameState.player;

        // First round MUST be blind - block open throws!
        if (gameState.isFirstRound && player.throwCount === 0 && !isBlind) {
            showMessage('⚠️ Eerste ronde moet blind zijn! Klik op "Gooi Blind" 🙈', 'warning');
            logToConsole('[FOUT] Poging om open te gooien in eerste ronde geblokkeerd');
            return;
        }

        // RULE CHECK: If player is achterligger, must follow voorgooier pattern
        if (!gameState.isFirstRound && gameState.playerToGoFirst === 'computer') {
            // Player is achterligger - check if pattern dictates this throw
            const throwIndex = player.throwCount; // About to throw this number (0-indexed in array)
            if (throwIndex < gameState.voorgooierPattern.length) {
                // Voorgooier made this throw - must match pattern
                const mustBeBlind = gameState.voorgooierPattern[throwIndex];
                if (isBlind !== mustBeBlind) {
                    const expectedType = mustBeBlind ? 'BLIND' : 'OPEN';
                    const attemptedType = isBlind ? 'blind' : 'open';
                    showMessage(`⚠️ Je moet ${expectedType} gooien op worp ${throwIndex + 1} (voorgooier patroon)!`, 'warning');
                    logToConsole(`[FOUT] Speler probeerde ${attemptedType} te gooien, maar moet ${expectedType} (voorgooier patroon)`);
                    return;
                }
                logToConsole(`[REGEL] Speler gooit ${isBlind ? 'BLIND' : 'OPEN'} op worp ${throwIndex + 1} (volgt voorgooier patroon)`);
            }
        }

        // Check if max throws reached (set by voorgooier)
        if (player.throwCount >= gameState.maxThrows) {
            showMessage('⚠️ Maximum worpen bereikt (voorgooier limiet)!', 'warning');
            return;
        }

        // Force blind on first round (backup check)
        if (gameState.isFirstRound && player.throwCount === 0) {
            isBlind = true;
        }

        player.isBlind = isBlind;
        player.throwCount++;

        // Track if player threw any blind throws this round
        if (isBlind) {
            player.threwBlindThisRound = true;
        }

        // If player is voorgooier, record pattern
        if (gameState.playerToGoFirst === 'player' && !gameState.isFirstRound) {
            gameState.voorgooierPattern.push(isBlind);
            logToConsole(`[Speler] Worp ${player.throwCount} - ${isBlind ? 'BLIND' : 'OPEN'} (voorgooier patroon: ${gameState.voorgooierPattern.length} worpen)`);
        } else {
            logToConsole(`[Speler] Worp ${player.throwCount} - ${isBlind ? 'BLIND' : 'OPEN'}`);
        }

        throwDice('player', isBlind);
    }

    function handlePlayerKeep() {
        // Player is done throwing, compare with computer
        const player = gameState.player;
        const computer = gameState.computer;
        const displayValue = player.displayThrow || player.currentThrow;

        // If player is voorgooier, set the max throws for this round
        if (gameState.playerToGoFirst === 'player' && !gameState.isFirstRound) {
            gameState.maxThrows = player.throwCount;
            // Voorgooier pattern is now complete - log it
            const patternStr = gameState.voorgooierPattern.map((isBlind, i) =>
                `Worp ${i+1}: ${isBlind ? '🙈 Blind' : '👁️ Open'}`
            ).join(', ');
            logToConsole(`[Speler] VOORGOOIER - Worplimiet: ${gameState.maxThrows}`);
            logToConsole(`[VOORGOOIER PATROON] ${patternStr}`);
            logToConsole(`[REGEL] Computer moet dit patroon volgen`);
        }

        logToConsole(`[Speler] LATEN STAAN - Eindworp: ${displayValue} (na ${player.throwCount} worpen)`);

        // Check if computer has already thrown (when computer was voorgooier)
        if (computer.currentThrow !== null) {
            // Computer already threw, compare immediately
            showMessage('Je hebt je worp vastgezet! Vergelijken...', 'info');
            disablePlayerButtons();
            setTimeout(() => {
                compareResults();
            }, 1000);
        } else {
            // Computer hasn't thrown yet, it's their turn
            showMessage('Je hebt je worp vastgezet! Computer is aan de beurt...', 'info');
            disablePlayerButtons();
            setTimeout(() => {
                // First round: always use special first round logic
                if (gameState.isFirstRound) {
                    computerFirstRoundTurn();
                } else {
                    computerTurn();
                }
            }, 1000);
        }
    }

    function handlePlayerReveal() {
        const player = gameState.player;
        player.isBlind = false;

        // Update throw history to mark current throw as revealed
        if (player.throwHistory.length > 0) {
            const lastThrow = player.throwHistory[player.throwHistory.length - 1];
            lastThrow.isBlind = false; // Mark as revealed
        }

        // Reveal dice
        elements.playerDice1.classList.remove('hidden');
        elements.playerDice2.classList.remove('hidden');
        // Flip cup back to normal position
        elements.playerDiceCup.classList.remove('flipped');

        updateThrowDisplay();

        const displayValue = player.displayThrow || player.currentThrow;
        logToConsole(`[Speler] ONTHUL - Resultaat: ${displayValue}${player.isMexico ? ' (MEXICO!)' : ''}`);

        // Check if Mexico
        if (player.isMexico) {
            celebrateMexico();
        }

        // Special handling for first round
        if (gameState.isFirstRound) {
            showMessage(`Je gooide ${displayValue}! Computer is aan de beurt...`, 'info');
            disablePlayerButtons();

            // Computer's turn in first round
            setTimeout(() => {
                computerFirstRoundTurn();
            }, 1000);
        } else {
            // Normal game flow
            showMessage(`Je gooide ${displayValue}!`, 'success');

            // SPECIAL RULE: First blind throw of round = direct to result choice
            if (player.throwCount === 1) {
                logToConsole(`[REGEL] Eerste blinde worp van ronde - direct naar resultaat keuze`);
                showMessage(`Eerste blinde worp - kies het resultaat`, 'info');
                disablePlayerButtons();

                // Auto-keep after short delay (goes to result screen)
                setTimeout(() => {
                    handlePlayerKeep();
                }, 1200);
            }
            // Check if player has reached max throws (set by voorgooier)
            else if (player.throwCount >= gameState.maxThrows) {
                // Forced keep - no choice
                logToConsole(`[Speler] AUTOMATISCH VASTGEZET - Worplimiet bereikt (${gameState.maxThrows})`);
                showMessage(`Je gooide ${displayValue}! Worp automatisch vastgezet (limiet: ${gameState.maxThrows})`, 'info');
                disablePlayerButtons();

                // Auto-keep after short delay
                setTimeout(() => {
                    handlePlayerKeep();
                }, 1200);
            } else {
                // Show keep button after reveal (worp 2 or 3)
                elements.revealBtn.classList.add('hidden');
                elements.keepBtn.classList.remove('hidden');
                elements.keepBtn.disabled = false;

                // Can still throw again if under max throws
                // First round check: only show blind button
                if (gameState.isFirstRound && gameState.player.throwCount === 0) {
                    elements.throwOpenBtn.classList.add('hidden');
                } else {
                    elements.throwOpenBtn.classList.remove('hidden');
                }
                elements.throwBlindBtn.classList.remove('hidden');
            }
        }
    }

    // ========================================
    // Computer AI Turn
    // ========================================
    function computerTurn() {
        const computer = gameState.computer;
        const player = gameState.player;

        showMessage('🤖 Computer denkt na...', 'info');

        // Simulate human-like thinking time (varied)
        const thinkingTime = 800 + Math.random() * 700; // 800-1500ms

        setTimeout(() => {
            computerThrowSequence();
        }, thinkingTime);
    }

    function computerFirstRoundTurn() {
        const computer = gameState.computer;

        showMessage('🤖 Computer gooit blind...', 'info');
        logToConsole(`[Computer] Worp 1 - BLIND`);

        // Computer throws exactly once, blind
        computer.throwCount++;
        throwDice('computer', true);

        // After throw animation, DON'T reveal yet - wait for comparison
        setTimeout(() => {
            // Don't reveal yet - both throws revealed at same time in compareFirstRoundResults
            logToConsole(`[Computer] Worp voltooid - blijft verborgen tot vergelijking${computer.isMexico ? ' (MEXICO!)' : ''}`);

            // Blind Mexico also stays hidden until reveal
            showMessage(`🤖 Computer heeft gegooid! Vergelijken...`, 'info');

            // Compare results after shorter delay
            setTimeout(() => {
                compareFirstRoundResults();
            }, 1500);
        }, 1000);
    }

    function computerThrowSequence() {
        const computer = gameState.computer;
        const player = gameState.player;

        // FIRST ROUND: Only 1 blind throw allowed!
        if (gameState.isFirstRound) {
            logToConsole(`[Computer] EERSTE RONDE - Mag maar 1x gooien (al gegooid)`);
            const displayValue = computer.displayThrow || computer.currentThrow;
            logToConsole(`[Computer] LATEN STAAN - Eindworp: ${displayValue} (na 1 worp, eerste ronde)`);
            setTimeout(() => {
                compareFirstRoundResults();
            }, 1000);
            return;
        }

        // Check if computer reached max throws (set by voorgooier)
        if (computer.throwCount >= gameState.maxThrows) {
            // Computer is done
            const displayValue = computer.isBlind ? '???' : (computer.displayThrow || computer.currentThrow);
            logToConsole(`[Computer] AUTOMATISCH VASTGEZET - Eindworp: ${computer.isBlind ? '???' : (computer.displayThrow || computer.currentThrow)} (limiet ${gameState.maxThrows} bereikt)`);

            // Check if player has thrown yet
            if (player.currentThrow === null) {
                // Player hasn't thrown yet, it's their turn now
                showMessage(`🤖 Computer gooide ${displayValue}! Automatisch vastgezet (limiet: ${gameState.maxThrows}).<br>Jouw beurt!`, 'info');
                enablePlayerButtons();
            } else {
                // Both have thrown, compare results
                showMessage(`🤖 Computer gooide ${displayValue}! Automatisch vastgezet (limiet: ${gameState.maxThrows}).`, 'info');
                setTimeout(() => {
                    compareResults();
                }, 1000);
            }
            return;
        }

        // Decide if next throw should be blind
        let isBlind = false;

        // RULE CHECK: If computer is achterligger, must follow voorgooier pattern
        if (!gameState.isFirstRound && gameState.playerToGoFirst === 'player') {
            // Computer is achterligger - check if pattern dictates this throw
            const throwIndex = computer.throwCount; // About to throw this number (0-indexed in array)
            if (throwIndex < gameState.voorgooierPattern.length) {
                // Voorgooier made this throw - must match pattern
                const mustBeBlind = gameState.voorgooierPattern[throwIndex];
                isBlind = mustBeBlind;
                logToConsole(`[REGEL] Computer MOET ${mustBeBlind ? 'BLIND' : 'OPEN'} gooien op worp ${throwIndex + 1} (voorgooier patroon)`);
            } else {
                // Voorgooier didn't reach this throw - computer can choose
                // Strategy: On 2nd throw with low value (<54), go blind on 3rd throw
                if (computer.throwCount === 2 && computer.currentThrow < 54 && gameState.maxThrows >= 3) {
                    isBlind = true;
                    logToConsole(`[Computer] Besluit: LAATSTE WORP BLIND GOOIEN (huidige worp te laag: ${computer.displayThrow || computer.currentThrow})`);
                }
            }
        } else if (!gameState.isFirstRound && gameState.playerToGoFirst === 'computer') {
            // Computer is voorgooier - free to choose
            // Strategy: On 2nd throw with low value (<54), go blind on 3rd throw
            if (computer.throwCount === 2 && computer.currentThrow < 54 && gameState.maxThrows >= 3) {
                isBlind = true;
                logToConsole(`[Computer] Besluit: LAATSTE WORP BLIND GOOIEN (huidige worp te laag: ${computer.displayThrow || computer.currentThrow})`);
            }
        }

        // Subsequent throws: smart AI decisions
        if (!isBlind && computer.throwCount > 0) {
            // AI decision logic
            const shouldThrowAgain = computerShouldThrowAgain();
            if (!shouldThrowAgain) {
                // Computer keeps current throw
                const displayValue = computer.displayThrow || computer.currentThrow;

                // If computer is voorgooier, set the max throws
                if (gameState.playerToGoFirst === 'computer' && !gameState.isFirstRound) {
                    gameState.maxThrows = computer.throwCount;
                    // Voorgooier pattern is now complete - log it
                    const patternStr = gameState.voorgooierPattern.map((isBlind, i) =>
                        `Worp ${i+1}: ${isBlind ? '🙈 Blind' : '👁️ Open'}`
                    ).join(', ');
                    logToConsole(`[Computer] VOORGOOIER - Worplimiet: ${gameState.maxThrows}`);
                    logToConsole(`[VOORGOOIER PATROON] ${patternStr}`);
                    logToConsole(`[REGEL] Speler moet dit patroon volgen`);
                }

                logToConsole(`[Computer] LATEN STAAN - Eindworp: ${displayValue} (na ${computer.throwCount} worpen)`);

                // Check if player has thrown yet
                if (player.currentThrow === null) {
                    // Player hasn't thrown yet, it's their turn now
                    showMessage(`🤖 Computer houdt ${displayValue}! Jouw beurt!`, 'info');
                    enablePlayerButtons();
                } else {
                    // Both have thrown, compare results
                    showMessage(`🤖 Computer houdt ${displayValue}!`, 'info');
                    setTimeout(() => {
                        compareResults();
                    }, 1000);
                }
                return;
            } else {
                logToConsole(`[Computer] Besluit: NOG EEN KEER GOOIEN`);
            }
        }

        // Computer throws
        computer.throwCount++;

        // Track if computer threw any blind throws this round
        if (isBlind) {
            computer.threwBlindThisRound = true;
        }

        // If computer is voorgooier, record pattern
        if (gameState.playerToGoFirst === 'computer' && !gameState.isFirstRound) {
            gameState.voorgooierPattern.push(isBlind);
            logToConsole(`[Computer] Worp ${computer.throwCount} - ${isBlind ? 'BLIND' : 'OPEN'} (voorgooier patroon: ${gameState.voorgooierPattern.length} worpen)`);
        } else {
            logToConsole(`[Computer] Worp ${computer.throwCount} - ${isBlind ? 'BLIND' : 'OPEN'}`);
        }

        throwDice('computer', isBlind);

        // After throw, decide next action
        setTimeout(() => {
            const displayValue = computer.displayThrow || computer.currentThrow;

            if (computer.isBlind) {
                // Check if this is the last throw - if so, keep it hidden for comparison
                const isLastThrow = computer.throwCount >= gameState.maxThrows;

                if (isLastThrow) {
                    // Last throw stays blind until comparison
                    logToConsole(`[Computer] Worp ${computer.throwCount} voltooid - blijft verborgen (laatste worp)`);

                    // Track throw for psychology (without revealing)
                    updatePsychologyAfterThrow(computer.currentThrow);

                    // Continue to next phase (will hit maxThrows check)
                    setTimeout(() => {
                        computerThrowSequence();
                    }, 1000);
                } else {
                    // Not the last throw - reveal it
                    computer.isBlind = false;
                    elements.computerDice1.classList.remove('hidden');
                    elements.computerDice2.classList.remove('hidden');
                    // Flip cup back to normal position
                    elements.computerDiceCup.classList.remove('flipped');
                    updateThrowDisplay();

                    logToConsole(`[Computer] ONTHUL - Resultaat: ${displayValue}${computer.isMexico ? ' (MEXICO!)' : ''}`);

                    // Track throw for psychology
                    updatePsychologyAfterThrow(computer.currentThrow);

                    if (computer.isMexico) {
                        celebrateMexico();
                    }

                    showMessage(`🤖 Computer gooide ${displayValue}!`, 'info');

                    // Continue sequence
                    setTimeout(() => {
                        computerThrowSequence();
                    }, 1500);
                }
            } else {
                // Open throw, continue sequence
                logToConsole(`[Computer] Resultaat: ${displayValue}${computer.isMexico ? ' (MEXICO!)' : ''}`);

                // Track throw for psychology
                updatePsychologyAfterThrow(computer.currentThrow);

                showMessage(`🤖 Computer gooide ${displayValue}!`, 'info');
                setTimeout(() => {
                    computerThrowSequence();
                }, 1500);
            }
        }, 1000);
    }

    // ========================================
    // AI Psychology Functions (8 Principles)
    // ========================================

    // 1. Loss Aversion: Extra voorzichtig als winnend
    function applyLossAversion(threshold) {
        const psych = gameState.aiPsychology;
        const computer = gameState.computer;
        const player = gameState.player;
        const difficulty = DIFFICULTY_MODIFIERS[gameState.difficulty];

        psych.livesAdvantage = computer.lives - player.lives;
        psych.isWinning = psych.livesAdvantage > 0;

        if (psych.isWinning) {
            // Trigger rate based on difficulty (easy: 50%, medium: 80%, hard: 95%)
            if (Math.random() < difficulty.psychologyTriggerRate) {
                // Loss aversion: 2.5x sterker gewicht aan verliezen
                // Als je wint, wil je NIET verliezen → verhoog threshold (voorzichtiger)
                const baseAdjustment = Math.min(psych.livesAdvantage * 3, 10);
                // Variatie: ±20% rondom base adjustment
                const rawAdjustment = baseAdjustment * (0.8 + Math.random() * 0.4);
                // Apply difficulty modifier
                const adjustment = Math.round(rawAdjustment * difficulty.thresholdAdjustment);
                logToConsole(`[Psychology] Loss Aversion TRIGGERED: +${adjustment} voorzichtiger (${psych.livesAdvantage} punten voorsprong)`);
                return threshold + adjustment;
            } else {
                logToConsole(`[Psychology] Loss Aversion possible but NOT triggered (${Math.round((1 - difficulty.psychologyTriggerRate) * 100)}% kans)`);
            }
        }

        return threshold;
    }

    // 2. Tilt Mechanics: Emotioneel na herhaalde verliezen
    function applyTiltMechanics(threshold, bluffChance) {
        const psych = gameState.aiPsychology;

        // Tilt levels: 0=none, 1=mild (2 losses), 2=moderate (3 losses), 3=severe (4+ losses)
        if (psych.consecutiveLosses >= 4) {
            psych.tiltLevel = 3;
        } else if (psych.consecutiveLosses >= 3) {
            psych.tiltLevel = 2;
        } else if (psych.consecutiveLosses >= 2) {
            psych.tiltLevel = 1;
        } else {
            psych.tiltLevel = 0;
        }

        // Tilt decay: herstel na 2-4 rondes zonder loss
        if (psych.roundsSinceLoss >= 3) {
            psych.tiltLevel = Math.max(0, psych.tiltLevel - 1);
        }

        if (psych.tiltLevel > 0) {
            // Tijdens tilt: agressiever (lager threshold) + meer bluffen
            const thresholdReduction = psych.tiltLevel * 5; // 5/10/15 punten agressiever
            const bluffIncrease = psych.tiltLevel * 0.15; // +15%/+30%/+45% bluff rate

            logToConsole(`[Psychology] TILT Level ${psych.tiltLevel}: -${thresholdReduction} threshold, +${Math.round(bluffIncrease * 100)}% bluff`);

            return {
                threshold: threshold - thresholdReduction,
                bluffChance: Math.min(bluffChance + bluffIncrease, 0.6) // Max 60% bluff
            };
        }

        return { threshold, bluffChance };
    }

    // 3. Gambler's Fallacy: "Ik heb 5x slecht gegooid, nu moet ik wel goed gooien"
    function applyGamblersFallacy(threshold) {
        const psych = gameState.aiPsychology;

        // Count recent bad throws (< 40)
        if (psych.recentBadThrows >= 3) {
            // 65% kans om te triggeren (veel mensen hebben dit, maar niet iedereen)
            if (Math.random() < 0.65) {
                // Na 3+ slechte worpen: denk dat je nu wel goed MOET gooien
                // → lager threshold (agressiever, want "nu ga ik vast goed gooien")
                const baseAdjustment = Math.min(psych.recentBadThrows * 3, 12);
                // Variatie: ±30% (meer variatie want irrationele bias)
                const adjustment = Math.round(baseAdjustment * (0.7 + Math.random() * 0.6));
                logToConsole(`[Psychology] Gambler's Fallacy TRIGGERED: -${adjustment} (${psych.recentBadThrows} slechte worpen, "nu moet het wel goed gaan")`);
                return threshold - adjustment;
            } else {
                logToConsole(`[Psychology] Gambler's Fallacy possible (${psych.recentBadThrows} bad throws) but NOT triggered`);
            }
        }

        return threshold;
    }

    // 4. Hot Hand Fallacy: "Ik ben on fire, dit gaat gewoon door"
    function applyHotHandFallacy(threshold) {
        const psych = gameState.aiPsychology;

        if (psych.consecutiveGoodThrows >= 3) {
            // 70% kans om te triggeren
            if (Math.random() < 0.70) {
                // Na 3+ goede worpen: denk dat je "on fire" bent
                // → lager threshold (agressiever, want "ik gooi toch wel goed")
                const baseAdjustment = Math.min(psych.consecutiveGoodThrows * 2, 10);
                // Variatie: ±25%
                const adjustment = Math.round(baseAdjustment * (0.75 + Math.random() * 0.5));
                logToConsole(`[Psychology] Hot Hand Fallacy TRIGGERED: -${adjustment} (${psych.consecutiveGoodThrows} goede worpen, "I'm on fire!")`);
                return threshold - adjustment;
            } else {
                logToConsole(`[Psychology] Hot Hand possible (${psych.consecutiveGoodThrows} good throws) but NOT triggered`);
            }
        }

        return threshold;
    }

    // 5. Recency Bias: Laatste events wegen zwaarder
    function applyRecencyBias(threshold) {
        const psych = gameState.aiPsychology;

        if (psych.lastRoundOutcome === 'loss' && psych.lastThrowQuality < 50) {
            // 75% kans (recente events zijn sterk maar niet altijd dominant)
            if (Math.random() < 0.75) {
                // Laatste ronde verloren met slechte worp → extra voorzichtig
                const adjustment = 3 + Math.round(Math.random() * 4); // 3-7 voorzichtiger
                logToConsole(`[Psychology] Recency Bias TRIGGERED: +${adjustment} voorzichtiger (laatste ronde slecht verloren)`);
                return threshold + adjustment;
            }
        } else if (psych.lastRoundOutcome === 'win' && psych.lastThrowQuality > 70) {
            // 75% kans
            if (Math.random() < 0.75) {
                // Laatste ronde gewonnen met goede worp → meer vertrouwen
                const adjustment = 3 + Math.round(Math.random() * 3); // 3-6 agressiever
                logToConsole(`[Psychology] Recency Bias TRIGGERED: -${adjustment} agressiever (laatste ronde goed gewonnen)`);
                return threshold - adjustment;
            }
        }

        return threshold;
    }

    // 6. Anchoring Effect: Eerste worp beïnvloedt beslissingen
    function applyAnchoringEffect(threshold, currentThrow) {
        const psych = gameState.aiPsychology;

        if (psych.firstThrowOfRound && currentThrow) {
            const firstThrowQuality = calculateThrowQuality(psych.firstThrowOfRound);

            // 60% kans (anchoring is subtiel)
            if (Math.random() < 0.60) {
                if (firstThrowQuality > 70) {
                    // Eerste worp was goed → verhoogde verwachtingen
                    const adjustment = 2 + Math.round(Math.random() * 3); // 2-5
                    logToConsole(`[Psychology] Anchoring TRIGGERED: +${adjustment} (eerste worp ${psych.firstThrowOfRound} was goed, hogere verwachtingen)`);
                    return threshold + adjustment;
                } else if (firstThrowQuality < 40) {
                    // Eerste worp was slecht → verlaagde verwachtingen
                    const adjustment = 2 + Math.round(Math.random() * 3); // 2-5
                    logToConsole(`[Psychology] Anchoring TRIGGERED: -${adjustment} (eerste worp ${psych.firstThrowOfRound} was slecht, lagere verwachtingen)`);
                    return threshold - adjustment;
                }
            }
        }

        return threshold;
    }

    // 7. Overconfidence Bias: Overschat kansen na wins
    function applyOverconfidenceBias(threshold) {
        const psych = gameState.aiPsychology;

        if (psych.recentWins >= 2) {
            // 70% kans (niet iedereen wordt overconfident)
            if (Math.random() < 0.70) {
                // Na 2+ wins in laatste 3 rondes: overconfident
                psych.confidenceMultiplier = 1.0 + (psych.recentWins * 0.08 * (0.8 + Math.random() * 0.4)); // 6-12% per win
                const adjustment = Math.round(threshold * (psych.confidenceMultiplier - 1.0));

                logToConsole(`[Psychology] Overconfidence TRIGGERED: -${adjustment} (${psych.recentWins} recente wins, ${Math.round((psych.confidenceMultiplier - 1) * 100)}% overconfident)`);
                return threshold - adjustment;
            } else {
                logToConsole(`[Psychology] Overconfidence possible (${psych.recentWins} wins) but NOT triggered`);
            }
        }

        psych.confidenceMultiplier = 1.0;
        return threshold;
    }

    // 8. Satisficing: "Good enough" in plaats van optimaal
    function applySatisficing(currentThrow, threshold) {
        const psych = gameState.aiPsychology;
        const throwQuality = calculateThrowQuality(currentThrow);

        // Als worp >= 65% quality EN niet te agressief → "good enough"
        if (throwQuality >= psych.satisficingThreshold && throwQuality < 0.9) {
            const rand = Math.random();
            // 40% kans om te stoppen bij "good enough"
            if (rand < 0.4) {
                logToConsole(`[Psychology] Satisficing: Stop bij ${currentThrow} (${Math.round(throwQuality * 100)}% quality = "good enough")`);
                return true; // Signal to stop
            }
        }

        return false; // No satisficing, continue normal logic
    }

    // Helper: Calculate throw quality (0-1 scale)
    function calculateThrowQuality(throwValue) {
        if (throwValue === 1000) return 1.0; // Mexico = 100%
        if (throwValue >= 600) return 0.95; // High doubles
        if (throwValue >= 500) return 0.85;
        if (throwValue >= 400) return 0.75;
        if (throwValue >= 300) return 0.65;
        if (throwValue >= 200) return 0.55;
        if (throwValue >= 65) return 0.50; // Top normal throws
        if (throwValue >= 54) return 0.40;
        if (throwValue >= 43) return 0.30;
        if (throwValue >= 32) return 0.20;
        return 0.10; // Bad throws
    }

    // Update psychology state after computer throw
    function updatePsychologyAfterThrow(throwValue) {
        const psych = gameState.aiPsychology;
        const quality = calculateThrowQuality(throwValue);

        // Track first throw of round (anchoring)
        if (!psych.firstThrowOfRound) {
            psych.firstThrowOfRound = throwValue;
        }

        // Update throw history (last 5 throws) for Gambler's Fallacy
        psych.recentThrowHistory.push(throwValue);
        if (psych.recentThrowHistory.length > 5) {
            psych.recentThrowHistory.shift();
        }

        // Count bad throws in history
        psych.recentBadThrows = psych.recentThrowHistory.filter(t => calculateThrowQuality(t) < 0.4).length;

        // Track consecutive good throws (Hot Hand)
        if (quality > 0.5) {
            psych.consecutiveGoodThrows++;
        } else {
            psych.consecutiveGoodThrows = 0;
        }

        // Store last throw quality (Recency Bias)
        psych.lastThrowQuality = quality * 100;

        logToConsole(`[Psychology] Throw tracked: quality=${Math.round(quality * 100)}%, bad throws in history=${psych.recentBadThrows}, good streak=${psych.consecutiveGoodThrows}`);
    }

    // Update psychology state after round ends
    function updatePsychologyAfterRound(didComputerWin) {
        const psych = gameState.aiPsychology;

        // Reset round-specific tracking
        psych.firstThrowOfRound = null;

        // Update win/loss tracking
        if (didComputerWin) {
            psych.lastRoundOutcome = 'win';
            psych.consecutiveLosses = 0;
            psych.roundsSinceLoss++;
            psych.recentWins = Math.min(psych.recentWins + 1, 3);

            logToConsole(`[Psychology] Round won! Consecutive losses reset, recent wins: ${psych.recentWins}`);
        } else {
            psych.lastRoundOutcome = 'loss';
            psych.consecutiveLosses++;
            psych.roundsSinceLoss = 0;
            psych.recentWins = Math.max(psych.recentWins - 1, 0);

            logToConsole(`[Psychology] Round lost! Consecutive losses: ${psych.consecutiveLosses}, tilt incoming...`);
        }
    }

    // ========================================
    // AI Personality System
    // ========================================
    function selectAIPersonality() {
        const rand = Math.random();

        // 30% Scared, 50% Rational, 20% Aggressive
        if (rand < 0.30) {
            return AI_PERSONALITIES.SCARED;
        } else if (rand < 0.80) {
            return AI_PERSONALITIES.RATIONAL;
        } else {
            return AI_PERSONALITIES.AGGRESSIVE;
        }
    }

    function computerShouldThrowAgain() {
        const computer = gameState.computer;
        const player = gameState.player;

        // If Mexico, never throw again
        if (computer.currentThrow === 1000) {
            return false;
        }

        // If computer has no throw yet, always throw
        if (!computer.currentThrow) {
            return true;
        }

        // DESPERATE SITUATION: If player has Mexico and computer has lower score
        // Computer MUST keep throwing - only chance is to also get Mexico
        if (player.currentThrow === 1000 && computer.currentThrow < 1000) {
            // Check if computer has throws left
            if (computer.throwCount < gameState.maxThrows) {
                logToConsole(`[AI DESPERATE] Speler heeft Mexico! Huidige score ${computer.displayThrow || computer.currentThrow} verliest 100%. DOORGOOIEN voor Mexico kans!`);
                return true;
            }
        }

        // Select or keep personality for this round
        if (!gameState.aiPersonality) {
            gameState.aiPersonality = selectAIPersonality();
            logToConsole(`[AI Personality] Computer speelt deze ronde: ${gameState.aiPersonality.name}`);
            logToConsole(`[AI Info] ${gameState.aiPersonality.description}`);
        }

        const personality = gameState.aiPersonality;
        const difficulty = DIFFICULTY_MODIFIERS[gameState.difficulty];
        let bluffChance = personality.bluffChance * difficulty.bluffChanceMultiplier;

        // RISK ANALYSIS: Check if next throw would be blind (forced by pattern)
        const nextThrowIndex = computer.throwCount; // Next throw (0-indexed)
        let nextThrowMustBeBlind = false;
        if (!gameState.isFirstRound && gameState.playerToGoFirst === 'player') {
            // Computer is achterligger - check if next throw must be blind
            if (nextThrowIndex < gameState.voorgooierPattern.length) {
                nextThrowMustBeBlind = gameState.voorgooierPattern[nextThrowIndex];
            }
        }

        // ========================================
        // APPLY 8 PSYCHOLOGICAL PRINCIPLES
        // ========================================
        logToConsole(`\n[Psychology] === Applying 8 Psychological Principles ===`);

        // Get base threshold from personality for current throw count
        let threshold = personality.thresholds[computer.throwCount] || 61;
        logToConsole(`[AI ${personality.name}] Basis threshold voor worp ${computer.throwCount}: ${threshold}`);

        // 8. Satisficing: Check first (can short-circuit decision)
        if (applySatisficing(computer.currentThrow, threshold)) {
            return false; // Stop at "good enough"
        }

        // Apply all other psychological principles
        threshold = applyLossAversion(threshold);
        const tiltResult = applyTiltMechanics(threshold, bluffChance);
        threshold = tiltResult.threshold;
        bluffChance = tiltResult.bluffChance;
        threshold = applyGamblersFallacy(threshold);
        threshold = applyHotHandFallacy(threshold);
        threshold = applyRecencyBias(threshold);
        threshold = applyAnchoringEffect(threshold, computer.currentThrow);
        threshold = applyOverconfidenceBias(threshold);

        logToConsole(`[Psychology] Final threshold after all adjustments: ${threshold}`);
        logToConsole(`[Psychology] =======================================\n`);

        // BLUFF OPTION: Sometimes stop at mediocre scores to bluff (affected by Tilt)
        if (Math.random() < bluffChance) {
            if (computer.currentThrow >= 43 && computer.currentThrow <= 62) {
                logToConsole(`[AI BLUF] Stop bij ${computer.displayThrow || computer.currentThrow} - probeer te bluffen (${Math.round(bluffChance * 100)}% kans)`);
                return false;
            }
        }

        // PSYCHOLOGY: Analyze player behavior (old logic, kept for compatibility)
        if (player.currentThrow !== null && player.isBlind && player.throwCount >= 2) {
            // Player threw multiple times then blind = probably low
            // Computer can be more aggressive (lower threshold)
            const adjustment = personality.psychologyFactor;
            if (adjustment > 0) {
                const oldThreshold = threshold;
                threshold = Math.max(threshold - adjustment, 43);
                logToConsole(`[AI Psychologie] Speler gooide ${player.throwCount}× en toen blind - waarschijnlijk LAAG`);
                logToConsole(`[AI Psychologie] Threshold aangepast: ${oldThreshold} → ${threshold} (${adjustment} punten agressiever)`);
            }
        }

        // EXTRA CAUTION: If next throw MUST be blind, be more careful
        if (nextThrowMustBeBlind && computer.currentThrow >= 200) {
            // High doubles + forced blind next = ALWAYS stop
            logToConsole(`[AI Voorzichtig] Hoge score (${computer.displayThrow}) + volgende worp MOET blind = STOPPEN`);
            return false;
        }

        if (nextThrowMustBeBlind) {
            // Add ~10 points to threshold (be more careful)
            const oldThreshold = threshold;
            threshold = Math.min(threshold + 10, 65);
            logToConsole(`[AI Voorzichtig] Volgende worp MOET blind - threshold verhoogd: ${oldThreshold} → ${threshold}`);
        }

        // Clamp threshold to reasonable bounds (31-66)
        threshold = Math.max(31, Math.min(threshold, 66));

        // DECISION: Compare current score with threshold
        const currentScore = computer.currentThrow;
        const displayValue = computer.displayThrow || currentScore;

        if (currentScore >= threshold) {
            logToConsole(`[AI ${personality.name}] Score ${displayValue} >= threshold ${threshold} → STOP`);
            return false;
        } else {
            logToConsole(`[AI ${personality.name}] Score ${displayValue} < threshold ${threshold} → GOOI DOOR`);
            return true;
        }
    }

    // ========================================
    // Dice Throwing
    // ========================================
    function throwDice(who, isBlind) {
        const actor = gameState[who];

        // Get the right dice elements based on who is throwing
        const dice1 = who === 'player' ? elements.playerDice1 : elements.computerDice1;
        const dice2 = who === 'player' ? elements.playerDice2 : elements.computerDice2;
        const diceCup = who === 'player' ? elements.playerDiceCup : elements.computerDiceCup;

        // Animate dice cup
        diceCup.classList.add('shaking');
        setTimeout(() => {
            diceCup.classList.remove('shaking');
        }, 500);

        // Roll animation
        dice1.classList.add('rolling');
        dice2.classList.add('rolling');

        // Random rolling effect
        let rollCount = 0;
        const rollInterval = setInterval(() => {
            const rand1 = Math.floor(Math.random() * 6) + 1;
            const rand2 = Math.floor(Math.random() * 6) + 1;
            dice1.textContent = diceSymbols[rand1 - 1];
            dice2.textContent = diceSymbols[rand2 - 1];
            rollCount++;

            if (rollCount >= 10) {
                clearInterval(rollInterval);
                finishThrow(who, isBlind);
            }
        }, 50);
    }

    function finishThrow(who, isBlind) {
        const actor = gameState[who];

        // Get the right dice elements based on who is throwing
        const dice1 = who === 'player' ? elements.playerDice1 : elements.computerDice1;
        const dice2 = who === 'player' ? elements.playerDice2 : elements.computerDice2;
        const diceCup = who === 'player' ? elements.playerDiceCup : elements.computerDiceCup;

        // Generate final dice values
        actor.dice1 = Math.floor(Math.random() * 6) + 1;
        actor.dice2 = Math.floor(Math.random() * 6) + 1;

        // 🎰 EASTER EGG: Lucky Mode - 70% extra chance for Mexico when player throws
        if (who === 'player' && typeof window.luckyModeActive !== 'undefined' && window.luckyModeActive) {
            // 70% chance to force Mexico (on top of normal 1/36 chance)
            if (Math.random() < 0.7) {
                actor.dice1 = 2;
                actor.dice2 = 1;
                logToConsole(`🎰 [LUCKY MODE] Mexico geforceerd!`);
            }
        }

        // Calculate throw value
        const higher = Math.max(actor.dice1, actor.dice2);
        const lower = Math.min(actor.dice1, actor.dice2);

        let throwValue;
        let displayValue;
        if ((higher === 2 && lower === 1) || (higher === 1 && lower === 2)) {
            // Mexico! - Highest possible throw
            throwValue = 1000; // Internal value for comparison (always wins)
            displayValue = 21; // Display value
            actor.isMexico = true;
            gameState.mexicoCount++; // Count Mexico for penalty calculation
            logToConsole(`[MEXICO TELLER] ${gameState.mexicoCount} Mexico(s) deze ronde`);
        } else if (higher === lower) {
            // Doubles as hundreds (66 = 600, 55 = 500, etc.)
            throwValue = higher * 100;
            displayValue = throwValue;
            actor.isMexico = false;
        } else {
            // Regular throw (highest first)
            throwValue = higher * 10 + lower;
            displayValue = throwValue;
            actor.isMexico = false;
        }

        actor.currentThrow = throwValue;
        actor.displayThrow = displayValue;

        // Track throw history for both players
        if (who === 'player') {
            gameState.player.throwHistory.push({
                value: throwValue,
                displayValue: displayValue,
                isBlind: isBlind,
                wasBlind: isBlind, // Track original blind state
                isMexico: actor.isMexico
            });
            logToConsole(`[Throw History] Player throw #${gameState.player.throwHistory.length}: ${isBlind ? '??? (Blind - verborgen)' : displayValue + ' (Open)'}`);
        } else if (who === 'computer') {
            gameState.computer.throwHistory.push({
                value: throwValue,
                displayValue: displayValue,
                isBlind: isBlind,
                wasBlind: isBlind, // Track original blind state
                isMexico: actor.isMexico
            });
            logToConsole(`[Throw History] Computer throw #${gameState.computer.throwHistory.length}: ${isBlind ? '??? (Blind - verborgen)' : displayValue + ' (Open)'}`);
        }

        // IMPORTANT: Hide dice BEFORE updating display if blind (INCLUDING Mexico!)
        // This prevents the value from flashing briefly
        if (isBlind) {
            dice1.classList.add('hidden');
            dice2.classList.add('hidden');
            // Flip the cup upside down to show it's hidden
            diceCup.classList.add('flipped');
        } else {
            // Ensure dice are visible for open throws
            dice1.classList.remove('hidden');
            dice2.classList.remove('hidden');
            // Make sure cup is right-side up
            diceCup.classList.remove('flipped');
        }

        // Update dice display (now already hidden if blind)
        dice1.textContent = diceSymbols[actor.dice1 - 1];
        dice2.textContent = diceSymbols[actor.dice2 - 1];
        dice1.classList.remove('rolling');
        dice2.classList.remove('rolling');

        // Handle Mexico - only celebrate if OPEN (blind Mexico stays hidden)
        if (actor.isMexico && !isBlind) {
            celebrateMexico();
        }

        // Handle blind throw (including blind Mexico)
        if (isBlind) {
            actor.isBlind = true;
            // Already hidden above

            if (who === 'player') {
                // FIRST ROUND: Player must stay blind until computer has also thrown!
                if (gameState.isFirstRound) {
                    logToConsole(`[Speler] BLIND - EERSTE RONDE - Worp blijft verborgen tot computer ook heeft gegooid${actor.isMexico ? ' (MEXICO!)' : ''}`);
                    showMessage(`🙈 Blind gegooid! Worp blijft verborgen. Computer is aan de beurt...`, 'info');
                    disablePlayerButtons();

                    // Auto-continue to computer's turn, keeping it blind
                    setTimeout(() => {
                        handlePlayerKeep();
                    }, 1500);
                } else if (gameState.player.throwCount >= gameState.maxThrows) {
                    // Check if player reached max throws - if so, keep it blind and auto-continue
                    logToConsole(`[Speler] BLIND - AUTOMATISCH VASTGEZET - Worplimiet bereikt (${gameState.maxThrows})${actor.isMexico ? ' (MEXICO!)' : ''}`);
                    showMessage(`🙈 Blind gegooid! Worp blijft verborgen (limiet: ${gameState.maxThrows}). Computer is aan de beurt...`, 'info');
                    disablePlayerButtons();

                    // Auto-keep after short delay, keeping it blind
                    setTimeout(() => {
                        handlePlayerKeep();
                    }, 1500);
                } else {
                    showMessage(`🙈 Blind gegooid! Klik "Laten Zien" om te onthullen`, 'info');
                    showRevealButton();
                }
            }
        } else {
            // Open throw (Mexico celebration only happens for open throws)
            dice1.classList.remove('hidden');
            dice2.classList.remove('hidden');
            updateThrowDisplay();

            if (who === 'player') {
                if (actor.isMexico) {
                    showMessage(`🎉 MEXICO! ${displayValue}!`, 'success');
                } else {
                    showMessage(`Je gooide ${displayValue}!`, 'success');
                }

                // Check if player has reached max throws (set by voorgooier)
                if (actor.throwCount >= gameState.maxThrows) {
                    // Forced keep - no choice
                    logToConsole(`[Speler] AUTOMATISCH VASTGEZET - Worplimiet bereikt (${gameState.maxThrows})`);
                    showMessage(`Je gooide ${displayValue}! Worp automatisch vastgezet (limiet: ${gameState.maxThrows})`, 'info');
                    disablePlayerButtons();

                    // Auto-keep after short delay
                    setTimeout(() => {
                        handlePlayerKeep();
                    }, 1200);
                } else {
                    // Show options - can still throw again
                    showThrowAgainButtons();
                }
            }
        }

        updateUI();
    }

    // ========================================
    // Compare Results
    // ========================================
    function compareFirstRoundResults() {
        const player = gameState.player;
        const computer = gameState.computer;

        // Check if we need to reveal any blind throws
        const playerWasBlind = player.isBlind;
        const computerWasBlind = computer.isBlind;

        // Reveal blind throws before comparison
        if (player.isBlind) {
            player.isBlind = false;

            // Update throw history to mark all player throws as revealed
            player.throwHistory.forEach(throwData => {
                if (throwData.isBlind) {
                    throwData.isBlind = false;
                }
            });

            elements.playerDice1.classList.remove('hidden');
            elements.playerDice2.classList.remove('hidden');
            // Flip cup back to normal position
            elements.playerDiceCup.classList.remove('flipped');
            updateThrowDisplay();
            logToConsole(`[Speler] ONTHUL - Resultaat: ${player.displayThrow || player.currentThrow}${player.isMexico ? ' (MEXICO!)' : ''}`);
        }
        if (computer.isBlind) {
            computer.isBlind = false;

            // Update throw history to mark all computer throws as revealed
            computer.throwHistory.forEach(throwData => {
                if (throwData.isBlind) {
                    throwData.isBlind = false;
                }
            });

            elements.computerDice1.classList.remove('hidden');
            elements.computerDice2.classList.remove('hidden');
            // Flip cup back to normal position
            elements.computerDiceCup.classList.remove('flipped');
            updateThrowDisplay();
            logToConsole(`[Computer] ONTHUL - Resultaat: ${computer.displayThrow || computer.currentThrow}${computer.isMexico ? ' (MEXICO!)' : ''}`);
        }

        const playerDisplay = player.displayThrow || player.currentThrow;
        const computerDisplay = computer.displayThrow || computer.currentThrow;

        // Show reveal message and wait before comparing (first round is always blind)
        showMessage(`🎲 Onthulling!<br>Jij: ${playerDisplay} | Computer: ${computerDisplay}`, 'info');

        // Wait for player to see the reveal before showing result
        setTimeout(() => {
            continueCompareFirstRoundResults(player, computer, playerDisplay, computerDisplay);
        }, 1800);
    }

    function continueCompareFirstRoundResults(player, computer, playerDisplay, computerDisplay) {
        // Calculate penalty based on Mexico count (same as normal rounds)
        const penalty = gameState.mexicoCount > 0 ? gameState.mexicoCount * 2 : 1;
        const penaltyText = gameState.mexicoCount > 0 ? `${penalty} levens (${gameState.mexicoCount}× Mexico!)` : '1 leven';

        let message = '';

        if (player.currentThrow > computer.currentThrow) {
            // Player wins first round - computer loses lives and becomes voorgooier
            computer.lives -= penalty;
            gameState.playerToGoFirst = 'computer';

            // Update psychology: computer LOST this round
            updatePsychologyAfterRound(false);

            message = `🎯 Jij: ${playerDisplay} vs Computer: ${computerDisplay}<br>Je wint de eerste ronde! Computer verliest ${penaltyText} (${computer.lives} over)<br>Computer is voorgooier voor ronde 2.`;
            logToConsole(`Ronde 1: Speler ${playerDisplay} > Computer ${computerDisplay} - Speler wint, Computer verliest ${penalty} (${gameState.mexicoCount}× Mexico), ${computer.lives} levens over`);
        } else if (computer.currentThrow > player.currentThrow) {
            // Computer wins first round - player loses lives and becomes voorgooier
            player.lives -= penalty;
            gameState.playerToGoFirst = 'player';

            // Update psychology: computer WON this round
            updatePsychologyAfterRound(true);

            message = `🎯 Jij: ${playerDisplay} vs Computer: ${computerDisplay}<br>Computer wint de eerste ronde! Jij verliest ${penaltyText} (${player.lives} over)<br>Jij bent voorgooier voor ronde 2.`;
            logToConsole(`Ronde 1: Speler ${playerDisplay} < Computer ${computerDisplay} - Computer wint, Speler verliest ${penalty} (${gameState.mexicoCount}× Mexico), ${player.lives} levens over`);
            logToConsole(`[DEBUG] Computer wint blok afgerond, ga naar showMessage...`);
        } else {
            // TIE - VASTGOOIER! Both throw again, no lives lost
            message = `🔄 <strong>VASTGOOIER!</strong> Beide: ${playerDisplay}<br>Gelijkspel! Geen levens verloren - beide spelers gooien opnieuw!`;
            logToConsole(`Ronde 1: Speler ${playerDisplay} = Computer ${computerDisplay} - VASTGOOIER! Overgooien...`);

            showMessage(message, 'warning');

            // IMPORTANT: Mexico count is NOT reset - all Mexicos in this round count!
            logToConsole(`[VASTGOOIER] Mexico teller blijft staan: ${gameState.mexicoCount} Mexico(s) tot nu toe`);

            // VASTGOOIER RULE: Only 1 throw allowed when rethrowing!
            gameState.maxThrows = 1;
            gameState.voorgooierPattern = []; // Reset pattern for rethrow
            gameState.aiPersonality = null; // Reset AI personality for rethrow
            logToConsole(`[VASTGOOIER] Worplimiet voor overgooien: 1 worp`);

            // Reset throws for both players
            player.currentThrow = null;
            player.displayThrow = null;
            player.isMexico = false;
            player.throwCount = 0;
            player.isBlind = false;

            computer.currentThrow = null;
            computer.displayThrow = null;
            computer.isMexico = false;
            computer.throwCount = 0;
            computer.isBlind = false;

            // Reset dice display
            elements.playerDice1.textContent = diceSymbols[0];
            elements.playerDice2.textContent = diceSymbols[0];
            elements.playerDice1.classList.remove('hidden');
            elements.playerDice2.classList.remove('hidden');
            elements.playerDiceCup.classList.remove('flipped');
            elements.computerDice1.textContent = diceSymbols[0];
            elements.computerDice2.textContent = diceSymbols[0];
            elements.computerDice1.classList.remove('hidden');
            elements.computerDice2.classList.remove('hidden');
            elements.computerDiceCup.classList.remove('flipped');

            updateUI();

            // Both throw blind again (first round rule)
            setTimeout(() => {
                logToConsole(`[VASTGOOIER] Knoppen activeren - speler mag opnieuw gooien (1 worp)`);
                showMessage('🎲 Eerste ronde blijft blind - gooi opnieuw (1 worp)!', 'info');
                enablePlayerButtons();
            }, 1800);
            return;
        }

        logToConsole(`[DEBUG] Na if/else blokken, message = "${message.substring(0, 50)}..."`);
        logToConsole(`[DEBUG] Roep showMessage aan...`);
        showMessage(message, 'info');
        logToConsole(`[DEBUG] showMessage succesvol, roep updateUI aan...`);
        updateUI();
        logToConsole(`[DEBUG] updateUI succesvol`);

        logToConsole(`[RONDE 1 EINDE] Wachten 3 sec voor game over check...`);

        // Check for game over (in case penalty was large enough)
        setTimeout(() => {
            logToConsole(`[GAME OVER CHECK] Speler: ${player.lives} levens, Computer: ${computer.lives} levens`);
            if (player.lives <= 0 || computer.lives <= 0) {
                logToConsole(`[GAME OVER] Spel is afgelopen`);
                handleGameOver();
            } else {
                logToConsole(`[VOLGENDE RONDE] Wachten voordat ronde 2 start...`);
                // Next round - delay to read results
                setTimeout(() => {
                    logToConsole(`[START RONDE 2] startNextRound() wordt aangeroepen...`);
                    startNextRound();
                }, 1800);
            }
        }, 1800);
    }

    function compareResults() {
        const player = gameState.player;
        const computer = gameState.computer;

        // Check if we need to reveal any blind throws
        const playerWasBlind = player.isBlind;
        const computerWasBlind = computer.isBlind;

        // Reveal blind throws before comparison
        if (player.isBlind) {
            player.isBlind = false;

            // Update throw history to mark all player throws as revealed
            player.throwHistory.forEach(throwData => {
                if (throwData.isBlind) {
                    throwData.isBlind = false;
                }
            });

            elements.playerDice1.classList.remove('hidden');
            elements.playerDice2.classList.remove('hidden');
            // Flip cup back to normal position
            elements.playerDiceCup.classList.remove('flipped');
            updateThrowDisplay();
            logToConsole(`[Speler] ONTHUL - Resultaat: ${player.displayThrow || player.currentThrow}${player.isMexico ? ' (MEXICO!)' : ''}`);
        }
        if (computer.isBlind) {
            computer.isBlind = false;

            // Update throw history to mark all computer throws as revealed
            computer.throwHistory.forEach(throwData => {
                if (throwData.isBlind) {
                    throwData.isBlind = false;
                }
            });

            elements.computerDice1.classList.remove('hidden');
            elements.computerDice2.classList.remove('hidden');
            // Flip cup back to normal position
            elements.computerDiceCup.classList.remove('flipped');
            updateThrowDisplay();
            logToConsole(`[Computer] ONTHUL - Resultaat: ${computer.displayThrow || computer.currentThrow}${computer.isMexico ? ' (MEXICO!)' : ''}`);
        }

        const playerDisplay = player.displayThrow || player.currentThrow;
        const computerDisplay = computer.displayThrow || computer.currentThrow;

        // If player threw blind, show reveal message and wait before comparing
        if (playerWasBlind) {
            showMessage(`🎲 Onthulling!<br>Jij: ${playerDisplay} | Computer: ${computerDisplay}`, 'info');

            // Wait for player to see the reveal before showing result
            setTimeout(() => {
                continueCompareResults(player, computer, playerDisplay, computerDisplay);
            }, 1800);
            return;
        }

        // No blind throws, compare immediately
        continueCompareResults(player, computer, playerDisplay, computerDisplay);
    }

    function continueCompareResults(player, computer, playerDisplay, computerDisplay) {
        // Calculate penalty based on Mexico count
        const penalty = gameState.mexicoCount > 0 ? gameState.mexicoCount * 2 : 1;
        const penaltyText = gameState.mexicoCount > 0 ? `${penalty} levens (${gameState.mexicoCount}× Mexico!)` : '1 leven';

        let message = '';
        let winner = null;

        if (player.currentThrow > computer.currentThrow) {
            // Player wins round
            computer.lives -= penalty;
            winner = 'player';

            // Update psychology: computer LOST this round
            updatePsychologyAfterRound(false);

            message = `🎉 Je wint de ronde!<br>Jij: ${playerDisplay} vs Computer: ${computerDisplay}<br>Computer verliest ${penaltyText} (${computer.lives} over)`;
            logToConsole(`Ronde ${gameState.roundNumber}: Speler ${playerDisplay} > Computer ${computerDisplay} - Speler wint, Computer verliest ${penalty} (${gameState.mexicoCount}× Mexico), ${computer.lives} levens over`);

            // Computer becomes voorgooier (goes first next round)
            gameState.playerToGoFirst = 'computer';
        } else if (computer.currentThrow > player.currentThrow) {
            // Computer wins round
            player.lives -= penalty;
            winner = 'computer';

            // Update psychology: computer WON this round
            updatePsychologyAfterRound(true);

            message = `😔 Computer wint de ronde!<br>Jij: ${playerDisplay} vs Computer: ${computerDisplay}<br>Jij verliest ${penaltyText} (${player.lives} over)`;
            logToConsole(`Ronde ${gameState.roundNumber}: Speler ${playerDisplay} < Computer ${computerDisplay} - Computer wint, Speler verliest ${penalty} (${gameState.mexicoCount}× Mexico), ${player.lives} levens over`);

            // Player becomes voorgooier (goes first next round)
            gameState.playerToGoFirst = 'player';
        } else {
            // TIE - VASTGOOIER! Both throw again, no lives lost
            message = `🔄 <strong>VASTGOOIER!</strong> Beide: ${playerDisplay}<br>Gelijkspel! Geen levens verloren - beide spelers gooien opnieuw!`;
            logToConsole(`Ronde ${gameState.roundNumber}: Speler ${playerDisplay} = Computer ${computerDisplay} - VASTGOOIER! Overgooien...`);

            showMessage(message, 'warning');

            // IMPORTANT: Mexico count is NOT reset - all Mexicos in this round count!
            logToConsole(`[VASTGOOIER] Mexico teller blijft staan: ${gameState.mexicoCount} Mexico(s) tot nu toe`);

            // VASTGOOIER RULE: Only 1 throw allowed when rethrowing!
            gameState.maxThrows = 1;
            gameState.voorgooierPattern = []; // Reset pattern for rethrow
            gameState.aiPersonality = null; // Reset AI personality for rethrow
            logToConsole(`[VASTGOOIER] Worplimiet voor overgooien: 1 worp`);

            // Reset throws for both players
            player.currentThrow = null;
            player.displayThrow = null;
            player.isMexico = false;
            player.throwCount = 0;
            player.isBlind = false;

            computer.currentThrow = null;
            computer.displayThrow = null;
            computer.isMexico = false;
            computer.throwCount = 0;
            computer.isBlind = false;

            // Reset dice display
            elements.playerDice1.textContent = diceSymbols[0];
            elements.playerDice2.textContent = diceSymbols[0];
            elements.playerDice1.classList.remove('hidden');
            elements.playerDice2.classList.remove('hidden');
            elements.playerDiceCup.classList.remove('flipped');
            elements.computerDice1.textContent = diceSymbols[0];
            elements.computerDice2.textContent = diceSymbols[0];
            elements.computerDice1.classList.remove('hidden');
            elements.computerDice2.classList.remove('hidden');
            elements.computerDiceCup.classList.remove('flipped');

            updateUI();

            // Determine who goes first (same voorgooier as before)
            setTimeout(() => {
                if (gameState.playerToGoFirst === 'player') {
                    logToConsole(`[VASTGOOIER] Speler begint met overgooien (1 worp)`);
                    showMessage(`🎲 Ronde ${gameState.roundNumber} - Overgooien! Jouw beurt (1 worp)!`, 'info');
                    enablePlayerButtons();
                } else {
                    logToConsole(`[VASTGOOIER] Computer begint met overgooien (1 worp)`);
                    showMessage(`🎲 Ronde ${gameState.roundNumber} - Overgooien! Computer begint (1 worp)...`, 'info');
                    disablePlayerButtons();
                    setTimeout(() => {
                        computerTurn();
                    }, 1500);
                }
            }, 1800);
            return;
        }

        showMessage(message, winner === 'player' ? 'success' : 'warning');
        updateUI();

        // Check for game over
        setTimeout(() => {
            if (player.lives <= 0 || computer.lives <= 0) {
                handleGameOver();
            } else {
                // Next round - delay to read results
                setTimeout(() => {
                    startNextRound();
                }, 1800);
            }
        }, 1800);
    }

    // ========================================
    // Round Management
    // ========================================
    function startNextRound() {
        logToConsole(`\n[startNextRound] FUNCTIE AANGEROEPEN`);

        gameState.roundNumber++;
        gameState.isFirstRound = false;

        logToConsole(`[startNextRound] Ronde nummer: ${gameState.roundNumber}, isFirstRound: ${gameState.isFirstRound}`);

        // Reset max throws to 3 (will be set by voorgooier during the round)
        gameState.maxThrows = 3;
        gameState.voorgooierPattern = []; // Reset pattern array for new round
        gameState.aiPersonality = null; // Reset AI personality for new round

        // Reset Mexico count for new round
        gameState.mexicoCount = 0;

        // Reset player states
        gameState.player.currentThrow = null;
        gameState.player.displayThrow = null;
        gameState.player.isMexico = false;
        gameState.player.throwCount = 0;
        gameState.player.isBlind = false;
        gameState.player.threwBlindThisRound = false;
        gameState.player.dice1 = 1;
        gameState.player.dice2 = 1;
        gameState.player.throwHistory = []; // Reset throw history

        gameState.computer.currentThrow = null;
        gameState.computer.displayThrow = null;
        gameState.computer.isMexico = false;
        gameState.computer.throwCount = 0;
        gameState.computer.isBlind = false;
        gameState.computer.threwBlindThisRound = false;
        gameState.computer.dice1 = 1;
        gameState.computer.dice2 = 1;
        gameState.computer.throwHistory = []; // Reset throw history

        // Determine who goes first
        gameState.currentTurn = gameState.playerToGoFirst;

        // Reset dice display
        elements.playerDice1.textContent = diceSymbols[0];
        elements.playerDice2.textContent = diceSymbols[0];
        elements.playerDice1.classList.remove('hidden');
        elements.playerDice2.classList.remove('hidden');
        elements.computerDice1.textContent = diceSymbols[0];
        elements.computerDice2.textContent = diceSymbols[0];
        elements.computerDice1.classList.remove('hidden');
        elements.computerDice2.classList.remove('hidden');

        updateUI();

        if (gameState.currentTurn === 'player') {
            logToConsole(`\n=== RONDE ${gameState.roundNumber} START ===`);
            logToConsole(`Voorgooier: SPELER | Levens: Speler ${gameState.player.lives} vs Computer ${gameState.computer.lives}`);
            showMessage(`🎲 Ronde ${gameState.roundNumber}! Jouw beurt als voorgooier!<br>Jij bepaalt hoeveel worpen (max 3)`, 'info');
            logToConsole(`[startNextRound] enablePlayerButtons() wordt aangeroepen...`);
            enablePlayerButtons();
            logToConsole(`[startNextRound] Knoppen geactiveerd! Speler kan nu gooien.`);
        } else {
            logToConsole(`\n=== RONDE ${gameState.roundNumber} START ===`);
            logToConsole(`Voorgooier: COMPUTER | Levens: Speler ${gameState.player.lives} vs Computer ${gameState.computer.lives}`);
            showMessage(`🎲 Ronde ${gameState.roundNumber}! Computer is voorgooier en begint...`, 'info');
            disablePlayerButtons();
            logToConsole(`[startNextRound] Computer beurt start over 1.5 seconden...`);
            setTimeout(() => {
                logToConsole(`[startNextRound] computerTurn() wordt aangeroepen...`);
                computerTurn();
            }, 1500);
        }
    }

    function startNewGame() {
        // Reset everything
        gameState.player.lives = 6;
        gameState.computer.lives = 6;
        gameState.roundNumber = 1;
        gameState.isFirstRound = true;
        gameState.playerToGoFirst = 'player';
        gameState.currentTurn = 'player';
        gameState.gameOver = false;
        gameState.mexicoCount = 0;
        gameState.maxThrows = 3;
        gameState.voorgooierPattern = []; // Reset pattern array for new game
        gameState.aiPersonality = null; // Reset AI personality for new game

        gameState.player.currentThrow = null;
        gameState.player.displayThrow = null;
        gameState.player.isMexico = false;
        gameState.player.throwCount = 0;
        gameState.player.isBlind = false;
        gameState.player.threwBlindThisRound = false;
        gameState.player.dice1 = 1;
        gameState.player.dice2 = 1;
        gameState.player.throwHistory = []; // Reset throw history

        gameState.computer.currentThrow = null;
        gameState.computer.displayThrow = null;
        gameState.computer.isMexico = false;
        gameState.computer.throwCount = 0;
        gameState.computer.isBlind = false;
        gameState.computer.threwBlindThisRound = false;
        gameState.computer.dice1 = 1;
        gameState.computer.dice2 = 1;
        gameState.computer.throwHistory = []; // Reset throw history

        elements.playerDice1.textContent = diceSymbols[0];
        elements.playerDice2.textContent = diceSymbols[0];
        elements.playerDice1.classList.remove('hidden');
        elements.playerDice2.classList.remove('hidden');
        elements.computerDice1.textContent = diceSymbols[0];
        elements.computerDice2.textContent = diceSymbols[0];
        elements.computerDice1.classList.remove('hidden');
        elements.computerDice2.classList.remove('hidden');

        updateUI();
        enablePlayerButtons();
        showMessage('🎮 Nieuw spel! Jouw beurt. Eerste ronde is altijd blind!', 'info');
    }

    // ========================================
    // Game Over
    // ========================================
    function handleGameOver() {
        gameState.gameOver = true;

        if (gameState.player.lives <= 0 && gameState.computer.lives <= 0) {
            // Both lost (tie)
            showMessage('🤝 Gelijkspel! Beide spelers zijn af!', 'warning');
            for (let i = 0; i < 30; i++) {
                setTimeout(() => createConfetti('#D4AF37'), i * 30);
            }
            // No stats recorded for tie
        } else if (gameState.player.lives > 0) {
            // Player wins
            showMessage('🎉🎊 JE HEBT GEWONNEN! DE COMPUTER IS VERSLAGEN! 🎊🎉', 'success');
            celebrateWin();
            recordGameResult(true); // Record win
        } else {
            // Computer wins
            showMessage('😔 Game Over! De computer heeft gewonnen. Probeer opnieuw!', 'danger');
            recordGameResult(false); // Record loss
        }

        disablePlayerButtons();
        showNewGameButton();
    }

    function showNewGameButton() {
        // Create new game button
        const actionButtons = document.getElementById('actionButtons');

        // Remove existing new game button if any
        const existingBtn = document.getElementById('gameOverNewGameBtn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // Create and add the button
        const newGameBtn = document.createElement('button');
        newGameBtn.id = 'gameOverNewGameBtn';
        newGameBtn.type = 'button';
        newGameBtn.className = 'btn-game w-full';
        newGameBtn.style.cssText = 'background: linear-gradient(135deg, #1e90ff 0%, #4169e1 100%); color: white;';
        newGameBtn.innerHTML = '🎮 Nieuw Spel Starten';
        newGameBtn.onclick = () => {
            newGameBtn.remove();
            startNewGame();
        };

        actionButtons.appendChild(newGameBtn);
    }

    // ========================================
    // UI Updates
    // ========================================
    function updateUI() {
        // Map lives to dice emoji: 0=💀, 1=⚀, 2=⚁, 3=⚂, 4=⚃, 5=⚄, 6=⚅
        const livesEmoji = ['💀', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

        // Update lives with dice emoji
        elements.playerLives.textContent = livesEmoji[gameState.player.lives] || '💀';
        elements.computerLives.textContent = livesEmoji[gameState.computer.lives] || '💀';

        // Color lives based on remaining
        updateLivesColor(elements.playerLives, gameState.player.lives);
        updateLivesColor(elements.computerLives, gameState.computer.lives);

        // Update throw history display (includes game info and turn indicator)
        updateThrowHistory();

        // Update throw count (element doesn't exist in HTML, so skip)
        // const currentActor = gameState[gameState.currentTurn];
        // elements.throwCount.textContent = currentActor.throwCount;

        // Update active card
        if (gameState.currentTurn === 'player') {
            elements.playerCard.classList.add('active');
            elements.computerCard.classList.remove('active');
        } else {
            elements.computerCard.classList.add('active');
            elements.playerCard.classList.remove('active');
        }
    }

    function updateLivesColor(element, lives) {
        if (lives <= 0) {
            element.style.borderColor = '#000';
            element.style.color = '#666';
            element.style.opacity = '0.5';
        } else if (lives <= 2) {
            element.style.borderColor = 'var(--color-red)';
            element.style.color = 'var(--color-red-light)';
        } else if (lives <= 4) {
            element.style.borderColor = '#FFD700';
            element.style.color = '#FFD700';
        } else {
            element.style.borderColor = 'var(--color-gold)';
            element.style.color = 'var(--color-gold-light)';
        }
    }

    function updateThrowDisplay() {
        // No longer needed - removed "Huidige Worp" display
        // Dice in cup show the throw visually
    }

    function showMessage(message, type = 'info') {
        const icons = {
            success: '✓',
            warning: '⚠️',
            danger: '❌',
            info: 'ℹ️'
        };

        const colors = {
            success: 'var(--color-green)',
            warning: '#FFD700',
            danger: 'var(--color-red)',
            info: 'var(--color-green-light)'
        };

        // Log the message (strip HTML tags for cleaner log)
        const cleanMessage = message.replace(/<br>/g, ' | ').replace(/<[^>]*>/g, '');
        logToConsole(`[UI] ${icons[type]} ${cleanMessage}`);

        // Simplified message for integrated display
        elements.gameInfoInHistory.innerHTML = `
            <div style="color: ${colors[type]}">
                ${icons[type]} ${message}
            </div>
        `;
    }

    // ========================================
    // Button Management
    // ========================================
    function enablePlayerButtons() {
        elements.throwBlindBtn.classList.remove('hidden');
        elements.throwBlindBtn.disabled = false;
        elements.throwBlindBtn.style.opacity = '1';
        elements.throwBlindBtn.style.cursor = 'pointer';
        elements.keepBtn.classList.add('hidden');
        elements.revealBtn.classList.add('hidden');

        // First round: only blind throw allowed - HIDE open button!
        if (gameState.isFirstRound && gameState.player.throwCount === 0) {
            elements.throwOpenBtn.classList.add('hidden');  // Verberg de knop gewoon
            logToConsole('[EERSTE RONDE] Gooi Open verborgen - alleen blind gooien toegestaan');
        } else {
            elements.throwOpenBtn.classList.remove('hidden');  // Toon de knop weer
            elements.throwOpenBtn.disabled = false;
            elements.throwOpenBtn.style.opacity = '1';
            elements.throwOpenBtn.style.cursor = 'pointer';

            // RULE CHECK: If player is achterligger, check voorgooier pattern for current throw
            if (!gameState.isFirstRound && gameState.playerToGoFirst === 'computer') {
                // Player is achterligger - check if pattern dictates this throw
                const throwIndex = gameState.player.throwCount; // About to throw this number (0-indexed)
                if (throwIndex < gameState.voorgooierPattern.length) {
                    // Voorgooier made this throw - must match pattern
                    const mustBeBlind = gameState.voorgooierPattern[throwIndex];
                    if (mustBeBlind) {
                        // Must throw blind - disable open button
                        elements.throwOpenBtn.disabled = true;
                        elements.throwOpenBtn.style.opacity = '0.5';
                        elements.throwOpenBtn.style.cursor = 'not-allowed';
                        logToConsole(`[REGEL] Speler MOET blind gooien op worp ${throwIndex + 1} (voorgooier patroon)`);
                    } else {
                        // Must throw open - disable blind button
                        elements.throwBlindBtn.disabled = true;
                        elements.throwBlindBtn.style.opacity = '0.5';
                        elements.throwBlindBtn.style.cursor = 'not-allowed';
                        logToConsole(`[REGEL] Speler MOET open gooien op worp ${throwIndex + 1} (voorgooier patroon)`);
                    }
                }
                // If throwIndex >= pattern length, voorgooier didn't reach this throw, so both buttons are enabled (already done above)
            }
        }
    }

    function disablePlayerButtons() {
        elements.throwOpenBtn.classList.add('hidden');
        elements.throwOpenBtn.disabled = true;
        elements.throwBlindBtn.classList.add('hidden');
        elements.throwBlindBtn.disabled = true;
        elements.keepBtn.classList.add('hidden');
        elements.keepBtn.disabled = true;
        elements.revealBtn.classList.add('hidden');
        elements.revealBtn.disabled = true;
    }

    function showThrowAgainButtons() {
        // Enable and show blind button by default
        elements.throwBlindBtn.classList.remove('hidden');
        elements.throwBlindBtn.disabled = false;
        elements.throwBlindBtn.style.opacity = '1';
        elements.throwBlindBtn.style.cursor = 'pointer';

        // First round check: only show blind button
        if (gameState.isFirstRound && gameState.player.throwCount === 0) {
            elements.throwOpenBtn.classList.add('hidden');
        } else {
            elements.throwOpenBtn.classList.remove('hidden');
            elements.throwOpenBtn.disabled = false;
            elements.throwOpenBtn.style.opacity = '1';
            elements.throwOpenBtn.style.cursor = 'pointer';

            // RULE CHECK: If player is achterligger, check voorgooier pattern for next throw
            if (!gameState.isFirstRound && gameState.playerToGoFirst === 'computer') {
                // Player is achterligger - check if pattern dictates next throw
                const throwIndex = gameState.player.throwCount; // About to throw this number (0-indexed)
                if (throwIndex < gameState.voorgooierPattern.length) {
                    // Voorgooier made this throw - must match pattern
                    const mustBeBlind = gameState.voorgooierPattern[throwIndex];
                    if (mustBeBlind) {
                        // Must throw blind - disable open button
                        elements.throwOpenBtn.disabled = true;
                        elements.throwOpenBtn.style.opacity = '0.5';
                        elements.throwOpenBtn.style.cursor = 'not-allowed';
                        logToConsole(`[REGEL] Speler MOET blind gooien op worp ${throwIndex + 1} (voorgooier patroon)`);
                    } else {
                        // Must throw open - disable blind button
                        elements.throwBlindBtn.disabled = true;
                        elements.throwBlindBtn.style.opacity = '0.5';
                        elements.throwBlindBtn.style.cursor = 'not-allowed';
                        logToConsole(`[REGEL] Speler MOET open gooien op worp ${throwIndex + 1} (voorgooier patroon)`);
                    }
                }
            }
        }
        elements.keepBtn.classList.remove('hidden');
        elements.keepBtn.disabled = false;
        elements.revealBtn.classList.add('hidden');
    }

    function showKeepButton() {
        elements.throwOpenBtn.classList.add('hidden');
        elements.throwBlindBtn.classList.add('hidden');
        elements.keepBtn.classList.remove('hidden');
        elements.keepBtn.disabled = false;
        elements.revealBtn.classList.add('hidden');
    }

    function showRevealButton() {
        elements.throwOpenBtn.classList.add('hidden');
        elements.throwBlindBtn.classList.add('hidden');
        elements.keepBtn.classList.add('hidden');
        elements.revealBtn.classList.remove('hidden');
        elements.revealBtn.disabled = false;
    }

    // ========================================
    // Celebrations
    // ========================================
    function celebrateMexico() {
        const colors = ['#D4AF37', '#FFD700', '#8B0000', '#0D5E3A'];

        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                createConfetti(colors[Math.floor(Math.random() * colors.length)]);
            }, i * 20);
        }
    }

    function celebrateWin() {
        const colors = ['#D4AF37', '#FFD700', '#0D5E3A', '#1B7A4B'];

        // Big confetti celebration
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                createConfetti(colors[Math.floor(Math.random() * colors.length)]);
            }, i * 30);
        }

        // Show celebration message
        const celebration = document.createElement('div');
        celebration.innerHTML = '🎉<br>GEWONNEN!<br>🎉';
        Object.assign(celebration.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '3rem',
            fontFamily: "'Cinzel', serif",
            color: 'var(--color-gold)',
            textShadow: '3px 3px 12px rgba(0,0,0,0.7)',
            zIndex: '10000',
            animation: 'pulse 1s ease infinite',
            pointerEvents: 'none',
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: '1.2'
        });

        document.body.appendChild(celebration);

        setTimeout(() => {
            celebration.remove();
        }, 4000);
    }

    function createConfetti(color) {
        const confetti = document.createElement('div');
        Object.assign(confetti.style, {
            position: 'fixed',
            width: '10px',
            height: '10px',
            backgroundColor: color,
            left: Math.random() * window.innerWidth + 'px',
            top: '-10px',
            borderRadius: '50%',
            zIndex: '9999',
            pointerEvents: 'none'
        });

        document.body.appendChild(confetti);

        const duration = 2000 + Math.random() * 1000;
        const xMovement = (Math.random() - 0.5) * 200;

        confetti.animate([
            {
                transform: 'translateY(0) translateX(0) rotate(0deg)',
                opacity: 1
            },
            {
                transform: `translateY(${window.innerHeight + 20}px) translateX(${xMovement}px) rotate(${Math.random() * 360}deg)`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });

        setTimeout(() => {
            confetti.remove();
        }, duration);
    }

    // ========================================
    // Debug Console
    // ========================================
    function logToConsole(message) {
        const consoleEl = document.getElementById('debugConsole');
        if (!consoleEl) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}\n`;

        consoleEl.textContent += logEntry;
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    // ========================================
    // Start Game
    // ========================================
    init();
    logToConsole('Spel gestart - Eerste ronde is altijd blind!');

})();
