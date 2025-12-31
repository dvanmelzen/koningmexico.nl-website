// Multiplayer Mexico Game - Client (CORRECTE SPELREGELS)
// Use relative URLs so it works in any environment (localhost, dev, production)
const API_URL = window.location.origin;
const SOCKET_URL = window.location.origin;

// Global state
let socket = null;
let currentUser = null;
let accessToken = null;
let currentGame = null;
let isMyTurn = false;
let currentThrowData = null;
let debugMode = true;

// Throw history tracking (per round)
let playerThrowHistory = [];
let opponentThrowHistory = [];

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

    // Fetch initial live stats
    fetchLiveStats();
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
    loadRecentGames();
    loadRecentUsers();
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

    // Guest login button
    const guestBtn = document.getElementById('guestLoginBtn');
    if (guestBtn) {
        console.log('✅ Guest login button gevonden, event listener toegevoegd');
        guestBtn.addEventListener('click', () => {
            console.log('🖱️ Guest login button geklikt!');
            handleGuestLogin();
        });
    } else {
        console.error('❌ Guest login button niet gevonden in DOM!');
    }

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

async function handleGuestLogin() {
    console.log('🎮 Guest login gestart...');

    try {
        // Generate random guest number (10000-99999)
        const guestNumber = Math.floor(10000 + Math.random() * 90000);
        const guestUsername = `Gast${guestNumber}`;

        console.log(`👤 Genereer gastgebruiker: ${guestUsername}`);
        console.log(`📡 API URL: ${API_URL}/api/auth/guest`);

        const response = await fetch(`${API_URL}/api/auth/guest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: guestUsername })
        });

        console.log(`📥 Response status: ${response.status}`);

        const data = await response.json();
        console.log('📦 Response data:', data);

        if (!response.ok) {
            console.error('❌ Guest login mislukt:', data.message);
            showToast(data.message || 'Gast login mislukt', 'error');
            return;
        }

        currentUser = data.user;
        accessToken = data.accessToken;

        console.log('✅ Guest login succesvol:', currentUser.username);

        // Don't save guest sessions to localStorage (temporary only)
        // localStorage.setItem('currentUser', JSON.stringify(currentUser));
        // localStorage.setItem('accessToken', accessToken);

        showToast(`Welkom ${currentUser.username}! 👋 (Gastspeler)`, 'success', 3000);
        initializeSocket();
        updateHeaderUserDisplay();
        showLobby();
    } catch (error) {
        console.error('❌ Guest login error:', error);
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

    // Copy debug log to clipboard
    document.getElementById('copyDebugBtn')?.addEventListener('click', () => {
        const debugLog = document.getElementById('debugLog');
        if (!debugLog) return;

        // Extract all log text
        const logText = Array.from(debugLog.children)
            .map(entry => entry.textContent)
            .join('\n');

        // Copy to clipboard
        navigator.clipboard.writeText(logText).then(() => {
            showToast('📋 Debug logs gekopieerd!', 'success', 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showToast('❌ Kopiëren mislukt', 'error', 2000);
        });
    });

    // Reset UI button - helps if UI gets stuck
    document.getElementById('resetUIBtn')?.addEventListener('click', () => {
        debugLog('🔄 UI Reset aangeroepen');
        resetGameUI();
        showToast('🔄 UI gereset!', 'info', 2000);
    });

    // New Debug Panel Toggle
    const toggleDebugPanel = document.getElementById('toggleDebugPanel');
    const debugPanelContent = document.getElementById('debugPanelContent');

    toggleDebugPanel?.addEventListener('click', () => {
        const isHidden = debugPanelContent?.style.display === 'none';
        if (debugPanelContent) {
            debugPanelContent.style.display = isHidden ? 'block' : 'none';
        }
        if (toggleDebugPanel) {
            toggleDebugPanel.textContent = isHidden ? '▼ Collapse' : '▶ Expand';
        }
    });

    // Copy Debug Log
    document.getElementById('copyDebugLog')?.addEventListener('click', () => {
        const debugEventLog = document.getElementById('debugEventLog');
        if (!debugEventLog) return;

        // Extract text from all log entries
        const logText = Array.from(debugEventLog.children)
            .map(entry => entry.textContent)
            .join('\n');

        // Copy to clipboard
        navigator.clipboard.writeText(logText).then(() => {
            showToast('📋 Debug log gekopieerd!', 'success', 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showToast('❌ Kopiëren mislukt', 'error', 2000);
        });
    });

    // Clear Debug Log
    document.getElementById('clearDebugLog')?.addEventListener('click', () => {
        const debugEventLog = document.getElementById('debugEventLog');
        if (debugEventLog) {
            debugEventLog.innerHTML = '<div style="opacity: 0.6;">Log gewist...</div>';
        }
    });
}

// Update header user display (username and Power)
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
        if (eloRatingEl) eloRatingEl.textContent = `(${currentUser.eloRating || 1200} Power)`;
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
    toast.className = 'toast-notification';

    // Inline styles for better visibility
    let bgColor = '#3B82F6'; // blue
    let icon = 'ℹ️';

    if (type === 'success') {
        bgColor = '#10B981'; // green
        icon = '✅';
    } else if (type === 'error') {
        bgColor = '#EF4444'; // red
        icon = '❌';
    } else if (type === 'warning') {
        bgColor = '#F59E0B'; // yellow/orange
        icon = '⚠️';
    }

    toast.style.cssText = `
        background: ${bgColor};
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        min-width: 250px;
        font-weight: 600;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;
    `;

    toast.innerHTML = `<span style="font-size: 1.25rem; margin-right: 0.5rem;">${icon}</span><span>${message}</span>`;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);

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

    socket.on('connect', () => {
        debugLog('✅ Connected');
        updateDebugSocketStatus('✅ Verbonden met server', '#00ff00');
    });

    socket.on('disconnect', () => {
        debugLog('❌ Disconnected');
        updateDebugSocketStatus('❌ Verbinding verbroken', '#ff4444');
        updateDebugQueueStatus('Niet verbonden', false);
    });

    socket.on('authenticated', (data) => {
        debugLog('✅ Authenticated:', data);
        updateDebugSocketStatus(`✅ Ingelogd als ${data.username}`, '#00ff00');
    });

    // Live stats updates
    socket.on('statsUpdate', (stats) => {
        updateLiveStats(stats);
        updateDebugQueueSize(stats.playersInQueue || 0);
    });

    // Matchmaking
    socket.on('queue_joined', (data) => {
        debugLog('🔍 Queue joined:', data);
        updateDebugQueueStatus('✅ In matchmaking queue', true);
        updateDebugQueueSize(data.queueSize || 1);
        updateDebugMatchStatus('Zoeken naar tegenstander...', '#ffaa00');
    });

    socket.on('match_found', (data) => {
        debugLog('🎮 Match found!', data);
        currentGame = { opponent: data.opponent };
        updateDebugQueueStatus('Match gevonden!', false);
        updateDebugMatchStatus(`🎉 Match met ${data.opponent.username}`, '#00ff00');
    });

    // Game events
    socket.on('game_start', handleGameStart);
    socket.on('throw_result', handleThrowResult);
    socket.on('dice_revealed', handleDiceRevealed);
    socket.on('throw_revealed', handleThrowRevealed); // Auto-reveal blind throw when kept
    socket.on('opponent_throw_revealed', handleOpponentThrowRevealed); // Auto-reveal opponent blind throw
    // choose_result_prompt VERWIJDERD - automatische vergelijking!
    socket.on('opponent_throw', handleOpponentThrow);
    socket.on('opponent_dice_revealed', handleOpponentDiceRevealed);
    socket.on('round_result', handleRoundResult);
    socket.on('new_round', handleNewRound);
    socket.on('your_turn', handleYourTurn);
    socket.on('waiting_for_opponent', handleWaitingForOpponent);
    socket.on('vastgooier', handleVastgooier); // Overgooien bij gelijkspel
    socket.on('vastgooier_reveal', handleVastgooierReveal); // Toon beide worpen
    socket.on('vastgooier_result', handleVastgooierResult); // Resultaat van vastgooier
    socket.on('vast_extra_throw', handleVastExtraThrow);
    socket.on('opponent_vast', handleOpponentVast);
    socket.on('game_over', handleGameOver);

    // First round simultaneous events
    socket.on('first_round_reveal', handleFirstRoundReveal);
    socket.on('first_round_result', handleFirstRoundResult);
    socket.on('first_round_tie', handleFirstRoundTie);

    // Rematch events
    socket.on('rematch_request', handleRematchRequest);
    socket.on('rematch_accepted', handleRematchAccepted);
    socket.on('rematch_declined', handleRematchDeclined);

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

        // Update debug panel
        updateDebugQueueStatus('Queue verlaten', false);
        updateDebugMatchStatus('Niet zoeken', '#aaa');
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

async function loadRecentGames() {
    try {
        const response = await fetch(`${API_URL}/api/games/recent`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch recent games');
        }

        const data = await response.json();
        const recentGamesDiv = document.getElementById('recentGamesList');
        if (!recentGamesDiv) return;

        if (data.games.length === 0) {
            recentGamesDiv.innerHTML = `
                <div class="text-center py-8" style="color: var(--text-secondary);">
                    <div class="text-4xl mb-2">🎮</div>
                    <div class="text-sm">Geen games gespeeld</div>
                </div>
            `;
            return;
        }

        recentGamesDiv.innerHTML = data.games.map(game => {
            const isWin = game.result === 'win';
            const resultIcon = isWin ? '🏆' : '❌';
            const resultColor = isWin ? 'var(--color-green)' : 'var(--color-red)';
            const eloSign = game.eloChange > 0 ? '+' : '';
            const timeAgo = formatTimeAgo(game.playedAt);

            return `
                <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--bg-secondary);">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">${resultIcon}</span>
                        <div>
                            <div class="font-medium" style="color: var(--text-primary);">
                                vs ${game.opponent}
                            </div>
                            <div class="text-xs" style="color: var(--text-secondary);">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold" style="color: ${resultColor};">
                            ${eloSign}${game.eloChange}
                        </div>
                        <div class="text-xs" style="color: var(--text-secondary);">
                            Power
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Recent games error:', error);
        const recentGamesDiv = document.getElementById('recentGamesList');
        if (recentGamesDiv) {
            recentGamesDiv.innerHTML = `
                <div class="text-center py-4 text-sm" style="color: var(--text-secondary);">
                    Fout bij laden
                </div>
            `;
        }
    }
}

async function loadRecentUsers() {
    try {
        const response = await fetch(`${API_URL}/api/users/recent?limit=3`);

        if (!response.ok) {
            throw new Error('Failed to fetch recent users');
        }

        const users = await response.json();
        const newPlayersDiv = document.getElementById('newPlayersList');
        if (!newPlayersDiv) return;

        if (users.length === 0) {
            newPlayersDiv.innerHTML = `
                <div class="text-center py-8" style="color: var(--text-secondary);">
                    <div class="text-4xl mb-2">👤</div>
                    <div class="text-sm">Nog geen spelers</div>
                </div>
            `;
            return;
        }

        newPlayersDiv.innerHTML = users.map(user => {
            const timeAgo = formatTimeAgo(user.createdAt);

            return `
                <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--bg-secondary);">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${user.avatarEmoji}</span>
                        <div>
                            <div class="font-medium" style="color: var(--text-primary);">
                                ${user.username}
                            </div>
                            <div class="text-xs" style="color: var(--text-secondary);">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-sm" style="color: var(--color-gold);">
                            ${user.eloRating}
                        </div>
                        <div class="text-xs" style="color: var(--text-secondary);">
                            Power
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Recent users error:', error);
        const newPlayersDiv = document.getElementById('newPlayersList');
        if (newPlayersDiv) {
            newPlayersDiv.innerHTML = `
                <div class="text-center py-4 text-sm" style="color: var(--text-secondary);">
                    Fout bij laden
                </div>
            `;
        }
    }
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Zojuist';
    if (diffMins < 60) return `${diffMins} min geleden`;
    if (diffHours < 24) return `${diffHours} uur geleden`;
    if (diffDays === 1) return 'Gisteren';
    if (diffDays < 7) return `${diffDays} dagen geleden`;
    return then.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function updateUserStats() {
    if (!currentUser) return;

    document.getElementById('lobbyElo').textContent = currentUser.eloRating || 1200;
    document.getElementById('lobbyWins').textContent = currentUser.stats?.wins || 0;
    document.getElementById('lobbyLosses').textContent = currentUser.stats?.losses || 0;
    document.getElementById('lobbyUsername').textContent = currentUser.username || '';
}

// Update live stats display
function updateLiveStats(stats) {
    const onlineEl = document.getElementById('onlinePlayers');
    const queueEl = document.getElementById('queuePlayers');
    const gamesEl = document.getElementById('activeGames');

    if (onlineEl) onlineEl.textContent = stats.onlinePlayers || 0;
    if (queueEl) queueEl.textContent = stats.playersInQueue || 0;
    if (gamesEl) gamesEl.textContent = stats.activeGames || 0;
}

// Fetch initial stats on page load
async function fetchLiveStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats`);
        if (response.ok) {
            const stats = await response.json();
            updateLiveStats(stats);
        }
    } catch (error) {
        debugLog('Error fetching live stats:', error);
    }
}

// ============================================
// GAME EVENTS
// ============================================

function setupGameListeners() {
    document.getElementById('throwOpenBtn')?.addEventListener('click', () => throwDice(false));
    document.getElementById('throwBlindBtn')?.addEventListener('click', () => throwDice(true));
    document.getElementById('revealBtn')?.addEventListener('click', revealDice);
    document.getElementById('keepBtn')?.addEventListener('click', keepThrow);

    // Result button listeners VERWIJDERD - automatische vergelijking!

    document.getElementById('returnLobbyBtn')?.addEventListener('click', returnToLobby);
    document.getElementById('requestRematchBtn')?.addEventListener('click', requestRematch);
}

function handleGameStart(data) {
    debugLog('▶️  Game started:', data);
    updateDebugMatchStatus('🎮 Spel gestart!', '#00ff00');

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

    // Reset dice displays for new game
    showDice('', '', false, false); // No animation - just clear
    showOpponentDice('', '', false, false); // No animation - just clear

    // Clear throw history for new game
    playerThrowHistory = [];
    opponentThrowHistory = [];
    // Show empty throw history from start
    updateThrowHistory();

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
    debugLog(`📊 Player throw count: ${playerThrowHistory.length + 1}, dice: ${data.dice1}-${data.dice2}, blind: ${data.isBlind}`);

    currentThrowData = data;

    // Update throw counter
    updateThrowCounter(data.throwCount || 1, data.maxThrows || 3);

    // Add throw to player history
    if (data.dice1 && data.dice2) {
        const throwInfo = calculateThrowDisplay(data.dice1, data.dice2);
        playerThrowHistory.push({
            displayValue: throwInfo.displayValue,
            isMexico: throwInfo.isMexico,
            isBlind: data.isBlind, // Currently blind (may be revealed later)
            wasBlind: data.isBlind  // Originally blind
        });
        debugLog(`✅ Added to player history. Total: ${playerThrowHistory.length} throws`);
        updateThrowHistory();
    }

    // AUTO-KEEP op laatste worp (geen bevestiging nodig)
    const isLastThrow = data.throwCount >= data.maxThrows;
    if (isLastThrow) {
        debugLog(`🎯 Laatste worp (${data.throwCount}/${data.maxThrows}) - AUTO-KEEP`);
        showWaitingMessage('Laatste worp - wacht op tegenstander...');

        // Auto-keep na korte delay (zodat speler de worp ziet)
        setTimeout(() => {
            keepThrow();
        }, data.isBlind ? 800 : 1200); // Korter voor blind, langer voor open
        return; // Stop hier - geen knoppen tonen
    }

    if (data.isBlind) {
        // Show dice as hidden (? marks)
        showDice('?', '?', true);

        // BELANGRIJK: Geen "Laten Zien" knop bij blind worp!
        // Speler kan alleen kiezen: "Laten Staan" of "Gooi Opnieuw"
        if (data.canKeep && data.canThrowAgain) {
            showKeepAndThrowAgainButtonsWithPattern(data.throwCount);
        } else if (data.canKeep) {
            showKeepButton();
        } else if (data.canThrowAgain) {
            // Only throw again option
            showThrowButtons(data.mustBlind || false);
        } else {
            // No options - waiting for server
            showWaitingMessage('Wachten op server...');
            debugLog('⚠️ No action buttons available after blind throw');
        }
    } else {
        // Open throw - show dice values
        showDice(data.dice1, data.dice2, false);

        if (data.canKeep && data.canThrowAgain) {
            showKeepAndThrowAgainButtonsWithPattern(data.throwCount);
        } else if (data.canKeep) {
            showKeepButton();
        } else if (data.canThrowAgain) {
            // Only throw again option
            showThrowButtons(data.mustBlind || false);
        } else {
            // No options - waiting for server
            showWaitingMessage('Wachten op server...');
            debugLog('⚠️ No action buttons available after open throw');
        }
    }
}

// Helper functie om knoppen te tonen met patroon respect
function showKeepAndThrowAgainButtonsWithPattern(currentThrowCount) {
    // Check if we're following a pattern (achterligger)
    if (currentGame && currentGame.mustFollowPattern && currentGame.voorgooierPattern) {
        // We're achterligger - must follow pattern
        // currentThrowCount tells us how many throws we've made
        // Next throw index = currentThrowCount (0-indexed)
        const nextThrowIndex = currentThrowCount;

        if (nextThrowIndex < currentGame.voorgooierPattern.length) {
            // There's a pattern to follow for the next throw
            const mustBeBlind = currentGame.voorgooierPattern[nextThrowIndex];

            // Show keep button + only the required throw button
            hideAllActionButtons();
            document.getElementById('keepBtn')?.classList.remove('hidden');

            if (mustBeBlind) {
                document.getElementById('throwBlindBtn')?.classList.remove('hidden');
            } else {
                document.getElementById('throwOpenBtn')?.classList.remove('hidden');
            }
        } else {
            // No more pattern (shouldn't happen, but fallback)
            showKeepAndThrowAgainButtons();
        }
    } else {
        // Voorgooier - show all options
        showKeepAndThrowAgainButtons();
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

    showDice(data.dice1, data.dice2, false, false); // No animation - just reveal

    // Update last throw in player history to not blind anymore
    if (playerThrowHistory.length > 0) {
        playerThrowHistory[playerThrowHistory.length - 1].isBlind = false;
        updateThrowHistory();
    }

    if (data.isMexico) {
        showToast('🎉 MEXICO!!! 🎉', 'success', 5000);
        showInlineMessage('🏆 MEXICO! 2-1!', 'success');
    }

    // mustChooseResult VERWIJDERD - automatische vergelijking!
    if (data.canKeep && data.canThrowAgain) {
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

// handleChooseResultPrompt en chooseResult VERWIJDERD - automatische vergelijking!

function handleOpponentThrow(data) {
    debugLog('🎲 Opponent threw:', data);
    debugLog(`📊 Opponent throw count: ${opponentThrowHistory.length + 1}, dice: ${data.dice1}-${data.dice2}, blind: ${data.isBlind}`);

    // Add throw to opponent history
    if (data.dice1 && data.dice2) {
        // Normal throw with dice values
        const throwInfo = calculateThrowDisplay(data.dice1, data.dice2);
        opponentThrowHistory.push({
            displayValue: throwInfo.displayValue,
            isMexico: throwInfo.isMexico,
            isBlind: data.isBlind, // Currently blind (may be revealed later)
            wasBlind: data.isBlind  // Originally blind
        });
        debugLog(`✅ Added to opponent history. Total: ${opponentThrowHistory.length} throws`);
        updateThrowHistory();
    } else if (data.isBlind) {
        // Blind throw - dice values not sent yet (will be revealed later)
        opponentThrowHistory.push({
            displayValue: '???', // Placeholder until revealed
            isMexico: false,
            isBlind: true, // Currently blind
            wasBlind: true, // Originally blind
            dice1: null,    // Will be set when revealed
            dice2: null     // Will be set when revealed
        });
        debugLog(`✅ Added blind throw to opponent history (placeholder). Total: ${opponentThrowHistory.length} throws`);
        updateThrowHistory();
    } else {
        debugLog(`⚠️ WARNING: Missing dice values in opponent throw! dice1: ${data.dice1}, dice2: ${data.dice2}`);
    }

    if (data.isBlind) {
        showOpponentDice('?', '?', true);
    } else {
        showOpponentDice(data.dice1, data.dice2, false);
    }
}

function handleOpponentDiceRevealed(data) {
    debugLog('👁️  Opponent revealed:', data);
    showOpponentDice(data.dice1, data.dice2, false, false); // No animation - just reveal

    // Update last throw in opponent history to not blind anymore
    if (opponentThrowHistory.length > 0) {
        const lastThrow = opponentThrowHistory[opponentThrowHistory.length - 1];
        lastThrow.isBlind = false;

        // If this was a placeholder (blind throw without dice values), update it now
        if (data.dice1 && data.dice2 && (!lastThrow.dice1 || !lastThrow.dice2)) {
            const throwInfo = calculateThrowDisplay(data.dice1, data.dice2);
            lastThrow.displayValue = throwInfo.displayValue;
            lastThrow.isMexico = throwInfo.isMexico;
            lastThrow.dice1 = data.dice1;
            lastThrow.dice2 = data.dice2;
            debugLog(`✅ Updated placeholder with actual dice values: ${data.dice1}-${data.dice2}`);
        }

        updateThrowHistory();
    }
}

function handleThrowRevealed(data) {
    debugLog('👁️  Blind throw auto-revealed:', data);

    // Show the dice values (no longer hidden)
    showDice(data.dice1, data.dice2, false, false); // No animation - just reveal

    // Update last throw in player history to not blind anymore
    if (playerThrowHistory.length > 0) {
        playerThrowHistory[playerThrowHistory.length - 1].isBlind = false;
        updateThrowHistory();
    }

    // Show message
    if (data.message) {
        showInlineMessage(data.message, 'info');
    }
}

function handleOpponentThrowRevealed(data) {
    debugLog('👁️  Opponent blind throw auto-revealed:', data);

    // Show the opponent's dice values (no longer hidden)
    showOpponentDice(data.dice1, data.dice2, false, false); // No animation - just reveal

    // Update last throw in opponent history to not blind anymore
    if (opponentThrowHistory.length > 0) {
        const lastThrow = opponentThrowHistory[opponentThrowHistory.length - 1];
        lastThrow.isBlind = false;

        // If this was a placeholder (blind throw without dice values), update it now
        if (data.dice1 && data.dice2 && (!lastThrow.dice1 || !lastThrow.dice2)) {
            const throwInfo = calculateThrowDisplay(data.dice1, data.dice2);
            lastThrow.displayValue = throwInfo.displayValue;
            lastThrow.isMexico = throwInfo.isMexico;
            lastThrow.dice1 = data.dice1;
            lastThrow.dice2 = data.dice2;
            debugLog(`✅ Updated placeholder with actual dice values: ${data.dice1}-${data.dice2}`);
        }

        updateThrowHistory();
    }

    // Show message
    if (data.message) {
        showInlineMessage(data.message, 'info');
    }
}

function handleRoundResult(data) {
    debugLog('📊 Round result:', data);

    // Update last round summary (NEW!)
    updateLastRoundSummary(data);

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

    try {
        currentGame = { ...currentGame, ...data };
        debugLog('✅ Step 1: Game state updated');

        updateGameUI();
        debugLog('✅ Step 2: UI updated');

        // IMPORTANT: Explicitly reset BOTH players' dice displays
        showDice('', '', false, false); // Reset own dice to default (⚀⚀) - no animation
        debugLog('✅ Step 3: Own dice reset');

        showOpponentDice('', '', false, false); // Reset opponent dice to default (⚀⚀) - no animation
        debugLog('✅ Step 4: Opponent dice reset');

        debugLog('🔄 Dice reset for new round');
    } catch (error) {
        debugLog('❌ ERROR in handleNewRound step 1-4:', error.message);
        console.error('Full error:', error);
    }

    try {
        // Clear throw history for new round
        playerThrowHistory = [];
        opponentThrowHistory = [];
        debugLog('✅ Step 5: History arrays cleared');

        // Keep history visible, just empty
        updateThrowHistory();
        debugLog('✅ Step 6: History UI updated');

        debugLog('🗑️ Throw history cleared for new round');
    } catch (error) {
        debugLog('❌ ERROR in handleNewRound step 5-6:', error.message);
        console.error('Full error:', error);
    }

    try {
        showToast(`Ronde ${data.roundNumber} begint!`, 'info', 2000);
        debugLog('✅ Step 7: Toast shown');
    } catch (error) {
        debugLog('❌ ERROR in handleNewRound step 7:', error.message);
        console.error('Full error:', error);
    }

    try {
        // Check if it's my turn (voorgooier starts)
        debugLog(`🔍 Checking turn: currentTurn=${data.currentTurn}, myId=${currentUser.id}, voorgooier=${data.voorgooier}`);

        if (data.currentTurn && data.currentTurn === currentUser.id) {
            isMyTurn = true;
            const isVoorgooier = data.voorgooier === currentUser.id;
            debugLog(`✅ Step 8a: It's my turn! isVoorgooier=${isVoorgooier}`);

            if (isVoorgooier) {
                showInlineMessage('🎯 Jouw beurt als voorgooier! Gooi de dobbelstenen', 'info');
                showThrowButtons(false); // Both open and blind buttons
                debugLog('✅ Voorgooier buttons shown');
            } else {
                // Shouldn't happen but fallback
                showThrowButtons(false);
                debugLog('✅ Fallback buttons shown');
            }
        } else {
            isMyTurn = false;
            showWaitingMessage('Wachten op voorgooier...');
            debugLog('✅ Step 8a: Not my turn, waiting');
        }
    } catch (error) {
        debugLog('❌ ERROR in handleNewRound step 8a (button logic):', error.message);
        console.error('Full error:', error);
    }

    try {
        if (data.voorgooier) {
            const isVoorgooier = data.voorgooier === currentUser.id;
            if (isVoorgooier) {
                showInlineMessage('👑 Jij bent de voorgooier!', 'warning');
            } else {
                showInlineMessage(`${currentGame.opponent.username} is de voorgooier`, 'info');
            }
            debugLog('✅ Step 8b: Voorgooier message shown');
        }
    } catch (error) {
        debugLog('❌ ERROR in handleNewRound step 8b (voorgooier message):', error.message);
        console.error('Full error:', error);
    }

    try {
        // Fallback button logic (old code, may be redundant)
        debugLog('🔍 Step 9: Fallback button check');
        if (data.currentTurn === currentUser.id) {
            isMyTurn = true;
            showThrowButtons(data.mustBlind);
            debugLog('✅ Step 9: Fallback buttons shown');
        } else {
            isMyTurn = false;
            showWaitingMessage('Wachten op tegenstander...');
            debugLog('✅ Step 9: Fallback waiting');
        }
    } catch (error) {
        debugLog('❌ ERROR in handleNewRound step 9 (fallback):', error.message);
        console.error('Full error:', error);
    }
}

function handleYourTurn(data) {
    debugLog('🔔 Your turn:', data);

    isMyTurn = true;

    showInlineMessage(data.message || 'Jouw beurt!', 'info');

    // Store pattern info in currentGame for later use
    if (data.mustFollowPattern && data.voorgooierPattern) {
        currentGame.mustFollowPattern = true;
        currentGame.voorgooierPattern = data.voorgooierPattern;
        currentGame.achterliggerThrowCount = data.achterliggerThrowCount || 0;
    } else {
        currentGame.mustFollowPattern = false;
        currentGame.voorgooierPattern = null;
    }

    // Show throw buttons
    // If voorgooierPattern is provided, check what the CURRENT throw should be
    if (data.mustFollowPattern && data.voorgooierPattern && data.voorgooierPattern.length > 0) {
        // Achterligger must follow pattern
        const currentThrowIndex = data.achterliggerThrowCount || 0;
        const mustBeBlind = data.voorgooierPattern[currentThrowIndex];

        showThrowButtons(mustBeBlind, true); // true = following pattern
    } else {
        // Voorgooier or no pattern yet
        showThrowButtons(false, false); // Show both options
    }
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
    showDice(data.yourThrow.dice1, data.yourThrow.dice2, false, false); // No animation - just reveal
    showOpponentDice(data.opponentThrow.dice1, data.opponentThrow.dice2, false, false); // No animation - just reveal

    // Update both throws in history to not blind anymore
    if (playerThrowHistory.length > 0) {
        playerThrowHistory[playerThrowHistory.length - 1].isBlind = false;
    }
    if (opponentThrowHistory.length > 0) {
        opponentThrowHistory[opponentThrowHistory.length - 1].isBlind = false;
    }
    updateThrowHistory();

    // Show message
    showInlineMessage(`🎲 ${data.yourName}: ${data.yourThrow.name} | ${data.opponentName}: ${data.opponentThrow.name}`, 'info');

    hideAllActionButtons();
    showWaitingMessage('Automatische vergelijking...');
}

function handleFirstRoundResult(data) {
    debugLog('📊 First round result:', data);

    const iWon = data.winnerId === currentUser.id;
    const iLost = data.loserId === currentUser.id;

    // Update game state with new voorgooier
    if (data.newVoorgooier) {
        currentGame.voorgooier = data.newVoorgooier;
        currentGame.currentTurn = data.newVoorgooier;
        debugLog(`📌 New voorgooier: ${data.newVoorgooier === currentUser.id ? 'Me' : 'Opponent'}`);
    }

    // Update lives display
    updateGameUI();

    // Update last round summary for first round (NEW!)
    // Convert first round format to regular round format
    const summaryData = {
        voorgooierId: data.winnerId,  // Winner was first (arbitrary for round 1)
        achterliggerId: data.loserId,
        voorgooierThrow: data.winnerThrow,
        achterliggerThrow: data.loserThrow,
        winnerId: data.winnerId,
        loserId: data.loserId,
        penalty: data.penalty
    };
    updateLastRoundSummary(summaryData);

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

        // CRITICAL FIX: Show buttons immediately if it's our turn as voorgooier
        hideAllActionButtons();
        if (data.newVoorgooier === currentUser.id) {
            isMyTurn = true;
            showInlineMessage('👑 Jouw beurt als voorgooier! Gooi de dobbelstenen', 'info');
            showThrowButtons(false); // Both open and blind
            debugLog('✅ Voorgooier buttons shown after first round result');
        } else {
            isMyTurn = false;
            showWaitingMessage('Wachten op voorgooier...');
            debugLog('⏳ Waiting for opponent voorgooier');
        }
    }
}

function handleFirstRoundTie(data) {
    debugLog('⚔️ First round tie:', data);

    showInlineMessage('⚔️ Gelijkspel! Gooi opnieuw blind!', 'warning');
    showToast(data.message, 'warning', 3000);

    // Reset UI for new throw
    showDice('', '', false, false); // No animation - just clear
    showOpponentDice('', '', false, false); // No animation - just clear

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
    showToast(`${title}\nPower: ${eloChange} (Nieuw: ${iWon ? data.winnerElo : data.loserElo})`, iWon ? 'success' : 'error', 7000);

    // Show rematch and return buttons
    document.getElementById('requestRematchBtn')?.classList.remove('hidden');
    document.getElementById('returnLobbyBtn')?.classList.remove('hidden');
}

// ============================================
// UI UPDATES
// ============================================

function updateGameUI() {
    if (!currentGame) return;

    const roundNumberEl = document.getElementById('roundNumber');
    if (roundNumberEl) {
        roundNumberEl.textContent = currentGame.roundNumber || 1;
    }

    const me = currentGame.players?.find(p => p.id === currentUser.id);
    const opponent = currentGame.players?.find(p => p.id !== currentUser.id);

    if (me) updateLives(me.id, me.lives);
    if (opponent) {
        updateLives(opponent.id, opponent.lives);

        // Update opponent name in UI labels
        const opponentName = opponent.username || currentGame.opponent?.username || 'Tegenstander';
        const opponentDiceCupLabelEl = document.getElementById('opponentDiceCupLabel');
        if (opponentDiceCupLabelEl) {
            opponentDiceCupLabelEl.textContent = `🎯 ${opponentName}`;
        }
    }

    updateTurnIndicator();
}

function resetGameUI() {
    debugLog('🔄 Resetting game UI...');

    // Hide all action buttons first
    hideAllActionButtons();

    // Clear any stuck animations
    document.querySelectorAll('.rolling').forEach(el => el.classList.remove('rolling'));
    document.querySelectorAll('.shaking').forEach(el => el.classList.remove('shaking'));

    // Update game state displays
    if (currentGame) {
        updateGameUI();
        updateThrowHistory();

        // Show appropriate buttons based on turn
        if (isMyTurn) {
            // Check if we need to show specific buttons based on game state
            if (currentGame.isSimultaneous) {
                showThrowButtons(true); // Blind only for first round
            } else if (currentGame.mustBlind) {
                showThrowButtons(true);
            } else {
                // Show appropriate buttons - you may need to adjust based on actual game state
                updateTurnIndicator();
            }
        } else {
            showWaitingMessage('Wachten op tegenstander...');
        }

        debugLog('✅ UI reset voltooid');
    } else {
        debugLog('⚠️ Geen actieve game om te resetten');
        showWaitingMessage('Geen actieve game');
    }
}

function updateLives(playerId, lives) {
    const isMe = playerId === currentUser.id;
    const livesElement = document.getElementById(isMe ? 'myLives' : 'opponentLives');

    if (livesElement) {
        // Display lives as dice symbols (6 levens = ⚅, 5 = ⚄, etc.)
        const diceSymbols = ['💀', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const clampedLives = Math.max(0, Math.min(6, lives));
        livesElement.textContent = diceSymbols[clampedLives];
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

// Helper function to calculate throw display value
function calculateThrowDisplay(dice1, dice2) {
    const higher = Math.max(dice1, dice2);
    const lower = Math.min(dice1, dice2);

    if ((higher === 2 && lower === 1) || (higher === 1 && lower === 2)) {
        // Mexico!
        return { displayValue: '21', isMexico: true };
    } else if (higher === lower) {
        // Doubles as hundreds (66 = 600, 55 = 500, etc.)
        return { displayValue: (higher * 100).toString(), isMexico: false };
    } else {
        // Regular throw (highest first)
        return { displayValue: (higher * 10 + lower).toString(), isMexico: false };
    }
}

function updateThrowHistory() {
    const historyDisplay = document.getElementById('throwHistoryDisplay');
    if (!historyDisplay) return;

    // Always show the history panel (even when empty)
    historyDisplay.classList.remove('hidden');

    // Update opponent label
    const opponent = currentGame?.players?.find(p => p.id !== currentUser?.id);
    const opponentName = opponent?.username || 'Tegenstander';
    document.getElementById('opponentThrowHistoryLabel').textContent = `🎯 ${opponentName}`;

    // Build player column
    const playerItems = document.getElementById('playerThrowHistoryItems');
    if (playerItems) {
        let playerHtml = '';
        if (playerThrowHistory.length === 0) {
            playerHtml = '<div class="text-xs opacity-50" style="color: var(--text-secondary);">Nog geen worpen</div>';
        } else {
            playerThrowHistory.forEach((throwData, index) => {
                // Check if this is still blind (not revealed)
                const isStillBlind = throwData.isBlind;

                let displayValue, typeLabel, mexicoLabel;

                if (isStillBlind) {
                    // Current throw is still blind - don't reveal!
                    displayValue = '???';
                    typeLabel = '🙈 Verborgen';
                    mexicoLabel = '';
                } else {
                    // Throw has been revealed (or was open from start)
                    displayValue = throwData.displayValue;
                    typeLabel = throwData.wasBlind ? '🙈→👁️' : '👁️';
                    mexicoLabel = throwData.isMexico ? ' <span style="color: var(--color-gold-light);" class="font-bold">🎉</span>' : '';
                }

                playerHtml += `<div class="text-xs" style="color: var(--text-primary);">
                    <span class="opacity-75">${index + 1}.</span>
                    <span class="font-bold" style="color: var(--color-gold);">${displayValue}</span>
                    <span class="opacity-60 text-[0.65rem]">${typeLabel}</span>
                    ${mexicoLabel}
                </div>`;
            });
        }
        playerItems.innerHTML = playerHtml;
    }

    // Build opponent column
    const opponentItems = document.getElementById('opponentThrowHistoryItems');
    if (opponentItems) {
        let opponentHtml = '';
        if (opponentThrowHistory.length === 0) {
            opponentHtml = '<div class="text-xs opacity-50" style="color: var(--text-secondary);">Nog geen worpen</div>';
        } else {
            opponentThrowHistory.forEach((throwData, index) => {
                // Check if this throw is still blind (not revealed yet)
                const isStillBlind = throwData.isBlind;

                let displayValue, typeLabel, mexicoLabel;

                if (isStillBlind) {
                    // Opponent throw is still blind - don't reveal!
                    displayValue = '???';
                    typeLabel = '🙈 Verborgen';
                    mexicoLabel = '';
                } else {
                    // Throw has been revealed
                    displayValue = throwData.displayValue;
                    typeLabel = throwData.wasBlind ? '🙈→👁️' : '👁️';
                    mexicoLabel = throwData.isMexico ? ' <span style="color: var(--color-gold-light);" class="font-bold">🎉</span>' : '';
                }

                opponentHtml += `<div class="text-xs" style="color: var(--text-primary);">
                    <span class="opacity-75">${index + 1}.</span>
                    <span class="font-bold" style="color: var(--color-gold);">${displayValue}</span>
                    <span class="opacity-60 text-[0.65rem]">${typeLabel}</span>
                    ${mexicoLabel}
                </div>`;
            });
        }
        opponentItems.innerHTML = opponentHtml;
    }

    // Update game info section
    const gameInfo = document.getElementById('gameInfoInHistory');
    if (gameInfo && currentGame) {
        const voorgooierName = currentGame.voorgooier === currentUser?.id ? 'Jij' : opponentName;
        gameInfo.innerHTML = `
            <div>Ronde ${currentGame.roundNumber || 1} | Voorgooier: <span class="font-semibold" style="color: var(--color-gold);">${voorgooierName}</span></div>
        `;
    }
}

function showDice(dice1, dice2, isHidden, animate = true) {
    const dice1El = document.getElementById('myDice1');
    const dice2El = document.getElementById('myDice2');
    const diceCup = document.getElementById('playerDiceCup');

    if (!dice1El || !dice2El) return;

    debugLog(`🎲 showDice called: dice1=${dice1}, dice2=${dice2}, isHidden=${isHidden}, animate=${animate}`);

    // Bij BLIND worp: meteen verbergen VOOR animatie
    if (isHidden) {
        dice1El.textContent = '?';
        dice2El.textContent = '?';
        dice1El.style.visibility = 'visible';
        dice2El.style.visibility = 'visible';
    }

    // If animation requested and we have valid dice values
    if (animate && ((isHidden) || (dice1 && dice2 && dice1 !== '' && dice2 !== ''))) {
        // Animate dice cup
        if (diceCup) {
            diceCup.classList.add('shaking');
            setTimeout(() => {
                diceCup.classList.remove('shaking');
            }, 500);
        }

        // Make dice visible and add rolling class
        dice1El.style.visibility = 'visible';
        dice2El.style.visibility = 'visible';
        dice1El.classList.add('rolling');
        dice2El.classList.add('rolling');

        // Bij BLIND: blijf ? tonen tijdens animatie
        if (isHidden) {
            // Geen rolling numbers, gewoon shake effect
            setTimeout(() => {
                dice1El.classList.remove('rolling');
                dice2El.classList.remove('rolling');
                dice1El.textContent = '?';
                dice2El.textContent = '?';
            }, 500);
            return; // Stop hier voor blind worpen
        }

        // Random rolling effect (alleen voor OPEN worpen)
        const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        let rollCount = 0;
        const rollInterval = setInterval(() => {
            const rand1 = Math.floor(Math.random() * 6) + 1;
            const rand2 = Math.floor(Math.random() * 6) + 1;
            dice1El.textContent = diceSymbols[rand1 - 1];
            dice2El.textContent = diceSymbols[rand2 - 1];
            rollCount++;

            if (rollCount >= 10) {
                clearInterval(rollInterval);

                // Show final result
                dice1El.classList.remove('rolling');
                dice2El.classList.remove('rolling');

                debugLog(`🎯 Animation ending - showing final: dice1=${dice1} (${diceSymbols[dice1 - 1]}), dice2=${dice2} (${diceSymbols[dice2 - 1]})`);

                dice1El.textContent = diceSymbols[dice1 - 1];
                dice2El.textContent = diceSymbols[dice2 - 1];
            }
        }, 50);

        return;
    }

    // No animation - show immediately
    if (isHidden) {
        // Blind throw - show question marks
        dice1El.style.visibility = 'visible';
        dice2El.style.visibility = 'visible';
        dice1El.textContent = '?';
        dice2El.textContent = '?';
    } else if (dice1 === '' || dice2 === '' || !dice1 || !dice2) {
        // No throw yet - dice are in the cup, not visible!
        dice1El.style.visibility = 'hidden';
        dice2El.style.visibility = 'hidden';
        dice1El.textContent = '';
        dice2El.textContent = '';
    } else {
        // Normal throw - show dice values
        dice1El.style.visibility = 'visible';
        dice2El.style.visibility = 'visible';
        const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        dice1El.textContent = diceSymbols[dice1 - 1];
        dice2El.textContent = diceSymbols[dice2 - 1];
    }
}

function showOpponentDice(dice1, dice2, isHidden, animate = true) {
    const dice1El = document.getElementById('opponentDice1');
    const dice2El = document.getElementById('opponentDice2');
    const diceCup = document.getElementById('opponentDiceCup');

    if (!dice1El || !dice2El) return;

    // If animation requested and we have valid dice values
    if (animate && ((isHidden) || (dice1 && dice2 && dice1 !== '' && dice2 !== ''))) {
        // Animate dice cup
        if (diceCup) {
            diceCup.classList.add('shaking');
            setTimeout(() => {
                diceCup.classList.remove('shaking');
            }, 500);
        }

        // Make dice visible and add rolling class
        dice1El.style.visibility = 'visible';
        dice2El.style.visibility = 'visible';
        dice1El.classList.add('rolling');
        dice2El.classList.add('rolling');

        // Random rolling effect
        const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        let rollCount = 0;
        const rollInterval = setInterval(() => {
            const rand1 = Math.floor(Math.random() * 6) + 1;
            const rand2 = Math.floor(Math.random() * 6) + 1;
            dice1El.textContent = diceSymbols[rand1 - 1];
            dice2El.textContent = diceSymbols[rand2 - 1];
            rollCount++;

            if (rollCount >= 10) {
                clearInterval(rollInterval);

                // Show final result
                dice1El.classList.remove('rolling');
                dice2El.classList.remove('rolling');

                if (isHidden) {
                    dice1El.textContent = '?';
                    dice2El.textContent = '?';
                } else {
                    dice1El.textContent = diceSymbols[dice1 - 1];
                    dice2El.textContent = diceSymbols[dice2 - 1];
                }
            }
        }, 50);

        return;
    }

    // No animation - show immediately
    if (isHidden) {
        // Blind throw - show question marks
        dice1El.style.visibility = 'visible';
        dice2El.style.visibility = 'visible';
        dice1El.textContent = '?';
        dice2El.textContent = '?';
    } else if (dice1 === '' || dice2 === '' || !dice1 || !dice2) {
        // No throw yet - dice are in the cup, not visible!
        dice1El.style.visibility = 'hidden';
        dice2El.style.visibility = 'hidden';
        dice1El.textContent = '';
        dice2El.textContent = '';
    } else {
        // Normal throw - show dice values
        dice1El.style.visibility = 'visible';
        dice2El.style.visibility = 'visible';
        const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        dice1El.textContent = diceSymbols[dice1 - 1];
        dice2El.textContent = diceSymbols[dice2 - 1];
    }
}

function showThrowButtons(mustBlind, followingPattern = false) {
    hideAllActionButtons();

    if (followingPattern) {
        // Achterligger must follow voorgooier's pattern
        if (mustBlind) {
            // Voorgooier threw blind → achterligger must throw blind
            document.getElementById('throwBlindBtn')?.classList.remove('hidden');
        } else {
            // Voorgooier threw open → achterligger must throw open
            document.getElementById('throwOpenBtn')?.classList.remove('hidden');
        }
    } else {
        // Voorgooier OR first round - show options based on mustBlind
        if (mustBlind) {
            // First round: must be blind
            document.getElementById('throwBlindBtn')?.classList.remove('hidden');
        } else {
            // Normal turn: can choose
            document.getElementById('throwOpenBtn')?.classList.remove('hidden');
            document.getElementById('throwBlindBtn')?.classList.remove('hidden');
        }
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

// showResultChoiceButtons VERWIJDERD - automatische vergelijking!

function hideAllActionButtons() {
    ['throwOpenBtn', 'throwBlindBtn', 'revealBtn', 'keepBtn'].forEach(id => {
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

// Voorgooier pattern display functions VERWIJDERD - overbodig met throw history statistieken

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
    loadRecentGames();
    loadRecentUsers();
}

// ============================================
// REMATCH FUNCTIONALITY
// ============================================

function requestRematch() {
    if (!currentGame || !currentGame.opponent) return;

    // Disable rematch button and show waiting state
    const rematchBtn = document.getElementById('requestRematchBtn');
    if (rematchBtn) {
        rematchBtn.disabled = true;
        rematchBtn.textContent = '⏳ Wachten op tegenstander...';
    }

    socket?.emit('request_rematch', {
        gameId: currentGame.gameId,
        opponentId: currentGame.opponent.id
    });

    showToast('🔄 Revanche aanvraag verzonden...', 'info', 3000);
}

function handleRematchRequest(data) {
    debugLog('🔄 Rematch request received:', data);

    const opponentName = data.fromUsername || 'Je tegenstander';

    // Show confirmation dialog
    if (confirm(`${opponentName} wil revanche! Wil je nog een keer spelen?`)) {
        socket?.emit('accept_rematch', {
            requestId: data.requestId,
            fromUserId: data.fromUserId
        });
        showToast('✅ Revanche geaccepteerd! Starting nieuwe game...', 'success', 2000);
    } else {
        socket?.emit('decline_rematch', {
            requestId: data.requestId,
            fromUserId: data.fromUserId
        });
        showToast('❌ Revanche geweigerd', 'info', 2000);
    }
}

function handleRematchAccepted(data) {
    debugLog('✅ Rematch accepted:', data);
    showToast('🎮 Revanche geaccepteerd! Game start...', 'success', 2000);

    // Reset UI
    resetGameUI();

    // Game will start automatically via game_start event
}

function handleRematchDeclined(data) {
    debugLog('❌ Rematch declined:', data);
    showToast('😔 Revanche geweigerd door tegenstander', 'error', 3000);

    // Re-enable rematch button
    const rematchBtn = document.getElementById('requestRematchBtn');
    if (rematchBtn) {
        rematchBtn.disabled = false;
        rematchBtn.textContent = '🔄 Revanche aanvragen';
    }
}

// ============================================
// VASTGOOIER HANDLERS
// ============================================

function handleVastgooier(data) {
    debugLog('⚔️  Vastgooier:', data);

    showInlineMessage(data.message || '🤝 Gelijkspel! Overgooien!', 'warning');
    showToast('⚔️ VASTGOOIER! Beide spelers gooien blind', 'warning', 3000);

    // Enable blind throw for both players
    isMyTurn = true;

    // Force UI update with slight delay to ensure DOM is ready
    setTimeout(() => {
        hideAllActionButtons();
        const blindBtn = document.getElementById('throwBlindBtn');
        if (blindBtn) {
            blindBtn.classList.remove('hidden');
            debugLog('✅ Vastgooier blind button shown');
        } else {
            debugLog('❌ ERROR: Blind button not found!');
        }
        updateTurnIndicator();
    }, 100);
}

function handleVastgooierReveal(data) {
    debugLog('👁️  Vastgooier reveal:', data);

    // Show own throw
    showDice(data.yourThrow.dice1, data.yourThrow.dice2, false, false); // No animation - just reveal

    // Show opponent throw
    showOpponentDice(data.opponentThrow.dice1, data.opponentThrow.dice2, false, false); // No animation - just reveal

    // Update both throws in history to not blind anymore
    if (playerThrowHistory.length > 0) {
        playerThrowHistory[playerThrowHistory.length - 1].isBlind = false;
    }
    if (opponentThrowHistory.length > 0) {
        opponentThrowHistory[opponentThrowHistory.length - 1].isBlind = false;
    }
    updateThrowHistory();

    // Show message
    showInlineMessage(`Jij: ${data.yourThrow.name} vs ${data.opponentName}: ${data.opponentThrow.name}`, 'info');
}

function handleVastgooierResult(data) {
    debugLog('🏆 Vastgooier result:', data);

    const isWinner = data.winnerId === currentUser.id;

    if (data.gameOver) {
        showInlineMessage(isWinner ? '🎉 JE WINT!' : '💀 GAME OVER', isWinner ? 'success' : 'error');
        showToast(isWinner ? '🎉 Gefeliciteerd! Je hebt gewonnen!' : '💀 Helaas! Je hebt verloren', isWinner ? 'success' : 'error', 5000);
    } else {
        showInlineMessage(isWinner ? '✅ Ronde gewonnen!' : '❌ Ronde verloren', isWinner ? 'success' : 'error');

        // Update game UI
        updateGameUI();

        // Show penalty message
        if (!isWinner) {
            showToast(`-${data.penalty} leven (geen Mexico penalty bij overgooien)`, 'warning', 3000);
        }
    }

    hideAllActionButtons();
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

    // Also log to new debug panel
    logToDebugPanel(args.join(' '));
}

// New Debug Panel Functions
function logToDebugPanel(message, type = 'info') {
    const debugEventLog = document.getElementById('debugEventLog');
    if (!debugEventLog) return;

    // Clear initial "waiting" message
    if (debugEventLog.children.length === 1 && debugEventLog.children[0].textContent.includes('Wachten')) {
        debugEventLog.innerHTML = '';
    }

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '4px';

    let color = '#00ff00';
    if (type === 'error') color = '#ff4444';
    if (type === 'warn') color = '#ffaa00';

    logEntry.innerHTML = `<span style="color: #666;">[${timestamp}]</span> <span style="color: ${color};">${message}</span>`;
    debugEventLog.appendChild(logEntry);

    // Auto-scroll to bottom
    debugEventLog.scrollTop = debugEventLog.scrollHeight;

    // Keep only last 50 entries
    while (debugEventLog.children.length > 50) {
        debugEventLog.removeChild(debugEventLog.firstChild);
    }
}

function updateDebugSocketStatus(status, color = '#00ff00') {
    const el = document.getElementById('debugSocketStatus');
    if (el) {
        el.innerHTML = `<span style="color: ${color};">${status}</span>`;
    }
}

function updateDebugQueueStatus(status, inQueue = false) {
    const el = document.getElementById('debugQueueStatus');
    if (el) {
        const color = inQueue ? '#00ff00' : '#aaa';
        el.innerHTML = `<span style="color: ${color};">${status}</span>`;
    }
}

function updateDebugQueueSize(size) {
    const el = document.getElementById('debugQueueSize');
    if (el) {
        el.innerHTML = `Spelers in queue: <span class="font-bold" style="color: var(--color-gold);">${size}</span>`;
    }
}

function updateDebugMatchStatus(status, color = '#aaa') {
    const el = document.getElementById('debugMatchStatus');
    if (el) {
        el.innerHTML = `<span style="color: ${color};">${status}</span>`;
    }
}

// ============================================
// LAST ROUND SUMMARY
// ============================================

function updateLastRoundSummary(data) {
    const summaryEl = document.getElementById('lastRoundSummary');
    const contentEl = document.getElementById('lastRoundContent');

    if (!summaryEl || !contentEl || !data) return;

    // Determine names
    const voorgooierName = data.voorgooierId === currentUser.id ? 'Jij' : currentGame.opponent.username;
    const achterliggerName = data.achterliggerId === currentUser.id ? 'Jij' : currentGame.opponent.username;
    const winnerName = data.winnerId === currentUser.id ? 'Jij' : currentGame.opponent.username;
    const loserName = data.loserId === currentUser.id ? 'Jij' : currentGame.opponent.username;

    // Get throw values
    const voorgooierValue = data.voorgooierThrow?.displayName || data.voorgooierThrow?.value || '?';
    const achterliggerValue = data.achterliggerThrow?.displayName || data.achterliggerThrow?.value || '?';

    // Build compact text summary
    let text = '';

    if (data.winnerId && data.loserId) {
        const winnerColor = data.winnerId === currentUser.id ? 'var(--color-green)' : 'var(--color-red)';
        const loserColor = data.loserId === currentUser.id ? 'var(--color-red)' : 'var(--color-green)';

        // Main result line
        text = `<span style="color: var(--color-gold);">📊 Vorige ronde:</span> `;
        text += `👑 ${voorgooierName} (${voorgooierValue}) vs 🎯 ${achterliggerName} (${achterliggerValue}) → `;
        text += `<span style="color: ${winnerColor}; font-weight: bold;">${winnerName} wint</span>`;

        // Penalty info (draaisteen terminologie)
        if (data.penalty > 1) {
            text += ` <span style="color: var(--color-red);">(${loserName} draait ${data.penalty}x, Mexico!)</span>`;
        } else {
            text += ` <span style="color: var(--text-secondary);">(${loserName} moet draaien)</span>`;
        }

        // Next voorgooier
        text += ` → ${loserName} mag voorgooien`;
    } else {
        text = `<span style="color: var(--color-gold);">📊 Vorige ronde:</span> `;
        text += `${voorgooierName} (${voorgooierValue}) vs ${achterliggerName} (${achterliggerValue}) → `;
        text += `<span style="color: var(--text-secondary);">🔄 Gelijkspel (Vastgooier!)</span>`;
    }

    contentEl.innerHTML = text;
    summaryEl.classList.remove('hidden');
}

// Close summary button handler
document.addEventListener('DOMContentLoaded', () => {
    const closeSummaryBtn = document.getElementById('closeSummaryBtn');
    if (closeSummaryBtn) {
        closeSummaryBtn.addEventListener('click', () => {
            document.getElementById('lastRoundSummary')?.classList.add('hidden');
        });
    }
});

console.log('🎲 Multiplayer Mexico Client - CORRECTE SPELREGELS');
console.log('✅ Client initialized');
