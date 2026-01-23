const readline = require('readline');
const pool = require('./config/database');
const bcrypt = require('bcrypt');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function createOrResetAdmin() {
    try {
        console.log('Checking for existing users...\n');

        // List all users
        const allUsers = await pool.query('SELECT id, username, email, role FROM users ORDER BY id');

        if (allUsers.rows.length > 0) {
            console.log('Existing users:');
            allUsers.rows.forEach(user => {
                console.log(`  - ${user.username} (${user.email}) - Role: ${user.role}`);
            });
            console.log('');
        } else {
            console.log('No users found in database.\n');
        }

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@trulycollectables.co.nz';

        rl.question('Do you want to (1) Create new admin or (2) Reset existing user password? [1/2]: ', (choice) => {
            if (choice === '1') {
                createNewAdmin(adminEmail);
            } else if (choice === '2') {
                resetExistingPassword();
            } else {
                console.log('Invalid choice.');
                pool.end();
                rl.close();
            }
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        rl.close();
    }
}

async function createNewAdmin(defaultEmail) {
    rl.question(`Admin email [${defaultEmail}]: `, (email) => {
        const adminEmail = email || defaultEmail;

        rl.question('Admin username: ', (username) => {
            if (!username) {
                console.log('❌ Username is required.');
                pool.end();
                rl.close();
                return;
            }

            rl.question('Admin password: ', async (password) => {
                if (!password || password.length < 6) {
                    console.log('❌ Password must be at least 6 characters long.');
                    await pool.end();
                    rl.close();
                    return;
                }

                try {
                    const hashedPassword = await bcrypt.hash(password, 10);

                    const result = await pool.query(
                        `INSERT INTO users (username, email, password_hash, role, created_at)
                         VALUES ($1, $2, $3, $4, NOW())
                         RETURNING id, username, email, role`,
                        [username, adminEmail, hashedPassword, 'admin']
                    );

                    console.log('\n✓ Admin user created successfully!');
                    console.log(`  Username: ${result.rows[0].username}`);
                    console.log(`  Email: ${result.rows[0].email}`);
                    console.log(`  Role: ${result.rows[0].role}`);
                } catch (error) {
                    if (error.code === '23505') {
                        console.log('❌ User with this email or username already exists.');
                    } else {
                        console.error('❌ Error creating admin:', error.message);
                    }
                } finally {
                    await pool.end();
                    rl.close();
                }
            });
        });
    });
}

async function resetExistingPassword() {
    rl.question('Enter user email: ', async (email) => {
        if (!email) {
            console.log('❌ Email is required.');
            await pool.end();
            rl.close();
            return;
        }

        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userCheck.rows.length === 0) {
            console.log(`❌ User with email ${email} not found.`);
            await pool.end();
            rl.close();
            return;
        }

        console.log(`Found user: ${userCheck.rows[0].username} (${email}) - Role: ${userCheck.rows[0].role}\n`);

        rl.question('Enter new password: ', async (newPassword) => {
            if (!newPassword || newPassword.length < 6) {
                console.log('❌ Password must be at least 6 characters long.');
                await pool.end();
                rl.close();
                return;
            }

            try {
                const hashedPassword = await bcrypt.hash(newPassword, 10);

                await pool.query(
                    'UPDATE users SET password_hash = $1 WHERE email = $2',
                    [hashedPassword, email]
                );

                console.log('\n✓ Password successfully reset!');
                console.log(`  Email: ${email}`);
            } catch (error) {
                console.error('❌ Error resetting password:', error.message);
            } finally {
                await pool.end();
                rl.close();
            }
        });
    });
}

createOrResetAdmin();
