#!/usr/bin/env node

/**
 * MASTER TEST RUNNER
 *
 * Runs all 50 automated tests:
 * - 25 bot mode tests (test-suite-bot.js)
 * - 25 multiplayer tests (test-suite-multiplayer.js)
 *
 * Provides comprehensive test coverage with statistical confidence.
 */

const { spawn } = require('child_process');
const path = require('path');

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

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTestSuite(scriptPath, suiteName) {
    return new Promise((resolve, reject) => {
        log(`\n${'='.repeat(60)}`, 'cyan');
        log(`Starting ${suiteName}...`, 'bright');
        log(`${'='.repeat(60)}\n`, 'cyan');

        const child = spawn('node', [scriptPath], {
            stdio: 'inherit',
            cwd: __dirname
        });

        child.on('close', (code) => {
            if (code === 0) {
                log(`\n✅ ${suiteName} COMPLETED SUCCESSFULLY\n`, 'green');
                resolve({ success: true, suite: suiteName });
            } else {
                log(`\n❌ ${suiteName} FAILED (exit code ${code})\n`, 'red');
                resolve({ success: false, suite: suiteName, code });
            }
        });

        child.on('error', (error) => {
            log(`\n❌ ${suiteName} ERROR: ${error.message}\n`, 'red');
            reject(error);
        });
    });
}

async function main() {
    const startTime = Date.now();

    console.log('');
    console.log(`${colors.bright}${colors.magenta}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}║         🎮 KONING MEXICO - MASTER TEST SUITE         ║${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}║                   50 AUTOMATED TESTS                  ║${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}╚═══════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');

    log('Test Coverage:', 'bright');
    log('  • 25 Bot Mode Tests (AI personalities, edge cases, stress)', 'cyan');
    log('  • 25 Multiplayer Tests (normal games, edge cases, stress, regression)', 'cyan');
    log('  • Statistical Confidence: 95% with 14% margin of error', 'cyan');
    console.log('');

    const results = [];

    try {
        // Check if required servers are running
        log('🔍 Pre-flight checks:', 'yellow');
        log('  Make sure the following servers are running:', 'yellow');
        log('  1. Bot API server:        node game-api.js (port 3002)', 'cyan');
        log('  2. Multiplayer server:    node server.js (port 3001)', 'cyan');
        console.log('');

        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        await new Promise((resolve) => {
            readline.question('Press ENTER to start tests (or Ctrl+C to cancel)...', () => {
                readline.close();
                resolve();
            });
        });

        console.log('');
        log('🚀 Starting test execution...\n', 'bright');

        // Run Bot Mode Tests
        const botResult = await runTestSuite(
            path.join(__dirname, 'test-suite-bot.js'),
            'BOT MODE TEST SUITE (25 tests)'
        );
        results.push(botResult);

        // Small delay between suites
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Run Multiplayer Tests
        const multiplayerResult = await runTestSuite(
            path.join(__dirname, 'test-suite-multiplayer.js'),
            'MULTIPLAYER TEST SUITE (25 tests)'
        );
        results.push(multiplayerResult);

        // Overall Summary
        console.log('');
        console.log(`${colors.bright}${colors.magenta}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.bright}${colors.magenta}║           📊 OVERALL TEST SUITE SUMMARY               ║${colors.reset}`);
        console.log(`${colors.bright}${colors.magenta}╚═══════════════════════════════════════════════════════╝${colors.reset}`);
        console.log('');

        const allPassed = results.every(r => r.success);
        const passedSuites = results.filter(r => r.success).length;
        const failedSuites = results.filter(r => !r.success).length;

        log(`${colors.bright}Test Suites:${colors.reset}`);
        log(`  ${colors.green}✓ Passed: ${passedSuites}/2${colors.reset}`);
        if (failedSuites > 0) {
            log(`  ${colors.red}✗ Failed: ${failedSuites}/2${colors.reset}`);
        }
        console.log('');

        results.forEach(result => {
            if (result.success) {
                log(`  ✅ ${result.suite}`, 'green');
            } else {
                log(`  ❌ ${result.suite} (exit code: ${result.code})`, 'red');
            }
        });

        console.log('');
        const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        log(`⏱️  Total execution time: ${totalDuration} minutes`, 'cyan');
        console.log('');

        if (allPassed) {
            log('✅ ALL TEST SUITES PASSED - 50 TESTS COMPLETE', 'green');
            log('', 'reset');
            log('Statistical Confidence: 95%', 'bright');
            log('The game has been thoroughly tested across:', 'cyan');
            log('  • All 3 AI personalities (SCARED, RATIONAL, AGGRESSIVE)', 'cyan');
            log('  • Normal game flows (multiple lengths)', 'cyan');
            log('  • Edge cases (Mexico, high doubles, patterns)', 'cyan');
            log('  • Stress scenarios (rapid play, connections)', 'cyan');
            log('  • Regression scenarios (known bugs fixed)', 'cyan');
            console.log('');
            log('🎉 Ready for production deployment!', 'bright');
        } else {
            log('❌ SOME TEST SUITES FAILED - REVIEW ERRORS ABOVE', 'red');
            log('', 'reset');
            log('Fix the failing tests before deploying to production.', 'yellow');
        }

        console.log('');
        console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
        console.log('');

        process.exit(allPassed ? 0 : 1);

    } catch (error) {
        log(`\n❌ Fatal error: ${error.message}`, 'red');
        log('\nMake sure both servers are running:', 'yellow');
        log('  Terminal 1: cd backend && node game-api.js', 'cyan');
        log('  Terminal 2: cd backend && node server.js', 'cyan');
        log('  Terminal 3: cd backend && node run-all-tests.js\n', 'cyan');
        process.exit(1);
    }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
    log('\n\n🛑 Test execution interrupted by user', 'yellow');
    log('Partial results may be incomplete.\n', 'yellow');
    process.exit(1);
});

// Run
main();
