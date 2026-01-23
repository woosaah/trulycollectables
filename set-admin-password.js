const pool = require('./config/database');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function setAdminPassword() {
    try {
        const adminEmail = 'admin@trulycollectables.com';
        const newPassword = 'TrulyCollect2024!';

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING username, email, role',
            [hashedPassword, adminEmail]
        );

        if (result.rows.length > 0) {
            console.log('✓ Admin password successfully updated!');
            console.log(`  Username: ${result.rows[0].username}`);
            console.log(`  Email: ${result.rows[0].email}`);
            console.log(`  Role: ${result.rows[0].role}`);
            console.log(`  Password: TrulyCollect2024!`);
        } else {
            console.log('❌ Admin user not found.');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

setAdminPassword();
