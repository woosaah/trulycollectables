const pool = require('../config/database');

const UserProfile = {
    // Create or get profile
    async getOrCreate(userId) {
        // Try to get existing profile
        let query = 'SELECT * FROM user_profiles WHERE user_id = $1';
        let result = await pool.query(query, [userId]);

        if (result.rows.length > 0) {
            return result.rows[0];
        }

        // Create new profile
        query = `
            INSERT INTO user_profiles (user_id)
            VALUES ($1)
            RETURNING *
        `;

        result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    // Update profile
    async update(userId, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'user_id' && key !== 'id') {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        // Add updated_at
        fields.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(userId);
        const query = `
            UPDATE user_profiles
            SET ${fields.join(', ')}
            WHERE user_id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            // Create if doesn't exist
            return await this.getOrCreate(userId);
        }

        return result.rows[0];
    },

    // Get full user data with profile
    async getFullProfile(userId) {
        const query = `
            SELECT
                users.id,
                users.username,
                users.email,
                users.role,
                users.created_at as member_since,
                user_profiles.*
            FROM users
            LEFT JOIN user_profiles ON users.id = user_profiles.user_id
            WHERE users.id = $1
        `;

        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    // Update notification preferences
    async updateNotifications(userId, preferences) {
        const query = `
            UPDATE user_profiles
            SET notification_preferences = $1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [JSON.stringify(preferences), userId]);
        return result.rows[0];
    }
};

module.exports = UserProfile;
