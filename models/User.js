const pool = require('../config/database');
const bcrypt = require('bcrypt');

const User = {
    // Create a new user
    async create(username, email, password, role = 'customer') {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `
            INSERT INTO users (username, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, role, created_at
        `;
        const result = await pool.query(query, [username, email, hashedPassword, role]);
        return result.rows[0];
    },

    // Find user by email
    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);
        return result.rows[0];
    },

    // Find user by username
    async findByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await pool.query(query, [username]);
        return result.rows[0];
    },

    // Find user by ID
    async findById(id) {
        const query = 'SELECT id, username, email, role, created_at FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Verify password
    async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    },

    // Update user
    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && key !== 'password_hash') {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        values.push(id);
        const query = `
            UPDATE users
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, username, email, role, created_at
        `;
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Change password
    async changePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const query = 'UPDATE users SET password_hash = $1 WHERE id = $2';
        await pool.query(query, [hashedPassword, id]);
    }
};

module.exports = User;
