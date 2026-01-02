// Script: Give Daniel and Bull 5000 credits each
const db = require('./database');

console.log('💰 Adding credits to Daniel and Bull...\n');

try {
    db.initializeDatabase();

    // Find users by username
    const daniel = db.findUserByUsername('Daniel');
    const bull = db.findUserByUsername('Bull');

    if (!daniel) {
        console.error('❌ User "Daniel" not found!');
        process.exit(1);
    }

    if (!bull) {
        console.error('❌ User "Bull" not found!');
        process.exit(1);
    }

    console.log(`✅ Found Daniel (ID: ${daniel.id})`);
    console.log(`✅ Found Bull (ID: ${bull.id})\n`);

    // Get current balances
    const danielCredits = db.getUserCredits(daniel.id);
    const bullCredits = db.getUserCredits(bull.id);

    console.log(`📊 Current balances:`);
    console.log(`   Daniel: ${danielCredits ? danielCredits.balance : 0} credits`);
    console.log(`   Bull: ${bullCredits ? bullCredits.balance : 0} credits\n`);

    // Add 5000 credits to each
    const danielAmount = 5000 - (danielCredits ? danielCredits.balance : 0);
    const bullAmount = 5000 - (bullCredits ? bullCredits.balance : 0);

    if (danielAmount > 0) {
        console.log(`💰 Adding ${danielAmount} credits to Daniel...`);
        const success1 = db.updateCredits(
            daniel.id,
            danielAmount,
            'admin_bonus',
            '🎁 Admin bonus: extra credits!',
            null
        );
        if (success1) {
            console.log('✅ Daniel now has 5000 credits');
        } else {
            console.error('❌ Failed to update Daniel\'s credits');
        }
    } else {
        console.log(`ℹ️  Daniel already has ${danielCredits.balance} credits (no update needed)`);
    }

    if (bullAmount > 0) {
        console.log(`💰 Adding ${bullAmount} credits to Bull...`);
        const success2 = db.updateCredits(
            bull.id,
            bullAmount,
            'admin_bonus',
            '🎁 Admin bonus: extra credits!',
            null
        );
        if (success2) {
            console.log('✅ Bull now has 5000 credits');
        } else {
            console.error('❌ Failed to update Bull\'s credits');
        }
    } else {
        console.log(`ℹ️  Bull already has ${bullCredits.balance} credits (no update needed)`);
    }

    // Show final balances
    const danielFinal = db.getUserCredits(daniel.id);
    const bullFinal = db.getUserCredits(bull.id);

    console.log(`\n📊 Final balances:`);
    console.log(`   Daniel: ${danielFinal.balance} credits`);
    console.log(`   Bull: ${bullFinal.balance} credits`);

    console.log('\n✅ Credits updated successfully!');
} catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
}
