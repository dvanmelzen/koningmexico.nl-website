#!/usr/bin/env node

// ============================================
// MEXICO CLI - Command Line Interface
// ============================================
// Play Mexico dice game from your terminal!

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// API configuration
const API_URL = process.env.MEXICO_API_URL || 'http://localhost:3002';
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.mexico-cli.json');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Helper to make colored text
function color(text, colorCode) {
    return `${colorCode}${text}${colors.reset}`;
}

// Load/save configuration
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (err) {
        // Ignore errors
    }
    return {};
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error(color('⚠️  Could not save config', colors.yellow));
    }
}

// HTTP request helper
function apiRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL + endpoint);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            method,
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = client.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(json.error || `HTTP ${res.statusCode}`));
                    }
                } catch (err) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Display game state
function displayState(state) {
    console.log('');
    console.log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.cyan));
    console.log(color('📊  GAME STATUS', colors.bright));
    console.log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.cyan));
    console.log(color(`Round:        ${state.roundNumber}`, colors.white));
    console.log(color(`Voorgooier:   ${state.voorgooierName}`, colors.yellow));
    console.log('');
    console.log(color(`YOU (${state.player.username})`, colors.green));
    console.log(`  ❤️  Lives:     ${state.player.lives}`);
    console.log(`  🎲 Throw:      ${state.player.displayThrow || '-'}`);
    console.log(`  🔢 Count:      ${state.player.throwCount}/${state.maxThrows}`);
    if (state.player.isBlind) {
        console.log(color('  🔒 BLIND!', colors.yellow));
    }
    console.log('');
    console.log(color(`BOT (${state.opponent.username})`, colors.red));
    console.log(`  ❤️  Lives:     ${state.opponent.lives}`);
    console.log(`  🎲 Throw:      ${state.opponent.displayThrow || '-'}`);
    console.log('');

    if (state.isGameOver) {
        console.log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.yellow));
        if (state.gameResult) {
            if (state.gameResult.winner === state.player.username) {
                console.log(color('🎉  YOU WIN!', colors.green + colors.bright));
            } else {
                console.log(color('😔  BOT WINS!', colors.red));
            }
        }
        console.log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.yellow));
    } else if (state.isPlayerTurn) {
        console.log(color('⏳  YOUR TURN', colors.green));
    } else {
        console.log(color('⏳  BOT\'S TURN (wait...)', colors.red));
    }
    console.log('');
}

// Commands
const commands = {
    async start(args) {
        const name = args[0] || 'Player';

        console.log(color('🎲  Starting new Mexico game...', colors.bright));

        try {
            const result = await apiRequest('POST', '/api/game/create', {
                playerName: name,
                playerId: `cli-${Date.now()}`
            });

            const config = loadConfig();
            config.currentGame = result.gameId;
            config.playerName = name;
            saveConfig(config);

            console.log(color('✅  Game created!', colors.green));
            console.log(color(`Game ID: ${result.gameId}`, colors.dim));
            console.log('');
            console.log(color(result.message, colors.yellow));
            console.log('');
            displayState(result.state);

            console.log(color('💡 Commands:', colors.cyan));
            console.log('  mexico throw [--blind]   - Throw dice');
            console.log('  mexico keep              - Keep current throw');
            console.log('  mexico reveal            - Reveal blind throw');
            console.log('  mexico status            - Show game status');
            console.log('');

        } catch (err) {
            console.error(color(`❌  Error: ${err.message}`, colors.red));
            process.exit(1);
        }
    },

    async throw(args) {
        const config = loadConfig();
        if (!config.currentGame) {
            console.error(color('❌  No active game. Run: mexico start', colors.red));
            process.exit(1);
        }

        const isBlind = args.includes('--blind') || args.includes('-b');

        console.log(color(`🎲  Throwing ${isBlind ? 'BLIND' : 'OPEN'}...`, colors.bright));

        try {
            const result = await apiRequest('POST', `/api/game/${config.currentGame}/throw`, {
                isBlind
            });

            console.log('');
            if (result.isBlind) {
                console.log(color('🙈  You threw blind!', colors.yellow));
                console.log(color('🔒  Hidden dice', colors.dim));
            } else {
                console.log(color(`🎲  You threw: ${result.displayValue}`, colors.green));
                console.log(color(`    Dice: ${result.dice1}-${result.dice2}`, colors.dim));
            }
            console.log('');

            if (result.isMexico) {
                console.log(color('🎉🎉🎉  MEXICO!!!  🎉🎉🎉', colors.green + colors.bright));
            }

            console.log(color('Options:', colors.cyan));
            if (result.canKeep) console.log('  ✅ keep    - Keep this throw');
            if (result.canThrowAgain) console.log('  🔁 throw   - Throw again');
            if (result.isBlind) console.log('  👁️  reveal  - Reveal blind throw');
            console.log('');

        } catch (err) {
            console.error(color(`❌  Error: ${err.message}`, colors.red));
            process.exit(1);
        }
    },

    async keep(args) {
        const config = loadConfig();
        if (!config.currentGame) {
            console.error(color('❌  No active game. Run: mexico start', colors.red));
            process.exit(1);
        }

        console.log(color('✅  Keeping throw...', colors.bright));

        try {
            const result = await apiRequest('POST', `/api/game/${config.currentGame}/keep`);

            console.log('');
            console.log(color('✓ Throw kept!', colors.green));
            console.log(color('🤖 Bot is thinking...', colors.cyan));
            console.log('');

            // Wait a moment for effect
            await new Promise(resolve => setTimeout(resolve, 500));

            displayState(result.state);

            if (result.state.isGameOver) {
                // Clear current game
                config.currentGame = null;
                saveConfig(config);
            }

        } catch (err) {
            console.error(color(`❌  Error: ${err.message}`, colors.red));
            process.exit(1);
        }
    },

    async reveal(args) {
        const config = loadConfig();
        if (!config.currentGame) {
            console.error(color('❌  No active game. Run: mexico start', colors.red));
            process.exit(1);
        }

        console.log(color('👁️  Revealing blind throw...', colors.bright));

        try {
            const result = await apiRequest('POST', `/api/game/${config.currentGame}/reveal`);

            console.log('');
            console.log(color(`👁️  Revealed: ${result.displayValue}`, colors.green));
            console.log(color(`    Dice: ${result.dice1}-${result.dice2}`, colors.dim));
            console.log('');

            if (result.value === 1000) {
                console.log(color('🎉🎉🎉  MEXICO!!!  🎉🎉🎉', colors.green + colors.bright));
            }

        } catch (err) {
            console.error(color(`❌  Error: ${err.message}`, colors.red));
            process.exit(1);
        }
    },

    async status(args) {
        const config = loadConfig();
        if (!config.currentGame) {
            console.error(color('❌  No active game. Run: mexico start', colors.red));
            process.exit(1);
        }

        try {
            const state = await apiRequest('GET', `/api/game/${config.currentGame}/state`);
            displayState(state);

        } catch (err) {
            console.error(color(`❌  Error: ${err.message}`, colors.red));
            process.exit(1);
        }
    },

    async games(args) {
        try {
            const result = await apiRequest('GET', '/api/games');

            console.log('');
            console.log(color('🎮  ACTIVE GAMES', colors.bright));
            console.log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.cyan));

            if (result.games.length === 0) {
                console.log(color('No active games', colors.dim));
            } else {
                result.games.forEach(game => {
                    console.log(`${game.gameId}`);
                    console.log(`  Player: ${game.playerName} (❤️  ${game.playerLives})`);
                    console.log(`  Round: ${game.roundNumber}`);
                    console.log(`  Status: ${game.isGameOver ? '✓ Finished' : '⏳ Active'}`);
                    console.log('');
                });
            }
            console.log(color(`Total: ${result.count} game(s)`, colors.dim));
            console.log('');

        } catch (err) {
            console.error(color(`❌  Error: ${err.message}`, colors.red));
            process.exit(1);
        }
    },

    async health(args) {
        try {
            const result = await apiRequest('GET', '/api/health');

            console.log('');
            console.log(color('💚  API Health Check', colors.bright));
            console.log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.green));
            console.log(`Status:       ${result.status}`);
            console.log(`Service:      ${result.service}`);
            console.log(`Version:      ${result.version}`);
            console.log(`Active Games: ${result.activeGames}`);
            console.log('');

        } catch (err) {
            console.error(color(`❌  API is down: ${err.message}`, colors.red));
            console.error(color(`Make sure server is running: npm run game-api`, colors.yellow));
            process.exit(1);
        }
    },

    help() {
        console.log('');
        console.log(color('🎲  MEXICO CLI - Play Mexico from your terminal!', colors.bright));
        console.log('');
        console.log(color('Commands:', colors.cyan));
        console.log('  mexico start [name]      - Start new game');
        console.log('  mexico throw [--blind]   - Throw dice (use --blind for blind throw)');
        console.log('  mexico keep              - Keep current throw');
        console.log('  mexico reveal            - Reveal blind throw');
        console.log('  mexico status            - Show current game status');
        console.log('  mexico games             - List all active games');
        console.log('  mexico health            - Check API server status');
        console.log('  mexico help              - Show this help');
        console.log('');
        console.log(color('Examples:', colors.yellow));
        console.log('  mexico start Daniel');
        console.log('  mexico throw --blind');
        console.log('  mexico reveal');
        console.log('  mexico keep');
        console.log('');
        console.log(color('Config file:', colors.dim));
        console.log(`  ${CONFIG_FILE}`);
        console.log('');
    }
};

// Main
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const commandArgs = args.slice(1);

    if (command === 'help' || command === '--help' || command === '-h') {
        commands.help();
        return;
    }

    if (!commands[command]) {
        console.error(color(`❌  Unknown command: ${command}`, colors.red));
        console.log(color('Run "mexico help" for available commands', colors.yellow));
        process.exit(1);
    }

    try {
        await commands[command](commandArgs);
    } catch (err) {
        console.error(color(`❌  Fatal error: ${err.message}`, colors.red));
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(err => {
        console.error(color(`❌  Fatal error: ${err.message}`, colors.red));
        process.exit(1);
    });
}

module.exports = { commands, apiRequest };
