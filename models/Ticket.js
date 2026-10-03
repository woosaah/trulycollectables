const pool = require('../config/database');

const Ticket = {
    async create({ title, description, screenshot_path, page_url, page_title, created_by }) {
        const result = await pool.query(
            `INSERT INTO tickets (title, description, screenshot_path, page_url, page_title, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title, description, screenshot_path || null, page_url || null, page_title || null, created_by || null]
        );
        return result.rows[0];
    },

    async getAll({ status } = {}) {
        const conditions = status ? 'WHERE t.status = $1' : '';
        const params = status ? [status] : [];
        const result = await pool.query(
            `SELECT t.*, u.username as created_by_username
             FROM tickets t
             LEFT JOIN users u ON t.created_by = u.id
             ${conditions}
             ORDER BY t.created_at DESC`,
            params
        );
        return result.rows;
    },

    async getById(id) {
        const result = await pool.query(
            `SELECT t.*, u.username as created_by_username
             FROM tickets t
             LEFT JOIN users u ON t.created_by = u.id
             WHERE t.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    async updateStatus(id, status) {
        const result = await pool.query(
            `UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, id]
        );
        return result.rows[0];
    },

    async updateNotes(id, notes) {
        const result = await pool.query(
            `UPDATE tickets SET notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [notes, id]
        );
        return result.rows[0];
    },

    async countByStatus() {
        const result = await pool.query(
            `SELECT status, COUNT(*) as count FROM tickets GROUP BY status`
        );
        const counts = { open: 0, in_progress: 0, resolved: 0 };
        result.rows.forEach(row => { counts[row.status] = parseInt(row.count); });
        return counts;
    }
};

module.exports = Ticket;
