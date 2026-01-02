// Migration Script: Grant 500 Credits to Existing Users
// Run this ONCE to initialize credits for users who registered before the credits system

const db = require('./database');

function migrateExistingUsers() {
    console.log('🔄 Starting migration: Grant credits to existing users...\n');

    // Get all users
    const allUsers = db.getAllUsers();
    console.log(`📊 Found ${allUsers.length} total users`);

    // Filter out guests and users who already have credits
    const usersToMigrate = [];

    for (const user of allUsers) {
        // Skip guests
        if (user.id.startsWith('guest_')) {
            continue;
        }

        // Check if user already has credits
        const existingCredits = db.getUserCredits(user.id);
        if (existingCredits) {
            console.log(`✓ ${user.username} already has credits (${existingCredits.balance})`);
            continue;
        }

        usersToMigrate.push(user);
    }

    console.log(`\n📋 Users needing credits: ${usersToMigrate.length}`);

    if (usersToMigrate.length === 0) {
        console.log('\n✅ All users already have credits! No migration needed.');
        return;
    }

    console.log('\n🚀 Starting credit grants...\n');

    let successCount = 0;
    let failCount = 0;

    for (const user of usersToMigrate) {
        try {
            // Insert credits record
            const insertCredits = db.db.prepare(`
                INSERT INTO user_credits (userId, balance, lifetimeEarned, lifetimeSpent)
                VALUES (?, 500, 500, 0)
            `);

            const insertTransaction = db.db.prepare(`
                INSERT INTO credit_transactions (userId, amount, type, description, balanceAfter)
                VALUES (?, 500, 'migration_bonus', 'Welkom! Bedankt voor het testen 🎉', 500)
            `);

            // Execute transaction
            const transaction = db.db.transaction(() => {
                insertCredits.run(user.id);
                insertTransaction.run(user.id);
            });

            transaction();

            console.log(`✅ ${user.username} - 500 credits granted`);
            successCount++;
        } catch (error) {
            console.error(`❌ ${user.username} - Failed:`, error.message);
            failCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Complete!');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${successCount} users`);
    console.log(`❌ Failed: ${failCount} users`);
    console.log(`📈 Total granted: ${successCount * 500} credits`);
    console.log('='.repeat(50) + '\n');
}

// Run migration
try {
    db.initializeDatabase();
    migrateExistingUsers();
} catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}
