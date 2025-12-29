// Multiplayer Mexico Game - Client (CORRECTE SPELREGELS)
const API_URL = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

// Global state
let socket = null;
let currentUser = null;
let accessToken = null;
let currentGame = null;
let isMyTurn = false;
let currentThrowData = null;
let debugMode = true;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('currentUser');

    if (storedToken && storedUser) {
        accessToken = storedToken;
        currentUser = JSON.parse(storedUser);
        initializeSocket();
        showLobby();
    } else {
        showAuth();
    }

    setupAuthListeners();
    setupLobbyListeners();
    setupGameListeners();
    setupUIListeners();

    // Update header user display if logged in
    if (currentUser) {
        updateHeaderUserDisplay();
    }
});

// ============================================
// SCREEN MANAGEMENT
// ============================================

function showAuth() {
    hideAllScreens();
    document.getElementById('authScreen')?.classList.remove('hidden');
}

function showLobby() {
    hideAllScreens();
    document.getElementById('lobbyScreen')?.classList.remove('hidden');
    loadLeaderboard();
    updateUserStats();
}

function showGame() {
    hideAllScreens();
    document.getElementById('gameScreen')?.classList.remove('hidden');
}

function hideAllScreens() {
    ['authScreen', 'lobbyScreen', 'gameScreen'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
}

// ============================================
// AUTH
// ============================================

function setupAuthListeners() {
    // Form submit handlers
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });

    document.getElementById('registerForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleRegister();
    });

    // Tab switching
    document.getElementById('loginTab')?.addEventListener('click', () => {
        document.getElementById('loginForm')?.classList.remove('hidden');
        document.getElementById('registerForm')?.classList.add('hidden');
        document.getElementById('loginTab').style.borderColor = 'var(--color-gold)';
        document.getElementById('loginTab').style.color = 'var(--text-primary)';
        document.getElementById('registerTab').style.borderColor = 'transparent';
        document.getElementById('registerTab').style.color = 'var(--text-secondary)';
    });

    document.getElementById('registerTab')?.addEventListener('click', () => {
        document.getElementById('registerForm')?.classList.remove('hidden');
        document.getElementById('loginForm')?.classList.add('hidden');
        document.getElementById('registerTab').style.borderColor = 'var(--color-gold)';
        document.getElementById('registerTab').style.color = 'var(--text-primary)';
        document.getElementById('loginTab').style.borderColor = 'transparent';
        document.getElementById('loginTab').style.color = 'var(--text-secondary)';
    });

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
}

async function handleLogin() {
    const username = document.getElementById('loginUsername')?.value;
    const password = document.getElementById('loginPassword')?.value;

    if (!username || !password) {
        showToast('Vul alle velden in', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || 'Login mislukt', 'error');
            return;
        }

        currentUser = data.user;
        accessToken = data.accessToken;

        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('accessToken', accessToken);

        initializeSocket();
        updateHeaderUserDisplay();
        showLobby();
    } catch (error) {
        console.error('Login error:', error);
        showToast('Verbinding mislukt - is de server actief?', 'error');
    }
}

async function handleRegister() {
    const username = document.getElementById('registerUsername')?.value;
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;

    if (!username || !email || !password) {
        showToast('Vul alle velden in', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || 'Registratie mislukt', 'error');
            return;
        }

        currentUser = data.user;
        accessToken = data.accessToken;

        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('accessToken', accessToken);

        showToast(`Welkom ${currentUser.username}!`, 'success');
        initializeSocket();
        updateHeaderUserDisplay();
        showLobby();
    } catch (error) {
        console.error('Register error:', error);
        showToast('Verbinding mislukt - is de server actief?', 'error');
    }
}

// ============================================
// UI LISTENERS (Debug, Dark Mode, etc.)
// ============================================

function setupUIListeners() {
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');

    // Check for saved dark mode preference (already applied in HTML, just update icon)
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode && darkModeIcon) {
        darkModeIcon.textContent = '☀️';
    }

    darkModeToggle?.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark-mode');
        const isDark = document.documentElement.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        if (darkModeIcon) {
            darkModeIcon.textContent = isDark ? '☀️' : '🌙';
        }
    });

    // Debug toggle
    const debugToggle = document.getElementById('debugToggle');
    const debugPanel = document.getElementById('debugPanel');

    debugToggle?.addEventListener('click', () => {
        debugPanel?.classList.toggle('hidden');
        debugMode = !debugPanel?.classList.contains('hidden');
    });

    // Clear debug log
    document.getElementById('clearDebugBtn')?.addEventListener('click', () => {
        const debugLog = document.getElementById('debugLog');
        if (debugLog) debugLog.innerHTML = '';
    });
}

// Update header user display (username and ELO)
function updateHeaderUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    const usernameEl = document.getElementById('username');
    const eloRatingEl = document.getElementById('eloRating');
    const logoutBtn = document.getElementById('logoutBtn');

    if (currentUser) {
        // Show user info
        userDisplay?.classList.remove('hidden');
        logoutBtn?.classList.remove('hidden');

        // Update content
        if (usernameEl) usernameEl.textContent = currentUser.username;
        if (eloRatingEl) eloRatingEl.textContent = `(${currentUser.eloRating || 1200} ELO)`;
    } else {
        // Hide when logged out
        userDisplay?.classList.add('hidden');
        logoutBtn?.classList.add('hidden');
    }
}

// Debug logging function
function debugLog(message, type = 'info') {
    if (!debugMode) return;

    const debugLogEl = document.getElementById('debugLog');
    if (!debugLogEl) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = 'text-xs';

    let color = 'text-green-400';
    let icon = 'ℹ️';

    if (type === 'error') {
        color = 'text-red-400';
        icon = '❌';
    } else if (type === 'warn') {
        color = 'text-yellow-400';
        icon = '⚠️';
    } else if (type === 'success') {
        color = 'text-green-300';
        icon = '✅';
    }

    logEntry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> <span class="${color}">${icon} ${message}</span>`;
    debugLogEl.appendChild(logEntry);
    debugLogEl.scrollTop = debugLogEl.scrollHeight;
}

// Toast notification system (replaces alerts)
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-notification p-4 rounded-lg shadow-lg mb-2 fade-in';

    let bgColor = 'bg-blue-500';
    let icon = 'ℹ️';

    if (type === 'success') {
        bgColor = 'bg-green-500';
        icon = '✅';
    } else if (type === 'error') {
        bgColor = 'bg-red-500';
        icon = '❌';
    } else if (type === 'warning') {
        bgColor = 'bg-yellow-500';
        icon = '⚠️';
    }

    toast.className += ` ${bgColor} text-white`;
    toast.innerHTML = `<span class="text-lg mr-2">${icon}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Show inline message in turn indicator
function showInlineMessage(message, type = 'info') {
    const indicator = document.getElementById('turnIndicator');
    if (!indicator) return;

    let bgColor = 'bg-blue-100';
    let textColor = 'text-blue-800';

    if (type === 'success') {
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
    } else if (type === 'error') {
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
    } else if (type === 'warning') {
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
    }

    indicator.className = `text-center py-4 mb-6 rounded-xl font-bold text-lg ${bgColor} ${textColor}`;
    indicator.textContent = message;
}

// ============================================
// SOCKET.IO
// ============================================

function initializeSocket() {
    if (socket) socket.disconnect();

    socket = io(SOCKET_URL, {
        auth: { token: accessToken }
    });

    socket.on('connect', () => debugLog('✅ Connected'));
    socket.on('disconnect', () => debugLog('❌ Disconnected'));
    socket.on('authenticated', (data) => debugLog('✅ Authenticated:', data));

    // Matchmaking
    socket.on('queue_joined', (data) => debugLog('🔍 Queue joined:', data));
    socket.on('match_found', (data) => {
        debugLog('🎮 Match found!', data);
        currentGame = { opponent: data.opponent };
    });

    // Game events
    socket.on('game_start', handleGameStart);
    socket.on('throw_result', handleThrowResult);
    socket.on('dice_revealed', handleDiceRevealed);
    socket.on('choose_result_prompt', handleChooseResultPrompt);
    socket.on('opponent_throw', handleOpponentThrow);
    socket.on('opponent_dice_revealed', handleOpponentDiceRevealed);
    socket.on('round_result', handleRoundResult);
    socket.on('new_round', handleNewRound);
    socket.on('your_turn', handleYourTurn);
    socket.on('waiting_for_opponent', handleWaitingForOpponent);
    socket.on('vast_extra_throw', handleVastExtraThrow);
    socket.on('opponent_vast', handleOpponentVast);
    socket.on('game_over', handleGameOver);

    // First round simultaneous events
    socket.on('first_round_reveal', handleFirstRoundReveal);
    socket.on('first_round_result', handleFirstRoundResult);
    socket.on('first_round_tie', handleFirstRoundTie);

    socket.on('error', (data) => debugLog('❌ Error:', data));
}

// ============================================
// LOBBY
// ============================================

function setupLobbyListeners() {
    document.getElementById('joinQueueBtn')?.addEventListener('click', () => {
        if (!socket) {
            showToast('Niet verbonden met server', 'error');
            return;
        }
        debugLog('🔍 Joining matchmaking queue...', 'info');
        socket.emit('join_queue', { gameMode: 'ranked' });

        // Show searching UI
        document.getElementById('queueIdle')?.classList.add('hidden');
        document.getElementById('queueSearching')?.classList.remove('hidden');
    });

    document.getElementById('leaveQueueBtn')?.addEventListener('click', () => {
        if (!socket) return;
        debugLog('❌ Leaving queue', 'info');
        socket.emit('leave_queue');

        // Show idle UI
        document.getElementById('queueSearching')?.classList.add('hidden');
        document.getElementById('queueIdle')?.classList.remove('hidden');
    });

    document.getElementById('refreshLeaderboard')?.addEventListener('click', loadLeaderboard);
}

function handleLogout() {
    localStorage.clear();
    currentUser = null;
    accessToken = null;
    if (socket) socket.disconnect();
    updateHeaderUserDisplay();
    showAuth();
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/api/leaderboard`);
        const data = await response.json();

        const leaderboardDiv = document.getElementById('leaderboardList');
        if (!leaderboardDiv) return;

        leaderboardDiv.innerHTML = data.players.slice(0, 10).map((player, index) => `
            <div class="flex justify-between items-center p-2 rounded ${player.id === currentUser?.id ? 'bg-gold bg-opacity-20' : ''}">
                <div class="flex items-center gap-2">
                    <span class="font-bold">${index + 1}.</span>
                    <span>${player.username}</span>
                </div>
                <span class="font-bold">${player.eloRating}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Leaderboard error:', error);
    }
}

function updateUserStats() {
    if (!currentUser) return;

    document.getElementById('lobbyElo').textContent = currentUser.eloRating || 1200;
    document.getElementById('lobbyWins').textContent = currentUser.stats?.wins || 0;
    document.getElementById('lobbyLosses').textContent = currentUser.stats?.losses || 0;
    document.getElementById('lobbyUsername').textContent = currentUser.username || '';
}

// ============================================
// GAME EVENTS
// ============================================

function setupGameListeners() {
    document.getElementById('throwOpenBtn')?.addEventListener('click', () => throwDice(false));
    document.getElementById('throwBlindBtn')?.addEventListener('click', () => throwDice(true));
    document.getElementById('revealBtn')?.addEventListener('click', revealDice);
    document.getElementById('keepBtn')?.addEventListener('click', keepThrow);

    document.getElementById('resultWonBtn')?.addEventListener('click', () => chooseResult('won'));
    document.getElementById('resultVastBtn')?.addEventListener('click', () => chooseResult('vast'));
    document.getElementById('resultLostBtn')?.addEventListener('click', () => chooseResult('lost'));

    document.getElementById('returnLobbyBtn')?.addEventListener('click', returnToLobby);
}

function handleGameStart(data) {
    debugLog('▶️  Game started:', data);

    currentGame = {
        ...currentGame,
        gameId: data.gameId,
        players: data.players,
        roundNumber: data.roundNumber,
        voorgooier: data.voorgooier,
        currentTurn: data.currentTurn,
        isFirstRound: data.isFirstRound,
        isSimultaneous: data.isSimultaneous,
        mustBlind: data.mustBlind
    };

    showGame();
    updateGameUI();

    if (data.isSimultaneous) {
        // Eerste ronde - beide spelers gooien tegelijk
        showInlineMessage('⚡ Ronde 1: Beide spelers gooien tegelijk BLIND!', 'warning');
        isMyTurn = true; // Beide spelers kunnen gooien
        showThrowButtons(true); // Alleen blind knop
    } else if (data.mustBlind) {
        showInlineMessage('⚠️ VERPLICHT BLIND!', 'warning');
        if (data.currentTurn === currentUser.id) {
            isMyTurn = true;
            showThrowButtons(data.mustBlind);
        } else {
            isMyTurn = false;
            showWaitingMessage('Wachten op tegenstander...');
        }
    } else {
        if (data.currentTurn === currentUser.id) {
            isMyTurn = true;
            showThrowButtons(false);
        } else {
            isMyTurn = false;
            showWaitingMessage('Wachten op tegenstander...');
        }
    }
}

function throwDice(isBlind) {
    if (!currentGame) return;

    // In simultane modus (ronde 1) is isMyTurn altijd true voor beide spelers
    // In normale modus checken we isMyTurn
    if (!currentGame.isSimultaneous && !isMyTurn) return;

    debugLog(`🎲 Throwing dice (${isBlind ? 'BLIND' : 'OPEN'})`);

    socket.emit('throw_dice', {
        gameId: currentGame.gameId,
        isBlind
    });

    hideAllActionButtons();

    if (currentGame.isSimultaneous) {
        showWaitingMessage('Wachten op tegenstander...');
    } else {
        showWaitingMessage('Dobbelstenen rollen...');
    }
}

function handleThrowResult(data) {
    debugLog('🎲 Throw result:', data);

    currentThrowData = data;

    // Update throw counter
    updateThrowCounter(data.throwCount || 1, data.maxThrows || 3);

    if (data.isBlind) {
        showDice('?', '?', true);
        showRevealButton();
    } else {
        showDice(data.dice1, data.dice2, false);

        if (data.canKeep && data.canThrowAgain) {
            showKeepAndThrowAgainButtons();
        } else if (data.canKeep) {
            showKeepButton();
        }
    }
}

function updateThrowCounter(currentThrow, maxThrows) {
    const counter = document.getElementById('throwCounter');
    if (!counter) return;

    counter.textContent = `🎲 Worp ${currentThrow}/${maxThrows}`;
    counter.style.fontWeight = 'bold';
}

function revealDice() {
    if (!currentGame) return;

    debugLog('👁️  Revealing dice');

    socket.emit('reveal_dice', {
        gameId: currentGame.gameId
    });

    hideAllActionButtons();
    showWaitingMessage('Dobbelstenen onthullen...');
}

function handleDiceRevealed(data) {
    debugLog('👁️  Dice revealed:', data);

    showDice(data.dice1, data.dice2, false);

    if (data.isMexico) {
        showToast('🎉 MEXICO!!! 🎉', 'success', 5000);
        showInlineMessage('🏆 MEXICO! 2-1!', 'success');
    }

    if (data.mustChooseResult) {
        // Wait for choose_result_prompt
    } else if (data.canKeep && data.canThrowAgain) {
        showKeepAndThrowAgainButtons();
    } else if (data.canKeep) {
        showKeepButton();
    }
}

function keepThrow() {
    if (!currentGame) return;

    debugLog('✅ Keeping throw');

    socket.emit('keep_throw', {
        gameId: currentGame.gameId
    });

    hideAllActionButtons();
    showWaitingMessage('Wachten op resultaat keuze...');
}

function handleChooseResultPrompt(data) {
    debugLog('📊 Choose result prompt:', data);

    showInlineMessage(data.message || 'Kies het resultaat van je beurt', 'info');
    showResultChoiceButtons();
}

function chooseResult(result) {
    if (!currentGame) return;

    debugLog(`📊 Choosing result: ${result}`);

    socket.emit('choose_result', {
        gameId: currentGame.gameId,
        result
    });

    hideAllActionButtons();
    showWaitingMessage('Resultaat verwerken...');
}

function handleOpponentThrow(data) {
    debugLog('🎲 Opponent threw:', data);

    if (data.isBlind) {
        showOpponentDice('?', '?', true);
    } else {
        showOpponentDice(data.dice1, data.dice2, false);
    }
}

function handleOpponentDiceRevealed(data) {
    debugLog('👁️  Opponent revealed:', data);
    showOpponentDice(data.dice1, data.dice2, false);
}

function handleRoundResult(data) {
    debugLog('📊 Round result:', data);

    // New format: includes voorgooier and achterligger results
    if (data.voorgooierResult && data.achterliggerResult) {
        const voorgooierName = data.voorgooierId === currentUser.id ? 'Jij' : currentGame.opponent.username;
        const achterliggerName = data.achterliggerId === currentUser.id ? 'Jij' : currentGame.opponent.username;

        const voorgooierText = data.voorgooierResult === 'won' ? 'won' : 'lost';
        const achterliggerText = data.achterliggerResult === 'won' ? 'won' : 'lost';

        // Show results
        let resultMessage = `${voorgooierName} (voorgooier): ${voorgooierText} | ${achterliggerName}: ${achterliggerText}`;

        if (data.loserId) {
            const loserName = data.loserId === currentUser.id ? 'Jij' : currentGame.opponent.username;
            resultMessage += ` - ${loserName} verliest!`;

            // Update lives
            updateLives(game.player1Id, data.player1Lives);
            updateLives(game.player2Id, data.player2Lives);
        } else {
            resultMessage += ' - Gelijkspel!';
        }

        const messageType = data.loserId === currentUser.id ? 'error' :
                           data.loserId ? 'success' : 'info';

        showInlineMessage(resultMessage, messageType);
    } else {
        // Old format (fallback for first round)
        const isMe = data.playerId === currentUser.id;
        const resultText = data.result === 'won' ? 'heeft gewonnen!' :
                          data.result === 'lost' ? 'heeft verloren!' : 'koos vast!';

        const playerName = isMe ? 'Jij' : currentGame.opponent.username;

        const messageType = (isMe && data.result === 'won') || (!isMe && data.result === 'lost') ? 'success' :
                           (isMe && data.result === 'lost') || (!isMe && data.result === 'won') ? 'error' : 'info';

        showInlineMessage(`${playerName} ${resultText}`, messageType);

        if (data.livesLeft !== undefined) {
            updateLives(data.playerId, data.livesLeft);
        }
    }

    showWaitingMessage('Wachten op nieuwe ronde...');
}

function handleNewRound(data) {
    debugLog('⚡ New round:', data);

    currentGame = { ...currentGame, ...data };
    updateGameUI();

    showToast(`Ronde ${data.roundNumber} begint!`, 'info', 2000);

    if (data.voorgooier) {
        const isVoorgooier = data.voorgooier === currentUser.id;
        if (isVoorgooier) {
            showInlineMessage('👑 Jij bent de voorgooier!', 'warning');
        } else {
            showInlineMessage(`${currentGame.opponent.username} is de voorgooier`, 'info');
        }
    }

    if (data.currentTurn === currentUser.id) {
        isMyTurn = true;
        showThrowButtons(data.mustBlind);
    } else {
        isMyTurn = false;
        showWaitingMessage('Wachten op tegenstander...');
    }
}

function handleYourTurn(data) {
    debugLog('🔔 Your turn:', data);

    isMyTurn = true;

    showInlineMessage(data.message || 'Jouw beurt!', 'info');

    // Show throw buttons (achterligger follows voorgooier pattern)
    const mustFollowPattern = data.voorgooierPattern && data.voorgooierPattern.length > 0;
    showThrowButtons(mustFollowPattern);
}

function handleWaitingForOpponent(data) {
    debugLog('⏳ Waiting for opponent:', data);

    isMyTurn = false;

    showInlineMessage(data.message || 'Wachten op tegenstander...', 'info');
    showWaitingMessage('Wachten op tegenstander...');
}

function handleVastExtraThrow(data) {
    debugLog('⚔️  Vast extra throw:', data);
    showInlineMessage(data.message || '⚔️ Gelijke stand! Extra worp!', 'warning');
    showThrowButtons(false);
}

function handleOpponentVast(data) {
    debugLog('⚔️  Opponent chose vast:', data);
    showInlineMessage(data.message || 'Tegenstander koos vast - extra worp', 'info');
    showWaitingMessage('Tegenstander gooit extra worp...');
}

// ============================================
// FIRST ROUND SIMULTANEOUS HANDLERS
// ============================================

function handleFirstRoundReveal(data) {
    debugLog('👁️ First round reveal:', data);

    // Show both throws
    showDice(data.yourThrow.dice1, data.yourThrow.dice2, false);
    showOpponentDice(data.opponentThrow.dice1, data.opponentThrow.dice2, false);

    // Show message
    showInlineMessage(`🎲 ${data.yourName}: ${data.yourThrow.name} | ${data.opponentName}: ${data.opponentThrow.name}`, 'info');

    hideAllActionButtons();
    showWaitingMessage('Automatische vergelijking...');
}

function handleFirstRoundResult(data) {
    debugLog('📊 First round result:', data);

    const iWon = data.winnerId === currentUser.id;
    const iLost = data.loserId === currentUser.id;

    // Update lives display
    updateGameUI();

    // Show result message
    const winnerName = iWon ? 'Jij' : currentGame.opponent.username;
    const loserName = iLost ? 'Jij' : currentGame.opponent.username;

    const penaltyText = data.penalty === 2 ? ' (MEXICO! -2 levens)' : '';
    const message = `${winnerName} wint! ${loserName} verliest${penaltyText}`;

    showInlineMessage(message, iWon ? 'success' : 'error');

    if (data.gameOver) {
        showToast('Game over!', 'warning', 2000);
    } else {
        const voorgooierName = data.newVoorgooier === currentUser.id ? 'Jij bent' : `${currentGame.opponent.username} is`;
        showToast(`${voorgooierName} de voorgooier!`, 'info', 2000);
    }
}

function handleFirstRoundTie(data) {
    debugLog('⚔️ First round tie:', data);

    showInlineMessage('⚔️ Gelijkspel! Gooi opnieuw blind!', 'warning');
    showToast(data.message, 'warning', 3000);

    // Reset UI for new throw
    showDice('', '', false);
    showOpponentDice('', '', false);

    // Both players can throw again
    isMyTurn = true;
    showThrowButtons(true); // Must be blind
}

function handleGameOver(data) {
    debugLog('🏁 Game over:', data);

    const iWon = data.winner === currentUser.id;

    if (currentUser) {
        if (iWon) {
            currentUser.stats.wins++;
            currentUser.eloRating = data.winnerElo;
        } else {
            currentUser.stats.losses++;
            currentUser.eloRating = data.loserElo;
        }
        currentUser.stats.gamesPlayed++;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    hideAllActionButtons();

    const title = iWon ? '🏆 Je hebt gewonnen!' : '😔 Helaas, je hebt verloren';
    const eloChange = iWon ? `+${data.eloChange}` : `${data.eloChange}`;

    // Show game over with inline message and toast
    showInlineMessage(title, iWon ? 'success' : 'error');
    showToast(`${title}\nElo: ${eloChange} (Nieuw: ${iWon ? data.winnerElo : data.loserElo})`, iWon ? 'success' : 'error', 7000);

    document.getElementById('returnLobbyBtn')?.classList.remove('hidden');
}

// ============================================
// UI UPDATES
// ============================================

function updateGameUI() {
    if (!currentGame) return;

    document.getElementById('roundNumber').textContent = currentGame.roundNumber || 1;

    const me = currentGame.players?.find(p => p.id === currentUser.id);
    const opponent = currentGame.players?.find(p => p.id !== currentUser.id);

    if (me) updateLives(me.id, me.lives);
    if (opponent) {
        updateLives(opponent.id, opponent.lives);

        // Update opponent name in UI labels
        const opponentName = opponent.username || currentGame.opponent?.username || 'Tegenstander';
        document.getElementById('opponentDiceCupLabel').textContent = `🎯 ${opponentName}`;
        document.getElementById('opponentHistoryLabel').textContent = `👤 ${opponentName}`;
    }

    updateTurnIndicator();
}

function updateLives(playerId, lives) {
    const isMe = playerId === currentUser.id;
    const livesElement = document.getElementById(isMe ? 'myLives' : 'opponentLives');

    if (livesElement) {
        livesElement.textContent = '●'.repeat(Math.max(0, lives));
    }
}

function updateTurnIndicator() {
    const indicator = document.getElementById('turnIndicator');
    if (!indicator) return;

    if (isMyTurn) {
        indicator.textContent = '🎯 Jouw beurt!';
        indicator.className = 'text-center text-lg font-bold text-green';
    } else {
        indicator.textContent = '⏳ Wachten op tegenstander...';
        indicator.className = 'text-center text-lg font-bold text-gray-500';
    }
}

function showDice(dice1, dice2, isHidden) {
    const dice1El = document.getElementById('myDice1');
    const dice2El = document.getElementById('myDice2');

    if (!dice1El || !dice2El) return;

    if (isHidden) {
        dice1El.textContent = '?';
        dice2El.textContent = '?';
    } else {
        const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        dice1El.textContent = diceSymbols[dice1 - 1];
        dice2El.textContent = diceSymbols[dice2 - 1];
    }
}

function showOpponentDice(dice1, dice2, isHidden) {
    const dice1El = document.getElementById('opponentDice1');
    const dice2El = document.getElementById('opponentDice2');

    if (!dice1El || !dice2El) return;

    if (isHidden) {
        dice1El.textContent = '?';
        dice2El.textContent = '?';
    } else {
        const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        dice1El.textContent = diceSymbols[dice1 - 1];
        dice2El.textContent = diceSymbols[dice2 - 1];
    }
}

function showThrowButtons(mustBlind) {
    hideAllActionButtons();

    if (mustBlind) {
        document.getElementById('throwBlindBtn')?.classList.remove('hidden');
    } else {
        document.getElementById('throwOpenBtn')?.classList.remove('hidden');
        document.getElementById('throwBlindBtn')?.classList.remove('hidden');
    }
}

function showRevealButton() {
    hideAllActionButtons();
    document.getElementById('revealBtn')?.classList.remove('hidden');
}

function showKeepButton() {
    hideAllActionButtons();
    document.getElementById('keepBtn')?.classList.remove('hidden');
}

function showKeepAndThrowAgainButtons() {
    hideAllActionButtons();
    document.getElementById('keepBtn')?.classList.remove('hidden');
    document.getElementById('throwOpenBtn')?.classList.remove('hidden');
    document.getElementById('throwBlindBtn')?.classList.remove('hidden');
}

function showResultChoiceButtons() {
    hideAllActionButtons();
    document.getElementById('resultWonBtn')?.classList.remove('hidden');
    document.getElementById('resultVastBtn')?.classList.remove('hidden');
    document.getElementById('resultLostBtn')?.classList.remove('hidden');
}

function hideAllActionButtons() {
    ['throwOpenBtn', 'throwBlindBtn', 'revealBtn', 'keepBtn',
     'resultWonBtn', 'resultVastBtn', 'resultLostBtn'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
}

function showWaitingMessage(message) {
    hideAllActionButtons();
    const indicator = document.getElementById('turnIndicator');
    if (indicator) {
        indicator.textContent = message;
        indicator.className = 'text-center text-lg font-bold text-gray-500';
    }
}

function returnToLobby() {
    if (currentGame) {
        socket?.emit('return_to_lobby', { gameId: currentGame.gameId });
    }

    currentGame = null;
    isMyTurn = false;
    currentThrowData = null;

    showLobby();
    updateUserStats();
    loadLeaderboard();
}

// ============================================
// UTILITIES
// ============================================

function debugLog(...args) {
    if (!debugMode) return;
    console.log(...args);

    const debugLogEl = document.getElementById('debugLog');
    if (debugLogEl) {
        const timestamp = new Date().toLocaleTimeString();
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        const logEntry = document.createElement('div');
        logEntry.className = 'text-xs';
        logEntry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> <span class="text-green-400">${message}</span>`;
        debugLogEl.appendChild(logEntry);
        debugLogEl.scrollTop = debugLogEl.scrollHeight;
    }
}

console.log('🎲 Multiplayer Mexico Client - CORRECTE SPELREGELS');
console.log('✅ Client initialized');
