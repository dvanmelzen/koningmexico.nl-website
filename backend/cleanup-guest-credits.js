// Cleanup Script: Remove credits from guest accounts
// Fixes bug where guest accounts (guest-xxx) got credits due to wrong pattern check

const db = require('./database');

function cleanupGuestCredits() {
    console.log('🧹 Starting cleanup: Remove credits from guest accounts...\n');

    // Get all users
    const allUsers = db.getAllUsers();
    console.log(`📊 Found ${allUsers.length} total users`);

    // Find guests who have credits
    const guestsWithCredits = [];

    for (const user of allUsers) {
        // Check for guest accounts (correct pattern: guest- with hyphen)
        if (user.id.startsWith('guest-')) {
            const credits = db.getUserCredits(user.id);
            if (credits) {
                guestsWithCredits.push({ user, credits });
            }
        }
    }

    console.log(`\n❌ Found ${guestsWithCredits.length} guest accounts with credits`);

    if (guestsWithCredits.length === 0) {
        console.log('\n✅ No cleanup needed! All credits are correctly assigned.');
        return;
    }

    console.log('\n🗑️  Removing credits from guest accounts...\n');

    let successCount = 0;
    let failCount = 0;

    for (const { user, credits } of guestsWithCredits) {
        try {
            // Delete credits record
            const deleteCredits = db.db.prepare('DELETE FROM user_credits WHERE userId = ?');
            const deleteTransactions = db.db.prepare('DELETE FROM credit_transactions WHERE userId = ?');

            // Execute transaction
            const transaction = db.db.transaction(() => {
                deleteCredits.run(user.id);
                deleteTransactions.run(user.id);
            });

            transaction();

            console.log(`✅ ${user.username} (${user.id}) - ${credits.balance} credits removed`);
            successCount++;
        } catch (error) {
            console.error(`❌ ${user.username} - Failed:`, error.message);
            failCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Cleanup Complete!');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${successCount} guest accounts cleaned`);
    console.log(`❌ Failed: ${failCount} accounts`);
    console.log(`💰 Total credits removed: ${guestsWithCredits.reduce((sum, g) => sum + g.credits.balance, 0)}`);
    console.log('='.repeat(50) + '\n');

    // Show remaining registered users with credits
    console.log('✅ Registered users with credits:');
    const registeredUsers = allUsers.filter(u => !u.id.startsWith('guest-'));
    for (const user of registeredUsers) {
        const credits = db.getUserCredits(user.id);
        if (credits) {
            console.log(`   ${user.username}: ${credits.balance} credits`);
        }
    }
}

// Run cleanup
try {
    db.initializeDatabase();
    cleanupGuestCredits();
} catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
}
