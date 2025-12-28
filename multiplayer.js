// Multiplayer Mexico Game - Client
const API_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3000';

// Global state
let socket = null;
let currentUser = null;
let accessToken = null;
let currentGame = null;
let isMyTurn = false;

// DOM Elements
const screens = {
    auth: document.getElementById('authScreen'),
    lobby: document.getElementById('lobbyScreen'),
    game: document.getElementById('gameScreen')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    setupEventListeners();
    checkExistingSession();
});

// ============================================
// AUTHENTICATION
// ============================================

function initializeAuth() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginTab.addEventListener('click', () => {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTab.classList.add('border-gold');
        loginTab.classList.remove('text-gray-500');
        registerTab.classList.remove('border-gold');
        registerTab.classList.add('text-gray-500');
    });

    registerTab.addEventListener('click', () => {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        registerTab.classList.add('border-gold');
        registerTab.classList.remove('text-gray-500');
        loginTab.classList.remove('border-gold');
        loginTab.classList.add('text-gray-500');
    });

    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            onAuthSuccess(data);
        } else {
            showAuthError(data.message || 'Login mislukt');
        }
    } catch (error) {
        showAuthError('Kan niet verbinden met server. Is de backend actief?');
        console.error('Login error:', error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showAuthSuccess('Account aangemaakt! Welkom ' + data.user.username);
            setTimeout(() => onAuthSuccess(data), 1000);
        } else {
            showAuthError(data.message || 'Registratie mislukt');
        }
    } catch (error) {
        showAuthError('Kan niet verbinden met server. Is de backend actief?');
        console.error('Register error:', error);
    }
}

function onAuthSuccess(data) {
    currentUser = data.user;
    accessToken = data.accessToken;

    // Save to localStorage
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(currentUser));

    // Update UI
    updateUserDisplay();
    showScreen('lobby');
    connectSocket();
    loadLeaderboard();
}

function updateUserDisplay() {
    document.getElementById('username').textContent = currentUser.username;
    document.getElementById('eloRating').textContent = `(${currentUser.eloRating} Elo)`;
    document.getElementById('userDisplay').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');

    // Lobby display
    document.getElementById('lobbyUsername').textContent = currentUser.username;
    document.getElementById('lobbyElo').textContent = currentUser.eloRating;
    document.getElementById('lobbyEmoji').textContent = currentUser.avatarEmoji || '👤';
    if (currentUser.stats) {
        document.getElementById('lobbyWins').textContent = currentUser.stats.wins || 0;
        document.getElementById('lobbyLosses').textContent = currentUser.stats.losses || 0;
    }
}

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

function showAuthSuccess(message) {
    const successDiv = document.getElementById('authSuccess');
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
    setTimeout(() => successDiv.classList.add('hidden'), 3000);
}

function checkExistingSession() {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');

    if (token && user) {
        accessToken = token;
        currentUser = JSON.parse(user);
        updateUserDisplay();
        showScreen('lobby');
        connectSocket();
        loadLeaderboard();
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    if (socket) socket.disconnect();
    location.reload();
});

// ============================================
// WEBSOCKET CONNECTION
// ============================================

function connectSocket() {
    if (!accessToken) {
        console.error('No access token available');
        return;
    }

    socket = io(SOCKET_URL, {
        auth: { token: accessToken }
    });

    socket.on('connect', () => {
        console.log('✅ Connected to server');
        showToast('Verbonden met server!', 'success');
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        showToast('Verbinding verbroken', 'error');
    });

    socket.on('authenticated', (data) => {
        console.log('Authenticated:', data);
    });

    socket.on('queue_joined', (data) => {
        console.log('Queue joined:', data);
        document.getElementById('queueCount').textContent = data.queueSize || 1;
    });

    socket.on('match_found', (data) => {
        console.log('Match found:', data);
        onMatchFound(data);
    });

    socket.on('game_start', (data) => {
        console.log('Game starting:', data);
        onGameStart(data);
    });

    socket.on('game_state_update', (data) => {
        console.log('Game state update:', data);
        updateGameState(data);
    });

    socket.on('throw_result', (data) => {
        console.log('Throw result:', data);
        onThrowResult(data);
    });

    socket.on('opponent_throw', (data) => {
        console.log('Opponent threw:', data);
        onOpponentThrow(data);
    });

    socket.on('game_over', (data) => {
        console.log('Game over:', data);
        onGameOver(data);
    });

    socket.on('chat_message', (data) => {
        console.log('Chat message:', data);
        addChatMessage(data);
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        showToast(data.message || 'Er ging iets mis', 'error');
    });
}

// ============================================
// MATCHMAKING
// ============================================

document.getElementById('joinQueueBtn').addEventListener('click', () => {
    if (!socket) return;
    socket.emit('join_queue', { gameMode: 'ranked' });
    document.getElementById('queueIdle').classList.add('hidden');
    document.getElementById('queueSearching').classList.remove('hidden');
});

document.getElementById('leaveQueueBtn').addEventListener('click', () => {
    if (!socket) return;
    socket.emit('leave_queue');
    document.getElementById('queueSearching').classList.add('hidden');
    document.getElementById('queueIdle').classList.remove('hidden');
});

function onMatchFound(data) {
    document.getElementById('queueSearching').classList.add('hidden');
    document.getElementById('matchFound').classList.remove('hidden');

    document.getElementById('opponentNameMatch').textContent = data.opponent.username;
    document.getElementById('opponentEloMatch').textContent = data.opponent.eloRating;

    showToast('Tegenstander gevonden! 🎉', 'success');
}

function onGameStart(data) {
    currentGame = data;
    showScreen('game');

    // Set player names
    document.getElementById('playerName').textContent = currentUser.username;
    document.getElementById('playerElo').textContent = currentUser.eloRating;

    document.getElementById('opponentName').textContent = data.opponent.username;
    document.getElementById('opponentElo').textContent = data.opponent.eloRating;

    // Reset game state
    document.getElementById('playerScore').textContent = '0';
    document.getElementById('opponentScore').textContent = '0';
    document.getElementById('playerHistory').innerHTML = '';
    document.getElementById('opponentHistory').innerHTML = '';
    document.getElementById('chatMessages').innerHTML = '<div class="text-center text-gray-400 text-sm py-4">Spel begonnen!</div>';
    document.getElementById('gameResult').classList.add('hidden');

    // Clear dice
    document.getElementById('dice1').textContent = '?';
    document.getElementById('dice2').textContent = '?';
    document.getElementById('currentThrowValue').textContent = '';

    updateTurnIndicator(data.currentTurn === currentUser.id);
}

// ============================================
// GAME LOGIC
// ============================================

document.getElementById('throwDiceBtn').addEventListener('click', () => {
    if (!isMyTurn || !socket) return;
    socket.emit('throw_dice', { gameId: currentGame.gameId });
    document.getElementById('throwDiceBtn').disabled = true;
});

document.getElementById('keepThrowBtn').addEventListener('click', () => {
    if (!socket) return;
    socket.emit('keep_throw', { gameId: currentGame.gameId });
    hideThrowButtons();
});

document.getElementById('continueThrowBtn').addEventListener('click', () => {
    if (!socket) return;
    hideThrowButtons();
    document.getElementById('throwDiceBtn').disabled = false;
});

function onThrowResult(data) {
    // Animate and show dice
    const dice1 = document.getElementById('dice1');
    const dice2 = document.getElementById('dice2');

    dice1.classList.add('dice-roll');
    dice2.classList.add('dice-roll');

    setTimeout(() => {
        dice1.textContent = data.dice[0];
        dice2.textContent = data.dice[1];
        dice1.classList.remove('dice-roll');
        dice2.classList.remove('dice-roll');
    }, 300);

    // Show throw value
    document.getElementById('currentThrowValue').textContent = `Worp: ${data.throwValue} (${getThrowName(data.throwValue)})`;

    // Add to history
    addThrowToHistory('player', data.dice, data.throwValue);

    // Show action buttons
    document.getElementById('keepThrowBtn').classList.remove('hidden');
    document.getElementById('continueThrowBtn').classList.remove('hidden');
}

function onOpponentThrow(data) {
    showToast(`Tegenstander gooide: ${data.throwValue}`, 'info');
    addThrowToHistory('opponent', data.dice, data.throwValue);
}

function updateGameState(data) {
    if (data.scores) {
        document.getElementById('playerScore').textContent = data.scores[currentUser.id] || 0;
        document.getElementById('opponentScore').textContent = data.scores[data.opponent.id] || 0;
    }

    updateTurnIndicator(data.currentTurn === currentUser.id);
}

function updateTurnIndicator(myTurn) {
    isMyTurn = myTurn;
    const indicator = document.getElementById('turnIndicator');
    const throwBtn = document.getElementById('throwDiceBtn');

    if (myTurn) {
        indicator.className = 'text-center py-4 mb-6 rounded-xl font-bold text-lg bg-green-100 text-green-800';
        indicator.textContent = '🎯 Jouw beurt!';
        throwBtn.disabled = false;
    } else {
        indicator.className = 'text-center py-4 mb-6 rounded-xl font-bold text-lg bg-gray-100 text-gray-600';
        indicator.textContent = '⏳ Wachten op tegenstander...';
        throwBtn.disabled = true;
    }
}

function hideThrowButtons() {
    document.getElementById('keepThrowBtn').classList.add('hidden');
    document.getElementById('continueThrowBtn').classList.add('hidden');
}

function addThrowToHistory(player, dice, value) {
    const historyDiv = document.getElementById(player === 'player' ? 'playerHistory' : 'opponentHistory');
    const entry = document.createElement('div');
    entry.className = 'py-1 px-2 bg-gray-50 rounded';
    entry.textContent = `${dice[0]}-${dice[1]}: ${value}`;
    historyDiv.insertBefore(entry, historyDiv.firstChild);
}

function getThrowName(value) {
    const names = {
        21: 'Mexico!', 11: 'Dubbel 1', 22: 'Dubbel 2', 33: 'Dubbel 3',
        44: 'Dubbel 4', 55: 'Dubbel 5', 66: 'Dubbel 6'
    };
    return names[value] || 'Normaal';
}

function onGameOver(data) {
    const resultDiv = document.getElementById('gameResult');
    const iconDiv = document.getElementById('resultIcon');
    const textDiv = document.getElementById('resultText');
    const detailsDiv = document.getElementById('resultDetails');

    const won = data.winner.id === currentUser.id;

    if (won) {
        iconDiv.textContent = '🏆';
        textDiv.textContent = 'Je hebt gewonnen!';
        textDiv.style.color = '#4CAF50';
        resultDiv.style.background = 'linear-gradient(135deg, #E8F5E9, #C8E6C9)';
    } else {
        iconDiv.textContent = '😔';
        textDiv.textContent = 'Helaas, je hebt verloren';
        textDiv.style.color = '#F44336';
        resultDiv.style.background = 'linear-gradient(135deg, #FFEBEE, #FFCDD2)';
    }

    detailsDiv.textContent = `${data.winner.username} won met ${data.finalScore.winner} punten`;

    resultDiv.classList.remove('hidden');
    hideThrowButtons();

    // Update Elo if provided
    if (data.eloChanges) {
        const change = data.eloChanges[currentUser.id];
        showToast(`Elo ${change >= 0 ? '+' : ''}${change}`, won ? 'success' : 'error');
    }
}

document.getElementById('backToLobbyBtn').addEventListener('click', () => {
    showScreen('lobby');
    document.getElementById('queueIdle').classList.remove('hidden');
    document.getElementById('queueSearching').classList.add('hidden');
    document.getElementById('matchFound').classList.add('hidden');
    loadLeaderboard();
});

// ============================================
// CHAT & EMOTES
// ============================================

function setupEventListeners() {
    document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Emote buttons
    document.querySelectorAll('.emote-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const emote = btn.dataset.emote;
            sendEmote(emote);
        });
    });

    document.getElementById('refreshLeaderboard').addEventListener('click', loadLeaderboard);
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (message && socket && currentGame) {
        socket.emit('send_message', {
            gameId: currentGame.gameId,
            message: message
        });
        input.value = '';
    }
}

function sendEmote(emote) {
    if (socket && currentGame) {
        socket.emit('send_message', {
            gameId: currentGame.gameId,
            message: emote,
            isEmote: true
        });
    }
}

function addChatMessage(data) {
    const container = document.getElementById('chatMessages');

    // Remove placeholder if exists
    if (container.children[0]?.classList.contains('text-gray-400')) {
        container.innerHTML = '';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';

    const isMe = data.userId === currentUser.id;
    const isEmote = data.isEmote || (data.message.length <= 2 && /\p{Emoji}/u.test(data.message));

    if (isEmote) {
        messageDiv.innerHTML = `
            <div class="text-center py-2">
                <span class="text-3xl">${data.message}</span>
                <div class="text-xs text-gray-500 mt-1">${data.username}</div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="p-2 rounded-lg ${isMe ? 'bg-gold text-white ml-4' : 'bg-gray-100 mr-4'}">
                <div class="text-xs font-semibold mb-1">${data.username}</div>
                <div class="text-sm">${escapeHtml(data.message)}</div>
            </div>
        `;
    }

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// LEADERBOARD
// ============================================

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/api/leaderboard`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayLeaderboard(data.players || []);
        } else {
            // If endpoint doesn't exist yet, show placeholder
            displayLeaderboard([]);
        }
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        displayLeaderboard([]);
    }
}

function displayLeaderboard(players) {
    const container = document.getElementById('leaderboardList');

    if (players.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 text-sm py-4">
                <div class="text-2xl mb-2">📊</div>
                <div>Nog geen spelers</div>
            </div>
        `;
        return;
    }

    container.innerHTML = players.slice(0, 10).map((player, index) => {
        const rank = index + 1;
        const rankClass = `leaderboard-rank top-${rank <= 3 ? rank : ''}`;
        const isMe = player.username === currentUser.username;

        return `
            <div class="flex items-center gap-3 p-2 rounded-lg ${isMe ? 'bg-gold-50 border border-gold' : 'bg-gray-50'}">
                <div class="${rankClass}">#${rank}</div>
                <div class="text-xl">${player.avatarEmoji || '👤'}</div>
                <div class="flex-1">
                    <div class="font-semibold text-sm">${player.username} ${isMe ? '(jij)' : ''}</div>
                    <div class="text-xs text-gray-600">${player.eloRating} Elo</div>
                </div>
                <div class="text-xs text-gray-500">
                    ${player.wins || 0}W-${player.losses || 0}L
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// SCREEN MANAGEMENT
// ============================================

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
    screens[screenName].classList.add('fade-in');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    toast.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg fade-in`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
