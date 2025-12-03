// ========================================
// Koning Mexico vs Computer - Game Logic
// ========================================

(function() {
    'use strict';

    // Game State
    let gameState = {
        player: {
            lives: 6,
            currentThrow: null,
            throwCount: 0,
            isBlind: false,
            dice1: 1,
            dice2: 1,
            threwBlindThisRound: false // Track if player threw any blind throws this round
        },
        computer: {
            lives: 6,
            currentThrow: null,
            throwCount: 0,
            isBlind: false,
            dice1: 1,
            dice2: 1,
            threwBlindThisRound: false // Track if computer threw any blind throws this round
        },
        currentTurn: 'player', // 'player' or 'computer'
        roundNumber: 1,
        isFirstRound: true,
        playerToGoFirst: 'player', // Who goes first this round (loser from previous round)
        gameOver: false,
        mexicoCount: 0, // Number of Mexico's thrown this round
        maxThrows: 3, // Maximum throws this round (set by voorgooier)
        voorgooierThrewBlind: false // Whether voorgooier threw ANY blind throws (determines if achterligger can throw blind)
    };

    // DOM Elements
    const elements = {
        playerLives: document.getElementById('playerLives'),
        computerLives: document.getElementById('computerLives'),
        playerCard: document.getElementById('playerCard'),
        computerCard: document.getElementById('computerCard'),
        roundNumber: document.getElementById('roundNumber'),
        currentPlayer: document.getElementById('currentPlayer'),
        dice1: document.getElementById('dice1'),
        dice2: document.getElementById('dice2'),
        diceCup: document.getElementById('diceCup'),
        gameInfo: document.getElementById('gameInfo'),

        // Buttons
        throwOpenBtn: document.getElementById('throwOpenBtn'),
        throwBlindBtn: document.getElementById('throwBlindBtn'),
        keepBtn: document.getElementById('keepBtn'),
        revealBtn: document.getElementById('revealBtn'),
        newGameBtn: document.getElementById('newGameBtn')
    };

    // Dice symbols
    const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

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
            logToConsole(`[Speler] Worp ${player.throwCount} - BLIND (blind vlag gezet)`);
        } else {
            logToConsole(`[Speler] Worp ${player.throwCount} - OPEN`);
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
            // Track if player threw any blind throws (if so, computer can also throw blind)
            gameState.voorgooierThrewBlind = player.threwBlindThisRound;
            const throwType = player.threwBlindThisRound ? 'Met blind' : 'Alleen open';
            logToConsole(`[Speler] VOORGOOIER - Worplimiet: ${gameState.maxThrows}, ${throwType} gegooid`);
            logToConsole(`[REGEL] Computer ${player.threwBlindThisRound ? 'MAG' : 'MAG NIET'} blind gooien`);
        }

        logToConsole(`[Speler] LATEN STAAN - Eindworp: ${displayValue} (na ${player.throwCount} worpen)`);

        // Check if computer has already thrown (when computer was voorgooier)
        if (computer.currentThrow !== null) {
            // Computer already threw, compare immediately
            showMessage('Je hebt je worp vastgezet! Vergelijken...', 'info');
            disablePlayerButtons();
            setTimeout(() => {
                compareResults();
            }, 1500);
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
            }, 1500);
        }
    }

    function handlePlayerReveal() {
        const player = gameState.player;
        player.isBlind = false;

        // Reveal dice
        elements.dice1.classList.remove('hidden');
        elements.dice2.classList.remove('hidden');

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
            }, 1500);
        } else {
            // Normal game flow
            showMessage(`Je gooide ${displayValue}!`, 'success');

            // Check if player has reached max throws (set by voorgooier)
            if (player.throwCount >= gameState.maxThrows) {
                // Forced keep - no choice
                logToConsole(`[Speler] AUTOMATISCH VASTGEZET - Worplimiet bereikt (${gameState.maxThrows})`);
                showMessage(`Je gooide ${displayValue}! Worp automatisch vastgezet (limiet: ${gameState.maxThrows})`, 'info');
                disablePlayerButtons();

                // Auto-keep after short delay
                setTimeout(() => {
                    handlePlayerKeep();
                }, 2000);
            } else {
                // Show keep button after reveal
                elements.revealBtn.classList.add('hidden');
                elements.keepBtn.classList.remove('hidden');

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

        showMessage('🤖 Computer gooit...', 'info');
        updateTurnIndicator();

        // Computer strategy:
        // - First throw is always blind (if first round)
        // - Otherwise, makes smart decisions based on player's throw
        setTimeout(() => {
            computerThrowSequence();
        }, 1000);
    }

    function computerFirstRoundTurn() {
        const computer = gameState.computer;

        showMessage('🤖 Computer gooit blind...', 'info');
        logToConsole(`[Computer] Worp 1 - BLIND`);

        // Computer throws exactly once, blind
        computer.throwCount++;
        throwDice('computer', true);

        // After throw animation, reveal and compare
        setTimeout(() => {
            // Reveal computer's throw
            computer.isBlind = false;
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');
            updateThrowDisplay();

            const displayValue = computer.displayThrow || computer.currentThrow;
            logToConsole(`[Computer] ONTHUL - Resultaat: ${displayValue}${computer.isMexico ? ' (MEXICO!)' : ''}`);

            if (computer.isMexico) {
                celebrateMexico();
            }

            showMessage(`🤖 Computer gooide ${displayValue}!`, 'info');

            // Compare results after longer delay to read
            setTimeout(() => {
                compareFirstRoundResults();
            }, 3000);
        }, 2000);
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
            }, 1500);
            return;
        }

        // Check if computer reached max throws (set by voorgooier)
        if (computer.throwCount >= gameState.maxThrows) {
            // Computer is done
            const displayValue = computer.displayThrow || computer.currentThrow;
            logToConsole(`[Computer] AUTOMATISCH VASTGEZET - Eindworp: ${displayValue} (limiet ${gameState.maxThrows} bereikt)`);

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
                }, 1500);
            }
            return;
        }

        // Decide if next throw should be blind
        let isBlind = false;

        // RULE CHECK: If voorgooier threw all open, achterligger MUST throw all open
        if (!gameState.isFirstRound && !gameState.voorgooierThrewBlind) {
            isBlind = false; // Force open throws
            logToConsole(`[REGEL] Computer MAG NIET blind gooien (voorgooier gooide alleen open)`);
        } else {
            // Strategy: On 2nd throw with low value (<54), go blind on 3rd throw (1vs1 strategy)
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
                    // Track if computer threw any blind throws (if so, player can also throw blind)
                    gameState.voorgooierThrewBlind = computer.threwBlindThisRound;
                    const throwType = computer.threwBlindThisRound ? 'Met blind' : 'Alleen open';
                    logToConsole(`[Computer] VOORGOOIER - Worplimiet: ${gameState.maxThrows}, ${throwType} gegooid`);
                    logToConsole(`[REGEL] Speler ${computer.threwBlindThisRound ? 'MAG' : 'MAG NIET'} blind gooien`);
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
                    }, 1500);
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
            logToConsole(`[Computer] Worp ${computer.throwCount} - BLIND (blind vlag gezet)`);
        } else {
            logToConsole(`[Computer] Worp ${computer.throwCount} - OPEN`);
        }

        throwDice('computer', isBlind);

        // After throw, decide next action
        setTimeout(() => {
            const displayValue = computer.displayThrow || computer.currentThrow;

            if (computer.isBlind) {
                // Computer reveals blind throw
                computer.isBlind = false;
                elements.dice1.classList.remove('hidden');
                elements.dice2.classList.remove('hidden');
                updateThrowDisplay();

                logToConsole(`[Computer] ONTHUL - Resultaat: ${displayValue}${computer.isMexico ? ' (MEXICO!)' : ''}`);

                if (computer.isMexico) {
                    celebrateMexico();
                }

                showMessage(`🤖 Computer gooide ${displayValue}!`, 'info');

                // Continue sequence with longer delay
                setTimeout(() => {
                    computerThrowSequence();
                }, 2500);
            } else {
                // Open throw, continue sequence
                logToConsole(`[Computer] Resultaat: ${displayValue}${computer.isMexico ? ' (MEXICO!)' : ''}`);
                showMessage(`🤖 Computer gooide ${displayValue}!`, 'info');
                setTimeout(() => {
                    computerThrowSequence();
                }, 2500);
            }
        }, 1500);
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

        // 1vs1 Strategy: Don't keep very low throws in early throws
        // After 1st throw: never keep anything below 52
        if (computer.throwCount === 1 && computer.currentThrow < 52) {
            logToConsole(`[Computer AI] Worp te laag (${computer.displayThrow || computer.currentThrow} < 52), gooi opnieuw`);
            return true;
        }

        // After 2nd throw: if still below 54, we'll go blind (handled in sequence)
        // So here we check if current throw is worth keeping
        if (computer.throwCount === 2) {
            // If we have 54 or higher, consider keeping it
            if (computer.currentThrow >= 54) {
                // Good throw, keep it
                logToConsole(`[Computer AI] Goede worp (${computer.displayThrow || computer.currentThrow}), laten staan`);
                return false;
            } else {
                // Low throw, will go blind on 3rd
                return true;
            }
        }

        // If player has higher throw and computer can still throw, try again
        if (player.currentThrow !== null && computer.currentThrow < player.currentThrow) {
            if (computer.throwCount < gameState.maxThrows) {
                logToConsole(`[Computer AI] Speler heeft hoger (${player.displayThrow || player.currentThrow}), probeer opnieuw`);
                return true;
            }
        }

        // If computer has decent throw (>= 54) and equals or beats player, keep it
        if (computer.currentThrow >= 54) {
            if (player.currentThrow === null || computer.currentThrow >= player.currentThrow) {
                return false;
            }
        }

        // If can still throw and current throw is not great, throw again
        if (computer.throwCount < gameState.maxThrows) {
            return true;
        }

        // Default: keep current throw
        return false;
    }

    // ========================================
    // Dice Throwing
    // ========================================
    function throwDice(who, isBlind) {
        const actor = gameState[who];

        // Animate dice cup
        elements.diceCup.classList.add('shaking');
        setTimeout(() => {
            elements.diceCup.classList.remove('shaking');
        }, 500);

        // Roll animation
        elements.dice1.classList.add('rolling');
        elements.dice2.classList.add('rolling');

        // Random rolling effect
        let rollCount = 0;
        const rollInterval = setInterval(() => {
            const rand1 = Math.floor(Math.random() * 6) + 1;
            const rand2 = Math.floor(Math.random() * 6) + 1;
            elements.dice1.textContent = diceSymbols[rand1 - 1];
            elements.dice2.textContent = diceSymbols[rand2 - 1];
            rollCount++;

            if (rollCount >= 10) {
                clearInterval(rollInterval);
                finishThrow(who, isBlind);
            }
        }, 50);
    }

    function finishThrow(who, isBlind) {
        const actor = gameState[who];

        // Generate final dice values
        actor.dice1 = Math.floor(Math.random() * 6) + 1;
        actor.dice2 = Math.floor(Math.random() * 6) + 1;

        // 🎰 EASTER EGG: Lucky Mode - 50% extra chance for Mexico when player throws
        if (who === 'player' && typeof window.luckyModeActive !== 'undefined' && window.luckyModeActive) {
            // 50% chance to force Mexico (on top of normal 1/36 chance)
            if (Math.random() < 0.5) {
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

        // Update dice display
        elements.dice1.textContent = diceSymbols[actor.dice1 - 1];
        elements.dice2.textContent = diceSymbols[actor.dice2 - 1];
        elements.dice1.classList.remove('rolling');
        elements.dice2.classList.remove('rolling');

        // Handle Mexico (always revealed)
        if (actor.isMexico) {
            actor.isBlind = false;
            isBlind = false;
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');
            celebrateMexico();
        }

        // Handle blind throw
        if (isBlind && !actor.isMexico) {
            actor.isBlind = true;
            elements.dice1.classList.add('hidden');
            elements.dice2.classList.add('hidden');

            if (who === 'player') {
                // FIRST ROUND: Player must stay blind until computer has also thrown!
                if (gameState.isFirstRound) {
                    logToConsole(`[Speler] BLIND - EERSTE RONDE - Worp blijft verborgen tot computer ook heeft gegooid`);
                    showMessage(`🙈 Blind gegooid! Worp blijft verborgen. Computer is aan de beurt...`, 'info');
                    disablePlayerButtons();

                    // Auto-continue to computer's turn, keeping it blind
                    setTimeout(() => {
                        handlePlayerKeep();
                    }, 2500);
                } else if (gameState.player.throwCount >= gameState.maxThrows) {
                    // Check if player reached max throws - if so, keep it blind and auto-continue
                    logToConsole(`[Speler] BLIND - AUTOMATISCH VASTGEZET - Worplimiet bereikt (${gameState.maxThrows})`);
                    showMessage(`🙈 Blind gegooid! Worp blijft verborgen (limiet: ${gameState.maxThrows}). Computer is aan de beurt...`, 'info');
                    disablePlayerButtons();

                    // Auto-keep after short delay, keeping it blind
                    setTimeout(() => {
                        handlePlayerKeep();
                    }, 2500);
                } else {
                    showMessage('🙈 Blind gegooid! Klik "Laten Zien" om te onthullen', 'info');
                    showRevealButton();
                }
            }
        } else {
            // Open throw or Mexico
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');
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
                    }, 2000);
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
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');
            updateThrowDisplay();
            logToConsole(`[Speler] ONTHUL - Resultaat: ${player.displayThrow || player.currentThrow}${player.isMexico ? ' (MEXICO!)' : ''}`);
        }
        if (computer.isBlind) {
            computer.isBlind = false;
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');
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
        }, 3000);
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
            message = `🎯 Jij: ${playerDisplay} vs Computer: ${computerDisplay}<br>Je wint de eerste ronde! Computer verliest ${penaltyText} (${computer.lives} over)<br>Computer is voorgooier voor ronde 2.`;
            logToConsole(`Ronde 1: Speler ${playerDisplay} > Computer ${computerDisplay} - Speler wint, Computer verliest ${penalty} (${gameState.mexicoCount}× Mexico), ${computer.lives} levens over`);
        } else if (computer.currentThrow > player.currentThrow) {
            // Computer wins first round - player loses lives and becomes voorgooier
            player.lives -= penalty;
            gameState.playerToGoFirst = 'player';
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
            elements.dice1.textContent = diceSymbols[0];
            elements.dice2.textContent = diceSymbols[0];
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');

            updateUI();

            // Both throw blind again (first round rule)
            setTimeout(() => {
                logToConsole(`[VASTGOOIER] Knoppen activeren - speler mag opnieuw gooien (1 worp)`);
                showMessage('🎲 Eerste ronde blijft blind - gooi opnieuw (1 worp)!', 'info');
                enablePlayerButtons();
            }, 3000);
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
                logToConsole(`[VOLGENDE RONDE] Wachten 3 sec voordat ronde 2 start...`);
                // Next round - longer delay to read results
                setTimeout(() => {
                    logToConsole(`[START RONDE 2] startNextRound() wordt aangeroepen...`);
                    startNextRound();
                }, 3000);
            }
        }, 3000);
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
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');
            updateThrowDisplay();
            logToConsole(`[Speler] ONTHUL - Resultaat: ${player.displayThrow || player.currentThrow}${player.isMexico ? ' (MEXICO!)' : ''}`);
        }
        if (computer.isBlind) {
            computer.isBlind = false;
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');
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
            }, 3000);
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
            message = `🎉 Je wint de ronde!<br>Jij: ${playerDisplay} vs Computer: ${computerDisplay}<br>Computer verliest ${penaltyText} (${computer.lives} over)`;
            logToConsole(`Ronde ${gameState.roundNumber}: Speler ${playerDisplay} > Computer ${computerDisplay} - Speler wint, Computer verliest ${penalty} (${gameState.mexicoCount}× Mexico), ${computer.lives} levens over`);

            // Computer becomes voorgooier (goes first next round)
            gameState.playerToGoFirst = 'computer';
        } else if (computer.currentThrow > player.currentThrow) {
            // Computer wins round
            player.lives -= penalty;
            winner = 'computer';
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
            elements.dice1.textContent = diceSymbols[0];
            elements.dice2.textContent = diceSymbols[0];
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');

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
                    }, 2500);
                }
            }, 3000);
            return;
        }

        showMessage(message, winner === 'player' ? 'success' : 'warning');
        updateUI();

        // Check for game over with longer delays
        setTimeout(() => {
            if (player.lives <= 0 || computer.lives <= 0) {
                handleGameOver();
            } else {
                // Next round - longer delay to read results
                setTimeout(() => {
                    startNextRound();
                }, 3000);
            }
        }, 3000);
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
        gameState.voorgooierThrewBlind = false;

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

        gameState.computer.currentThrow = null;
        gameState.computer.displayThrow = null;
        gameState.computer.isMexico = false;
        gameState.computer.throwCount = 0;
        gameState.computer.isBlind = false;
        gameState.computer.threwBlindThisRound = false;
        gameState.computer.dice1 = 1;
        gameState.computer.dice2 = 1;

        // Determine who goes first
        gameState.currentTurn = gameState.playerToGoFirst;

        // Reset dice display
        elements.dice1.textContent = diceSymbols[0];
        elements.dice2.textContent = diceSymbols[0];
        elements.dice1.classList.remove('hidden');
        elements.dice2.classList.remove('hidden');

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
            logToConsole(`[startNextRound] Computer beurt start over 2.5 seconden...`);
            setTimeout(() => {
                logToConsole(`[startNextRound] computerTurn() wordt aangeroepen...`);
                computerTurn();
            }, 2500);
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
        gameState.voorgooierThrewBlind = false;

        gameState.player.currentThrow = null;
        gameState.player.displayThrow = null;
        gameState.player.isMexico = false;
        gameState.player.throwCount = 0;
        gameState.player.isBlind = false;
        gameState.player.threwBlindThisRound = false;
        gameState.player.dice1 = 1;
        gameState.player.dice2 = 1;

        gameState.computer.currentThrow = null;
        gameState.computer.displayThrow = null;
        gameState.computer.isMexico = false;
        gameState.computer.throwCount = 0;
        gameState.computer.isBlind = false;
        gameState.computer.threwBlindThisRound = false;
        gameState.computer.dice1 = 1;
        gameState.computer.dice2 = 1;

        elements.dice1.textContent = diceSymbols[0];
        elements.dice2.textContent = diceSymbols[0];
        elements.dice1.classList.remove('hidden');
        elements.dice2.classList.remove('hidden');

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
        } else if (gameState.player.lives > 0) {
            // Player wins
            showMessage('🎉🎊 JE HEBT GEWONNEN! DE COMPUTER IS VERSLAGEN! 🎊🎉', 'success');
            celebrateWin();
        } else {
            // Computer wins
            showMessage('😔 Game Over! De computer heeft gewonnen. Probeer opnieuw!', 'danger');
        }

        disablePlayerButtons();
    }

    // ========================================
    // UI Updates
    // ========================================
    function updateUI() {
        // Update lives
        elements.playerLives.textContent = gameState.player.lives;
        elements.computerLives.textContent = gameState.computer.lives;

        // Color lives based on remaining
        updateLivesColor(elements.playerLives, gameState.player.lives);
        updateLivesColor(elements.computerLives, gameState.computer.lives);

        // Update round number
        elements.roundNumber.textContent = gameState.roundNumber;

        // Update turn indicator
        updateTurnIndicator();

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

    function updateTurnIndicator() {
        if (gameState.currentTurn === 'player') {
            elements.currentPlayer.textContent = '👤 Jouw beurt!';
            elements.currentPlayer.style.color = 'var(--color-green)';
        } else {
            elements.currentPlayer.textContent = '🤖 Computer is aan de beurt';
            elements.currentPlayer.style.color = 'var(--color-red)';
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

        const title = {
            success: 'Gelukt!',
            warning: 'Let op',
            danger: 'Verloren',
            info: 'Info'
        };

        elements.gameInfo.innerHTML = `
            <div class="text-base font-bold mb-2" style="color: ${colors[type]}">
                ${icons[type]} ${title[type]}
            </div>
            <p class="text-brown-medium text-sm">${message}</p>
        `;
    }

    // ========================================
    // Button Management
    // ========================================
    function enablePlayerButtons() {
        elements.throwBlindBtn.classList.remove('hidden');
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

            // RULE CHECK: If voorgooier threw all open, achterligger MUST throw all open
            if (!gameState.isFirstRound && gameState.playerToGoFirst === 'computer' && !gameState.voorgooierThrewBlind) {
                // Voorgooier (computer) threw all open, so player must also throw open
                elements.throwBlindBtn.disabled = true;
                elements.throwBlindBtn.style.opacity = '0.5';
                elements.throwBlindBtn.style.cursor = 'not-allowed';
                logToConsole('[REGEL] Speler MAG NIET blind gooien (voorgooier gooide alleen open)');
            } else {
                elements.throwBlindBtn.disabled = false;
                elements.throwBlindBtn.style.opacity = '1';
                elements.throwBlindBtn.style.cursor = 'pointer';
            }
        }
    }

    function disablePlayerButtons() {
        elements.throwOpenBtn.classList.add('hidden');
        elements.throwBlindBtn.classList.add('hidden');
        elements.keepBtn.classList.add('hidden');
        elements.revealBtn.classList.add('hidden');
    }

    function showThrowAgainButtons() {
        // First round check: only show blind button
        if (gameState.isFirstRound && gameState.player.throwCount === 0) {
            elements.throwOpenBtn.classList.add('hidden');
        } else {
            elements.throwOpenBtn.classList.remove('hidden');
        }
        elements.throwBlindBtn.classList.remove('hidden');
        elements.keepBtn.classList.remove('hidden');
        elements.revealBtn.classList.add('hidden');
    }

    function showKeepButton() {
        elements.throwOpenBtn.classList.add('hidden');
        elements.throwBlindBtn.classList.add('hidden');
        elements.keepBtn.classList.remove('hidden');
        elements.revealBtn.classList.add('hidden');
    }

    function showRevealButton() {
        elements.throwOpenBtn.classList.add('hidden');
        elements.throwBlindBtn.classList.add('hidden');
        elements.keepBtn.classList.add('hidden');
        elements.revealBtn.classList.remove('hidden');
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
