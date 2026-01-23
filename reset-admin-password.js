const readline = require('readline');
const pool = require('./config/database');
const bcrypt = require('bcrypt');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function resetAdminPassword() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@trulycollectables.co.nz';

        // Check if admin user exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);

        if (userCheck.rows.length === 0) {
            console.log(`❌ Admin user with email ${adminEmail} not found.`);
            await pool.end();
            rl.close();
            return;
        }

        console.log(`Found admin user: ${userCheck.rows[0].username} (${adminEmail})`);
        console.log('');

        rl.question('Enter new password: ', async (newPassword) => {
            if (!newPassword || newPassword.length < 6) {
                console.log('❌ Password must be at least 6 characters long.');
                await pool.end();
                rl.close();
                return;
            }

            rl.question('Confirm new password: ', async (confirmPassword) => {
                if (newPassword !== confirmPassword) {
                    console.log('❌ Passwords do not match.');
                    await pool.end();
                    rl.close();
                    return;
                }

                try {
                    // Hash the new password
                    const hashedPassword = await bcrypt.hash(newPassword, 10);

                    // Update the password
                    await pool.query(
                        'UPDATE users SET password_hash = $1 WHERE email = $2',
                        [hashedPassword, adminEmail]
                    );

                    console.log('');
                    console.log('✓ Admin password successfully reset!');
                    console.log(`✓ You can now login with:`);
                    console.log(`  Email: ${adminEmail}`);
                    console.log(`  Password: [your new password]`);
                } catch (error) {
                    console.error('❌ Error resetting password:', error.message);
                } finally {
                    await pool.end();
                    rl.close();
                }
            });
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        rl.close();
    }
}

resetAdminPassword();
