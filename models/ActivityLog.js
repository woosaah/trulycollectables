const pool = require('../config/database');

const ActivityLog = {
    // Log activity
    async log(userId, action, entityType = null, entityId = null, ipAddress = null, userAgent = null, metadata = null) {
        const query = `
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await pool.query(query, [
            userId,
            action,
            entityType,
            entityId,
            ipAddress,
            userAgent,
            metadata ? JSON.stringify(metadata) : null
        ]);

        return result.rows[0];
    },

    // Get logs for user
    async findByUser(userId, limit = 50) {
        const query = `
            SELECT * FROM activity_logs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [userId, limit]);
        return result.rows;
    },

    // Get all logs (admin)
    async findAll(filters = {}, limit = 100, offset = 0) {
        let query = 'SELECT activity_logs.*, users.username FROM activity_logs LEFT JOIN users ON activity_logs.user_id = users.id WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (filters.user_id) {
            query += ` AND activity_logs.user_id = $${paramCount}`;
            params.push(filters.user_id);
            paramCount++;
        }

        if (filters.action) {
            query += ` AND activity_logs.action = $${paramCount}`;
            params.push(filters.action);
            paramCount++;
        }

        if (filters.entity_type) {
            query += ` AND activity_logs.entity_type = $${paramCount}`;
            params.push(filters.entity_type);
            paramCount++;
        }

        if (filters.date_from) {
            query += ` AND activity_logs.created_at >= $${paramCount}`;
            params.push(filters.date_from);
            paramCount++;
        }

        if (filters.date_to) {
            query += ` AND activity_logs.created_at <= $${paramCount}`;
            params.push(filters.date_to);
            paramCount++;
        }

        query += ` ORDER BY activity_logs.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Get activity summary
    async getSummary(days = 7) {
        const query = `
            SELECT
                action,
                COUNT(*) as count,
                DATE(created_at) as date
            FROM activity_logs
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY action, DATE(created_at)
            ORDER BY date DESC, count DESC
        `;

        const result = await pool.query(query);
        return result.rows;
    }
};

module.exports = ActivityLog;
