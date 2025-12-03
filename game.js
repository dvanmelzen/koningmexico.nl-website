// ========================================
// Koning Mexico - Game Logic
// ========================================

(function() {
    'use strict';

    // Game State
    let gameState = {
        lives: 6,
        currentThrow: null,
        throwCount: 0,
        maxThrows: 3,
        dice1: 1,
        dice2: 1,
        isBlind: false,
        roundActive: false,
        // New settings
        isVoorgooier: false,
        worplimiet: 3,
        thirdThrowClosed: false,
        isFirstRound: true,
        // Voorgooier pattern tracking
        voorgooierPattern: [], // Array of 'open' or 'blind' for each throw
        isSettingPattern: false // True when voorgooier is creating the pattern
    };

    // DOM Elements
    const elements = {
        livesDisplay: document.getElementById('livesDisplay'),
        currentThrow: document.getElementById('currentThrow'),
        throwCount: document.getElementById('throwCount'),
        maxThrowsDisplay: document.getElementById('maxThrowsDisplay'),
        diceCup: document.getElementById('diceCup'),
        diceContainer: document.getElementById('diceContainer'),
        dice1: document.getElementById('dice1'),
        dice2: document.getElementById('dice2'),
        gameInfo: document.getElementById('gameInfo'),

        // Button containers
        initialButtons: document.getElementById('initialButtons'),
        afterThrowButtons: document.getElementById('afterThrowButtons'),
        blindRevealButtons: document.getElementById('blindRevealButtons'),
        mexicoButtons: document.getElementById('mexicoButtons'),
        resultButtons: document.getElementById('resultButtons'),

        // Individual buttons
        throwOpenBtn: document.getElementById('throwOpenBtn'),
        throwBlindBtn: document.getElementById('throwBlindBtn'),
        throwAgainOpenBtn: document.getElementById('throwAgainOpenBtn'),
        throwAgainBlindBtn: document.getElementById('throwAgainBlindBtn'),
        keepBtn: document.getElementById('keepBtn'),
        revealBtn: document.getElementById('revealBtn'),
        vastBtn: document.getElementById('vastBtn'),
        lostBtn: document.getElementById('lostBtn'),
        keepMexicoBtn: document.getElementById('keepMexicoBtn'),
        vastMexicoBtn: document.getElementById('vastMexicoBtn'),
        wonBtn: document.getElementById('wonBtn'),
        wonResultBtn: document.getElementById('wonResultBtn'),
        vastResultBtn: document.getElementById('vastResultBtn'),
        lostResultBtn: document.getElementById('lostResultBtn'),

        // Settings controls
        voorgooierToggle: document.getElementById('voorgooierToggle'),
        thirdThrowClosedToggle: document.getElementById('thirdThrowClosedToggle'),
        firstRoundIndicator: document.getElementById('firstRoundIndicator'),
        worplimietBtns: document.querySelectorAll('.worplimiet-btn'),
        patternDisplay: document.getElementById('patternDisplay'),
        patternList: document.getElementById('patternList'),
        refreshBtn: document.getElementById('refreshBtn')
    };

    // Dice symbols
    const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    // ========================================
    // Initialize Game
    // ========================================
    function init() {
        // Event Listeners - Game Actions
        elements.throwOpenBtn.addEventListener('click', () => throwDice(false));
        elements.throwBlindBtn.addEventListener('click', () => throwDice(true));
        elements.throwAgainOpenBtn.addEventListener('click', () => throwDice(false));
        elements.throwAgainBlindBtn.addEventListener('click', () => throwDice(true));
        elements.keepBtn.addEventListener('click', handleKeep);
        elements.revealBtn.addEventListener('click', handleReveal);
        elements.vastBtn.addEventListener('click', handleVast);
        elements.lostBtn.addEventListener('click', handleLost);
        elements.keepMexicoBtn.addEventListener('click', handleKeep);
        elements.vastMexicoBtn.addEventListener('click', handleVast);
        elements.wonBtn.addEventListener('click', handleWon);
        elements.wonResultBtn.addEventListener('click', handleWon);
        elements.vastResultBtn.addEventListener('click', handleVast);
        elements.lostResultBtn.addEventListener('click', handleLost);

        // Event Listeners - Settings
        elements.voorgooierToggle.addEventListener('click', toggleVoorgooier);
        elements.thirdThrowClosedToggle.addEventListener('click', toggleThirdThrowClosed);
        elements.refreshBtn.addEventListener('click', handleNewRound);

        elements.worplimietBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const limit = parseInt(btn.getAttribute('data-limit'));
                setWorplimiet(limit);
            });
        });

        updateUI();
        updateFirstRoundIndicator();
        updateWorplimietButtons();
        console.log('🎲 Mexico Spel geladen! Veel speelplezier!');
    }

    // ========================================
    // Throw Dice
    // ========================================
    function throwDice(isBlind) {
        if (gameState.throwCount >= gameState.maxThrows) {
            showMessage('⚠️ Maximum aantal worpen bereikt!', 'warning');
            return;
        }

        // FORCE BLIND on first round ONLY if NO voorgooier
        if (gameState.isFirstRound && gameState.throwCount === 0 && !gameState.isVoorgooier) {
            isBlind = true;
            showMessage('🔒 Eerste ronde zonder voorgooier is altijd blind!', 'info');
        }

        // FORCE CLOSED on third throw if setting enabled (unless voorgooier is setting pattern)
        if (gameState.thirdThrowClosed && gameState.throwCount === 2 && !gameState.isVoorgooier) {
            isBlind = true;
            showMessage('🙈 Derde worp is dicht!', 'info');
        }

        // FOLLOW VOORGOOIER PATTERN if not voorgooier and pattern exists
        if (!gameState.isVoorgooier && gameState.voorgooierPattern.length > 0) {
            const patternIndex = gameState.throwCount;
            if (patternIndex < gameState.voorgooierPattern.length) {
                const requiredType = gameState.voorgooierPattern[patternIndex];
                if (requiredType === 'blind') {
                    isBlind = true;
                    showMessage(`🎯 Voorgooier patroon: worp ${patternIndex + 1} is blind`, 'info');
                } else {
                    isBlind = false;
                    showMessage(`🎯 Voorgooier patroon: worp ${patternIndex + 1} is open`, 'info');
                }
            }
        }

        // Record pattern if voorgooier is setting it
        if (gameState.isVoorgooier && gameState.isSettingPattern) {
            gameState.voorgooierPattern.push(isBlind ? 'blind' : 'open');
            updatePatternDisplay();
        }

        gameState.isBlind = isBlind;
        gameState.throwCount++;
        gameState.roundActive = true;

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
                finishThrow();
            }
        }, 50);
    }

    function finishThrow() {
        // Generate final dice values
        gameState.dice1 = Math.floor(Math.random() * 6) + 1;
        gameState.dice2 = Math.floor(Math.random() * 6) + 1;

        // Calculate throw value (highest first)
        const higher = Math.max(gameState.dice1, gameState.dice2);
        const lower = Math.min(gameState.dice1, gameState.dice2);

        let throwValue;
        if (higher === lower) {
            // Doubles as hundreds (66 = 600, 55 = 500, etc.)
            throwValue = higher * 100;
        } else if ((higher === 2 && lower === 1) || (higher === 1 && lower === 2)) {
            // Mexico!
            throwValue = 21;
        } else {
            // Regular throw (highest first)
            throwValue = higher * 10 + lower;
        }

        gameState.currentThrow = throwValue;

        // Update dice display
        elements.dice1.textContent = diceSymbols[gameState.dice1 - 1];
        elements.dice2.textContent = diceSymbols[gameState.dice2 - 1];
        elements.dice1.classList.remove('rolling');
        elements.dice2.classList.remove('rolling');

        // Check for Mexico FIRST (always visible, even when blind!)
        if (throwValue === 21) {
            // Mexico is always revealed immediately!
            gameState.isBlind = false;
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');
            updateThrowDisplay();
            celebrateMexico();
            // After Mexico, show special Mexico options
            showMexicoButtons();
        } else if (!gameState.isBlind) {
            // Normal open throw
            elements.dice1.classList.remove('hidden');
            elements.dice2.classList.remove('hidden');
            updateThrowDisplay();

            // Check if max throws reached - automatic "Laten Staan"
            if (gameState.throwCount >= gameState.maxThrows) {
                showMessage(`Je gooide ${throwValue}! Maximum worpen bereikt. Wat is het resultaat?`, 'info');
                showResultButtons(); // No more throws, choose result
            } else {
                showMessage(`Je gooide ${throwValue}!`, 'success');
                showAfterThrowButtons(); // Can throw again or keep
            }
        } else {
            // Blind throw - HIDE the dice! No re-throw option!
            elements.dice1.classList.add('hidden');
            elements.dice2.classList.add('hidden');
            elements.currentThrow.textContent = '🙈';
            elements.currentThrow.className = 'throw-result';
            elements.currentThrow.style.color = 'var(--color-brown-medium)';
            showMessage('🙈 Blind gegooid! Klik "Laten Zien" om te onthullen', 'info');
            showBlindRevealButtons(); // Only reveal option
        }

        updateUI();
    }

    // ========================================
    // Handle Actions
    // ========================================
    function handleKeep() {
        // If voorgooier is setting pattern, finalize it
        if (gameState.isVoorgooier && gameState.isSettingPattern) {
            gameState.isSettingPattern = false;
            gameState.maxThrows = gameState.voorgooierPattern.length;
            showMessage(`✓ Voorgooier patroon vastgesteld! ${gameState.maxThrows} ${gameState.maxThrows === 1 ? 'worp' : 'worpen'}. Wat is het resultaat?`, 'success');
            showResultButtons();
            return;
        }

        // "Laten Staan" = Stop met gooien, kies resultaat
        showMessage('✓ Worp staat! Wat is het resultaat van de ronde?', 'info');
        showResultButtons();
    }

    function handleReveal() {
        // Reveal blind throw
        gameState.isBlind = false;

        // Remove hidden class from dice to reveal them
        elements.dice1.classList.remove('hidden');
        elements.dice2.classList.remove('hidden');

        updateThrowDisplay();

        // If voorgooier is setting pattern, finalize it
        if (gameState.isVoorgooier && gameState.isSettingPattern) {
            gameState.isSettingPattern = false;
            gameState.maxThrows = gameState.voorgooierPattern.length;
            showMessage(`✓ Voorgooier patroon vastgesteld! ${gameState.maxThrows} ${gameState.maxThrows === 1 ? 'worp' : 'worpen'}. Je gooide ${gameState.currentThrow}!`, 'success');
            // After voorgooier pattern, go straight to result
            showResultButtons();
        } else if (gameState.throwCount === 1) {
            // EERSTE BLINDE WORP: Geen hergooien mogelijk!
            // Direct naar resultaat keuze: Ronde gehaald, Vast, of Verloren
            showMessage(`Je gooide ${gameState.currentThrow}! Eerste blinde worp - kies het resultaat`, 'info');
            showResultButtons();
        } else {
            // Latere worpen: normale logica (kan wel hergooien)
            showMessage(`Je gooide ${gameState.currentThrow}! Kies je actie`, 'success');
            showAfterThrowButtons();
        }
    }

    function handleWon() {
        const encouragements = [
            '🎉 Ronde gehaald! Je levens blijven intact!',
            '✓ Geweldig! Je bent veilig deze ronde!',
            '👏 Mooi gegooid! Geen levens verloren!',
            '🌟 Top! Je overleeft deze ronde!',
            '💪 Sterk gegooid! Je blijft in het spel!'
        ];

        const randomMessage = encouragements[Math.floor(Math.random() * encouragements.length)];
        showMessage(randomMessage, 'success');

        // Small celebration
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                createConfetti('#D4AF37');
            }, i * 30);
        }

        // Je bent NIET de voorgooier als je wint
        gameState.isVoorgooier = false;
        elements.voorgooierToggle.classList.remove('active');

        // Reset for new round
        setTimeout(() => {
            resetRound();
        }, 1500);
    }

    function resetRound() {
        // Mark first round as complete
        gameState.isFirstRound = false;
        updateFirstRoundIndicator();

        // Force complete reset
        gameState.currentThrow = null;
        gameState.throwCount = 0;
        // Use voorgooier pattern length if pattern is set, otherwise worplimiet
        gameState.maxThrows = gameState.voorgooierPattern.length > 0
            ? gameState.voorgooierPattern.length
            : gameState.worplimiet;
        gameState.isBlind = false;
        gameState.roundActive = false;
        gameState.dice1 = 1;
        gameState.dice2 = 1;

        // If voorgooier, restart pattern setting for next round
        if (gameState.isVoorgooier) {
            gameState.isSettingPattern = true;
            gameState.voorgooierPattern = [];
            updatePatternDisplay();
        }

        elements.dice1.textContent = diceSymbols[0];
        elements.dice2.textContent = diceSymbols[0];
        elements.dice1.classList.remove('hidden');
        elements.dice2.classList.remove('hidden');
        elements.currentThrow.textContent = '--';
        elements.currentThrow.className = 'throw-result';

        showMessage('🎲 Nieuwe ronde! Gooi de dobbelstenen', 'info');
        showInitialButtons();
        updateUI();
    }

    function handleVast() {
        showMessage('Vast! Je mag nog 1× gooien om te tie-breaken', 'info');

        // For vast (tie-breaker), allow exactly ONE more throw
        // Set maxThrows to current count + 1
        gameState.maxThrows = gameState.throwCount + 1;

        showInitialButtons();
        updateUI();
    }

    function handleLost() {
        gameState.lives--;

        if (gameState.lives <= 0) {
            showMessage('💀 Game Over! Je bent af. Start opnieuw?', 'danger');
            gameState.lives = 0;
            updateUI();

            // Show new round button
            setTimeout(() => {
                handleGameOver();
            }, 2000);
        } else {
            showMessage(`❌ Verloren! Je hebt nog ${gameState.lives} ${gameState.lives === 1 ? 'leven' : 'levens'}. 👑 Jij bent nu de voorgooier!`, 'warning');

            // JE WORDT AUTOMATISCH VOORGOOIER als je verliest
            gameState.isVoorgooier = true;
            elements.voorgooierToggle.classList.add('active');

            // Reset for new round
            setTimeout(() => {
                resetRound();
            }, 1500);
        }
    }

    function handleNewRound() {
        resetRound();
    }

    function handleGameOver() {
        if (confirm('💀 Game Over! Je bent af.\n\nWil je opnieuw beginnen met 6 levens?')) {
            gameState.lives = 6;
            gameState.isFirstRound = true; // Reset to first round
            updateFirstRoundIndicator();
            handleNewRound();
        }
    }

    // ========================================
    // Settings Handlers
    // ========================================
    function toggleVoorgooier() {
        gameState.isVoorgooier = !gameState.isVoorgooier;

        if (gameState.isVoorgooier) {
            elements.voorgooierToggle.classList.add('active');
            // Start pattern setting mode
            gameState.isSettingPattern = true;
            gameState.voorgooierPattern = [];
            updatePatternDisplay();
            showMessage('👑 Je bent nu de voorgooier! Bij elke worp bepaal je: open of blind', 'info');
        } else {
            elements.voorgooierToggle.classList.remove('active');
            gameState.isSettingPattern = false;
            // Clear pattern when turning off voorgooier
            gameState.voorgooierPattern = [];
            updatePatternDisplay();
            // Reset to worplimiet
            gameState.maxThrows = gameState.worplimiet;
            updateUI();
            showMessage('👤 Je bent niet langer de voorgooier. Worplimiet instellingen actief', 'info');
        }
        updateWorplimietButtons();
    }

    function toggleThirdThrowClosed() {
        gameState.thirdThrowClosed = !gameState.thirdThrowClosed;

        if (gameState.thirdThrowClosed) {
            elements.thirdThrowClosedToggle.classList.add('active');
            showMessage('🙈 Derde worp zal nu altijd blind zijn', 'info');
        } else {
            elements.thirdThrowClosedToggle.classList.remove('active');
            showMessage('👁️ Derde worp kan nu open of blind', 'info');
        }
    }

    function setWorplimiet(limit) {
        // Check if voorgooier pattern is active
        if (gameState.voorgooierPattern.length > 0 && !gameState.isVoorgooier) {
            showMessage('⚠️ Voorgooier patroon is actief. Worplimiet kan niet worden aangepast.', 'warning');
            return;
        }

        gameState.worplimiet = limit;
        gameState.maxThrows = limit;

        // Update button styles
        elements.worplimietBtns.forEach(btn => {
            if (parseInt(btn.getAttribute('data-limit')) === limit) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        showMessage(`🎲 Worplimiet ingesteld op ${limit} ${limit === 1 ? 'worp' : 'worpen'}`, 'info');
        updateUI();
    }

    function updateWorplimietButtons() {
        // Disable worplimiet buttons if voorgooier pattern is active
        const hasPattern = gameState.voorgooierPattern.length > 0 && !gameState.isVoorgooier;

        elements.worplimietBtns.forEach(btn => {
            if (hasPattern) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }

    function updateFirstRoundIndicator() {
        if (gameState.isFirstRound) {
            elements.firstRoundIndicator.classList.remove('hidden');
        } else {
            elements.firstRoundIndicator.classList.add('hidden');
        }
    }

    function updatePatternDisplay() {
        if (gameState.voorgooierPattern.length === 0) {
            elements.patternDisplay.classList.add('hidden');
            updateWorplimietButtons();
            return;
        }

        elements.patternDisplay.classList.remove('hidden');
        elements.patternList.innerHTML = '';

        gameState.voorgooierPattern.forEach((type, index) => {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 rounded text-xs font-semibold';

            if (type === 'open') {
                badge.style.background = 'var(--color-green)';
                badge.style.color = 'white';
                badge.textContent = `${index + 1}. Open`;
            } else {
                badge.style.background = 'var(--color-brown-dark)';
                badge.style.color = 'var(--color-gold)';
                badge.textContent = `${index + 1}. Blind`;
            }

            elements.patternList.appendChild(badge);
        });

        updateWorplimietButtons();
    }

    // ========================================
    // UI Updates
    // ========================================
    function updateUI() {
        elements.livesDisplay.textContent = gameState.lives;
        elements.throwCount.textContent = gameState.throwCount;
        elements.maxThrowsDisplay.textContent = gameState.maxThrows;

        // Color lives display based on remaining lives
        if (gameState.lives <= 2) {
            elements.livesDisplay.style.borderColor = 'var(--color-red)';
            elements.livesDisplay.style.color = 'var(--color-red-light)';
        } else if (gameState.lives <= 4) {
            elements.livesDisplay.style.borderColor = '#FFD700';
            elements.livesDisplay.style.color = '#FFD700';
        } else {
            elements.livesDisplay.style.borderColor = 'var(--color-gold)';
            elements.livesDisplay.style.color = 'var(--color-gold-light)';
        }
    }

    function updateThrowDisplay() {
        const value = gameState.currentThrow;
        elements.currentThrow.textContent = value;

        // Style based on throw value
        if (value === 21) {
            elements.currentThrow.className = 'throw-result mexico';
        } else if (value >= 100) {
            elements.currentThrow.className = 'throw-result';
            elements.currentThrow.style.color = 'var(--color-gold)';
        } else {
            elements.currentThrow.className = 'throw-result';
            elements.currentThrow.style.color = 'var(--color-green)';
        }
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

        elements.gameInfo.innerHTML = `
            <div class="text-lg font-bold mb-2" style="color: ${colors[type]}">
                ${icons[type]} ${type === 'success' ? 'Resultaat' : type === 'warning' ? 'Let op!' : type === 'danger' ? 'Verloren' : 'Info'}
            </div>
            <p class="text-brown-medium">${message}</p>
        `;
    }

    // ========================================
    // Button Visibility
    // ========================================
    function showInitialButtons() {
        elements.initialButtons.classList.remove('hidden');
        elements.afterThrowButtons.classList.add('hidden');
        elements.blindRevealButtons.classList.add('hidden');
        elements.mexicoButtons.classList.add('hidden');
        elements.resultButtons.classList.add('hidden');
    }

    function showAfterThrowButtons() {
        elements.initialButtons.classList.add('hidden');
        elements.afterThrowButtons.classList.remove('hidden');
        elements.blindRevealButtons.classList.add('hidden');
        elements.mexicoButtons.classList.add('hidden');
        elements.resultButtons.classList.add('hidden');

        // Disable throw again buttons if max throws reached
        if (gameState.throwCount >= gameState.maxThrows) {
            elements.throwAgainOpenBtn.disabled = true;
            elements.throwAgainOpenBtn.style.opacity = '0.5';
            elements.throwAgainBlindBtn.disabled = true;
            elements.throwAgainBlindBtn.style.opacity = '0.5';
        } else {
            elements.throwAgainOpenBtn.disabled = false;
            elements.throwAgainOpenBtn.style.opacity = '1';
            elements.throwAgainBlindBtn.disabled = false;
            elements.throwAgainBlindBtn.style.opacity = '1';
        }
    }

    function showBlindRevealButtons() {
        elements.initialButtons.classList.add('hidden');
        elements.afterThrowButtons.classList.add('hidden');
        elements.blindRevealButtons.classList.remove('hidden');
        elements.mexicoButtons.classList.add('hidden');
        elements.resultButtons.classList.add('hidden');
    }

    function showMexicoButtons() {
        elements.initialButtons.classList.add('hidden');
        elements.afterThrowButtons.classList.add('hidden');
        elements.blindRevealButtons.classList.add('hidden');
        elements.mexicoButtons.classList.remove('hidden');
        elements.resultButtons.classList.add('hidden');
    }

    function showResultButtons() {
        elements.initialButtons.classList.add('hidden');
        elements.afterThrowButtons.classList.add('hidden');
        elements.blindRevealButtons.classList.add('hidden');
        elements.mexicoButtons.classList.add('hidden');
        elements.resultButtons.classList.remove('hidden');
    }

    // ========================================
    // Mexico Celebration
    // ========================================
    function celebrateMexico() {
        showMessage('🎉🎊 MEXICO! DE KONING DER WORPEN! 🎊🎉', 'success');

        // BIG Confetti animation - more and longer!
        const colors = ['#D4AF37', '#FFD700', '#8B0000', '#0D5E3A', '#B8960F'];

        // First wave - immediate burst
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                createConfetti(colors[Math.floor(Math.random() * colors.length)]);
            }, i * 15);
        }

        // Second wave - delayed
        setTimeout(() => {
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    createConfetti(colors[Math.floor(Math.random() * colors.length)]);
                }, i * 15);
            }
        }, 500);

        // Show BIG celebration message
        const celebration = document.createElement('div');
        celebration.innerHTML = '🎉<br>MEXICO!<br>🎉';
        Object.assign(celebration.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '4rem',
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
    // Start Game
    // ========================================
    init();

})();
