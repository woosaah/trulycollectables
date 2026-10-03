const pool = require('../config/database');

const CardVariation = {
    async getByCardId(cardId) {
        const result = await pool.query(
            'SELECT * FROM card_variations WHERE card_id = $1 ORDER BY sort_order ASC, variation_name ASC',
            [cardId]
        );
        return result.rows;
    },

    async findById(id) {
        const result = await pool.query('SELECT * FROM card_variations WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    async create(cardId, data) {
        const { variation_name, price_nzd, quantity, condition, image_url, sort_order } = data;
        const result = await pool.query(
            `INSERT INTO card_variations (card_id, variation_name, price_nzd, quantity, condition, image_url, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [cardId, variation_name, price_nzd ?? 0, quantity ?? 0, condition || null, image_url || null, sort_order ?? 0]
        );
        return result.rows[0];
    },

    async update(id, data) {
        const allowed = ['variation_name', 'price_nzd', 'quantity', 'condition', 'image_url', 'sort_order', 'available'];
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(data)) {
            if (allowed.includes(key)) {
                fields.push(`${key} = $${paramCount++}`);
                values.push(value);
            }
        }
        if (!fields.length) return null;
        fields.push('updated_at = NOW()');
        values.push(id);

        const result = await pool.query(
            `UPDATE card_variations SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    },

    async delete(id) {
        await pool.query('DELETE FROM card_variations WHERE id = $1', [id]);
    },

    // Create variation for every card in a set
    // base only = cards with purely numeric card numbers (e.g. 1, 34, 356)
    // include inserts = also include prefixed cards (DM1, EDG1, LL1 etc.)
    async bulkCreate(setName, variationData, includeInserts = false) {
        let query = 'SELECT id FROM cards WHERE set_name = $1';
        const params = [setName];
        if (!includeInserts) {
            query += ` AND card_number ~ '^[0-9]+$'`;
        }
        const cards = await pool.query(query, params);
        let created = 0, skipped = 0;

        for (const card of cards.rows) {
            const res = await pool.query(
                `INSERT INTO card_variations (card_id, variation_name, price_nzd, quantity, condition, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (card_id, variation_name) DO NOTHING`,
                [card.id, variationData.variation_name, variationData.price_nzd ?? 0,
                 variationData.quantity ?? 0, variationData.condition || null, variationData.sort_order ?? 0]
            );
            if (res.rowCount > 0) created++; else skipped++;
        }
        return { created, skipped, total: cards.rows.length };
    },

    async previewBulkCount(setName, includeInserts = false) {
        let query = 'SELECT COUNT(*) FROM cards WHERE set_name = $1';
        const params = [setName];
        if (!includeInserts) {
            query += ` AND card_number ~ '^[0-9]+$'`;
        }
        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    }
};

module.exports = CardVariation;
