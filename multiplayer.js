// Multiplayer Mexico Game - Client (CORRECTE SPELREGELS)
// Smart API URL detection: use dev server if on production without backend
let API_URL = window.location.origin;
let SOCKET_URL = window.location.origin;

// If on GitHub Pages (koningmexico.nl without backend), use dev server
if (window.location.hostname === 'koningmexico.nl' || window.location.hostname.includes('github.io')) {
    API_URL = 'https://dev.koningmexico.nl';
    SOCKET_URL = 'https://dev.koningmexico.nl';
    console.log('📡 Using dev backend:', API_URL);
}

// If opened via file:// protocol (local testing), use localhost backend
if (window.location.protocol === 'file:') {
    API_URL = 'http://localhost:3001';
    SOCKET_URL = 'http://localhost:3001';
    console.log('📡 Local file detected, using localhost backend:', API_URL);
}

// ============================================
// CENTRALIZED STATE MANAGEMENT
// ============================================

const gameState = {
    // Connection & Auth
    socket: null,
    currentUser: null,
    accessToken: null,

    // Game State
    currentGame: null,
    isMyTurn: false,
    currentThrowData: null,

    // Throw history (per round)
    playerThrowHistory: [],
    opponentThrowHistory: [],

    // UI State
    debugMode: true,

    // Getters
    getSocket() { return this.socket; },
    getUser() { return this.currentUser; },
    getToken() { return this.accessToken; },
    getGame() { return this.currentGame; },
    isPlayerTurn() { return this.isMyTurn; },
    getThrowData() { return this.currentThrowData; },
    getPlayerHistory() { return this.playerThrowHistory; },
    getOpponentHistory() { return this.opponentThrowHistory; },
    isDebugMode() { return this.debugMode; },

    // Setters
    setSocket(socket) { this.socket = socket; },
    setUser(user) {
        this.currentUser = user;
        if (user) localStorage.setItem('currentUser', JSON.stringify(user));
        else localStorage.removeItem('currentUser');
    },
    setToken(token) {
        this.accessToken = token;
        if (token) localStorage.setItem('accessToken', token);
        else localStorage.removeItem('accessToken');
    },
    setGame(game) {
        this.currentGame = game;
        // Track active game for reconnection
        if (game && game.gameId) {
            localStorage.setItem('activeGameId', game.gameId);
        } else {
            localStorage.removeItem('activeGameId');
        }
    },
    getActiveGameId() {
        return localStorage.getItem('activeGameId');
    },
    setTurn(isMyTurn) { this.isMyTurn = isMyTurn; },
    setThrowData(data) { this.currentThrowData = data; },
    setPlayerHistory(history) { this.playerThrowHistory = history; },
    setOpponentHistory(history) { this.opponentThrowHistory = history; },
    addPlayerThrow(dice1, dice2, value, isBlind) {
        this.playerThrowHistory.push({ dice1, dice2, value, isBlind });
    },
    addOpponentThrow(dice1, dice2, value, isBlind) {
        this.opponentThrowHistory.push({ dice1, dice2, value, isBlind });
    },
    clearHistory() {
        this.playerThrowHistory = [];
        this.opponentThrowHistory = [];
    },

    // Reset entire state
    reset() {
        this.currentGame = null;
        this.isMyTurn = false;
        this.currentThrowData = null;
        this.clearHistory();
        localStorage.removeItem('activeGameId');
    },

    // Logout
    logout() {
        this.socket?.disconnect();
        this.socket = null;
        this.currentUser = null;
        this.accessToken = null;
        this.reset();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('activeGameId');
    }
};

// ============================================
// DYNAMIC BACKWARD COMPATIBILITY LAYER
// ============================================
// These properties dynamically reference gameState to ensure synchronization
// Reading these variables gets current value from gameState
// Writing to these variables updates gameState (use setters where possible)

Object.defineProperty(globalThis, 'socket', {
    get: () => gameState.getSocket(),
    set: (value) => gameState.setSocket(value),
    configurable: true
});

Object.defineProperty(globalThis, 'currentUser', {
    get: () => gameState.getUser(),
    set: (value) => gameState.setUser(value),
    configurable: true
});

Object.defineProperty(globalThis, 'accessToken', {
    get: () => gameState.getToken(),
    set: (value) => gameState.setToken(value),
    configurable: true
});

Object.defineProperty(globalThis, 'currentGame', {
    get: () => gameState.getGame(),
    set: (value) => gameState.setGame(value),
    configurable: true
});

Object.defineProperty(globalThis, 'isMyTurn', {
    get: () => gameState.isPlayerTurn(),
    set: (value) => gameState.setTurn(value),
    configurable: true
});

Object.defineProperty(globalThis, 'currentThrowData', {
    get: () => gameState.getThrowData(),
    set: (value) => gameState.setThrowData(value),
    configurable: true
});

Object.defineProperty(globalThis, 'debugMode', {
    get: () => gameState.isDebugMode(),
    set: (value) => gameState.debugMode = value,
    configurable: true
});

Object.defineProperty(globalThis, 'playerThrowHistory', {
    get: () => gameState.getPlayerHistory(),
    set: (value) => gameState.setPlayerHistory(value),
    configurable: true
});

Object.defineProperty(globalThis, 'opponentThrowHistory', {
    get: () => gameState.getOpponentHistory(),
    set: (value) => gameState.setOpponentHistory(value),
    configurable: true
});

// Active timers/intervals tracking (for cleanup)
let activeTimers = {
    intervals: [],
    timeouts: []
};

// ============================================
// CENTRALIZED ERROR HANDLING
// ============================================

const ErrorHandler = {
    // Error types
    types: {
        NETWORK: 'network',
        AUTH: 'auth',
        GAME: 'game',
        VALIDATION: 'validation',
        UNKNOWN: 'unknown'
    },

    // Error severity
    severity: {
        INFO: 'info',
        WARNING: 'warning',
        ERROR: 'error',
        CRITICAL: 'critical'
    },

    // Handle error with appropriate user feedback
    handle(error, type = this.types.UNKNOWN, severity = this.severity.ERROR) {
        // Log to console
        const emoji = this._getEmoji(severity);
        console.error(`${emoji} [${type.toUpperCase()}]`, error);

        // Get user-friendly message
        const message = this._getUserMessage(error, type);

        // Show appropriate UI feedback
        switch (severity) {
            case this.severity.INFO:
                showToast(message, 'info', 3000);
                break;
            case this.severity.WARNING:
                showToast(message, 'warning', 4000);
                break;
            case this.severity.ERROR:
                showToast(message, 'error', 5000);
                break;
            case this.severity.CRITICAL:
                showToast(message, 'error', 8000);
                this._showCriticalErrorModal(message);
                break;
        }

        // Track error for debugging
        this._trackError(error, type, severity);
    },

    // Network error handler
    network(error, context = '') {
        const message = context ? `${context}: ${error.message}` : error.message;
        this.handle(new Error(message), this.types.NETWORK, this.severity.ERROR);
    },

    // Auth error handler
    auth(error, shouldLogout = false) {
        this.handle(error, this.types.AUTH, this.severity.ERROR);
        if (shouldLogout) {
            trackTimeout(setTimeout(() => {
                gameState.logout();
                showAuth();
            }, 2000));
        }
    },

    // Game logic error handler
    game(error, context = '') {
        const message = context ? `${context}: ${error.message}` : error.message;
        this.handle(new Error(message), this.types.GAME, this.severity.WARNING);
    },

    // Validation error handler
    validation(message) {
        this.handle(new Error(message), this.types.VALIDATION, this.severity.INFO);
    },

    // Critical error handler
    critical(error, context = '') {
        const message = context ? `${context}: ${error.message}` : error.message;
        this.handle(new Error(message), this.types.UNKNOWN, this.severity.CRITICAL);
    },

    // Get emoji for severity
    _getEmoji(severity) {
        switch (severity) {
            case this.severity.INFO: return 'ℹ️';
            case this.severity.WARNING: return '⚠️';
            case this.severity.ERROR: return '❌';
            case this.severity.CRITICAL: return '🚨';
            default: return '❓';
        }
    },

    // Get user-friendly message
    _getUserMessage(error, type) {
        const message = error.message || 'Er is een onbekende fout opgetreden';

        // Try to extract meaningful message from common error patterns
        if (message.includes('fetch') || message.includes('network')) {
            return 'Netwerkfout - controleer je internetverbinding';
        }
        if (message.includes('timeout')) {
            return 'Verbinding timeout - probeer het opnieuw';
        }
        if (message.includes('unauthorized') || message.includes('401')) {
            return 'Sessie verlopen - log opnieuw in';
        }
        if (message.includes('forbidden') || message.includes('403')) {
            return 'Geen toegang tot deze actie';
        }
        if (message.includes('not found') || message.includes('404')) {
            return 'Gevraagde resource niet gevonden';
        }
        if (message.includes('500') || message.includes('server error')) {
            return 'Serverfout - probeer het later opnieuw';
        }

        // Return original message if no pattern matched
        return message;
    },

    // Show critical error modal
    _showCriticalErrorModal(message) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-red-600 rounded-2xl shadow-2xl p-8 max-w-md text-center text-white">
                <div class="text-6xl mb-4">🚨</div>
                <h3 class="text-2xl font-bold mb-4">Kritieke Fout</h3>
                <p class="mb-6">${message}</p>
                <button onclick="location.reload()" class="bg-white text-red-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors">
                    Pagina Herladen
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Track error for debugging (can be extended to send to logging service)
    _trackError(error, type, severity) {
        if (!gameState.isDebugMode()) return;

        const errorLog = {
            timestamp: new Date().toISOString(),
            type,
            severity,
            message: error.message,
            stack: error.stack,
            user: gameState.getUser()?.username,
            game: gameState.getGame()?.gameId
        };

        // Store in console for now (can be sent to logging service later)
        console.log('📊 Error tracked:', errorLog);
    }
};

// Cleanup function to prevent memory leaks
function clearAllTimers() {
    activeTimers.intervals.forEach(id => clearInterval(id));
    activeTimers.timeouts.forEach(id => clearTimeout(id));
    activeTimers.intervals = [];
    activeTimers.timeouts = [];
}

// Track interval/timeout for cleanup
function trackInterval(id) {
    activeTimers.intervals.push(id);
    return id;
}

function trackTimeout(id) {
    activeTimers.timeouts.push(id);
    return id;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    clearAllTimers();
    if (socket) {
        socket.disconnect();
    }
});

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('currentUser');

    if (storedToken && storedUser) {
        gameState.setToken(storedToken);
        gameState.setUser(JSON.parse(storedUser));
        // Update legacy variables for backward compatibility
        accessToken = gameState.accessToken;
        currentUser = gameState.currentUser;
        initializeSocket();

        // Check for active game to reconnect
        const activeGameId = gameState.getActiveGameId();
        if (activeGameId) {
            console.log('🔄 Found active game, attempting reconnection:', activeGameId);
            attemptGameReconnection(activeGameId);
        } else {
            showLobby();
        }
    } else {
        showAuth();
    }

    setupAuthListeners();
    setupLobbyListeners();
    setupGameListeners();
    initializeShop(); // Phase 3: Credits system
    setupUIListeners();

    // Update header user display if logged in
    if (gameState.getUser()) {
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

    // Reset queue status - hide "Match gevonden!" message
    const queueSearching = document.getElementById('queueSearching');
    const queueIdle = document.getElementById('queueIdle');
    if (queueSearching) queueSearching.classList.add('hidden');
    if (queueIdle) queueIdle.classList.remove('hidden');

    // Hide game result section (shown after game ends)
    document.getElementById('gameResult')?.classList.add('hidden');

    // Show/hide gambling opt-in (Phase 3: Only for registered users)
    updateGamblingOptInVisibility();

    loadLeaderboard();
    loadRecentGames();
    loadRecentUsers();
    updateUserStats();
    loadUserStats(); // Phase 2: Load stats dashboard
}

// Show gambling opt-in for registered users only (Phase 3)
function updateGamblingOptInVisibility() {
    const gamblingOptIn = document.getElementById('gamblingOptIn');
    if (!gamblingOptIn) return;

    // Only show for registered users (not guests) with sufficient credits
    if (currentUser && !currentUser.id.startsWith('guest-')) {
        // Check if user has at least 100 credits (credits is an object with balance property)
        const hasEnoughCredits = currentUser.credits && currentUser.credits.balance >= 100;

        if (hasEnoughCredits) {
            gamblingOptIn.classList.remove('hidden');
        } else {
            gamblingOptIn.classList.add('hidden');
            // Uncheck if hidden
            const gamblingCheckbox = document.getElementById('gamblingCheckbox');
            if (gamblingCheckbox) gamblingCheckbox.checked = false;
        }
    } else {
        gamblingOptIn.classList.add('hidden');
        // Uncheck if hidden
        const gamblingCheckbox = document.getElementById('gamblingCheckbox');
        if (gamblingCheckbox) gamblingCheckbox.checked = false;
    }
}

function showGame() {
    hideAllScreens();
    document.getElementById('gameScreen')?.classList.remove('hidden');

    // Hide game result section (shown after game ends)
    document.getElementById('gameResult')?.classList.add('hidden');
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

    // Guest login button - GLOBAL function for inline onclick (most reliable on mobile)
    window.handleGuestLoginClick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 Guest login clicked via inline onclick!');

        const guestBtn = document.getElementById('guestLoginBtn');
        if (guestBtn) {
            // Disable button temporarily to prevent double-clicks
            guestBtn.disabled = true;
            guestBtn.style.opacity = '0.6';
            guestBtn.style.pointerEvents = 'none';

            // Call handler
            handleGuestLogin();

            // Re-enable after 2 seconds
            trackTimeout(setTimeout(() => {
                guestBtn.disabled = false;
                guestBtn.style.opacity = '1';
                guestBtn.style.pointerEvents = 'auto';
            }, 2000));
        }
    };

    console.log('✅ Guest login handler registered globally');

    // Spelregels modal handler - GLOBAL function for inline link
    window.handleSpelregelsClick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('📜 Spelregels clicked!');

        const spelregelsModal = document.getElementById('spelregelsModal');
        if (spelregelsModal) {
            console.log('📜 Opening modal...');
            spelregelsModal.classList.remove('hidden');
        } else {
            console.error('❌ Modal not found!');
        }
    };

    console.log('✅ Spelregels handler registered globally');

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

    // Logout buttons (header and lobby)
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('lobbyLogoutBtn')?.addEventListener('click', handleLogout);

    // Disclaimer Modal Logic
    setupDisclaimerModal();
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
        localStorage.setItem('token', accessToken); // Also store as 'token' for API calls

        initializeSocket();
        updateHeaderUserDisplay();
        showLobby();

        // Check if user needs to accept disclaimer
        await checkDisclaimerStatus();
    } catch (error) {
        console.error('Login error:', error);
        showToast('Verbinding mislukt - is de server actief?', 'error');
    }
}

async function handleRegister() {
    const username = document.getElementById('registerUsername')?.value;
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;
    const disclaimerCheckbox = document.getElementById('registerDisclaimerCheckbox');

    if (!username || !email || !password) {
        showToast('Vul alle velden in', 'warning');
        return;
    }

    // Check if disclaimer is accepted
    if (!disclaimerCheckbox || !disclaimerCheckbox.checked) {
        showToast('Je moet akkoord gaan met de disclaimer om te registreren', 'warning');
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
        localStorage.setItem('token', accessToken); // Also store as 'token' for API calls

        // Accept disclaimer for new user
        try {
            await fetch(`${API_URL}/api/disclaimer/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (disclaimerError) {
            console.error('Error accepting disclaimer:', disclaimerError);
            // Don't block registration if disclaimer acceptance fails
        }

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
// DISCLAIMER MANAGEMENT
// ============================================

function setupDisclaimerModal() {
    const disclaimerModal = document.getElementById('disclaimerModal');
    const disclaimerAcceptCheckbox = document.getElementById('disclaimerAcceptCheckbox');
    const disclaimerAcceptBtn = document.getElementById('disclaimerAcceptBtn');
    const disclaimerCloseBtn = document.getElementById('disclaimerCloseBtn');
    const disclaimerFooterLink = document.getElementById('disclaimerFooterLink');
    const disclaimerLinkFromRegister = document.getElementById('disclaimerLinkFromRegister');

    // Setup close button
    if (disclaimerCloseBtn) {
        disclaimerCloseBtn.addEventListener('click', () => {
            console.log('🔴 Disclaimer close button clicked');
            closeDisclaimerModal();
        });
    }

    // Setup ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && disclaimerModal && !disclaimerModal.classList.contains('hidden')) {
            console.log('🔴 ESC pressed - closing disclaimer');
            closeDisclaimerModal();
        }
    });

    // Setup click outside to close (click on backdrop)
    if (disclaimerModal) {
        disclaimerModal.addEventListener('click', (e) => {
            if (e.target === disclaimerModal) {
                console.log('🔴 Clicked outside modal - closing disclaimer');
                closeDisclaimerModal();
            }
        });
    }

    // Setup checkbox to enable/disable accept button
    if (disclaimerAcceptCheckbox && disclaimerAcceptBtn) {
        disclaimerAcceptCheckbox.addEventListener('change', () => {
            if (disclaimerAcceptCheckbox.checked) {
                disclaimerAcceptBtn.disabled = false;
                disclaimerAcceptBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                disclaimerAcceptBtn.classList.add('hover:brightness-110', 'cursor-pointer');
            } else {
                disclaimerAcceptBtn.disabled = true;
                disclaimerAcceptBtn.classList.add('opacity-50', 'cursor-not-allowed');
                disclaimerAcceptBtn.classList.remove('hover:brightness-110', 'cursor-pointer');
            }
        });
    }

    // Setup footer link to open disclaimer modal (read-only mode)
    if (disclaimerFooterLink) {
        disclaimerFooterLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('📜 Footer disclaimer link clicked');
            openDisclaimerModal(true); // true = read-only mode
        });
    }

    // Setup disclaimer link from registration form
    if (disclaimerLinkFromRegister) {
        disclaimerLinkFromRegister.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('📜 Register disclaimer link clicked');
            openDisclaimerModal(true); // true = read-only mode
        });
    }

    // Handle accept button click
    if (disclaimerAcceptBtn) {
        disclaimerAcceptBtn.addEventListener('click', async () => {
            if (!disclaimerAcceptCheckbox || !disclaimerAcceptCheckbox.checked) {
                console.log('⚠️ Accept clicked but checkbox not checked');
                return;
            }

            console.log('✅ Accepting disclaimer...');
            console.log('Token:', accessToken ? 'Present' : 'Missing');

            try {
                const response = await fetch(`${API_URL}/api/disclaimer/accept`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('API Response status:', response.status);

                if (response.ok) {
                    // Close modal
                    closeDisclaimerModal();

                    showToast('Disclaimer geaccepteerd!', 'success');
                } else {
                    const data = await response.json();
                    console.error('API Error:', data);
                    showToast(data.error || 'Kon disclaimer niet accepteren', 'error');
                }
            } catch (error) {
                console.error('Error accepting disclaimer:', error);
                showToast('Kon disclaimer niet accepteren', 'error');
            }
        });
    }
}

function openDisclaimerModal(readOnly = false) {
    const disclaimerModal = document.getElementById('disclaimerModal');
    const disclaimerAcceptCheckbox = document.getElementById('disclaimerAcceptCheckbox');
    const disclaimerAcceptBtn = document.getElementById('disclaimerAcceptBtn');

    if (!disclaimerModal) return;

    // Reset checkbox
    if (disclaimerAcceptCheckbox) {
        disclaimerAcceptCheckbox.checked = false;
    }

    // Disable button by default
    if (disclaimerAcceptBtn) {
        disclaimerAcceptBtn.disabled = true;
        disclaimerAcceptBtn.classList.add('opacity-50', 'cursor-not-allowed');
        disclaimerAcceptBtn.classList.remove('hover:brightness-110', 'cursor-pointer');
    }

    // Show modal
    disclaimerModal.classList.remove('hidden');

    // If read-only mode, just show the modal (user can close manually)
    // If required mode, user MUST accept
    if (readOnly) {
        // Could add a close button in read-only mode, but for now modal stays open until user accepts or closes
    }
}

function closeDisclaimerModal() {
    const disclaimerModal = document.getElementById('disclaimerModal');
    if (disclaimerModal) {
        disclaimerModal.classList.add('hidden');
    }
}

async function checkDisclaimerStatus() {
    console.log('🔍 Checking disclaimer status...');
    console.log('Current user:', currentUser ? currentUser.username : 'None');
    console.log('Access token:', accessToken ? 'Present' : 'Missing');

    // Check if user needs to accept disclaimer
    if (!currentUser || !accessToken) {
        console.log('⚠️ No user or token, skipping disclaimer check');
        return;
    }

    // Guests don't need to accept
    if (currentUser.id.startsWith('guest-')) {
        console.log('👤 Guest user, skipping disclaimer');
        return;
    }

    try {
        const token = accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token');
        console.log('📡 Calling disclaimer status API...');

        const response = await fetch(`${API_URL}/api/disclaimer/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('API Response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Disclaimer status:', data);

            if (!data.accepted && !data.isGuest) {
                // User hasn't accepted current version, show modal
                console.log('⚠️ User needs to accept disclaimer - showing modal');
                setTimeout(() => {
                    openDisclaimerModal(false); // false = required mode
                }, 500); // Small delay to let lobby load first
            } else {
                console.log('✅ User has already accepted disclaimer');
            }
        } else {
            console.error('❌ Disclaimer status API failed:', response.status);
        }
    } catch (error) {
        console.error('❌ Error checking disclaimer status:', error);
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

    // Home button - back to lobby
    const homeBtn = document.getElementById('homeBtn');
    homeBtn?.addEventListener('click', () => {
        debugLog('🏠 Home button clicked - returning to lobby');
        showLobby();
    });

    // Initialize stats dashboard toggle (Phase 2)
    initializeStatsToggle();

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

    // Submit debug log to server
    document.getElementById('submitDebugBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('debugSubmitModal');
        const notesInput = document.getElementById('debugNotesInput');
        const resultArea = document.getElementById('debugSubmitResult');

        if (!modal) return;

        // Reset modal state
        notesInput.value = '';
        resultArea.classList.add('hidden');

        // Show modal
        modal.classList.remove('hidden');
    });

    // Close debug submit modal
    document.getElementById('closeDebugSubmitModal')?.addEventListener('click', () => {
        document.getElementById('debugSubmitModal')?.classList.add('hidden');
    });

    document.getElementById('cancelDebugSubmit')?.addEventListener('click', () => {
        document.getElementById('debugSubmitModal')?.classList.add('hidden');
    });

    // Confirm debug log submission
    document.getElementById('confirmDebugSubmit')?.addEventListener('click', async () => {
        const debugLog = document.getElementById('debugLog');
        const notesInput = document.getElementById('debugNotesInput');
        const confirmBtn = document.getElementById('confirmDebugSubmit');
        const resultArea = document.getElementById('debugSubmitResult');
        const codeDisplay = document.getElementById('debugLogCode');

        if (!debugLog || !confirmBtn) return;

        // Extract all log text
        const logText = Array.from(debugLog.children)
            .map(entry => entry.textContent)
            .join('\n');

        if (!logText.trim()) {
            showToast('❌ Debug log is leeg', 'error', 2000);
            return;
        }

        // Disable button during submission
        confirmBtn.disabled = true;
        confirmBtn.textContent = '⏳ Versturen...';

        try {
            // Build headers - only include Authorization if token exists
            const headers = {
                'Content-Type': 'application/json'
            };

            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/debug-log/submit', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    logContent: logText,
                    userNotes: notesInput.value.trim() || null
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to submit debug log');
            }

            // Show success with debug code
            codeDisplay.textContent = data.logId;
            resultArea.classList.remove('hidden');

            // Hide the input section
            notesInput.parentElement.classList.add('hidden');
            document.querySelector('#debugSubmitModal .flex.gap-3').classList.add('hidden');

            showToast('✅ Debug log verstuurd!', 'success', 3000);

            debugLog(`✅ Debug log submitted: ${data.logId}`, 'success');

        } catch (error) {
            console.error('Failed to submit debug log:', error);
            showToast('❌ Versturen mislukt: ' + error.message, 'error', 3000);
            confirmBtn.disabled = false;
            confirmBtn.textContent = '📤 Verstuur Log';
        }
    });

    // Copy debug code to clipboard
    document.getElementById('copyDebugCodeBtn')?.addEventListener('click', () => {
        const codeDisplay = document.getElementById('debugLogCode');
        if (!codeDisplay) return;

        navigator.clipboard.writeText(codeDisplay.textContent).then(() => {
            showToast('📋 Code gekopieerd!', 'success', 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showToast('❌ Kopiëren mislukt', 'error', 2000);
        });
    });

    // Auto-hide menu on scroll down (mobile optimization)
    let lastScrollTop = 0;
    let scrollTimeout;
    const mainHeader = document.getElementById('main-header');
    const controlBar = document.querySelector('.bg-gradient-to-r.from-green-light.to-green');

    window.addEventListener('scroll', () => {
        // Clear previous timeout
        clearTimeout(scrollTimeout);

        // Wait for scroll to finish
        scrollTimeout = trackTimeout(setTimeout(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            if (scrollTop > lastScrollTop && scrollTop > 80) {
                // Scrolling down - hide menus
                if (mainHeader) {
                    mainHeader.style.transform = 'translateY(-100%)';
                    mainHeader.style.transition = 'transform 0.3s ease';
                }
                if (controlBar) {
                    controlBar.style.transform = 'translateY(-100%)';
                    controlBar.style.transition = 'transform 0.3s ease';
                }
            } else {
                // Scrolling up or at top - show menus
                if (mainHeader) {
                    mainHeader.style.transform = 'translateY(0)';
                }
                if (controlBar) {
                    controlBar.style.transform = 'translateY(0)';
                }
            }

            lastScrollTop = scrollTop;
        }, 100)); // Debounce 100ms
    });

    // Leave Game button - allows leaving during active game
    document.getElementById('leaveGameBtn')?.addEventListener('click', () => {
        showLeaveGameConfirmation();
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

    // Spelregels Modal Handlers
    const spelregelsModal = document.getElementById('spelregelsModal');
    const closeSpelregelsBtn = document.getElementById('closeSpelregelsModal');
    const spelregelsBtn = document.getElementById('spelregelsBtn');

    // Open modal from button
    spelregelsBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        spelregelsModal?.classList.remove('hidden');
        debugLog('📜 Modal geopend via spelregels button');
    });

    // Close button
    closeSpelregelsBtn?.addEventListener('click', () => {
        spelregelsModal?.classList.add('hidden');
        debugLog('📜 Modal gesloten via X button');
    });

    // Click outside modal to close
    spelregelsModal?.addEventListener('click', (e) => {
        if (e.target === spelregelsModal) {
            spelregelsModal.classList.add('hidden');
            debugLog('📜 Modal gesloten via backdrop click');
        }
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && spelregelsModal && !spelregelsModal.classList.contains('hidden')) {
            spelregelsModal.classList.add('hidden');
            debugLog('📜 Modal gesloten via ESC key');
        }
    });
}

// Update header user display (username, Power, and Credits)
function updateHeaderUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    const usernameEl = document.getElementById('username');
    const eloRatingEl = document.getElementById('eloRating');
    const logoutBtn = document.getElementById('logoutBtn');
    const shopBtn = document.getElementById('shopBtn'); // Phase 3: Shop button

    if (currentUser) {
        // Show user info
        userDisplay?.classList.remove('hidden');
        logoutBtn?.classList.remove('hidden');
        shopBtn?.classList.remove('hidden'); // Phase 3: Show shop for logged in users

        // Update content
        if (usernameEl) usernameEl.textContent = currentUser.username;
        if (eloRatingEl) eloRatingEl.textContent = `(${currentUser.eloRating || 1200} Power)`;

        // Fetch and update credits (Phase 3)
        updateCreditsDisplay();
    } else {
        // Hide when logged out
        userDisplay?.classList.add('hidden');
        logoutBtn?.classList.add('hidden');
        shopBtn?.classList.add('hidden'); // Phase 3: Hide shop for guests
    }
}

// Fetch and update credits display (Phase 3)
async function updateCreditsDisplay() {
    const creditsDisplay = document.getElementById('creditsDisplay');
    const creditsBalance = document.getElementById('creditsBalance');

    if (!creditsDisplay || !creditsBalance) return;

    try {
        const response = await fetch(`${API_URL}/api/credits/balance`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch credits:', response.status);
            return;
        }

        const data = await response.json();

        // Update display
        if (data.isGuest) {
            // Hide for guests
            creditsDisplay.classList.add('hidden');
        } else {
            // Show for registered users
            creditsDisplay.classList.remove('hidden');
            creditsBalance.textContent = data.balance || 0;
        }
    } catch (error) {
        console.error('Error fetching credits:', error);
        // Hide on error
        creditsDisplay.classList.add('hidden');
    }
}

// ============================================
// SHOP MODAL FUNCTIONS (Phase 3)
// ============================================

// Open shop modal
function openShopModal() {
    const shopModal = document.getElementById('shopModal');
    const shopBtn = document.getElementById('shopBtn');
    const creditsDisplay = document.getElementById('creditsDisplay');

    if (!shopModal) return;

    // Show modal
    shopModal.classList.remove('hidden');

    // Load shop items and update credits
    loadShopItems();
    updateShopCreditsDisplay();
}

// Close shop modal
function closeShopModal() {
    const shopModal = document.getElementById('shopModal');
    if (shopModal) {
        shopModal.classList.add('hidden');
    }
}

// Update credits display in shop modal
async function updateShopCreditsDisplay() {
    const shopCreditsBalance = document.getElementById('shopCreditsBalance');

    if (!shopCreditsBalance) return;

    try {
        const response = await fetch(`${API_URL}/api/credits/balance`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            shopCreditsBalance.textContent = data.balance || 0;
        }
    } catch (error) {
        console.error('Error fetching credits for shop:', error);
        shopCreditsBalance.textContent = '--';
    }
}

// Load and display shop items
async function loadShopItems() {
    const shopItemsContainer = document.getElementById('shopItemsContainer');

    if (!shopItemsContainer) return;

    try {
        // Show loading state
        shopItemsContainer.innerHTML = `
            <div class="col-span-2 text-center text-white py-8">
                <div class="text-4xl mb-2">⏳</div>
                <p>Laden...</p>
            </div>
        `;

        const response = await fetch(`${API_URL}/api/shop/items`);

        if (!response.ok) {
            throw new Error('Failed to load shop items');
        }

        const data = await response.json();
        const items = data.items || [];

        if (items.length === 0) {
            shopItemsContainer.innerHTML = `
                <div class="col-span-2 text-center text-white py-8">
                    <div class="text-4xl mb-2">🛒</div>
                    <p>Geen items beschikbaar</p>
                </div>
            `;
            return;
        }

        // Display items
        shopItemsContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${items.map(item => createShopItemCard(item)).join('')}
            </div>
        `;

        // Add click handlers
        items.forEach(item => {
            const buyBtn = document.getElementById(`buy-${item.id}`);
            if (buyBtn) {
                buyBtn.addEventListener('click', () => purchaseItem(item));
            }
        });

    } catch (error) {
        console.error('Error loading shop items:', error);
        shopItemsContainer.innerHTML = `
            <div class="col-span-2 text-center text-red-400 py-8">
                <div class="text-4xl mb-2">❌</div>
                <p>Fout bij laden van shop items</p>
            </div>
        `;
    }
}

// Create HTML for shop item card
function createShopItemCard(item) {
    const icons = {
        'penalty_reduction': '🛡️',
        'mexico_shield': '⚡'
    };

    const icon = icons[item.id] || '🎁';

    return `
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border-2 border-purple-600 hover:border-purple-400 transition shadow-lg">
            <div class="text-center mb-4">
                <div class="text-5xl mb-2">${icon}</div>
                <h3 class="text-xl font-bold text-white mb-2">${item.name}</h3>
                <p class="text-sm text-gray-300">${item.description}</p>
            </div>

            <div class="flex items-center justify-between mt-4">
                <div class="flex items-center gap-2 text-yellow-500 font-bold text-lg">
                    <span>💰</span>
                    <span>${item.cost}</span>
                </div>
                <button id="buy-${item.id}" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition font-bold shadow-md">
                    Koop
                </button>
            </div>
        </div>
    `;
}

// Purchase item
async function purchaseItem(item) {
    try {
        const response = await fetch(`${API_URL}/api/credits/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ itemId: item.id })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(`❌ ${data.error || 'Aankoop mislukt'}`);
            return;
        }

        // Success!
        alert(`✅ ${data.message}`);

        // Update displays
        updateShopCreditsDisplay();
        updateCreditsDisplay();

        // TODO Phase 3.5: Activate power-up in game state
        console.log('Power-up purchased:', item);

    } catch (error) {
        console.error('Error purchasing item:', error);
        alert('❌ Fout bij aankoop. Probeer het opnieuw.');
    }
}

// Initialize shop event listeners
function initializeShop() {
    // Shop button click
    const shopBtn = document.getElementById('shopBtn');
    if (shopBtn) {
        shopBtn.addEventListener('click', openShopModal);
    }

    // Credits display click (also opens shop)
    const creditsDisplay = document.getElementById('creditsDisplay');
    if (creditsDisplay) {
        creditsDisplay.addEventListener('click', openShopModal);
    }

    // Close button click
    const closeShopModalBtn = document.getElementById('closeShopModal');
    if (closeShopModalBtn) {
        closeShopModalBtn.addEventListener('click', closeShopModal);
    }

    // Click outside modal to close
    const shopModal = document.getElementById('shopModal');
    if (shopModal) {
        shopModal.addEventListener('click', (e) => {
            if (e.target === shopModal) {
                closeShopModal();
            }
        });
    }

    console.log('✅ Shop initialized');
}

// ============================================
// POWER-UPS IN-GAME (Phase 3.5)
// ============================================

let playerInventory = []; // Store player's unused power-ups

// Load player's inventory from API
async function loadPlayerInventory() {
    if (!currentUser || currentUser.id.startsWith('guest-')) {
        playerInventory = [];
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/inventory`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            console.error('Failed to load inventory:', response.status);
            return;
        }

        const data = await response.json();

        // Filter only unused power-ups
        playerInventory = data.inventory.filter(item => !item.isUsed);

        console.log('✅ Inventory loaded:', playerInventory.length, 'unused power-ups');
    } catch (error) {
        console.error('Error loading inventory:', error);
        playerInventory = [];
    }
}

// Display power-ups in game UI
function displayPowerupsInGame() {
    const powerupsSection = document.getElementById('powerupsSection');
    const powerupsContainer = document.getElementById('powerupsContainer');

    if (!powerupsContainer) return;

    // Clear existing buttons
    powerupsContainer.innerHTML = '';

    // Count unused power-ups by type
    const powerupCounts = {};
    playerInventory.forEach(item => {
        if (!powerupCounts[item.itemId]) {
            powerupCounts[item.itemId] = {
                count: 0,
                name: item.name,
                description: item.description
            };
        }
        powerupCounts[item.itemId].count++;
    });

    // Show section only if player has power-ups
    if (Object.keys(powerupCounts).length === 0) {
        powerupsSection?.classList.add('hidden');
        return;
    }

    powerupsSection?.classList.remove('hidden');

    // Create button for each power-up type
    const icons = {
        'penalty_reduction': '🛡️',
        'mexico_shield': '⚡'
    };

    for (const [itemId, data] of Object.entries(powerupCounts)) {
        const icon = icons[itemId] || '🎁';
        const button = document.createElement('button');
        button.id = `powerup-${itemId}`;
        button.className = 'px-4 py-3 rounded-lg font-bold text-sm shadow-lg transition hover:scale-105 active:scale-95';
        button.style.background = 'linear-gradient(135deg, #7C3AED, #9333EA)';
        button.style.color = 'white';
        button.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-2xl">${icon}</span>
                <div class="text-left">
                    <div class="text-xs">${data.name}</div>
                    <div class="text-xs opacity-75">× ${data.count}</div>
                </div>
            </div>
        `;
        button.title = data.description;
        button.addEventListener('click', () => activatePowerup(itemId));
        powerupsContainer.appendChild(button);
    }
}

// Activate a power-up
function activatePowerup(itemId) {
    if (!socket || !currentGame.gameId) {
        showToast('❌ Geen actieve game', 'error');
        return;
    }

    // Check if player has this power-up
    const hasPowerup = playerInventory.some(item => item.itemId === itemId);
    if (!hasPowerup) {
        showToast('❌ Je hebt deze power-up niet meer', 'error');
        return;
    }

    // Send activation to server
    socket.emit('activate_powerup', {
        gameId: currentGame.gameId,
        itemId
    });

    console.log(`✨ Activating power-up: ${itemId}`);
}

// Handle power-up activation event from server
function handlePowerupActivated(data) {
    const { playerId, itemId, playerUsername } = data;

    // Remove from inventory if it's us
    if (playerId === currentUser.id) {
        const index = playerInventory.findIndex(item => item.itemId === itemId);
        if (index !== -1) {
            playerInventory.splice(index, 1);
        }

        // Update UI
        displayPowerupsInGame();

        const powerupNames = {
            'penalty_reduction': '🛡️ Draaisteen Plussen',
            'mexico_shield': '⚡ Mexico Shield'
        };
        const name = powerupNames[itemId] || itemId;
        showToast(`✅ ${name} geactiveerd!`, 'success');
    } else {
        // Opponent activated
        const powerupNames = {
            'penalty_reduction': '🛡️ Draaisteen Plussen',
            'mexico_shield': '⚡ Mexico Shield'
        };
        const name = powerupNames[itemId] || itemId;
        showToast(`⚠️ ${playerUsername} gebruikt ${name}!`, 'warning');
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

    let color = 'text-white';
    let icon = 'ℹ️';

    if (type === 'error') {
        color = 'text-red-400';
        icon = '❌';
    } else if (type === 'warn') {
        color = 'text-yellow-400';
        icon = '⚠️';
    } else if (type === 'success') {
        color = 'text-white';
        icon = '✅';
    }

    logEntry.innerHTML = `<span class="text-gray-400">[${timestamp}]</span> <span class="${color}">${icon} ${message}</span>`;
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
    trackTimeout(setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10));

    trackTimeout(setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        trackTimeout(setTimeout(() => toast.remove(), 300));
    }, duration));
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
    // Cleanup existing socket and ALL listeners to prevent duplicates
    const existingSocket = gameState.getSocket();
    if (existingSocket) {
        existingSocket.removeAllListeners();  // Remove all event listeners
        existingSocket.disconnect();
        gameState.setSocket(null);
    }

    const newSocket = io(SOCKET_URL, {
        auth: { token: gameState.getToken() },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    gameState.setSocket(newSocket);

    socket.on('connect', () => {
        debugLog('✅ Connected');
        updateDebugSocketStatus('✅ Verbonden met server', '#00ff00');
        updateConnectionStatus('connected', 'Verbonden');
        showToast('✅ Verbonden met server', 'success', 2000);
    });

    socket.on('disconnect', (reason) => {
        debugLog('❌ Disconnected:', reason);
        updateDebugSocketStatus('❌ Verbinding verbroken', '#ff4444');
        updateDebugQueueStatus('Niet verbonden', false);
        updateConnectionStatus('disconnected', 'Verbinding verbroken');

        // Show reconnect option if not intentional disconnect
        if (reason !== 'io client disconnect') {
            showReconnectOption();
        }
    });

    socket.on('connect_error', (error) => {
        debugLog('❌ Connection error:', error);
        updateConnectionStatus('disconnected', 'Verbindingsfout');
        showToast('❌ Kan geen verbinding maken met server', 'error', 4000);
    });

    socket.on('reconnecting', (attemptNumber) => {
        debugLog(`🔄 Reconnecting... attempt ${attemptNumber}`);
        updateConnectionStatus('reconnecting', `Opnieuw verbinden... (${attemptNumber})`);
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

        // Show match found with countdown
        showMatchFoundCountdown(data.opponent.username);
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
    socket.on('turn_changed', handleTurnChanged); // Turn update during game (BUG FIX #3)
    socket.on('vastgooier', handleVastgooier); // Overgooien bij gelijkspel
    socket.on('vastgooier_reveal', handleVastgooierReveal); // Toon beide worpen
    socket.on('vastgooier_result', handleVastgooierResult); // Resultaat van vastgooier
    socket.on('vast_extra_throw', handleVastExtraThrow);
    socket.on('opponent_vast', handleOpponentVast);
    socket.on('game_over', handleGameOver);
    socket.on('powerup_activated', handlePowerupActivated); // Phase 3.5

    // First round simultaneous events
    socket.on('first_round_reveal', handleFirstRoundReveal);
    socket.on('first_round_result', handleFirstRoundResult);
    socket.on('first_round_tie', handleFirstRoundTie);

    // Rematch events
    socket.on('rematch_request', handleRematchRequest);
    socket.on('rematch_accepted', handleRematchAccepted);
    socket.on('rematch_declined', handleRematchDeclined);

    socket.on('error', (data) => debugLog('❌ Error:', data));

    // Reconnection handling
    socket.on('game_rejoined', handleGameRejoined);
    socket.on('rejoin_failed', handleRejoinFailed);

    // Grace period disconnect/reconnect events
    socket.on('opponent_disconnected_grace', handleOpponentDisconnectedGrace);
    socket.on('opponent_reconnected_grace_cancelled', handleOpponentReconnectedGraceCancelled);
}

// Attempt to reconnect to an active game
function attemptGameReconnection(gameId) {
    if (!socket || !socket.connected) {
        console.warn('⚠️ Cannot reconnect: socket not connected');
        gameState.reset();
        showLobby();
        return;
    }

    console.log('🔄 Attempting to rejoin game:', gameId);
    showToast('🔄 Opnieuw verbinden met game...', 'info', 3000);

    // Request to rejoin the game
    socket.emit('rejoin_game', { gameId });

    // Timeout if no response after 5 seconds
    const timeout = trackTimeout(setTimeout(() => {
        console.warn('⚠️ Reconnection timeout');
        ErrorHandler.network(new Error('Reconnection timeout'), 'Game reconnection');
        gameState.reset();
        showLobby();
    }, 5000));

    // Store timeout so it can be cleared on success
    gameState._reconnectionTimeout = timeout;
}

// Handle successful game rejoin
function handleGameRejoined(data) {
    console.log('✅ Game rejoined successfully:', data);

    // Clear reconnection timeout
    if (gameState._reconnectionTimeout) {
        clearTimeout(gameState._reconnectionTimeout);
        delete gameState._reconnectionTimeout;
    }

    // Restore game state
    gameState.setGame(data.game);
    currentGame = data.game;
    gameState.setTurn(data.isYourTurn);
    isMyTurn = data.isYourTurn;

    // Restore throw history if available
    if (data.playerHistory) {
        gameState.setPlayerHistory(data.playerHistory);
        playerThrowHistory = data.playerHistory;
    }
    if (data.opponentHistory) {
        gameState.setOpponentHistory(data.opponentHistory);
        opponentThrowHistory = data.opponentHistory;
    }

    // Show game screen
    showGame();

    // Update UI with current game state (new format: player1 and player2 objects)
    if (data.game.player1 && data.game.player2) {
        const player1 = data.game.player1;
        const player2 = data.game.player2;

        // Determine which player is me and which is opponent
        const isPlayer1Me = player1.userId === currentUser?.id;
        const me = isPlayer1Me ? player1 : player2;
        const opponent = isPlayer1Me ? player2 : player1;

        // Update round display
        const roundElement = document.getElementById('currentRound');
        if (roundElement) {
            roundElement.textContent = `Ronde ${data.game.currentRound || 1}`;
        }

        // Update lives display
        const myLives = me.lives;
        const opponentLives = opponent.lives;

        // Update player lives
        const playerLivesEl = document.getElementById('playerLives');
        if (playerLivesEl) {
            playerLivesEl.textContent = '❤️'.repeat(myLives);
        }

        // Update opponent lives
        const opponentLivesEl = document.getElementById('opponentLives');
        if (opponentLivesEl) {
            opponentLivesEl.textContent = '❤️'.repeat(opponentLives);
        }

        // Update opponent name in UI labels
        const opponentName = opponent.username || 'Tegenstander';
        const opponentDiceCupLabel = document.getElementById('opponentDiceCupLabel');
        if (opponentDiceCupLabel) {
            opponentDiceCupLabel.textContent = `🎯 ${opponentName}`;
        }
        const opponentThrowHistoryLabel = document.getElementById('opponentThrowHistoryLabel');
        if (opponentThrowHistoryLabel) {
            opponentThrowHistoryLabel.textContent = `🎯 ${opponentName}`;
        }
        const opponentCardLabel = document.getElementById('opponentCardLabel');
        if (opponentCardLabel) {
            opponentCardLabel.textContent = `🎯 ${opponentName.toUpperCase()}`;
        }

        console.log(`✅ Game restored: Round ${data.game.currentRound}, Lives: Me=${myLives} Opponent=${opponentLives}, MyTurn=${data.isYourTurn}`);
    }

    // Restore dice display if available
    if (data.currentDice) {
        if (data.currentDice.player) {
            showDice(data.currentDice.player.dice1, data.currentDice.player.dice2, false);
        }
        if (data.currentDice.opponent) {
            showOpponentDice(data.currentDice.opponent.dice1, data.currentDice.opponent.dice2, data.currentDice.opponent.isBlind);
        }
    }

    // Update turn indicator (clear waiting message from before disconnect)
    const turnIndicator = document.getElementById('turnIndicator');
    if (turnIndicator) {
        if (data.isYourTurn) {
            turnIndicator.textContent = "Jouw beurt!";
            turnIndicator.className = 'text-center text-lg font-bold text-green-600';
        } else {
            const opponent = data.game.player1.userId === currentUser?.id ? data.game.player2 : data.game.player1;
            turnIndicator.textContent = `${opponent.username} is aan de beurt...`;
            turnIndicator.className = 'text-center text-lg font-bold text-gray-500';
        }
    }

    // Update action buttons based on game state
    hideAllActionButtons();
    if (data.availableActions && data.availableActions.length > 0) {
        data.availableActions.forEach(action => {
            const btn = document.getElementById(`${action}Btn`);
            if (btn) {
                btn.classList.remove('hidden');
                console.log(`✅ Showing button: ${action}Btn`);
            }
        });
    } else {
        console.log('⏳ No actions available - waiting for opponent');
    }

    showToast('✅ Game hersteld!', 'success', 3000);
}

// Handle failed rejoin
function handleRejoinFailed(data) {
    console.log('❌ Rejoin failed:', data);

    // Clear reconnection timeout
    if (gameState._reconnectionTimeout) {
        clearTimeout(gameState._reconnectionTimeout);
        delete gameState._reconnectionTimeout;
    }

    // Clear game state
    gameState.reset();

    // Show error message
    const reason = data.reason || 'Game niet meer beschikbaar';
    showToast(`❌ Kan niet opnieuw verbinden: ${reason}`, 'error', 4000);

    // Return to lobby
    showLobby();
}

// Grace period disconnect/reconnect handlers
let gracePeriodInterval = null;
let gracePeriodSecondsLeft = 0;

function handleOpponentDisconnectedGrace(data) {
    console.log('⏳ Opponent disconnected - grace period started:', data);

    gracePeriodSecondsLeft = data.gracePeriodSeconds || 120;

    // Show waiting overlay with countdown
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) return;

    // Create grace period overlay
    let graceOverlay = document.getElementById('graceOverlay');
    if (!graceOverlay) {
        graceOverlay = document.createElement('div');
        graceOverlay.id = 'graceOverlay';
        graceOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            padding: 20px;
        `;
        gameArea.appendChild(graceOverlay);
    }

    graceOverlay.innerHTML = `
        <div style="text-align: center; max-width: 500px;">
            <div style="font-size: 3rem; margin-bottom: 20px;">⏳</div>
            <h2 style="color: var(--primary-color); margin-bottom: 10px; font-size: 1.5rem;">
                ${data.disconnectedPlayerName} is inactief
            </h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 1.1rem;">
                We wachten maximaal <span id="graceCountdown" style="color: var(--primary-color); font-weight: bold; font-size: 1.3rem;">${gracePeriodSecondsLeft}</span> seconden.
            </p>
            <p style="color: var(--text-secondary); margin-bottom: 30px; font-size: 0.95rem;">
                Als ${data.disconnectedPlayerName} niet opnieuw verbindt, verliest hij/zij automatisch.
            </p>
            <button id="forfeitDuringGraceBtn" class="btn btn-danger" style="
                background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            ">
                Verlaten (Jij verliest)
            </button>
        </div>
    `;

    // Add hover effect to button
    const forfeitBtn = document.getElementById('forfeitDuringGraceBtn');
    forfeitBtn.addEventListener('mouseenter', () => {
        forfeitBtn.style.transform = 'scale(1.05)';
        forfeitBtn.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
    });
    forfeitBtn.addEventListener('mouseleave', () => {
        forfeitBtn.style.transform = 'scale(1)';
        forfeitBtn.style.boxShadow = 'none';
    });

    // Handle forfeit button
    forfeitBtn.addEventListener('click', () => {
        if (confirm('Weet je zeker dat je het spel wilt verlaten? Je verliest dan automatisch.')) {
            // User chooses to leave - they lose
            socket.emit('leave_game', { gameId: currentGame.gameId, forfeit: true });
            clearGracePeriodUI();
        }
    });

    // Start countdown
    clearInterval(gracePeriodInterval);
    gracePeriodInterval = setInterval(() => {
        gracePeriodSecondsLeft--;

        const countdownEl = document.getElementById('graceCountdown');
        if (countdownEl) {
            countdownEl.textContent = gracePeriodSecondsLeft;

            // Change color as time runs out
            if (gracePeriodSecondsLeft <= 30) {
                countdownEl.style.color = '#f59e0b'; // Orange
            }
            if (gracePeriodSecondsLeft <= 10) {
                countdownEl.style.color = '#dc2626'; // Red
            }
        }

        if (gracePeriodSecondsLeft <= 0) {
            clearInterval(gracePeriodInterval);
            // Server will handle game end
        }
    }, 1000);

    showToast(`⏳ ${data.disconnectedPlayerName} is inactief. Wacht alsjeblieft...`, 'warning', 3000);
}

function handleOpponentReconnectedGraceCancelled(data) {
    console.log('✅ Opponent reconnected - grace period cancelled:', data);

    clearGracePeriodUI();

    showToast(`✅ ${data.username} is terug! Het spel gaat verder.`, 'success', 2000);
}

function clearGracePeriodUI() {
    // Clear countdown interval
    if (gracePeriodInterval) {
        clearInterval(gracePeriodInterval);
        gracePeriodInterval = null;
    }

    // Remove overlay
    const graceOverlay = document.getElementById('graceOverlay');
    if (graceOverlay) {
        graceOverlay.remove();
    }
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

        // Check gambling opt-in (Phase 3)
        const gamblingCheckbox = document.getElementById('gamblingCheckbox');
        const gambling = gamblingCheckbox ? gamblingCheckbox.checked : false;

        debugLog(`🔍 Joining matchmaking queue... ${gambling ? '🎰 (GAMBLING)' : ''}`, 'info');
        socket.emit('join_queue', { gameMode: 'ranked', gambling });

        // Show enhanced searching UI
        startSearchingAnimation();
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

    // Leaderboard filter change listeners (Phase 2)
    document.getElementById('leaderboardSort')?.addEventListener('change', loadLeaderboard);
    document.getElementById('leaderboardMinGames')?.addEventListener('change', loadLeaderboard);
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
        // Get filter values
        const sortBy = document.getElementById('leaderboardSort')?.value || 'elo';
        const minGames = document.getElementById('leaderboardMinGames')?.value || '0';

        // Fetch leaderboard with filters (top 5)
        const response = await fetch(`${API_URL}/api/leaderboard?sortBy=${sortBy}&minGames=${minGames}&limit=5`);
        const data = await response.json();

        const leaderboardDiv = document.getElementById('leaderboardList');
        if (!leaderboardDiv) return;

        if (data.players.length === 0) {
            leaderboardDiv.innerHTML = `
                <div class="text-center py-8" style="color: var(--text-secondary);">
                    <div class="text-4xl mb-2">🏆</div>
                    <div class="text-sm">Geen spelers gevonden met deze filters</div>
                </div>
            `;
            return;
        }

        leaderboardDiv.innerHTML = data.players.map((player, index) => {
            // Determine what stat to show based on sort
            let statDisplay;
            let statIcon;
            if (sortBy === 'winrate') {
                statDisplay = `${player.winRate}%`;
                statIcon = '📈';
            } else if (sortBy === 'games') {
                statDisplay = `${player.stats.gamesPlayed}`;
                statIcon = '🎮';
            } else {
                statDisplay = player.eloRating;
                statIcon = '⚡'; // Power
            }

            // Medal colors for top 3
            const rankClass = index === 0 ? 'leaderboard-rank top-1' :
                            index === 1 ? 'leaderboard-rank top-2' :
                            index === 2 ? 'leaderboard-rank top-3' :
                            'leaderboard-rank';

            return `
                <div class="flex justify-between items-center p-2 rounded transition hover:bg-opacity-10 hover:bg-white ${player.id === currentUser?.id ? 'bg-gold bg-opacity-20' : ''}" style="border-left: 3px solid ${index < 3 ? 'var(--color-gold)' : 'transparent'};">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                        <span class="${rankClass} text-sm font-bold">${index + 1}.</span>
                        <span class="truncate">${player.username}</span>
                        <span class="text-xs opacity-60">${player.avatarEmoji || '👤'}</span>
                    </div>
                    <div class="flex items-center gap-1 text-sm font-bold whitespace-nowrap">
                        <span class="text-xs">${statIcon}</span>
                        <span style="color: var(--color-gold);">${statDisplay}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Leaderboard error:', error);
        const leaderboardDiv = document.getElementById('leaderboardList');
        if (leaderboardDiv) {
            leaderboardDiv.innerHTML = `
                <div class="text-center py-8" style="color: var(--text-secondary);">
                    <div class="text-4xl mb-2">❌</div>
                    <div class="text-sm">Fout bij laden leaderboard</div>
                </div>
            `;
        }
    }
}

async function loadRecentGames() {
    try {
        const response = await fetch(`${API_URL}/api/games/recent?limit=3`, {
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

// ============================================
// STATS DASHBOARD (Phase 2)
// ============================================

async function loadUserStats() {
    const statsDashboard = document.getElementById('statsDashboard');
    if (!statsDashboard) return;

    // Hide for guests
    if (!currentUser || !accessToken || currentUser.id.startsWith('guest_')) {
        statsDashboard.classList.add('hidden');
        return;
    }

    // Show for registered users
    statsDashboard.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}/api/user/stats`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }

        const stats = await response.json();

        if (stats.isGuest) {
            // Show guest message
            document.getElementById('statsContent').classList.add('hidden');
            document.getElementById('statsGuestMessage').classList.remove('hidden');
            return;
        }

        // Hide guest message, show stats
        document.getElementById('statsGuestMessage').classList.add('hidden');
        document.getElementById('statsContent').classList.remove('hidden');

        // Update stats displays
        document.getElementById('statWinRate').textContent = stats.winRate || '0%';
        document.getElementById('statTotalGames').textContent = stats.totalGames || 0;
        document.getElementById('statMexicos').textContent = stats.mexicoCount || 0;
        document.getElementById('statTotalThrows').textContent = stats.totalThrows || 0;
        document.getElementById('statBlindThrows').textContent = stats.blindThrows || 0;
        document.getElementById('statVastgooiers').textContent = stats.vastgooierCount || 0;
        document.getElementById('statMexicoVast').textContent = stats.mexicoInVastgooier || 0;

    } catch (error) {
        console.error('Stats error:', error);
        // Hide stats dashboard on error
        statsDashboard.classList.add('hidden');
    }
}

function initializeStatsToggle() {
    const statsToggle = document.getElementById('statsToggle');
    const statsContent = document.getElementById('statsContent');
    const statsToggleIcon = document.getElementById('statsToggleIcon');

    if (!statsToggle || !statsContent) return;

    statsToggle.addEventListener('click', () => {
        const isHidden = statsContent.classList.contains('hidden');

        if (isHidden) {
            statsContent.classList.remove('hidden');
            statsToggleIcon.textContent = '▼';
        } else {
            statsContent.classList.add('hidden');
            statsToggleIcon.textContent = '▶';
        }
    });
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

async function updateUserStats() {
    if (!currentUser) return;

    document.getElementById('lobbyElo').textContent = currentUser.eloRating || 1200;
    document.getElementById('lobbyWins').textContent = currentUser.stats?.wins || 0;
    document.getElementById('lobbyLosses').textContent = currentUser.stats?.losses || 0;
    document.getElementById('lobbyUsername').textContent = currentUser.username || '';

    // Set avatar emoji
    const avatarEmoji = currentUser.avatarEmoji || '👤';
    document.getElementById('lobbyEmoji').textContent = avatarEmoji;

    // Fetch and display credits
    const lobbyCreditsEl = document.getElementById('lobbyCredits');
    if (lobbyCreditsEl) {
        try {
            const response = await fetch(`${API_URL}/api/credits/balance`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.isGuest) {
                    lobbyCreditsEl.textContent = '--';
                } else {
                    lobbyCreditsEl.textContent = data.balance || 0;
                }
            } else {
                lobbyCreditsEl.textContent = '--';
            }
        } catch (error) {
            console.error('Error fetching credits for lobby:', error);
            lobbyCreditsEl.textContent = '--';
        }
    }
}

// Update live stats display
function updateLiveStats(stats) {
    const onlineEl = document.getElementById('onlinePlayers');
    const queueEl = document.getElementById('queuePlayers');
    const gamesEl = document.getElementById('activeGames');

    // Update stats
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
        mustBlind: data.mustBlind,
        // Phase 3: Gambling game info
        isGambling: data.isGambling || false,
        gamblingPot: data.gamblingPot || 0
    };

    // Display gambling pot if this is a gambling game (Phase 3)
    const gamblingPotDisplay = document.getElementById('gamblingPotDisplay');
    const gamblingPotAmount = document.getElementById('gamblingPotAmount');

    if (data.isGambling && data.gamblingPot > 0) {
        showToast(`🎰 Gambling Game! Pot: ${data.gamblingPot} credits (winner takes all!)`, 'success');
        console.log(`🎰 GAMBLING GAME - Pot: ${data.gamblingPot} credits`);

        // Show gambling pot banner
        if (gamblingPotDisplay && gamblingPotAmount) {
            gamblingPotAmount.textContent = data.gamblingPot;
            gamblingPotDisplay.classList.remove('hidden');
        }
    } else {
        // Hide gambling pot banner for normal games
        if (gamblingPotDisplay) {
            gamblingPotDisplay.classList.add('hidden');
        }
    }

    // Update opponent name in UI labels
    const opponent = data.players?.find(p => p.id !== currentUser?.id);
    const opponentName = opponent?.username || 'Tegenstander';

    // ✅ INITIALIZE GAMEENGINE IN MULTIPLAYER MODE
    gameEngine = new GameEngine('multiplayer');
    gameEngine.initialize({
        gameId: data.gameId,
        playerId: currentUser.id,
        playerName: currentUser.username,
        opponentId: opponent?.id,
        opponentName: opponent?.username
    });
    debugLog('[GameEngine] Initialized for multiplayer:', gameEngine.getState());

    const opponentDiceCupLabel = document.getElementById('opponentDiceCupLabel');
    if (opponentDiceCupLabel) {
        opponentDiceCupLabel.textContent = `🎯 ${opponentName}`;
    }

    const opponentThrowHistoryLabel = document.getElementById('opponentThrowHistoryLabel');
    if (opponentThrowHistoryLabel) {
        opponentThrowHistoryLabel.textContent = `🎯 ${opponentName}`;
    }

    const opponentCardLabel = document.getElementById('opponentCardLabel');
    if (opponentCardLabel) {
        opponentCardLabel.textContent = `🎯 ${opponentName.toUpperCase()}`;
    }

    showGame();
    updateGameUI();

    // Load and display power-ups (Phase 3.5)
    loadPlayerInventory().then(() => {
        displayPowerupsInGame();
    });

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

async function throwDice(isBlind) {
    if (!currentGame) return;

    // ✅ USE GAMEENGINE IF AVAILABLE (BOT MODE)
    if (gameEngine) {
        // 🔒 CRITICAL: Validate player can throw BEFORE calling engine
        const state = gameEngine.getState();
        if (!state.isPlayerTurn) {
            showInlineMessage('Niet jouw beurt!', 'error');
            hideAllActionButtons();
            return;
        }
        if (state.player.throwCount >= gameEngine.maxThrows) {
            showInlineMessage(`Je hebt al ${gameEngine.maxThrows}x gegooid!`, 'error');
            hideAllActionButtons();
            return;
        }

        debugLog(`🎲 [GameEngine] Throwing dice (${isBlind ? 'BLIND' : 'OPEN'})`);

        try {
            hideAllActionButtons();
            showWaitingMessage('Dobbelstenen rollen...');

            const result = await gameEngine.throwDice(isBlind);

            debugLog(`🎲 [GameEngine] Throw result:`, result);

            // Update UI directly (same as handleThrowResult would do)
            currentThrowData = result;
            updateThrowCounter(result.throwCount, gameEngine.maxThrows);

            // Add to player history
            const throwInfo = calculateThrowDisplay(result.dice1, result.dice2);
            playerThrowHistory.push({
                displayValue: throwInfo.displayValue,
                isMexico: throwInfo.isMexico,
                isBlind: result.isBlind,
                wasBlind: result.isBlind
            });

            // Show dice
            showDice(result.dice1, result.dice2, result.isBlind, result.isMexico);
            updateThrowHistory();

            hideWaitingMessage();

            // Show appropriate buttons
            if (result.canKeep && result.canThrowAgain) {
                showKeepAndThrowAgainButtons();
            } else if (result.canKeep) {
                showKeepButton();
            }

            if (result.isBlind) {
                showRevealButton();
            }

            return;
        } catch (err) {
            debugLog(`❌ [GameEngine] Throw error:`, err);
            showInlineMessage(err.message || 'Fout bij gooien', 'error');
            hideWaitingMessage();
            // 🔒 CRITICAL: Hide all buttons after error to prevent repeat clicks
            hideAllActionButtons();
            return;
        }
    }

    // ⚠️ FALLBACK: MULTIPLAYER MODE (socket.io)
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
    // ✅ Skip legacy handler if GameEngine is active
    if (gameEngine) {
        debugLog('[Legacy Handler] Skipped - GameEngine active');
        return;
    }

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

        // ✅ BELANGRIJK: Toon dobbelstenen VOOR de return!
        if (data.isBlind) {
            showDice('?', '?', true, true); // Animate blind throw
        } else {
            showDice(data.dice1, data.dice2, false, true); // Animate open throw
        }

        showWaitingMessage('Laatste worp - wacht op tegenstander...');

        // Auto-keep na korte delay (zodat speler de worp ziet)
        trackTimeout(setTimeout(() => {
            keepThrow();
        }, data.isBlind ? 800 : 1200)); // Korter voor blind, langer voor open
        return; // Stop hier - geen knoppen tonen
    }

    if (data.isBlind) {
        // Show dice as hidden (? marks)
        showDice('?', '?', true, true); // Animate blind throw

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
        showDice(data.dice1, data.dice2, false, true); // Animate open throw

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

async function revealDice() {
    if (!currentGame) return;

    debugLog('👁️  Revealing dice');

    // ✅ USE GAMEENGINE IF AVAILABLE (BOT MODE)
    if (gameEngine) {
        debugLog(`👁️ [GameEngine] Revealing dice`);

        try {
            const result = await gameEngine.revealDice();

            debugLog(`👁️ [GameEngine] Reveal result:`, result);

            // Show revealed dice with animation
            showDice(result.dice1, result.dice2, false, true);

            // Update last throw in player history to not blind anymore
            if (playerThrowHistory.length > 0) {
                playerThrowHistory[playerThrowHistory.length - 1].isBlind = false;
                updateThrowHistory();
            }

            hideWaitingMessage();

            return;
        } catch (err) {
            debugLog(`❌ [GameEngine] Reveal error:`, err);
            showInlineMessage(err.message, 'error');
            return;
        }
    }

    // ⚠️ FALLBACK: MULTIPLAYER MODE (socket.io)
    socket.emit('reveal_dice', {
        gameId: currentGame.gameId
    });

    hideAllActionButtons();
    showWaitingMessage('Dobbelstenen onthullen...');
}

function handleDiceRevealed(data) {
    // ✅ Skip legacy handler if GameEngine is active
    if (gameEngine) {
        debugLog('[Legacy Handler] Skipped - GameEngine active');
        return;
    }

    debugLog('👁️  Dice revealed:', data);

    showDice(data.dice1, data.dice2, false, true); // Animate reveal

    // Update last throw in player history to not blind anymore
    if (playerThrowHistory.length > 0) {
        playerThrowHistory[playerThrowHistory.length - 1].isBlind = false;
        updateThrowHistory();
    }

    if (data.isMexico) {
        showToast('🎉 MEXICO!!! 🎉', 'success', 5000);
        showInlineMessage('🏆 MEXICO! 2-1!', 'success');
        // Fire confetti celebration!
        fireMexicoConfetti('mexico');
    }

    // mustChooseResult VERWIJDERD - automatische vergelijking!
    if (data.canKeep && data.canThrowAgain) {
        showKeepAndThrowAgainButtons();
    } else if (data.canKeep) {
        showKeepButton();
    }
}

async function keepThrow() {
    if (!currentGame) return;

    debugLog('✅ Keeping throw');

    // ✅ USE GAMEENGINE IF AVAILABLE (BOT MODE)
    if (gameEngine) {
        debugLog(`✅ [GameEngine] Keeping throw`);

        try {
            hideAllActionButtons();
            showWaitingMessage('Bot speelt...');

            const result = await gameEngine.keepThrow();

            debugLog(`✅ [GameEngine] Keep result:`, result);

            // Round is complete, bot has played, result is compared
            const state = result.state;

            // Update lives
            updateLives(state.player.id, state.player.lives);
            updateLives(state.opponent.id, state.opponent.lives);

            // Update round info
            currentGame.roundNumber = state.roundNumber;
            currentGame.voorgooier = state.voorgooierId;
            currentGame.currentTurn = state.currentTurnId;
            updateRoundInfo();

            // Clear throw histories
            playerThrowHistory = [];
            opponentThrowHistory = [];
            updateThrowHistory();

            hideWaitingMessage();

            // Check if game is over
            if (state.isGameOver) {
                const winner = state.player.lives > 0 ? state.player : state.opponent;
                showInlineMessage(`🎉 ${winner.username} wint het spel!`, 'success');
                hideAllActionButtons();
                return;
            }

            // Start next round
            showInlineMessage(`Ronde ${state.roundNumber} begint!`, 'info');

            // Show appropriate buttons for next round
            if (state.isPlayerTurn) {
                if (state.isFirstRound) {
                    showThrowButtons(false, true); // Blind only
                } else {
                    showThrowButtons(false, false); // Normal
                }
            } else {
                showWaitingMessage('Bot is aan de beurt...');
            }

            return;
        } catch (err) {
            debugLog(`❌ [GameEngine] Keep error:`, err);
            showInlineMessage(err.message, 'error');
            hideWaitingMessage();
            return;
        }
    }

    // ⚠️ FALLBACK: MULTIPLAYER MODE (socket.io)
    socket.emit('keep_throw', {
        gameId: currentGame.gameId
    });

    hideAllActionButtons();
    showWaitingMessage('Wachten op resultaat keuze...');
}

// handleChooseResultPrompt en chooseResult VERWIJDERD - automatische vergelijking!

function handleOpponentThrow(data) {
    // ✅ Skip legacy handler if GameEngine is active
    if (gameEngine) {
        debugLog('[Legacy Handler] Skipped - GameEngine active');
        return;
    }

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
    // ✅ Skip legacy handler if GameEngine is active
    if (gameEngine) {
        debugLog('[Legacy Handler] Skipped - GameEngine active');
        return;
    }

    debugLog('👁️  Opponent revealed:', data);
    showOpponentDice(data.dice1, data.dice2, false, true); // Animate reveal

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
    // ✅ Skip legacy handler if GameEngine is active
    if (gameEngine) {
        debugLog('[Legacy Handler] Skipped - GameEngine active');
        return;
    }

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
    // ✅ Skip legacy handler if GameEngine is active
    if (gameEngine) {
        debugLog('[Legacy Handler] Skipped - GameEngine active');
        return;
    }

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

    // ✅ SYNC GAMEENGINE LIVES WITH SERVER STATE
    if (gameEngine && data.player1Lives !== undefined && data.player2Lives !== undefined) {
        // Determine which player is me
        const isPlayer1 = currentGame.player1Id === currentUser.id;
        gameEngine.player.lives = isPlayer1 ? data.player1Lives : data.player2Lives;
        gameEngine.opponent.lives = isPlayer1 ? data.player2Lives : data.player1Lives;

        debugLog('[GameEngine] Lives synced:', {
            player: gameEngine.player.lives,
            opponent: gameEngine.opponent.lives
        });
    }

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

        // ✅ SYNC GAMEENGINE WITH SERVER STATE
        if (gameEngine) {
            gameEngine.roundNumber = data.roundNumber;
            gameEngine.isFirstRound = data.isFirstRound || false;
            gameEngine.maxThrows = data.isFirstRound ? 1 : 3;
            gameEngine.voorgooierId = data.voorgooier;
            gameEngine.currentTurnId = data.currentTurn;
            gameEngine.isSimultaneous = data.isSimultaneous || false;

            // Sync lives from server data if available
            const myPlayer = data.players?.find(p => p.id === currentUser.id);
            const opponentPlayer = data.players?.find(p => p.id !== currentUser.id);
            if (myPlayer) gameEngine.player.lives = myPlayer.lives;
            if (opponentPlayer) gameEngine.opponent.lives = opponentPlayer.lives;

            debugLog('[GameEngine] Synced with server state:', {
                round: gameEngine.roundNumber,
                voorgooier: gameEngine.voorgooierId,
                currentTurn: gameEngine.currentTurnId
            });
        }

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

// BUG FIX #3: Handle turn changes during game
function handleTurnChanged(data) {
    debugLog('🔄 Turn changed:', data);

    // Update turn state
    isMyTurn = data.isYourTurn;

    // Update UI based on whose turn it is
    if (data.isYourTurn) {
        showInlineMessage('Jouw beurt!', 'info');
        // Show throw buttons if applicable
        if (currentGame && !currentGame.waitingForResult) {
            showThrowButtons(currentGame.mustFollowPattern || false);
        }
    } else {
        showInlineMessage('Wachten op tegenstander...', 'info');
        showWaitingMessage('Wachten op tegenstander...');
    }
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

    // ✅ UPDATE GAMEENGINE STATE with actual server dice values
    if (gameEngine) {
        debugLog('[GameEngine] Updating player state with server dice from reveal');
        gameEngine.player.dice1 = data.yourThrow.dice1;
        gameEngine.player.dice2 = data.yourThrow.dice2;
        gameEngine.player.currentThrow = data.yourThrow.value;
        gameEngine.player.displayThrow = data.yourThrow.name;
        gameEngine.player.isBlind = false; // Revealed
        gameEngine.player.isMexico = data.yourThrow.isMexico || false;

        debugLog('[GameEngine] Updating opponent state with server dice from reveal');
        gameEngine.opponent.dice1 = data.opponentThrow.dice1;
        gameEngine.opponent.dice2 = data.opponentThrow.dice2;
        gameEngine.opponent.currentThrow = data.opponentThrow.value;
        gameEngine.opponent.displayThrow = data.opponentThrow.name;
        gameEngine.opponent.isBlind = false; // Revealed
        gameEngine.opponent.isMexico = data.opponentThrow.isMexico || false;
    }

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

    let penaltyText = data.penalty === 2 ? ' (MEXICO! -2 levens)' : '';

    // Add power-up info (Phase 3.5)
    if (data.powerupUsed) {
        if (data.powerupUsed === 'mexico_shield') {
            penaltyText += ' ⚡ Mexico Shield geblokkeerd!';
        } else if (data.powerupUsed === 'penalty_reduction') {
            penaltyText += ` 🛡️ Penalty verminderd (was ${data.penalty + 1})`;
        }
    }

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

    // Display gambling winnings if applicable (Phase 3)
    let toastMessage = `${title}\nPower: ${eloChange} (Nieuw: ${iWon ? data.winnerElo : data.loserElo})`;
    if (data.isGambling && data.gamblingWinnings && iWon) {
        toastMessage += `\n💰 Gambling winnings: +${data.gamblingWinnings} credits!`;
        // Update credits display
        setTimeout(() => {
            updateCreditsDisplay();
        }, 1000);
    }

    // Check if game ended because opponent left
    if (data.reason === 'player_left') {
        if (iWon) {
            // Show prominent popup for win by forfeit
            showWinByForfeitPopup(data);
        } else {
            // You left - show regular message
            showInlineMessage(title, 'error');
            showToast(toastMessage, 'error', 7000);
        }
    } else {
        // Normal game end
        showInlineMessage(title, iWon ? 'success' : 'error');
        showToast(toastMessage, iWon ? 'success' : 'error', 7000);
    }

    // Show game result section with buttons
    const gameResult = document.getElementById('gameResult');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');

    if (gameResult && resultTitle && resultMessage) {
        resultTitle.textContent = title;

        let message = `Power: ${eloChange} (Nieuw: ${iWon ? data.winnerElo : data.loserElo})`;
        if (data.isGambling && data.gamblingWinnings && iWon) {
            message += `\n💰 Je wint ${data.gamblingWinnings} credits!`;
        }
        resultMessage.textContent = message;

        gameResult.classList.remove('hidden');
    }

    // Show rematch and return buttons
    document.getElementById('requestRematchBtn')?.classList.remove('hidden');
    document.getElementById('returnLobbyBtn')?.classList.remove('hidden');
}

function showWinByForfeitPopup(data) {
    const opponentName = data.loserUsername === currentUser.username ? data.winnerUsername : data.loserUsername;
    const eloChange = `+${data.eloChange}`;

    // Build gambling section if applicable (Phase 3)
    const gamblingSection = (data.isGambling && data.gamblingWinnings) ? `
        <div class="p-4 rounded-lg mb-4" style="background: linear-gradient(135deg, #b45309 0%, #92400e 100%); border: 2px solid #fbbf24;">
            <p class="text-2xl mb-2">🎰</p>
            <p class="text-sm" style="color: rgba(255, 255, 255, 0.8);">Gambling Winnings</p>
            <p class="text-3xl font-bold" style="color: #fbbf24;">+${data.gamblingWinnings} credits</p>
            <p class="text-xs mt-1" style="color: rgba(255, 255, 255, 0.7);">Winner takes all!</p>
        </div>
    ` : '';

    const popupHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" id="winByForfeitModal">
            <div class="rounded-2xl shadow-2xl p-8 max-w-md text-center animate-bounce-in" style="background: linear-gradient(135deg, #1a5f3a 0%, #0d3b24 100%);">
                <div class="text-8xl mb-4 animate-pulse">🏆</div>
                <h2 class="text-3xl font-heading font-bold mb-4" style="color: #FFD700;">
                    Je hebt gewonnen!
                </h2>
                <div class="mb-6">
                    <p class="text-xl mb-2" style="color: white; font-weight: 600;">
                        🚪 ${opponentName} heeft het spel verlaten
                    </p>
                    <p class="text-sm mb-4" style="color: rgba(255, 255, 255, 0.7);">
                        Je wint automatisch door opgave van je tegenstander
                    </p>
                    ${gamblingSection}
                    <div class="p-4 rounded-lg mb-4" style="background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700;">
                        <p class="text-sm" style="color: rgba(255, 255, 255, 0.8);">Power wijziging</p>
                        <p class="text-2xl font-bold" style="color: #4ADE80;">${eloChange}</p>
                        <p class="text-sm" style="color: rgba(255, 255, 255, 0.7);">Nieuw: ${data.winnerElo}</p>
                    </div>
                </div>
                <button id="closeForfeitPopup" class="px-6 py-3 rounded-lg font-bold text-lg transition hover:opacity-80" style="background: #FFD700; color: #0D3B24;">
                    ✨ Geweldig!
                </button>
            </div>
        </div>
    `;

    // Remove existing modal if any
    document.getElementById('winByForfeitModal')?.remove();

    // Add to body
    document.body.insertAdjacentHTML('beforeend', popupHtml);

    // Add event listeners
    document.getElementById('closeForfeitPopup').addEventListener('click', () => {
        document.getElementById('winByForfeitModal')?.remove();
    });
}

// ============================================
// UI UPDATES
// ============================================

function updateRoundInfo() {
    // Update round number from GameEngine or currentGame
    const roundNumberEl = document.getElementById('roundNumber');
    if (roundNumberEl) {
        const roundNumber = gameEngine?.roundNumber || currentGame?.roundNumber || 1;
        roundNumberEl.textContent = roundNumber;
    }

    // Update voorgooier indicator if exists
    const voorgooierEl = document.getElementById('voorgooierIndicator');
    if (voorgooierEl && gameEngine) {
        const voorgooierName = gameEngine.voorgooierId === gameEngine.player.id
            ? 'Jij'
            : gameEngine.opponent.username;
        voorgooierEl.textContent = `👑 Voorgooier: ${voorgooierName}`;
    }
}

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

    // Get current game info for context
    const round = currentGame?.currentRound || 1;
    const throwsLeft = 3; // Default, kan extended worden met state tracking

    if (isMyTurn) {
        // Jouw beurt - prominent en animerend
        indicator.innerHTML = `
            <div style="background: linear-gradient(135deg, #1B7A4B, #0D5E3A); padding: 16px; border-radius: 12px; animation: pulse 2s ease-in-out infinite; box-shadow: 0 4px 12px rgba(27, 122, 75, 0.4);">
                <div style="font-size: 1.5rem; margin-bottom: 4px;">🎯</div>
                <div style="font-size: 1.2rem; font-weight: bold; color: white;">JOUW BEURT!</div>
                <div style="font-size: 0.85rem; color: rgba(255,255,255,0.8); margin-top: 4px;">Ronde ${round} • Kies je actie</div>
            </div>
        `;
        indicator.className = 'text-center mb-6';
    } else {
        // Wachten op tegenstander - neutraal
        const opponentName = currentGame?.players?.find(p => p.userId !== currentUser?.id)?.username || 'tegenstander';
        indicator.innerHTML = `
            <div style="background: rgba(156, 163, 175, 0.2); padding: 14px; border-radius: 12px; border: 2px dashed rgba(156, 163, 175, 0.4);">
                <div style="font-size: 1.2rem; margin-bottom: 4px;">⏳</div>
                <div style="font-size: 1rem; font-weight: 600; color: var(--text-secondary);">Wachten op ${opponentName}...</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); opacity: 0.7; margin-top: 4px;">Ronde ${round}</div>
            </div>
        `;
        indicator.className = 'text-center mb-6';
    }
}

// Add pulse animation style if not exists
if (!document.getElementById('pulseAnimation')) {
    const style = document.createElement('style');
    style.id = 'pulseAnimation';
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(27, 122, 75, 0.4); }
            50% { transform: scale(1.02); box-shadow: 0 6px 20px rgba(27, 122, 75, 0.6); }
        }
    `;
    document.head.appendChild(style);
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
                // A throw is still blind if: isBlind is true AND wasRevealed is not true
                const isStillBlind = throwData.isBlind && !throwData.wasRevealed;

                let displayValue, typeLabel, mexicoLabel;

                if (isStillBlind) {
                    // Current throw is still blind - don't reveal!
                    displayValue = '???';
                    typeLabel = '🙈 Verborgen';
                    mexicoLabel = '';
                } else {
                    // Throw has been revealed (or was open from start)
                    // Ensure we have dice values
                    if (!throwData.displayValue && throwData.dice1 && throwData.dice2) {
                        const result = calculateThrowDisplay(throwData.dice1, throwData.dice2);
                        throwData.displayValue = result.displayValue;
                        throwData.isMexico = result.isMexico;
                    }
                    displayValue = throwData.displayValue || '???';
                    typeLabel = throwData.isBlind ? '🙈→👁️' : '👁️';
                    mexicoLabel = throwData.isMexico ? ' <span style="color: var(--color-gold-light);" class="font-bold">🎉</span>' : '';
                }

                const isLast = index === playerThrowHistory.length - 1;
                const animClass = isLast ? 'throw-entry-new' : '';
                const highlightStyle = isLast ? 'background: rgba(255, 215, 0, 0.1); padding: 0.25rem 0.5rem; border-radius: 0.25rem; border-left: 2px solid var(--color-gold);' : '';

                playerHtml += `<div class="text-xs ${animClass}" style="color: var(--text-primary); ${highlightStyle}">
                    <span class="opacity-75">${index + 1}.</span>
                    <span class="font-bold" style="color: var(--color-gold);">${displayValue}</span>
                    <span class="opacity-60 text-[0.65rem]">${typeLabel}</span>
                    ${mexicoLabel}
                    ${isLast ? ' <span class="text-[0.6rem]" style="color: var(--color-gold);">◄ Nieuw</span>' : ''}
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
                // A throw is still blind if: isBlind is true AND wasRevealed is not true
                const isStillBlind = throwData.isBlind && !throwData.wasRevealed;

                let displayValue, typeLabel, mexicoLabel;

                if (isStillBlind) {
                    // Opponent throw is still blind - don't reveal!
                    displayValue = '???';
                    typeLabel = '🙈 Verborgen';
                    mexicoLabel = '';
                } else {
                    // Throw has been revealed
                    // Ensure we have dice values
                    if (!throwData.displayValue && throwData.dice1 && throwData.dice2) {
                        const result = calculateThrowDisplay(throwData.dice1, throwData.dice2);
                        throwData.displayValue = result.displayValue;
                        throwData.isMexico = result.isMexico;
                    }
                    displayValue = throwData.displayValue || '???';
                    typeLabel = throwData.isBlind ? '🙈→👁️' : '👁️';
                    mexicoLabel = throwData.isMexico ? ' <span style="color: var(--color-gold-light);" class="font-bold">🎉</span>' : '';
                }

                const isLast = index === opponentThrowHistory.length - 1;
                const animClass = isLast ? 'throw-entry-new' : '';
                const highlightStyle = isLast ? 'background: rgba(255, 99, 71, 0.1); padding: 0.25rem 0.5rem; border-radius: 0.25rem; border-left: 2px solid var(--color-red);' : '';

                opponentHtml += `<div class="text-xs ${animClass}" style="color: var(--text-primary); ${highlightStyle}">
                    <span class="opacity-75">${index + 1}.</span>
                    <span class="font-bold" style="color: var(--color-gold);">${displayValue}</span>
                    <span class="opacity-60 text-[0.65rem]">${typeLabel}</span>
                    ${mexicoLabel}
                    ${isLast ? ' <span class="text-[0.6rem]" style="color: var(--color-red);">◄ Nieuw</span>' : ''}
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
            trackTimeout(setTimeout(() => {
                diceCup.classList.remove('shaking');
            }, 500));
        }

        // Make dice visible and add rolling class
        dice1El.style.visibility = 'visible';
        dice2El.style.visibility = 'visible';
        dice1El.classList.add('rolling');
        dice2El.classList.add('rolling');

        // Bij BLIND: blijf ? tonen tijdens animatie
        if (isHidden) {
            // Geen rolling numbers, gewoon shake effect
            trackTimeout(setTimeout(() => {
                dice1El.classList.remove('rolling');
                dice2El.classList.remove('rolling');
                dice1El.textContent = '?';
                dice2El.textContent = '?';
            }, 500));
            return; // Stop hier voor blind worpen
        }

        // Random rolling effect (alleen voor OPEN worpen)
        const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        let rollCount = 0;
        const rollInterval = trackInterval(setInterval(() => {
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
        }, 50));

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
            trackTimeout(setTimeout(() => {
                diceCup.classList.remove('shaking');
            }, 500));
        }

        // Make dice visible and add rolling class
        dice1El.style.visibility = 'visible';
        dice2El.style.visibility = 'visible';
        dice1El.classList.add('rolling');
        dice2El.classList.add('rolling');

        // Random rolling effect
        const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        let rollCount = 0;
        const rollInterval = trackInterval(setInterval(() => {
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
        }, 50));

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
    ['throwOpenBtn', 'throwBlindBtn', 'revealBtn', 'keepBtn', 'leaveGameBtn'].forEach(id => {
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

function hideWaitingMessage() {
    const indicator = document.getElementById('turnIndicator');
    if (indicator) {
        indicator.textContent = '';
    }
}

function updateOpponentName(name, eloRating) {
    const opponentNameDisplay = name + (eloRating ? ` (${eloRating})` : '');

    const opponentDiceCupLabel = document.getElementById('opponentDiceCupLabel');
    if (opponentDiceCupLabel) {
        opponentDiceCupLabel.textContent = `🎯 ${opponentNameDisplay}`;
    }

    const opponentThrowHistoryLabel = document.getElementById('opponentThrowHistoryLabel');
    if (opponentThrowHistoryLabel) {
        opponentThrowHistoryLabel.textContent = `🎯 ${opponentNameDisplay}`;
    }

    const opponentCardLabel = document.getElementById('opponentCardLabel');
    if (opponentCardLabel) {
        opponentCardLabel.textContent = `🎯 ${name.toUpperCase()}`;
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
    trackTimeout(setTimeout(() => {
        hideAllActionButtons();
        const blindBtn = document.getElementById('throwBlindBtn');
        if (blindBtn) {
            blindBtn.classList.remove('hidden');
            debugLog('✅ Vastgooier blind button shown');
        } else {
            debugLog('❌ ERROR: Blind button not found!');
        }
        updateTurnIndicator();
    }, 100));
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
            let penaltyMessage = `-${data.penalty} leven (geen Mexico penalty bij overgooien)`;

            // Add power-up info (Phase 3.5)
            if (data.powerupUsed) {
                if (data.powerupUsed === 'mexico_shield') {
                    penaltyMessage += ' ⚡ Mexico Shield geblokkeerd!';
                } else if (data.powerupUsed === 'penalty_reduction') {
                    penaltyMessage += ` 🛡️ (penalty was ${data.penalty + 1})`;
                }
            }

            showToast(penaltyMessage, 'warning', 3000);
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

    // Determine names (✅ FIX: Add safety checks for bot mode)
    const opponentName = currentGame?.opponent?.username || gameEngine?.opponent?.username || 'Tegenstander';
    const voorgooierName = data.voorgooierId === currentUser.id ? 'Jij' : opponentName;
    const achterliggerName = data.achterliggerId === currentUser.id ? 'Jij' : opponentName;
    const winnerName = data.winnerId === currentUser.id ? 'Jij' : opponentName;
    const loserName = data.loserId === currentUser.id ? 'Jij' : opponentName;

    // Get throw values - replace 1000 with "Mexico!"
    let voorgooierValue = data.voorgooierThrow?.displayName || data.voorgooierThrow?.value || '?';
    if (voorgooierValue === 1000 || voorgooierValue === '1000') voorgooierValue = 'Mexico!';

    let achterliggerValue = data.achterliggerThrow?.displayName || data.achterliggerThrow?.value || '?';
    if (achterliggerValue === 1000 || achterliggerValue === '1000') achterliggerValue = 'Mexico!';

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
            text += ` <span style="color: var(--color-red);">(${loserName} moet ${data.penalty}x draaien - Mexico!)</span>`;
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

// ============================================
// UX ENHANCEMENTS
// ============================================

// Connection Status Indicator
function updateConnectionStatus(status, text) {
    const statusEl = document.getElementById('connectionStatus');
    const statusTextEl = document.getElementById('connectionStatusText');

    if (!statusEl || !statusTextEl) return;

    // Remove all status classes
    statusEl.classList.remove('connected', 'disconnected', 'reconnecting', 'hidden');

    // Add appropriate status class
    statusEl.classList.add(status);
    statusTextEl.textContent = text;

    // Auto-hide after 3 seconds if connected
    if (status === 'connected') {
        trackTimeout(setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 3000));
    }
}

// Show Reconnect Option
function showReconnectOption() {
    const reconnectHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" id="reconnectModal">
            <div class="rounded-2xl shadow-2xl p-8 max-w-md text-center" style="background: var(--bg-card);">
                <div class="text-6xl mb-4">🔌</div>
                <h2 class="text-2xl font-heading font-bold mb-4" style="color: var(--color-gold);">
                    Verbinding verbroken
                </h2>
                <p class="mb-6" style="color: var(--text-secondary);">
                    De verbinding met de server is verbroken. Probeer opnieuw te verbinden?
                </p>
                <div class="flex gap-4">
                    <button id="reconnectBtn" class="flex-1 py-3 px-6 rounded-xl font-bold transition transform hover:scale-105" style="background: var(--color-gold); color: #000;">
                        🔄 Opnieuw verbinden
                    </button>
                    <button id="cancelReconnectBtn" class="flex-1 py-3 px-6 rounded-xl font-bold transition" style="background: var(--bg-secondary); color: var(--text-primary);">
                        ❌ Annuleren
                    </button>
                </div>
            </div>
        </div>
    `;

    // Check if modal already exists
    if (document.getElementById('reconnectModal')) return;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', reconnectHtml);

    // Setup event listeners
    document.getElementById('reconnectBtn')?.addEventListener('click', () => {
        document.getElementById('reconnectModal')?.remove();
        initializeSocket();
        showToast('🔄 Opnieuw verbinden...', 'info', 2000);
    });

    document.getElementById('cancelReconnectBtn')?.addEventListener('click', () => {
        document.getElementById('reconnectModal')?.remove();
    });
}

// Match Found Countdown
function showMatchFoundCountdown(opponentName) {
    const queueSearching = document.getElementById('queueSearching');
    if (!queueSearching) return;

    // Replace searching message with match found countdown
    queueSearching.innerHTML = `
        <div class="text-center py-12">
            <div class="text-6xl mb-4">🎉</div>
            <div class="text-2xl font-bold mb-4" style="color: var(--color-gold);">
                Match gevonden!
            </div>
            <div class="text-lg mb-6" style="color: var(--text-primary);">
                Tegenstander: <span class="font-bold">${opponentName}</span>
            </div>
            <div class="countdown-timer" id="matchCountdown">3</div>
            <div class="text-sm mt-4" style="color: var(--text-secondary);">
                Het spel start zo...
            </div>
        </div>
    `;

    // Countdown animation
    let countdown = 3;
    const countdownEl = document.getElementById('matchCountdown');

    const countdownInterval = trackInterval(setInterval(() => {
        countdown--;
        if (countdownEl) {
            countdownEl.textContent = countdown;
            countdownEl.style.animation = 'none';
            trackTimeout(setTimeout(() => {
                if (countdownEl) countdownEl.style.animation = 'countdown-pulse 1s ease-in-out';
            }, 10));
        }

        if (countdown <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000));
}

// Enhanced Searching Animation
function startSearchingAnimation() {
    const queueIdle = document.getElementById('queueIdle');
    const queueSearching = document.getElementById('queueSearching');

    if (queueIdle) queueIdle.classList.add('hidden');
    if (queueSearching) {
        queueSearching.classList.remove('hidden');

        // Enhanced searching animation
        queueSearching.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4 searching-animation">🔍</div>
                <div class="text-xl font-bold mb-2" style="color: var(--color-gold);">
                    Zoeken naar tegenstander...
                </div>
                <div class="flex justify-center items-center gap-2 mb-6">
                    <div class="loading-spinner text-2xl">⚄</div>
                    <div class="text-sm" style="color: var(--text-secondary);">
                        Dit kan even duren
                    </div>
                </div>
                <button id="leaveQueueBtn" class="py-2 px-6 rounded-lg font-semibold transition hover:opacity-80" style="background: var(--color-red); color: white;">
                    ❌ Annuleren
                </button>
            </div>
        `;

        // Re-attach leave queue listener
        document.getElementById('leaveQueueBtn')?.addEventListener('click', () => {
            if (!socket) return;
            debugLog('❌ Leaving queue', 'info');
            socket.emit('leave_queue');

            // Show idle UI
            queueSearching.classList.add('hidden');
            queueIdle?.classList.remove('hidden');

            // Update debug panel
            updateDebugQueueStatus('Queue verlaten', false);
            updateDebugMatchStatus('Niet zoeken', '#aaa');
        });
    }
}

// Leave Game Confirmation
function showLeaveGameConfirmation() {
    const confirmHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" id="leaveGameModal">
            <div class="rounded-2xl shadow-2xl p-8 max-w-md text-center" style="background: var(--bg-card);">
                <div class="text-6xl mb-4">🚪</div>
                <h2 class="text-2xl font-heading font-bold mb-4" style="color: var(--color-gold);">
                    Spel verlaten?
                </h2>
                <p class="mb-2" style="color: var(--text-primary); font-weight: 600;">
                    Weet je het zeker?
                </p>
                <p class="mb-6 text-sm" style="color: var(--text-secondary);">
                    Als je nu vertrekt, verlies je automatisch dit spel en wordt je tegenstander de winnaar.
                </p>
                <div class="flex gap-4">
                    <button id="confirmLeaveBtn" class="flex-1 py-3 px-6 rounded-xl font-bold transition transform hover:scale-105" style="background: var(--color-red); color: white;">
                        🚪 Ja, verlaten
                    </button>
                    <button id="cancelLeaveBtn" class="flex-1 py-3 px-6 rounded-xl font-bold transition hover:opacity-80" style="background: var(--color-green); color: white;">
                        ❌ Annuleren
                    </button>
                </div>
            </div>
        </div>
    `;

    // Check if modal already exists
    if (document.getElementById('leaveGameModal')) return;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', confirmHtml);

    // Setup event listeners
    document.getElementById('confirmLeaveBtn')?.addEventListener('click', () => {
        document.getElementById('leaveGameModal')?.remove();
        leaveGame();
    });

    document.getElementById('cancelLeaveBtn')?.addEventListener('click', () => {
        document.getElementById('leaveGameModal')?.remove();
    });
}

// Leave Game
function leaveGame() {
    if (!socket || !currentGame) {
        showToast('Geen actief spel om te verlaten', 'error');
        return;
    }

    debugLog('🚪 Verlaat spel...');

    // Emit leave game event to server
    socket.emit('leave_game', { gameId: currentGame.gameId });

    // Show toast
    showToast('🚪 Je hebt het spel verlaten', 'info', 3000);

    // Reset game state and return to lobby
    currentGame = null;
    resetGameUI();
    showLobby();
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

// ===================================================================
// BOT OPPONENT SYSTEM (Client-Side AI)
// ===================================================================

// Bot names pool
const BOT_NAMES = ['Bot Alex', 'Bot Sarah', 'Bot Mike', 'Bot Emma', 'Bot Lucas', 'Bot Nina', 'Bot Tom', 'Bot Lisa'];

// AI Personalities (from AI_PSYCHOLOGY.md)
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
        thresholds: { 1: 61, 2: 65, 3: 22 },  // Exact volgens Mexico regels
        bluffChance: 0.15,  // Blufft soms (15%)
        psychologyFactor: 0.5,  // Matige psychologische aanpassing
        description: 'Speelt volgens de regels en statistiek'
    },
    AGGRESSIVE: {
        name: 'Agressief',
        thresholds: { 1: 54, 2: 61, 3: 12 },  // Gokt meer
        bluffChance: 0.30,  // Blufft regelmatig (30%)
        psychologyFactor: 1.0,  // Volledige psychologische aanpassing
        description: 'Durft risico te nemen, intimideert tegenstander'
    }
};

// ============================================
// GAME MODE ADAPTER PATTERN
// ============================================
// Single source of truth for gameplay logic
// Bot and Multiplayer use same core functions via adapters

/**
 * GameModeAdapter Interface
 * Provides abstraction between gameplay and opponent handling
 */
const GameModeAdapter = {
    mode: 'base',

    /**
     * Get opponent state data
     * @returns {Object} Opponent state (lives, throw, etc)
     */
    getOpponentState() {
        throw new Error('getOpponentState must be implemented');
    },

    /**
     * Get opponent name and rating
     * @returns {Object} {username, eloRating}
     */
    getOpponentInfo() {
        throw new Error('getOpponentInfo must be implemented');
    },

    /**
     * Check if it's player's turn
     * @returns {Boolean}
     */
    isPlayerTurn() {
        throw new Error('isPlayerTurn must be implemented');
    },

    /**
     * Notify opponent of player action
     * @param {String} action - 'throw', 'keep', 'reveal'
     * @param {Object} data - Action data
     */
    notifyOpponent(action, data) {
        throw new Error('notifyOpponent must be implemented');
    },

    /**
     * Execute opponent turn
     * @returns {Promise} Resolves when opponent turn complete
     */
    executeOpponentTurn() {
        throw new Error('executeOpponentTurn must be implemented');
    },

    /**
     * Start new game
     * @param {Object} config - Game configuration
     */
    startGame(config) {
        throw new Error('startGame must be implemented');
    },

    /**
     * End current game
     * @param {Object} result - Game result
     */
    endGame(result) {
        throw new Error('endGame must be implemented');
    },

    /**
     * Start next round
     */
    startNextRound() {
        throw new Error('startNextRound must be implemented');
    }
};

/**
 * MultiplayerAdapter
 * Handles real opponent via socket.io
 */
const MultiplayerAdapter = Object.create(GameModeAdapter);
MultiplayerAdapter.mode = 'multiplayer';

MultiplayerAdapter.getOpponentState = function() {
    // ✅ FIX: Get opponent state from GameEngine instead of undefined variables
    const game = gameState.getGame();
    if (gameEngine) {
        return {
            lives: gameEngine.opponent.lives || 0,
            currentThrow: gameEngine.opponent.currentThrow || null,
            isRevealed: !gameEngine.opponent.isBlind
        };
    }

    // Fallback to game state if no GameEngine
    return {
        lives: game?.opponent?.lives || 0,
        currentThrow: null,
        isRevealed: false
    };
};

MultiplayerAdapter.getOpponentInfo = function() {
    const game = gameState.getGame();
    if (!game) return { username: 'Tegenstander', eloRating: 1200 };

    const opponent = game.players.find(p => p.id !== currentUser.id);
    return {
        username: opponent ? opponent.username : 'Tegenstander',
        eloRating: opponent ? opponent.eloRating : 1200
    };
};

MultiplayerAdapter.isPlayerTurn = function() {
    return gameState.isPlayerTurn();
};

MultiplayerAdapter.notifyOpponent = function(action, data) {
    const socket = gameState.getSocket();
    if (!socket) return;

    // Emit appropriate socket event
    switch (action) {
        case 'throw':
            socket.emit('throw-dice', data);
            break;
        case 'keep':
            socket.emit('keep-throw', data);
            break;
        case 'reveal':
            socket.emit('reveal-dice', data);
            break;
    }
};

MultiplayerAdapter.rollDice = function(isBlind) {
    // Roll dice via socket (server handles the actual roll)
    return new Promise((resolve) => {
        const socket = gameState.getSocket();
        if (!socket) {
            // Fallback: local roll if no socket
            const dice1 = Math.ceil(Math.random() * 6);
            const dice2 = Math.ceil(Math.random() * 6);
            resolve({ dice1, dice2, isBlind });
            return;
        }

        // Emit to server and wait for response
        socket.emit('throw_dice', {
            gameId: gameState.getGame()?.gameId,
            isBlind
        });

        // Listen for throw result (once)
        socket.once('throw_result', (data) => {
            // ✅ FIX: First-round blind throws don't include dice values for security
            // Roll locally if undefined (will be corrected by first_round_reveal later)
            const dice1 = data.dice1 !== undefined ? data.dice1 : Math.ceil(Math.random() * 6);
            const dice2 = data.dice2 !== undefined ? data.dice2 : Math.ceil(Math.random() * 6);

            resolve({
                dice1,
                dice2,
                isBlind: data.isBlind
            });
        });
    });
};

MultiplayerAdapter.executeOpponentTurn = function() {
    // Opponent turn happens via socket events
    // This is just a placeholder - real logic is in socket handlers
    return Promise.resolve();
};

MultiplayerAdapter.startGame = function(config) {
    // Multiplayer games start via matchmaking/socket
    // This is handled elsewhere
};

MultiplayerAdapter.endGame = function(result) {
    // End game via socket
    const socket = gameState.getSocket();
    if (socket && result) {
        socket.emit('game-ended', result);
    }
};

MultiplayerAdapter.startNextRound = function() {
    // Round transitions handled by server in multiplayer
    // Just update UI
    updateRoundInfo();
};

// Current active game mode
let currentGameMode = MultiplayerAdapter;

// Bot game state
let botGame = {
    active: false,
    botPlayer: null,  // Bot data
    botState: {
        dice1: 1,
        dice2: 1,
        currentThrow: null,
        displayThrow: null,
        throwCount: 0,
        isBlind: false,
        isMexico: false,
        lives: 6,
        throwHistory: []
    },
    playerState: {
        dice1: 1,
        dice2: 1,
        currentThrow: null,
        displayThrow: null,
        throwCount: 0,
        isBlind: false,
        isMexico: false,
        lives: 6,
        throwHistory: []
    },
    roundNumber: 1,
    isFirstRound: true,
    voorgooier: null,  // 'player' or 'bot'
    currentTurn: null,  // 'player' or 'bot'
    maxThrows: 3,
    voorgooierPattern: [],
    aiPersonality: null,
    aiPsychology: {
        consecutiveLosses: 0,
        roundsSinceLoss: 0,
        lastRoundOutcome: null,
        tiltLevel: 0,
        livesAdvantage: 0,
        isWinning: false,
        recentThrowHistory: [],
        recentBadThrows: 0,
        consecutiveGoodThrows: 0,
        lastThrowQuality: 0,
        firstThrowOfRound: null,
        recentWins: 0
    }
};

// Select random bot name
function getRandomBotName() {
    return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

// Select AI personality (30% SCARED, 50% RATIONAL, 20% AGGRESSIVE)
function selectAIPersonality() {
    const rand = Math.random();
    if (rand < 0.30) {
        return AI_PERSONALITIES.SCARED;
    } else if (rand < 0.80) {
        return AI_PERSONALITIES.RATIONAL;
    } else {
        return AI_PERSONALITIES.AGGRESSIVE;
    }
}

// Calculate throw value (same logic as Mexico game)
function calculateBotThrowValue(dice1, dice2) {
    if ((dice1 === 2 && dice2 === 1) || (dice1 === 1 && dice2 === 2)) {
        return 1000; // Mexico
    }
    // Pair
    if (dice1 === dice2) {
        return dice1 * 100;
    }
    // Normal throw: higher die first
    return Math.max(dice1, dice2) * 10 + Math.min(dice1, dice2);
}

// Throw quality for psychology (0.0 to 1.0)
function calculateThrowQuality(throwValue) {
    if (throwValue === 1000) return 1.0;  // Mexico
    if (throwValue >= 65) return 0.50; // Top normal throws
    if (throwValue >= 54) return 0.40;
    if (throwValue >= 43) return 0.30;
    if (throwValue >= 32) return 0.20;
    return 0.10; // Bad throws
}

// AI Psychology Functions (from AI_PSYCHOLOGY.md)

// 1. Loss Aversion: Extra voorzichtig als winnend
function applyLossAversion(threshold) {
    const psych = botGame.aiPsychology;
    const botLives = botGame.botState.lives;
    const playerLives = botGame.playerState.lives;

    psych.livesAdvantage = botLives - playerLives;
    psych.isWinning = psych.livesAdvantage > 0;

    if (psych.isWinning) {
        // 80% kans om te triggeren
        if (Math.random() < 0.80) {
            // Loss aversion: 2.5x sterker gewicht aan verliezen
            const baseAdjustment = Math.min(psych.livesAdvantage * 3, 10);
            const adjustment = Math.round(baseAdjustment * (0.8 + Math.random() * 0.4));
            debugLog(`[Bot Psychology] Loss Aversion TRIGGERED: +${adjustment} voorzichtiger`);
            return threshold + adjustment;
        }
    }
    return threshold;
}

// 2. Tilt Mechanics: Emotioneel na herhaalde verliezen
function applyTiltMechanics(threshold, bluffChance) {
    const psych = botGame.aiPsychology;

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

    // Tilt decay: herstel na 3 rondes zonder loss
    if (psych.roundsSinceLoss >= 3) {
        psych.tiltLevel = Math.max(0, psych.tiltLevel - 1);
    }

    if (psych.tiltLevel > 0) {
        // Tijdens tilt: agressiever (lager threshold) + meer bluffen
        const thresholdReduction = psych.tiltLevel * 5;
        const bluffIncrease = psych.tiltLevel * 0.15;

        debugLog(`[Bot Psychology] TILT Level ${psych.tiltLevel}: -${thresholdReduction} threshold, +${Math.round(bluffIncrease * 100)}% bluff`);

        return {
            threshold: threshold - thresholdReduction,
            bluffChance: Math.min(bluffChance + bluffIncrease, 0.6)
        };
    }

    return { threshold, bluffChance };
}

// 3. Gambler's Fallacy: "Ik heb 5x slecht gegooid, nu moet ik wel goed gooien"
function applyGamblersFallacy(threshold) {
    const psych = botGame.aiPsychology;

    if (psych.recentBadThrows >= 3) {
        if (Math.random() < 0.65) {
            const baseAdjustment = Math.min(psych.recentBadThrows * 3, 12);
            const adjustment = Math.round(baseAdjustment * (0.7 + Math.random() * 0.6));
            debugLog(`[Bot Psychology] Gambler's Fallacy TRIGGERED: -${adjustment}`);
            return threshold - adjustment;
        }
    }
    return threshold;
}

// 4. Hot Hand Fallacy: "Ik ben on fire, dit gaat gewoon door"
function applyHotHandFallacy(threshold) {
    const psych = botGame.aiPsychology;

    if (psych.consecutiveGoodThrows >= 3) {
        if (Math.random() < 0.70) {
            const baseAdjustment = Math.min(psych.consecutiveGoodThrows * 2, 10);
            const adjustment = Math.round(baseAdjustment * (0.75 + Math.random() * 0.5));
            debugLog(`[Bot Psychology] Hot Hand Fallacy TRIGGERED: -${adjustment}`);
            return threshold - adjustment;
        }
    }
    return threshold;
}

// Update psychology after bot throw
function updateBotPsychologyAfterThrow(throwValue) {
    const psych = botGame.aiPsychology;
    const quality = calculateThrowQuality(throwValue);

    if (!psych.firstThrowOfRound) {
        psych.firstThrowOfRound = throwValue;
    }

    psych.recentThrowHistory.push(throwValue);
    if (psych.recentThrowHistory.length > 5) {
        psych.recentThrowHistory.shift();
    }

    psych.recentBadThrows = psych.recentThrowHistory.filter(t => calculateThrowQuality(t) < 0.4).length;

    if (quality > 0.5) {
        psych.consecutiveGoodThrows++;
    } else {
        psych.consecutiveGoodThrows = 0;
    }

    psych.lastThrowQuality = quality * 100;
}

// Update psychology after round
function updateBotPsychologyAfterRound(didBotWin) {
    const psych = botGame.aiPsychology;

    psych.firstThrowOfRound = null;

    if (didBotWin) {
        psych.lastRoundOutcome = 'win';
        psych.consecutiveLosses = 0;
        psych.roundsSinceLoss++;
        psych.recentWins = Math.min(psych.recentWins + 1, 3);
        debugLog(`[Bot Psychology] Round won! Reset losses`);
    } else {
        psych.lastRoundOutcome = 'loss';
        psych.consecutiveLosses++;
        psych.roundsSinceLoss = 0;
        psych.recentWins = Math.max(psych.recentWins - 1, 0);
        debugLog(`[Bot Psychology] Round lost! Consecutive losses: ${psych.consecutiveLosses}`);
    }
}

// Bot decision: should throw again?
function botShouldThrowAgain() {
    const bot = botGame.botState;

    // If Mexico, never throw again
    if (bot.currentThrow === 1000) {
        return false;
    }

    // If no throw yet, always throw
    if (!bot.currentThrow) {
        return true;
    }

    // If reached max throws, stop
    if (bot.throwCount >= botGame.maxThrows) {
        return false;
    }

    // Select or keep personality
    if (!botGame.aiPersonality) {
        botGame.aiPersonality = selectAIPersonality();
        debugLog(`[Bot AI] Personality: ${botGame.aiPersonality.name}`);
    }

    const personality = botGame.aiPersonality;
    let bluffChance = personality.bluffChance;

    // Get base threshold
    let threshold = personality.thresholds[bot.throwCount] || 61;

    // Apply psychological principles
    threshold = applyLossAversion(threshold);
    const tiltResult = applyTiltMechanics(threshold, bluffChance);
    threshold = tiltResult.threshold;
    bluffChance = tiltResult.bluffChance;
    threshold = applyGamblersFallacy(threshold);
    threshold = applyHotHandFallacy(threshold);

    debugLog(`[Bot AI] Decision: throw=${bot.currentThrow}, threshold=${threshold}`);

    // Bluff option
    if (Math.random() < bluffChance) {
        if (bot.currentThrow >= 43 && bot.currentThrow <= 62) {
            debugLog(`[Bot AI] BLUFF: Stop at ${bot.currentThrow}`);
            return false;
        }
    }

    // Normal decision: throw again if below threshold
    return bot.currentThrow < threshold;
}

/**
 * BotAdapter
 * Handles AI opponent with local simulation
 */
const BotAdapter = Object.create(GameModeAdapter);
BotAdapter.mode = 'bot';

BotAdapter.getOpponentState = function() {
    // Bot state from gameEngine (if available) or botGame object (fallback)
    if (gameEngine) {
        return {
            lives: gameEngine.opponent.lives,
            currentThrow: gameEngine.opponent.currentThrow,
            displayThrow: gameEngine.opponent.displayThrow,
            isBlind: gameEngine.opponent.isBlind,
            isMexico: gameEngine.opponent.isMexico,
            throwCount: gameEngine.opponent.throwCount
        };
    }
    return {
        lives: botGame.botState.lives,
        currentThrow: botGame.botState.currentThrow,
        displayThrow: botGame.botState.displayThrow,
        isBlind: botGame.botState.isBlind,
        isMexico: botGame.botState.isMexico,
        throwCount: botGame.botState.throwCount
    };
};

BotAdapter.getOpponentInfo = function() {
    return {
        username: botGame.botPlayer ? botGame.botPlayer.username : '🤖 Bot',
        eloRating: botGame.botPlayer ? botGame.botPlayer.eloRating : 1200
    };
};

BotAdapter.isPlayerTurn = function() {
    return botGame.currentTurn === 'player';
};

BotAdapter.notifyOpponent = function(action, data) {
    // Bot doesn't need notifications during player turn
    // Bot will act when executeOpponentTurn is called
    debugLog(`[BotAdapter] Player action: ${action}`, data);
};

BotAdapter.rollDice = function(isBlind) {
    // Roll dice locally (bot mode)
    const dice1 = Math.ceil(Math.random() * 6);
    const dice2 = Math.ceil(Math.random() * 6);

    debugLog(`[BotAdapter] Player rolled: ${dice1}-${dice2} (${isBlind ? 'BLIND' : 'OPEN'})`);

    // Return as resolved promise for consistency with MultiplayerAdapter
    return Promise.resolve({
        dice1,
        dice2,
        isBlind
    });
};

BotAdapter.executeOpponentTurn = async function() {
    // Execute bot's turn
    debugLog('[BotAdapter] Executing bot turn...');

    // For now, use simple bot AI (just throw once and keep)
    // TODO: Integrate advanced AI psychology later
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate thinking

    const dice1 = Math.ceil(Math.random() * 6);
    const dice2 = Math.ceil(Math.random() * 6);

    debugLog(`[BotAdapter] Bot rolled: ${dice1}-${dice2}`);

    // Update gameEngine opponent state directly
    if (gameEngine) {
        gameEngine.opponent.dice1 = dice1;
        gameEngine.opponent.dice2 = dice2;
        gameEngine.opponent.currentThrow = gameEngine.calculateThrowValue(dice1, dice2);
        gameEngine.opponent.displayThrow = gameEngine.opponent.currentThrow === 1000 ? 'MEXICO' : String(gameEngine.opponent.currentThrow);
        gameEngine.opponent.throwCount = 1;
        gameEngine.opponent.isBlind = false;
        gameEngine.opponent.isMexico = (gameEngine.opponent.currentThrow === 1000);

        // Show opponent dice
        showOpponentDice(dice1, dice2, false, gameEngine.opponent.isMexico);

        // Add to opponent history
        const throwInfo = calculateThrowDisplay(dice1, dice2);
        opponentThrowHistory.push({
            displayValue: throwInfo.displayValue,
            isMexico: throwInfo.isMexico,
            isBlind: false,
            wasBlind: false
        });
        updateThrowHistory();
    }

    debugLog('[BotAdapter] Bot turn complete');
};

BotAdapter.startGame = function(config) {
    // Initialize bot game
    debugLog('[BotAdapter] Starting bot game');
    botGame.active = true;
    currentGameMode = BotAdapter;

    // Bot game initialization happens in startBotGame()
};

BotAdapter.endGame = function(result) {
    debugLog('[BotAdapter] Ending bot game', result);
    botGame.active = false;
    currentGameMode = MultiplayerAdapter;

    // Show result to player
    if (result) {
        const message = result.winnerId === currentUser.id
            ? `🎉 Je hebt gewonnen tegen ${botGame.botPlayer.username}!`
            : `😔 Je hebt verloren van ${botGame.botPlayer.username}`;
        showToast(message, result.winnerId === currentUser.id ? 'success' : 'error', 3000);
    }
};

BotAdapter.startNextRound = function() {
    // Bot round transition (uses existing logic)
    startBotNextRound();
};

// ============================================
// UNIFIED GAME ENGINE
// ============================================
// Single source of truth for ALL game logic
// Works for both multiplayer and bot modes

class GameEngine {
    constructor(mode) {
        this.mode = mode; // 'multiplayer' or 'bot'
        this.adapter = mode === 'bot' ? BotAdapter : MultiplayerAdapter;

        // Game state
        this.gameId = null;
        this.roundNumber = 1;
        this.isFirstRound = true;
        this.maxThrows = 1; // First round: 1 blind throw only!
        this.voorgooierId = null;
        this.currentTurnId = null;
        this.isSimultaneous = true; // First round is simultaneous in multiplayer
        this.isGambling = false;
        this.gamblingPot = 0;

        // Player state
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

        // Opponent state (populated via adapter)
        this.opponent = {
            id: null,
            username: null,
            lives: 6,
            currentThrow: null,
            displayThrow: null,
            isBlind: false,
            isMexico: false
        };

        debugLog(`[GameEngine] Created (${mode} mode)`);
    }

    /**
     * Initialize game with player data
     */
    async initialize(config) {
        this.gameId = config.gameId || `game-${Date.now()}`;
        this.player.id = config.playerId;
        this.player.username = config.playerName;
        this.voorgooierId = this.player.id;
        this.currentTurnId = this.player.id;

        // Get opponent info from adapter
        const opponentInfo = this.adapter.getOpponentInfo();
        this.opponent.id = config.opponentId || opponentInfo.id || 'opponent-' + Date.now();
        this.opponent.username = opponentInfo.username;

        debugLog(`[GameEngine] Initialized: ${this.player.username} vs ${this.opponent.username}`);

        return this.getState();
    }

    /**
     * Throw dice (works for both modes!)
     */
    async throwDice(isBlind) {
        // In simultaneous mode (first round), both players can throw at the same time
        if (!this.isSimultaneous && !this.isPlayerTurn()) {
            throw new Error('Not your turn!');
        }

        // First round must be blind!
        if (this.isFirstRound && !isBlind) {
            throw new Error('Eerste ronde moet blind!');
        }

        debugLog(`[GameEngine] Player throws ${isBlind ? 'BLIND' : 'OPEN'}`);

        // Roll dice via adapter (local or server)
        const result = await this.adapter.rollDice(isBlind);

        // Update player state
        this.player.throwCount++;
        this.player.dice1 = result.dice1;
        this.player.dice2 = result.dice2;
        this.player.currentThrow = this.calculateThrowValue(result.dice1, result.dice2);
        this.player.isBlind = isBlind;
        this.player.isMexico = (this.player.currentThrow === 1000);

        if (this.player.isBlind) {
            this.player.displayThrow = '???';
        } else {
            this.player.displayThrow = this.player.isMexico ? '🎉 Mexico!' : this.player.currentThrow.toString();
        }

        // Add to throw history
        this.player.throwHistory.push({
            dice1: result.dice1,
            dice2: result.dice2,
            value: this.player.currentThrow,
            isBlind: isBlind,
            wasBlind: isBlind
        });

        // Add to UI history (for display)
        const throwInfo = calculateThrowDisplay(result.dice1, result.dice2);
        playerThrowHistory.push({
            displayValue: throwInfo.displayValue,
            isMexico: throwInfo.isMexico,
            isBlind: isBlind,
            wasBlind: isBlind
        });

        // Update UI
        updateThrowHistory();
        updateThrowCounter(this.player.throwCount, this.maxThrows);

        // Show dice
        if (this.player.isBlind) {
            showDice('', '', false, true);
            showInlineMessage('🙈 Je gooide blind', 'info');
        } else {
            showDice(this.player.dice1, this.player.dice2, this.player.isMexico, false);
            showInlineMessage(`Je gooide: ${this.player.displayThrow}`, this.player.isMexico ? 'success' : 'info');
        }

        debugLog(`[GameEngine] Throw result: ${this.player.dice1}-${this.player.dice2} = ${this.player.currentThrow}`);

        // Determine next actions
        const canKeep = true;
        const canThrowAgain = this.player.throwCount < this.maxThrows;
        const isLastThrow = this.player.throwCount >= this.maxThrows;

        // 🎯 UX IMPROVEMENT: First round blind throw auto-keeps (no user action needed)
        if (this.isFirstRound && isBlind && isLastThrow) {
            debugLog('[GameEngine] Auto-keeping first round blind throw');
            // Auto-keep after a short delay for UX
            setTimeout(async () => {
                await this.keepThrow();
            }, 800);
        }

        return {
            dice1: this.player.dice1,
            dice2: this.player.dice2,
            value: this.player.currentThrow,
            isBlind: this.player.isBlind,
            isMexico: this.player.isMexico,
            throwCount: this.player.throwCount,
            canKeep,
            canThrowAgain: this.isFirstRound && isBlind ? false : canThrowAgain, // No second throw in round 1
            isLastThrow,
            state: this.getState()
        };
    }

    /**
     * Keep current throw
     */
    async keepThrow() {
        if (!this.isPlayerTurn()) {
            throw new Error('Not your turn!');
        }

        debugLog(`[GameEngine] Player keeps throw: ${this.player.displayThrow}`);

        // Notify opponent via adapter
        this.adapter.notifyOpponent('keep', {
            throw: this.player.currentThrow,
            isBlind: this.player.isBlind
        });

        // Switch turn to opponent
        this.currentTurnId = this.opponent.id;

        // Execute opponent turn via adapter
        await this.adapter.executeOpponentTurn();

        // After opponent turn, compare round
        await this.compareRound();

        return {
            roundComplete: true,
            state: this.getState()
        };
    }

    /**
     * Reveal blind throw
     */
    revealDice() {
        if (!this.player.isBlind) {
            throw new Error('Throw is not blind!');
        }

        debugLog(`[GameEngine] Player reveals: ${this.player.currentThrow}`);

        this.player.isBlind = false;
        this.player.displayThrow = this.player.isMexico ? '🎉 Mexico!' : this.player.currentThrow.toString();

        // Update throw history
        if (playerThrowHistory.length > 0) {
            playerThrowHistory[playerThrowHistory.length - 1].isBlind = false;
            updateThrowHistory();
        }

        // Show dice
        showDice(this.player.dice1, this.player.dice2, this.player.isMexico, false);
        showInlineMessage(`Je onthult: ${this.player.displayThrow}`, this.player.isMexico ? 'success' : 'info');

        return {
            revealed: true,
            value: this.player.currentThrow,
            state: this.getState()
        };
    }

    /**
     * Compare round results
     */
    async compareRound() {
        debugLog(`[GameEngine] Comparing round ${this.roundNumber}`);

        // Get opponent state from adapter
        const opponentState = this.adapter.getOpponentState();
        this.opponent.currentThrow = opponentState.currentThrow;
        this.opponent.displayThrow = opponentState.displayThrow;
        this.opponent.isBlind = opponentState.isBlind;
        this.opponent.isMexico = opponentState.isMexico;

        // Reveal any blind throws
        if (this.player.isBlind) {
            this.revealDice();
        }

        if (this.opponent.isBlind) {
            // Update opponent history
            if (opponentThrowHistory.length > 0) {
                opponentThrowHistory[opponentThrowHistory.length - 1].isBlind = false;
                updateThrowHistory();
            }
        }

        // Determine winner
        const winner = this.determineWinner();
        const loser = winner === this.player.id ? this.opponent.id : this.player.id;

        // Update lives
        if (winner === this.player.id) {
            this.opponent.lives--;
            debugLog(`[GameEngine] Player wins! Opponent lives: ${this.opponent.lives}`);
        } else {
            this.player.lives--;
            debugLog(`[GameEngine] Opponent wins! Player lives: ${this.player.lives}`);
        }

        // Update UI
        updateLives(this.player.id, this.player.lives);
        updateLives(this.opponent.id, this.opponent.lives);

        // Update last round summary
        const isVoorgooier = (this.voorgooierId === this.player.id);
        updateLastRoundSummary({
            voorgooierId: this.voorgooierId,
            achterliggerId: isVoorgooier ? this.opponent.id : this.player.id,
            voorgooierResult: (winner === this.voorgooierId) ? 'won' : 'lost',
            achterliggerResult: (winner !== this.voorgooierId) ? 'won' : 'lost',
            winnerId: winner,
            loserId: loser,
            livesLeft: winner === this.player.id ? this.player.lives : this.opponent.lives
        });

        // Check for game over
        if (this.isGameOver()) {
            await this.endGame();
        } else {
            await this.startNextRound();
        }
    }

    /**
     * Determine round winner
     */
    determineWinner() {
        const playerThrow = this.player.currentThrow;
        const opponentThrow = this.opponent.currentThrow;

        // Mexico always wins
        if (playerThrow === 1000 && opponentThrow !== 1000) {
            return this.player.id;
        }
        if (opponentThrow === 1000 && playerThrow !== 1000) {
            return this.opponent.id;
        }

        // Both Mexico = tie (voorgooier wins)
        if (playerThrow === 1000 && opponentThrow === 1000) {
            return this.voorgooierId;
        }

        // Higher throw wins
        if (playerThrow > opponentThrow) {
            return this.player.id;
        }
        if (opponentThrow > playerThrow) {
            return this.opponent.id;
        }

        // Tie = voorgooier wins
        return this.voorgooierId;
    }

    /**
     * Start next round
     */
    async startNextRound() {
        this.roundNumber++;
        this.isFirstRound = false;
        this.isSimultaneous = false; // After first round: turn-based
        this.maxThrows = 3; // After first round: 3 throws allowed

        // Alternate voorgooier
        this.voorgooierId = (this.voorgooierId === this.player.id) ? this.opponent.id : this.player.id;
        this.currentTurnId = this.voorgooierId;

        // Reset throw states
        this.player.throwCount = 0;
        this.player.dice1 = null;
        this.player.dice2 = null;
        this.player.currentThrow = null;
        this.player.displayThrow = null;
        this.player.isBlind = false;
        this.player.isMexico = false;
        this.player.throwHistory = [];

        // Clear UI history
        playerThrowHistory = [];
        opponentThrowHistory = [];
        updateThrowHistory();

        // Update UI
        showDice('', '', false, false);
        showOpponentDice('', '', false, false);
        updateRoundInfo();

        showToast(`Ronde ${this.roundNumber} begint!`, 'info', 2000);

        debugLog(`[GameEngine] Round ${this.roundNumber} started. Voorgooier: ${this.voorgooierId}`);

        // 🤖 BOT MODE: If bot is voorgooier, auto-play bot's turn immediately
        if (this.mode === 'bot' && this.currentTurnId === this.opponent.id) {
            debugLog(`[GameEngine] Bot is voorgooier - auto-playing bot's turn`);
            // Hide ALL player buttons and show waiting message
            hideAllActionButtons();
            showInlineMessage(`🎲 Ronde ${this.roundNumber} - Bot is voorgooier...`, 'info');
            showWaitingMessage('Bot gooit...');

            // 🔧 CRITICAL: Sync GameEngine state to botGame before calling executeBotTurn
            botGame.maxThrows = this.maxThrows;
            botGame.voorgooier = (this.voorgooierId === this.opponent.id) ? 'bot' : 'player';
            botGame.roundNumber = this.roundNumber;
            botGame.isFirstRound = this.isFirstRound;
            debugLog(`[GameEngine] Synced to botGame: maxThrows=${botGame.maxThrows}, voorgooier=${botGame.voorgooier}, isFirstRound=${botGame.isFirstRound}`);

            // Execute bot turn after short delay (don't call adapter to prevent duplicate)
            setTimeout(() => {
                executeBotTurn();
            }, 1000);
            return; // Skip adapter call to prevent double round start logic
        }

        // Call adapter for mode-specific logic (multiplayer or player is voorgooier)
        this.adapter.startNextRound();
    }

    /**
     * Check if game is over
     */
    isGameOver() {
        return this.player.lives <= 0 || this.opponent.lives <= 0;
    }

    /**
     * End game
     */
    async endGame() {
        const winner = this.player.lives > 0 ? this.player.id : this.opponent.id;
        const loser = winner === this.player.id ? this.opponent.id : this.player.id;

        debugLog(`[GameEngine] Game over! Winner: ${winner}`);

        const result = {
            gameId: this.gameId,
            winnerId: winner,
            loserId: loser,
            playerLives: this.player.lives,
            opponentLives: this.opponent.lives
        };

        // Call adapter for mode-specific end game logic
        this.adapter.endGame(result);

        return result;
    }

    /**
     * Check if it's player's turn
     */
    isPlayerTurn() {
        return this.currentTurnId === this.player.id;
    }

    /**
     * Calculate throw value
     */
    calculateThrowValue(dice1, dice2) {
        if ((dice1 === 2 && dice2 === 1) || (dice1 === 1 && dice2 === 2)) {
            return 1000; // Mexico
        }
        if (dice1 === dice2) {
            return dice1 * 100; // Pair
        }
        return Math.max(dice1, dice2) * 10 + Math.min(dice1, dice2); // Normal
    }

    /**
     * Get current game state
     */
    getState() {
        return {
            gameId: this.gameId,
            mode: this.mode,
            roundNumber: this.roundNumber,
            isFirstRound: this.isFirstRound,
            maxThrows: this.maxThrows,
            voorgooierId: this.voorgooierId,
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
                isMexico: this.player.isMexico
            },
            opponent: {
                id: this.opponent.id,
                username: this.opponent.username,
                lives: this.opponent.lives,
                currentThrow: this.opponent.currentThrow,
                displayThrow: this.opponent.displayThrow
            },
            isGameOver: this.isGameOver()
        };
    }
}

// Global game engine instance
let gameEngine = null;

// Start bot game
async function startBotGame() {
    debugLog('🤖 Starting bot game with GameEngine...');

    // Hide gambling checkbox for bot games
    const gamblingCheckbox = document.getElementById('gamblingCheckbox');
    if (gamblingCheckbox) {
        gamblingCheckbox.checked = false;
        gamblingCheckbox.disabled = true;
    }

    // Setup bot player
    const botPlayer = {
        id: 'bot-' + Date.now(),
        username: getRandomBotName(),
        eloRating: 1200
    };

    // ✅ INITIALIZE GAMEENGINE IN BOT MODE
    gameEngine = new GameEngine('bot');

    await gameEngine.initialize({
        gameId: 'bot-game-' + Date.now(),
        playerId: currentUser.id,
        playerName: currentUser.username,
        opponentId: botPlayer.id,
        opponentName: botPlayer.username
    });

    // Keep old botGame object for backwards compatibility (psychology, etc.)
    botGame.botPlayer = botPlayer;
    botGame.aiPersonality = null;
    botGame.aiPsychology = {
        consecutiveLosses: 0,
        roundsSinceLoss: 0,
        lastRoundOutcome: null,
        tiltLevel: 0,
        livesAdvantage: 0,
        isWinning: false,
        recentThrowHistory: [],
        recentBadThrows: 0,
        consecutiveGoodThrows: 0,
        lastThrowQuality: 0,
        firstThrowOfRound: null,
        recentWins: 0
    };

    // Set currentGame for UI compatibility
    currentGame = {
        gameId: gameEngine.gameId,
        players: [
            { id: currentUser.id, username: currentUser.username, lives: 6 },
            { id: botPlayer.id, username: botPlayer.username, lives: 6 }
        ],
        roundNumber: 1,
        voorgooier: currentUser.id,
        currentTurn: currentUser.id,
        isFirstRound: true,
        isGambling: false,
        gamblingPot: 0
    };

    // Show game screen
    showGame();

    // Update UI
    updateOpponentName(botPlayer.username, botPlayer.eloRating);
    updateLives(currentUser.id, 6);
    updateLives(botPlayer.id, 6);
    updateRoundInfo();

    // ✅ INITIALIZE THROW HISTORY DISPLAY
    playerThrowHistory = [];
    opponentThrowHistory = [];
    updateThrowHistory();

    // Show gambling pot as 0
    const gamblingPotDisplay = document.getElementById('gamblingPotDisplay');
    if (gamblingPotDisplay) {
        gamblingPotDisplay.classList.add('hidden');
    }

    // First round: player starts (blind throw only)
    showInlineMessage('🤖 Ronde 1 - Eerste ronde! Jij moet blind gooien', 'info');
    showThrowButtons(true, false);  // ✅ FIX: mustBlind=true for first round

    debugLog('✅ GameEngine initialized in bot mode:', gameEngine.getState());
}

// Bot throw dice (simulates rolling)
function botThrowDice(isBlind) {
    const bot = botGame.botState;

    bot.throwCount++;
    bot.dice1 = Math.ceil(Math.random() * 6);
    bot.dice2 = Math.ceil(Math.random() * 6);
    bot.currentThrow = calculateBotThrowValue(bot.dice1, bot.dice2);
    bot.isBlind = isBlind;
    bot.isMexico = (bot.currentThrow === 1000);

    debugLog(`[Bot] Worp ${bot.throwCount}: ${bot.dice1}-${bot.dice2} = ${bot.currentThrow} (${isBlind ? 'BLIND' : 'OPEN'})`);

    // Update psychology
    updateBotPsychologyAfterThrow(bot.currentThrow);

    // Determine display value
    if (bot.isBlind) {
        bot.displayThrow = '???';
    } else {
        bot.displayThrow = bot.isMexico ? '🎉 Mexico!' : bot.currentThrow.toString();
    }

    // Track throw in pattern if voorgooier
    if (botGame.voorgooier === 'bot') {
        botGame.voorgooierPattern.push(isBlind);
    }

    // Add to internal bot history
    bot.throwHistory.push({
        dice1: bot.dice1,
        dice2: bot.dice2,
        value: bot.currentThrow,
        isBlind: isBlind
    });

    // ✅ ADD TO MULTIPLAYER THROW HISTORY (for UI display)
    const throwInfo = calculateThrowDisplay(bot.dice1, bot.dice2);
    opponentThrowHistory.push({
        displayValue: throwInfo.displayValue,
        isMexico: throwInfo.isMexico,
        isBlind: isBlind,
        wasBlind: isBlind,
        dice1: bot.dice1,
        dice2: bot.dice2
    });
    updateThrowHistory();
}

// Bot turn sequence
function executeBotTurn() {
    debugLog('🤖 Bot turn starting...');

    showInlineMessage('🤖 Bot denkt na...', 'info');

    // Thinking time (800-1500ms)
    const thinkTime = 800 + Math.random() * 700;

    setTimeout(() => {
        botTurnThrowSequence();
    }, thinkTime);
}

// Bot throw sequence (recursive until done)
function botTurnThrowSequence() {
    const bot = botGame.botState;

    // 🔍 DEBUG: Log entry state
    debugLog(`[botTurnThrowSequence] ENTRY: throwCount=${bot.throwCount}, maxThrows=${botGame.maxThrows}, voorgooier=${botGame.voorgooier}, isFirstRound=${botGame.isFirstRound}`);

    // First round: only 1 blind throw
    if (botGame.isFirstRound) {
        botThrowDice(true);  // Blind
        showOpponentDice('', '', false, true);  // Hidden for blind
        showInlineMessage('🤖 Bot gooide blind...', 'info');

        // Compare after short delay
        setTimeout(() => {
            compareBotRound();
        }, 1500);
        return;
    }

    // Check if bot reached max throws
    if (bot.throwCount >= botGame.maxThrows) {
        debugLog(`[Bot] Reached max throws (${botGame.maxThrows})`);

        // 🎯 Bot is voorgooier: show throw and enable PLAYER buttons
        if (botGame.voorgooier === 'bot') {
            showOpponentDice(bot.dice1, bot.dice2, bot.isMexico, false);
            showInlineMessage(`🤖 Bot houdt: ${bot.displayThrow} - Jouw beurt!`, 'info');
            showThrowButtons(false, false); // Enable open/blind throw for player
            return; // DON'T compare yet - wait for player response
        }

        // Bot is achterligger: compare immediately
        compareBotRound();
        return;
    }

    // Decide if should throw blind (pattern enforcement)
    let mustBlind = false;
    if (botGame.voorgooier === 'player' && bot.throwCount < botGame.voorgooierPattern.length) {
        mustBlind = botGame.voorgooierPattern[bot.throwCount];
        debugLog(`[Bot] Must follow pattern: ${mustBlind ? 'BLIND' : 'OPEN'}`);
    }
    debugLog(`[botTurnThrowSequence] mustBlind=${mustBlind} (voorgooier=${botGame.voorgooier}, throwCount=${bot.throwCount})`);

    // Check if should throw again (only after first throw)
    debugLog(`[botTurnThrowSequence] Checking shouldContinue: throwCount=${bot.throwCount}, mustBlind=${mustBlind}`);
    if (bot.throwCount > 0 && !mustBlind) {
        const shouldContinue = botShouldThrowAgain();
        if (!shouldContinue) {
            debugLog(`[Bot] Decision: KEEP at ${bot.currentThrow}`);
            // Set max throws if voorgooier
            if (botGame.voorgooier === 'bot') {
                botGame.maxThrows = bot.throwCount;
                debugLog(`[Bot] Voorgooier sets max throws: ${botGame.maxThrows}`);

                // 🎯 Bot is voorgooier: show throw and enable PLAYER buttons
                showOpponentDice(bot.dice1, bot.dice2, bot.isMexico, false);
                showInlineMessage(`🤖 Bot houdt: ${bot.displayThrow} - Jouw beurt!`, 'info');
                showThrowButtons(false, false); // Enable open/blind throw for player
                return; // DON'T compare yet - wait for player response
            }

            // Bot is achterligger: compare immediately
            compareBotRound();
            return;
        }
    }

    // Throw dice
    debugLog(`[botTurnThrowSequence] About to throw: mustBlind=${mustBlind}`);
    botThrowDice(mustBlind);

    // Show dice (or hide if blind)
    if (bot.isBlind) {
        showOpponentDice('', '', false, true);
        showInlineMessage(`🤖 Bot gooide blind...`, 'info');

        // If not last throw, reveal after delay
        if (bot.throwCount < botGame.maxThrows) {
            setTimeout(() => {
                bot.isBlind = false;
                bot.displayThrow = bot.isMexico ? '🎉 Mexico!' : bot.currentThrow.toString();
                showOpponentDice(bot.dice1, bot.dice2, bot.isMexico, false);
                showInlineMessage(`🤖 Bot onthult: ${bot.displayThrow}`, 'info');

                // ✅ UPDATE THROW HISTORY (mark as revealed)
                if (opponentThrowHistory.length > 0) {
                    opponentThrowHistory[opponentThrowHistory.length - 1].isBlind = false;
                    updateThrowHistory();
                }

                // Continue sequence
                setTimeout(() => {
                    botTurnThrowSequence();
                }, 1200);
            }, 1000);
        } else {
            // Last throw stays blind until comparison
            setTimeout(() => {
                botTurnThrowSequence();
            }, 1000);
        }
    } else {
        // Open throw
        showOpponentDice(bot.dice1, bot.dice2, bot.isMexico, false);
        showInlineMessage(`🤖 Bot gooide: ${bot.displayThrow}`, 'info');

        // Continue sequence after delay
        setTimeout(() => {
            botTurnThrowSequence();
        }, 1500);
    }
}

// Compare round results with bot
function compareBotRound() {
    const player = botGame.playerState;
    const bot = botGame.botState;

    debugLog(`[Bot] Comparing: Player ${player.currentThrow} vs Bot ${bot.currentThrow}`);

    // Reveal blind throws
    if (player.isBlind) {
        player.isBlind = false;
        player.displayThrow = player.isMexico ? '🎉 Mexico!' : player.currentThrow.toString();
        showDice(player.dice1, player.dice2, player.isMexico, false);

        // ✅ UPDATE THROW HISTORY
        if (playerThrowHistory.length > 0) {
            playerThrowHistory[playerThrowHistory.length - 1].isBlind = false;
            updateThrowHistory();
        }
    }

    if (bot.isBlind) {
        bot.isBlind = false;
        bot.displayThrow = bot.isMexico ? '🎉 Mexico!' : bot.currentThrow.toString();
        showOpponentDice(bot.dice1, bot.dice2, bot.isMexico, false);

        // ✅ UPDATE THROW HISTORY
        if (opponentThrowHistory.length > 0) {
            opponentThrowHistory[opponentThrowHistory.length - 1].isBlind = false;
            updateThrowHistory();
        }
    }

    showInlineMessage(`Vergelijken: Jij ${player.displayThrow} vs Bot ${bot.displayThrow}`, 'info');

    setTimeout(() => {
        let winner = null;
        let winnerId = null;
        let loserId = null;
        let resultMessage = '';

        if (player.currentThrow > bot.currentThrow) {
            winner = 'player';
            winnerId = currentUser.id;
            loserId = botGame.botPlayer.id;
            resultMessage = '🎉 Jij wint deze ronde!';
            player.lives = Math.max(0, player.lives);
            bot.lives--;
        } else if (bot.currentThrow > player.currentThrow) {
            winner = 'bot';
            winnerId = botGame.botPlayer.id;
            loserId = currentUser.id;
            resultMessage = '😔 Bot wint deze ronde';
            bot.lives = Math.max(0, bot.lives);
            player.lives--;
        } else {
            // Tie - overgooien
            resultMessage = '🤝 Gelijkspel! Overgooien (1 worp)';
            showInlineMessage(resultMessage, 'info');

            setTimeout(() => {
                startBotOvergooien();
            }, 2000);
            return;
        }

        // ✅ UPDATE LAST ROUND SUMMARY (like normal multiplayer)
        const isVoorgooier = (botGame.voorgooier === 'player');
        updateLastRoundSummary({
            voorgooierId: isVoorgooier ? currentUser.id : botGame.botPlayer.id,
            achterliggerId: isVoorgooier ? botGame.botPlayer.id : currentUser.id,
            voorgooierResult: (winnerId === (isVoorgooier ? currentUser.id : botGame.botPlayer.id)) ? 'won' : 'lost',
            achterliggerResult: (winnerId === (isVoorgooier ? botGame.botPlayer.id : currentUser.id)) ? 'won' : 'lost',
            winnerId: winnerId,
            loserId: loserId,
            livesLeft: winner === 'player' ? player.lives : bot.lives
        });

        // Update lives display
        updateLives(currentUser.id, player.lives);
        updateLives(botGame.botPlayer.id, bot.lives);

        // Update psychology
        updateBotPsychologyAfterRound(winner === 'bot');

        showInlineMessage(resultMessage, winner === 'player' ? 'success' : 'error');

        // Check for game over
        if (player.lives <= 0 || bot.lives <= 0) {
            setTimeout(() => {
                endBotGame(player.lives > bot.lives);
            }, 2000);
        } else {
            // Next round
            setTimeout(() => {
                startBotNextRound();
            }, 2500);
        }
    }, 1500);
}

// Start next round with bot
function startBotNextRound() {
    botGame.roundNumber++;
    botGame.isFirstRound = false;

    // Alternate voorgooier
    botGame.voorgooier = (botGame.voorgooier === 'player') ? 'bot' : 'player';
    botGame.currentTurn = botGame.voorgooier;
    botGame.voorgooierPattern = [];
    botGame.maxThrows = 3;
    botGame.aiPersonality = null;  // New personality each round

    // Reset throw states
    botGame.playerState.currentThrow = null;
    botGame.playerState.displayThrow = null;
    botGame.playerState.throwCount = 0;
    botGame.playerState.isBlind = false;
    botGame.playerState.dice1 = 1;
    botGame.playerState.dice2 = 1;
    botGame.playerState.throwHistory = [];

    botGame.botState.currentThrow = null;
    botGame.botState.displayThrow = null;
    botGame.botState.throwCount = 0;
    botGame.botState.isBlind = false;
    botGame.botState.dice1 = 1;
    botGame.botState.dice2 = 1;
    botGame.botState.throwHistory = [];

    // ✅ CLEAR MULTIPLAYER THROW HISTORY
    playerThrowHistory = [];
    opponentThrowHistory = [];
    updateThrowHistory();

    // Update UI
    showDice('', '', false, false);
    showOpponentDice('', '', false, false);
    updateRoundInfo();

    currentGame.roundNumber = botGame.roundNumber;
    currentGame.voorgooier = botGame.voorgooier === 'player' ? currentUser.id : botGame.botPlayer.id;

    showToast(`Ronde ${botGame.roundNumber} begint!`, 'info', 2000);

    if (botGame.voorgooier === 'player') {
        showInlineMessage(`🎲 Ronde ${botGame.roundNumber} - Jij bent voorgooier!`, 'info');
        showThrowButtons(false, false);
    } else {
        showInlineMessage(`🎲 Ronde ${botGame.roundNumber} - Bot is voorgooier...`, 'info');
        showWaitingMessage('Bot gooit...');
        // 🔒 CRITICAL: Hide ALL player buttons when bot is voorgooier
        hideAllActionButtons();
        setTimeout(() => {
            executeBotTurn();
        }, 1000);
    }
}

// Overgooien with bot
function startBotOvergooien() {
    debugLog('[Bot] Starting overgooien (1 throw each)');

    botGame.maxThrows = 1;

    // Reset throw states
    botGame.playerState.currentThrow = null;
    botGame.playerState.displayThrow = null;
    botGame.playerState.throwCount = 0;
    botGame.playerState.isBlind = false;

    botGame.botState.currentThrow = null;
    botGame.botState.displayThrow = null;
    botGame.botState.throwCount = 0;
    botGame.botState.isBlind = false;

    // ✅ CLEAR THROW HISTORY FOR OVERGOOIEN
    playerThrowHistory = [];
    opponentThrowHistory = [];
    updateThrowHistory();

    // Show UI
    showDice('', '', false, false);
    showOpponentDice('', '', false, false);

    // Voorgooier goes first
    if (botGame.voorgooier === 'player') {
        showInlineMessage('Overgooien! Jouw beurt (1 worp)', 'info');
        showThrowButtons(false, false);
    } else {
        showInlineMessage('Overgooien! Bot gooit eerst (1 worp)...', 'info');
        setTimeout(() => {
            executeBotTurn();
        }, 1000);
    }
}

// End bot game
function endBotGame(playerWon) {
    const title = playerWon ? '🏆 Je hebt gewonnen!' : '😔 Game Over';
    const message = playerWon
        ? `Je versloeg ${botGame.botPlayer.username}! 🎉`
        : `${botGame.botPlayer.username} heeft gewonnen.`;

    showInlineMessage(title, playerWon ? 'success' : 'error');
    showToast(`${title}\n${message}`, playerWon ? 'success' : 'error', 5000);

    // Show game result screen
    const gameResult = document.getElementById('gameResult');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');

    if (gameResult && resultTitle && resultMessage) {
        resultTitle.textContent = title;
        resultMessage.textContent = message + '\n(Bot games tellen niet mee voor statistieken)';
        gameResult.classList.remove('hidden');
    }

    document.getElementById('returnLobbyBtn')?.classList.remove('hidden');

    // Clear bot game state
    botGame.active = false;
}

// Override throwDice to handle bot games
const originalThrowDice = throwDice;
window.throwDice = function(isBlind) {
    if (botGame.active) {
        // Bot game logic
        const player = botGame.playerState;

        player.throwCount++;
        player.dice1 = Math.ceil(Math.random() * 6);
        player.dice2 = Math.ceil(Math.random() * 6);
        player.currentThrow = calculateBotThrowValue(player.dice1, player.dice2);
        player.isBlind = isBlind;
        player.isMexico = (player.currentThrow === 1000);

        if (player.isBlind) {
            player.displayThrow = '???';
        } else {
            player.displayThrow = player.isMexico ? '🎉 Mexico!' : player.currentThrow.toString();
        }

        // Track in pattern if voorgooier
        if (botGame.voorgooier === 'player') {
            botGame.voorgooierPattern.push(isBlind);
        }

        // Add to internal bot history
        player.throwHistory.push({
            dice1: player.dice1,
            dice2: player.dice2,
            value: player.currentThrow,
            isBlind: isBlind
        });

        // ✅ ADD TO MULTIPLAYER THROW HISTORY (for UI display)
        const throwInfo = calculateThrowDisplay(player.dice1, player.dice2);
        playerThrowHistory.push({
            displayValue: throwInfo.displayValue,
            isMexico: throwInfo.isMexico,
            isBlind: isBlind,
            wasBlind: isBlind
        });
        updateThrowHistory();

        // ✅ UPDATE THROW COUNTER
        updateThrowCounter(player.throwCount, botGame.maxThrows);

        debugLog(`[Player] Worp ${player.throwCount}: ${player.dice1}-${player.dice2} = ${player.currentThrow} (${isBlind ? 'BLIND' : 'OPEN'})`);

        // Show dice
        if (player.isBlind) {
            showDice('', '', false, true);
            showInlineMessage('🙈 Je gooide blind', 'info');
            // Show reveal button
            setTimeout(() => {
                const revealBtn = document.getElementById('revealBtn');
                if (revealBtn) {
                    revealBtn.classList.remove('hidden');
                    revealBtn.disabled = false;
                }
            }, 500);
        } else {
            showDice(player.dice1, player.dice2, player.isMexico, false);
            showInlineMessage(`Je gooide: ${player.displayThrow}`, player.isMexico ? 'success' : 'info');

            // Show action buttons
            setTimeout(() => {
                if (player.throwCount < botGame.maxThrows) {
                    showThrowButtons(false, false);
                    const keepBtn = document.getElementById('keepBtn');
                    if (keepBtn) {
                        keepBtn.classList.remove('hidden');
                        keepBtn.disabled = false;
                    }
                } else {
                    // Auto-keep at max throws
                    setTimeout(() => {
                        window.keepThrow();
                    }, 1000);
                }
            }, 500);
        }

        return;
    }

    // Normal multiplayer logic
    originalThrowDice.call(this, isBlind);
};

// Override keepThrow for bot games
const originalKeepThrow = keepThrow;
window.keepThrow = function() {
    if (botGame.active) {
        const player = botGame.playerState;

        debugLog(`[Player] KEEP at ${player.currentThrow} (${player.throwCount} throws)`);

        // Set max throws if voorgooier
        if (botGame.voorgooier === 'player') {
            botGame.maxThrows = player.throwCount;
            debugLog(`[Player] Voorgooier sets max throws: ${botGame.maxThrows}`);
        }

        hideAllActionButtons();
        showWaitingMessage('Bot is aan de beurt...');

        // Bot's turn
        setTimeout(() => {
            executeBotTurn();
        }, 1000);

        return;
    }

    // Normal multiplayer logic
    originalKeepThrow.call(this);
};

// Override revealDice for bot games
const originalRevealDice = revealDice;
window.revealDice = function() {
    if (botGame.active) {
        const player = botGame.playerState;

        player.isBlind = false;
        player.displayThrow = player.isMexico ? '🎉 Mexico!' : player.currentThrow.toString();

        showDice(player.dice1, player.dice2, player.isMexico, false);
        showInlineMessage(`Je onthult: ${player.displayThrow}`, player.isMexico ? 'success' : 'info');

        // ✅ UPDATE THROW HISTORY (mark as revealed)
        if (playerThrowHistory.length > 0) {
            playerThrowHistory[playerThrowHistory.length - 1].isBlind = false;
            updateThrowHistory();
        }

        debugLog(`[Player] REVEAL: ${player.displayThrow}`);

        // First round: auto-keep after reveal
        if (botGame.isFirstRound) {
            hideAllActionButtons();
            setTimeout(() => {
                window.keepThrow();
            }, 1200);
        } else {
            // Show action buttons
            setTimeout(() => {
                if (player.throwCount < botGame.maxThrows) {
                    showThrowButtons(false, false);
                    const keepBtn = document.getElementById('keepBtn');
                    if (keepBtn) {
                        keepBtn.classList.remove('hidden');
                        keepBtn.disabled = false;
                    }
                } else {
                    // Auto-keep at max throws
                    setTimeout(() => {
                        window.keepThrow();
                    }, 1000);
                }
            }, 500);
        }

        return;
    }

    // Normal multiplayer logic
    originalRevealDice.call(this);
};

// Bot event listeners
document.addEventListener('DOMContentLoaded', () => {
    const playVsBotBtn = document.getElementById('playVsBotBtn');
    if (playVsBotBtn) {
        playVsBotBtn.addEventListener('click', startBotGame);
    }
});

// ===================================================================
// SPELREGELS PARCHMENT MODAL
// ===================================================================

// Spelregels link handler - GLOBAL function for inline onclick (most reliable)
window.handleSpelregelsClick = function(event) {
    console.log('📜 Spelregels clicked!');

    const gameScreen = document.getElementById('gameScreen');
    const spelregelsModal = document.getElementById('spelregelsModal');
    const isGameActive = gameScreen && !gameScreen.classList.contains('hidden');

    console.log('📜 Game active?', isGameActive);

    // If game is active, show modal instead of navigating
    if (isGameActive && spelregelsModal) {
        event.preventDefault();
        console.log('📜 Opening Spelregels modal during active game');
        spelregelsModal.classList.remove('hidden');
        return false; // Prevent navigation
    }

    // Otherwise, allow normal navigation to spelregels.html
    console.log('📜 Allowing navigation to spelregels.html');
    return true;
};

// Close button and backdrop handlers
document.addEventListener('DOMContentLoaded', () => {
    const spelregelsModal = document.getElementById('spelregelsModal');
    const closeModalBtn = document.getElementById('closeSpelregelsModal');

    if (closeModalBtn && spelregelsModal) {
        // Close button handler
        closeModalBtn.addEventListener('click', () => {
            console.log('📜 Closing Spelregels modal (close button)');
            spelregelsModal.classList.add('hidden');
        });

        // Close on backdrop click
        spelregelsModal.addEventListener('click', (e) => {
            if (e.target === spelregelsModal) {
                console.log('📜 Closing Spelregels modal (backdrop click)');
                spelregelsModal.classList.add('hidden');
            }
        });

        console.log('✅ Spelregels modal close handlers registered');
    }

    // ESC key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && spelregelsModal && !spelregelsModal.classList.contains('hidden')) {
            console.log('📜 Closing Spelregels modal (ESC key)');
            spelregelsModal.classList.add('hidden');
        }
    });
});

console.log('✅ Spelregels parchment modal handler registered globally');

// ============================================
// CONFETTI EFFECT
// ============================================

/**
 * Fire Mexican-themed confetti (green, white, red)
 * @param {string} type - 'mexico' for full effect, 'small' for subtle effect
 */
function fireMexicoConfetti(type = 'mexico') {
    if (typeof confetti === 'undefined') {
        console.warn('⚠️ Confetti library not loaded');
        return;
    }

    const mexicanColors = ['#0D5E3A', '#FFFFFF', '#8B0000']; // Green, White, Red (Mexican flag)

    if (type === 'mexico') {
        // Full Mexico confetti - celebrate!
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            // Fire from left
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: mexicanColors
            });

            // Fire from right
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: mexicanColors
            });
        }, 250);
    } else if (type === 'small') {
        // Small confetti burst
        confetti({
            particleCount: 30,
            spread: 70,
            origin: { y: 0.6 },
            colors: mexicanColors,
            zIndex: 9999
        });
    }
}

console.log('🎲 Multiplayer Mexico Client - CORRECTE SPELREGELS');
console.log('✅ Client initialized');
