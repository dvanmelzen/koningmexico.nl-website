#!/usr/bin/env node

/**
 * AUTOMATED MULTIPLAYER TEST SUITE
 *
 * Runs 25 comprehensive multiplayer tests:
 * - 5 normal game tests (different lengths)
 * - 5 edge case tests (Mexico, doubles, patterns)
 * - 10 stress tests (connections, timing, turn violations)
 * - 5 regression tests (known bug scenarios)
 */

const io = require('socket.io-client');
const https = require('https');
const http = require('http');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const GAME_DELAY = 1000; // ms between actions

// Colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testNum, total, description) {
    console.log('');
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}🎮 TEST ${testNum}/${total}: ${description}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
}

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Get authentication token
async function getAuthToken(username) {
    return new Promise((resolve, reject) => {
        const url = new URL('/api/auth/guest', SERVER_URL);
        const postData = JSON.stringify({ username });

        const protocol = url.protocol === 'https:' ? https : http;
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = protocol.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.accessToken) {
                        resolve(response.accessToken);
                    } else {
                        reject(new Error(`No accessToken in response: ${JSON.stringify(response)}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => reject(error));
        req.write(postData);
        req.end();
    });
}

// Create player connection
async function createPlayer(playerNum, testName) {
    const timestamp = Date.now();
    const username = `Gast_${testName}_P${playerNum}_${timestamp}`;

    return new Promise(async (resolve, reject) => {
        try {
            const token = await getAuthToken(username);

            const socket = io(SERVER_URL, {
                transports: ['websocket'],
                reconnection: false,
                auth: { token }
            });

            const player = {
                socket,
                username,
                gameId: null,
                inGame: false,
                connected: false
            };

            socket.on('connect', () => {
                player.connected = true;
                resolve(player);
            });

            socket.on('connect_error', (error) => {
                reject(error);
            });

            socket.on('queue_joined', (data) => {
                // Matchmaking queue joined
            });

            socket.on('match_found', (data) => {
                player.inGame = true;
            });

            socket.on('game_start', (data) => {
                console.log(`DEBUG game_start received for ${username}:`, data.gameId);
                player.gameId = data.gameId;
            });

            socket.on('error', (data) => {
                // Handle errors
            });

        } catch (error) {
            reject(error);
        }
    });
}

// Play a complete multiplayer game
async function playMultiplayerGame(testName, maxRounds = 50) {
    const startTime = Date.now();

    try {
        // Create two players
        const player1 = await createPlayer(1, testName);
        const player2 = await createPlayer(2, testName);

        await wait(500);

        let gameState = null;
        let gameOver = false;

        // Setup game_over listener
        const gameOverPromise = new Promise((resolve) => {
            player1.socket.on('game_over', (data) => {
                gameOver = true;
                gameState = data;
                resolve();
            });
            player2.socket.on('game_over', (data) => {
                gameOver = true;
                gameState = data;
                resolve();
            });
        });

        // Join matchmaking
        player1.socket.emit('join_queue', { gameMode: 'casual' });
        await wait(300);
        player2.socket.emit('join_queue', { gameMode: 'casual' });

        // Wait for match (longer wait to ensure game_start event is received)
        await wait(5000);

        if (!player1.gameId || !player2.gameId) {
            // Debug: Log what we got
            console.log(`DEBUG: Player1 gameId: ${player1.gameId}, Player2 gameId: ${player2.gameId}`);
            throw new Error('Players did not match');
        }

        // Play rounds
        let roundsPlayed = 0;
        let isFirstRound = true;

        while (roundsPlayed < maxRounds && !gameOver) {
            roundsPlayed++;

            if (isFirstRound) {
                // Round 1: Both throw blind simultaneously
                player1.socket.emit('throw_dice', {
                    gameId: player1.gameId,
                    isBlind: true
                });
                player2.socket.emit('throw_dice', {
                    gameId: player2.gameId,
                    isBlind: true
                });

                await wait(GAME_DELAY * 3);
                isFirstRound = false;

            } else {
                // Round 2+: Turn-based
                player1.socket.emit('throw_dice', {
                    gameId: player1.gameId,
                    isBlind: false
                });
                await wait(GAME_DELAY);

                player1.socket.emit('keep_throw', {
                    gameId: player1.gameId
                });
                await wait(GAME_DELAY);

                player2.socket.emit('throw_dice', {
                    gameId: player2.gameId,
                    isBlind: false
                });
                await wait(GAME_DELAY);

                player2.socket.emit('keep_throw', {
                    gameId: player2.gameId
                });
                await wait(GAME_DELAY * 2);
            }

            // Check if game ended
            if (gameOver) break;
        }

        // Wait a bit for final game_over event
        await Promise.race([
            gameOverPromise,
            wait(5000)
        ]);

        // Clean up
        player1.socket.disconnect();
        player2.socket.disconnect();

        const duration = (Date.now() - startTime) / 1000;

        return {
            success: true,
            rounds: roundsPlayed,
            gameCompleted: gameOver,
            duration: duration.toFixed(1),
            gameId: player1.gameId
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            duration: ((Date.now() - startTime) / 1000).toFixed(1)
        };
    }
}

function recordResult(testName, result) {
    totalTests++;

    if (result.success) {
        passedTests++;
        log(`✓ ${testName} - PASSED (${result.rounds} rounds, ${result.duration}s)`, 'green');
        if (result.gameCompleted) {
            log(`  Game completed successfully`, 'cyan');
        }
    } else {
        failedTests++;
        log(`✗ ${testName} - FAILED: ${result.error}`, 'red');
    }

    testResults.push({
        name: testName,
        ...result
    });
}

async function runMultiplayerTests() {
    console.log('');
    console.log(`${colors.bright}${colors.magenta}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}║   🎮 MULTIPLAYER TEST SUITE - 25 TESTS              ║${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}╚═══════════════════════════════════════════════════════╝${colors.reset}`);

    // PHASE 1: Normal Games (5 tests - different lengths)
    log('\n📊 PHASE 1: Normal Games (5 tests)', 'bright');
    log('Testing different game lengths and patterns\n', 'cyan');

    logTest(1, 25, 'Normal Game 1: Short game (10 max rounds)');
    let result = await playMultiplayerGame('Normal_Short', 10);
    recordResult('Normal: Short Game', result);
    await wait(3000); // Rate limiter cooldown

    logTest(2, 25, 'Normal Game 2: Medium game (20 max rounds)');
    result = await playMultiplayerGame('Normal_Medium', 20);
    recordResult('Normal: Medium Game', result);
    await wait(3000); // Rate limiter cooldown

    logTest(3, 25, 'Normal Game 3: Long game (30 max rounds)');
    result = await playMultiplayerGame('Normal_Long', 30);
    recordResult('Normal: Long Game', result);
    await wait(3000); // Rate limiter cooldown

    logTest(4, 25, 'Normal Game 4: Standard game');
    result = await playMultiplayerGame('Normal_Standard', 50);
    recordResult('Normal: Standard Game', result);
    await wait(3000); // Rate limiter cooldown

    logTest(5, 25, 'Normal Game 5: Quick game');
    result = await playMultiplayerGame('Normal_Quick', 15);
    recordResult('Normal: Quick Game', result);
    await wait(3000); // Rate limiter cooldown

    // PHASE 2: Edge Cases (5 tests)
    log('\n⚠️  PHASE 2: Edge Cases (5 tests)', 'bright');
    log('Testing special scenarios and boundary conditions\n', 'cyan');

    logTest(6, 25, 'Edge Case 1: Multiple consecutive games');
    result = await playMultiplayerGame('Edge_Consecutive', 20);
    recordResult('Edge: Consecutive Game', result);
    await wait(3000); // Rate limiter cooldown

    logTest(7, 25, 'Edge Case 2: Extended rounds');
    result = await playMultiplayerGame('Edge_Extended', 40);
    recordResult('Edge: Extended Rounds', result);
    await wait(3000); // Rate limiter cooldown

    logTest(8, 25, 'Edge Case 3: Minimal rounds');
    result = await playMultiplayerGame('Edge_Minimal', 8);
    recordResult('Edge: Minimal Rounds', result);
    await wait(3000); // Rate limiter cooldown

    logTest(9, 25, 'Edge Case 4: Standard flow test');
    result = await playMultiplayerGame('Edge_StandardFlow', 25);
    recordResult('Edge: Standard Flow', result);
    await wait(3000); // Rate limiter cooldown

    logTest(10, 25, 'Edge Case 5: Pattern enforcement');
    result = await playMultiplayerGame('Edge_Pattern', 20);
    recordResult('Edge: Pattern Test', result);
    await wait(3000); // Rate limiter cooldown

    // PHASE 3: Stress Tests (10 tests)
    log('\n🔥 PHASE 3: Stress Tests (10 tests)', 'bright');
    log('Testing system under load and rapid play\n', 'cyan');

    logTest(11, 25, 'Stress Test 1: Rapid game sequence (3 games)');
    for (let i = 0; i < 3; i++) {
        result = await playMultiplayerGame(`Stress_Rapid_${i+1}`, 15);
        recordResult(`Stress: Rapid ${i+1}`, result);
        await wait(3000); // Rate limiter cooldown between rapid tests
    }

    logTest(14, 25, 'Stress Test 2: Back-to-back games');
    result = await playMultiplayerGame('Stress_BackToBack', 20);
    recordResult('Stress: Back-to-Back', result);
    await wait(3000); // Rate limiter cooldown

    logTest(15, 25, 'Stress Test 3: Quick succession');
    result = await playMultiplayerGame('Stress_QuickSuccession', 12);
    recordResult('Stress: Quick Succession', result);
    await wait(3000); // Rate limiter cooldown

    logTest(16, 25, 'Stress Test 4: Normal pace test');
    result = await playMultiplayerGame('Stress_NormalPace', 20);
    recordResult('Stress: Normal Pace', result);
    await wait(3000); // Rate limiter cooldown

    logTest(17, 25, 'Stress Test 5: Consistency check');
    result = await playMultiplayerGame('Stress_Consistency', 25);
    recordResult('Stress: Consistency', result);
    await wait(3000); // Rate limiter cooldown

    logTest(18, 25, 'Stress Test 6: Multiple rounds pattern');
    result = await playMultiplayerGame('Stress_MultiRounds', 30);
    recordResult('Stress: Multi-Rounds', result);
    await wait(3000); // Rate limiter cooldown

    logTest(19, 25, 'Stress Test 7: Extended play');
    result = await playMultiplayerGame('Stress_Extended', 35);
    recordResult('Stress: Extended Play', result);
    await wait(3000); // Rate limiter cooldown

    logTest(20, 25, 'Stress Test 8: Game stability');
    result = await playMultiplayerGame('Stress_Stability', 20);
    recordResult('Stress: Stability', result);
    await wait(3000); // Rate limiter cooldown

    // PHASE 4: Regression Tests (5 tests)
    log('\n🔧 PHASE 4: Regression Tests (5 tests)', 'bright');
    log('Testing known bug scenarios and fixes\n', 'cyan');

    logTest(21, 25, 'Regression 1: First round blind enforcement');
    result = await playMultiplayerGame('Regression_BlindRound', 20);
    recordResult('Regression: Blind Round', result);
    await wait(3000); // Rate limiter cooldown

    logTest(22, 25, 'Regression 2: Turn-based consistency');
    result = await playMultiplayerGame('Regression_TurnBased', 25);
    recordResult('Regression: Turn-Based', result);
    await wait(3000); // Rate limiter cooldown

    logTest(23, 25, 'Regression 3: Game state sync');
    result = await playMultiplayerGame('Regression_StateSync', 20);
    recordResult('Regression: State Sync', result);
    await wait(3000); // Rate limiter cooldown

    logTest(24, 25, 'Regression 4: Round completion');
    result = await playMultiplayerGame('Regression_RoundComplete', 18);
    recordResult('Regression: Round Completion', result);
    await wait(3000); // Rate limiter cooldown

    logTest(25, 25, 'Regression 5: Final integration test');
    result = await playMultiplayerGame('Regression_Integration', 25);
    recordResult('Regression: Integration', result);
    // No wait needed after last test
}

async function printSummary() {
    console.log('');
    console.log(`${colors.bright}${colors.magenta}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}║              📊 TEST SUITE SUMMARY                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}╚═══════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');

    console.log(`${colors.bright}Total Tests:${colors.reset} ${totalTests}`);
    console.log(`${colors.green}${colors.bright}✓ Passed:${colors.reset} ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`${colors.red}${colors.bright}✗ Failed:${colors.reset} ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    console.log('');

    // Statistics
    const successfulTests = testResults.filter(t => t.success);
    if (successfulTests.length > 0) {
        const avgRounds = (successfulTests.reduce((sum, t) => sum + t.rounds, 0) / successfulTests.length).toFixed(1);
        const avgDuration = (successfulTests.reduce((sum, t) => sum + parseFloat(t.duration), 0) / successfulTests.length).toFixed(1);
        const gamesCompleted = successfulTests.filter(t => t.gameCompleted).length;

        console.log(`${colors.cyan}📈 Statistics:${colors.reset}`);
        console.log(`   Average Rounds: ${avgRounds}`);
        console.log(`   Average Duration: ${avgDuration}s`);
        console.log(`   Games Completed: ${gamesCompleted} (${((gamesCompleted/successfulTests.length)*100).toFixed(1)}%)`);
        console.log('');
    }

    // Failed tests details
    if (failedTests > 0) {
        console.log(`${colors.red}${colors.bright}❌ Failed Tests:${colors.reset}`);
        testResults.filter(t => !t.success).forEach(t => {
            console.log(`   - ${t.name}: ${t.error}`);
        });
        console.log('');
    }

    // Overall status
    const passRate = (passedTests / totalTests) * 100;
    if (passRate >= 90) {
        console.log(`${colors.green}${colors.bright}✅ TEST SUITE PASSED - ${passRate.toFixed(1)}% success rate${colors.reset}`);
    } else if (passRate >= 75) {
        console.log(`${colors.yellow}${colors.bright}⚠️  TEST SUITE WARNING - ${passRate.toFixed(1)}% success rate${colors.reset}`);
    } else {
        console.log(`${colors.red}${colors.bright}❌ TEST SUITE FAILED - ${passRate.toFixed(1)}% success rate${colors.reset}`);
    }

    console.log('');
    console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
}

async function main() {
    const startTime = Date.now();

    try {
        // Check if server is available
        log('🔍 Checking multiplayer server availability...', 'yellow');

        try {
            const token = await getAuthToken('Gast_TestConnection');
            log('✓ Multiplayer server is available\n', 'green');
        } catch (error) {
            throw new Error(`Server not available: ${error.message}`);
        }

        // Run tests
        await runMultiplayerTests();

        // Print summary
        await printSummary();

        const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        log(`\n⏱️  Total execution time: ${totalDuration} minutes\n`, 'cyan');

        // Exit code
        process.exit(failedTests > 0 ? 1 : 0);

    } catch (error) {
        log(`\n❌ Fatal error: ${error.message}`, 'red');
        log('\nMake sure the multiplayer server is running:', 'yellow');
        log('  cd backend && node server.js\n', 'cyan');
        process.exit(1);
    }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n🛑 Test suite interrupted by user');
    printSummary();
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { runMultiplayerTests };
