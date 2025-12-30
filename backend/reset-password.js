#!/usr/bin/env node
// Admin Password Reset Tool
// Usage: node reset-password.js <email> [new-password]
// If no password provided, generates a random secure password

const bcrypt = require('bcryptjs');
const db = require('./database');
const crypto = require('crypto');

// Initialize database
db.initializeDatabase();

// Parse arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email) {
    console.error('❌ Usage: node reset-password.js <email> [new-password]');
    console.error('');
    console.error('Examples:');
    console.error('  node reset-password.js user@example.com');
    console.error('  node reset-password.js user@example.com NewPass123!');
    process.exit(1);
}

// Generate secure random password
function generatePassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%';

    // Ensure at least one of each required character type
    let password = '';
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += special[crypto.randomInt(special.length)];

    // Fill rest with random characters from all sets
    const allChars = lowercase + uppercase + numbers + special;
    for (let i = password.length; i < length; i++) {
        password += allChars[crypto.randomInt(allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function resetPassword() {
    try {
        // Find user by email
        const user = db.findUserByEmail(email);

        if (!user) {
            console.error(`❌ Gebruiker met email "${email}" niet gevonden`);
            process.exit(1);
        }

        // Use provided password or generate one
        const password = newPassword || generatePassword();

        // Validate password strength if provided manually
        if (newPassword) {
            if (password.length < 8) {
                console.error('❌ Wachtwoord moet minimaal 8 karakters zijn');
                process.exit(1);
            }
            if (!/[a-z]/.test(password)) {
                console.error('❌ Wachtwoord moet minimaal 1 kleine letter bevatten');
                process.exit(1);
            }
            if (!/[A-Z]/.test(password)) {
                console.error('❌ Wachtwoord moet minimaal 1 hoofdletter bevatten');
                process.exit(1);
            }
            if (!/\d/.test(password)) {
                console.error('❌ Wachtwoord moet minimaal 1 cijfer bevatten');
                process.exit(1);
            }
            if (!/[!@#$%.,]/.test(password)) {
                console.error('❌ Wachtwoord moet minimaal 1 speciaal teken bevatten (!@#$%.,)');
                process.exit(1);
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password in database
        const stmt = db.db.prepare('UPDATE users SET password = ? WHERE id = ?');
        const result = stmt.run(hashedPassword, user.id);

        if (result.changes === 0) {
            console.error('❌ Wachtwoord update gefaald');
            process.exit(1);
        }

        // Success!
        console.log('✅ Wachtwoord succesvol gereset!');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`👤 Gebruiker: ${user.username}`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`🔐 Nieuw wachtwoord: ${password}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('⚠️  Geef dit wachtwoord aan de gebruiker via een veilig kanaal');
        console.log('⚠️  Verwijder dit wachtwoord uit je terminal history');
        console.log('⚠️  Gebruiker moet wachtwoord wijzigen bij eerste login');
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run reset
resetPassword();
