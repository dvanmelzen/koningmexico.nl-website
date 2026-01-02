// Migration: Add disclaimer fields to users table
const db = require('./database');

console.log('🔄 Starting migration: Add disclaimer fields to users table\n');

try {
    db.initializeDatabase();

    // Check which columns need to be added
    const tableInfo = db.db.prepare("PRAGMA table_info(users)").all();
    const versionExists = tableInfo.some(col => col.name === 'disclaimerVersion');
    const timestampExists = tableInfo.some(col => col.name === 'disclaimerAcceptedAt');

    if (!versionExists) {
        console.log('➕ Adding disclaimerVersion column...');
        db.db.exec(`
            ALTER TABLE users
            ADD COLUMN disclaimerVersion INTEGER DEFAULT NULL
        `);
        console.log('✅ disclaimerVersion column added');
    } else {
        console.log('✅ disclaimerVersion column already exists');
    }

    if (!timestampExists) {
        console.log('➕ Adding disclaimerAcceptedAt column...');
        db.db.exec(`
            ALTER TABLE users
            ADD COLUMN disclaimerAcceptedAt TEXT DEFAULT NULL
        `);
        console.log('✅ disclaimerAcceptedAt column added');
    } else {
        console.log('✅ disclaimerAcceptedAt column already exists');
    }

    console.log('\n📊 Migration complete!');
    console.log(`Current disclaimer version: ${db.CURRENT_DISCLAIMER_VERSION}`);
} catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}
