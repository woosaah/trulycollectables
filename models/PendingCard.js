const pool = require('../config/database');

const PendingCard = {
    async search(term) {
        const like = `%${term}%`;
        const result = await pool.query(`
            SELECT
                pc.*,
                u.username as submitted_by_username,
                COUNT(DISTINCT uc.user_id) as collection_count
            FROM pending_cards pc
            LEFT JOIN users u ON u.id = pc.submitted_by
            LEFT JOIN user_collections uc ON uc.pending_card_id = pc.id
            WHERE LOWER(pc.card_name) LIKE LOWER($1)
               OR LOWER(COALESCE(pc.set_name, '')) LIKE LOWER($1)
               OR LOWER(COALESCE(pc.manufacturer, '')) LIKE LOWER($1)
            GROUP BY pc.id, u.username
            ORDER BY pc.card_name
            LIMIT 20
        `, [like]);
        return result.rows;
    },

    async create(userId, data) {
        const { card_name, set_name, card_number, manufacturer, insert_list, year, card_category, sport_type, notes, image_front } = data;
        const result = await pool.query(`
            INSERT INTO pending_cards
                (card_name, set_name, card_number, manufacturer, insert_list, year, card_category, sport_type, notes, image_front, submitted_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [card_name, set_name || null, card_number || null, manufacturer || null, insert_list || null, year || null, card_category || 'non_sport', sport_type || null, notes || null, image_front || null, userId]);
        return result.rows[0];
    },

    async findById(id) {
        const result = await pool.query(`
            SELECT pc.*, u.username as submitted_by_username,
                COUNT(DISTINCT uc.user_id) as collection_count
            FROM pending_cards pc
            LEFT JOIN users u ON u.id = pc.submitted_by
            LEFT JOIN user_collections uc ON uc.pending_card_id = pc.id
            WHERE pc.id = $1
            GROUP BY pc.id, u.username
        `, [id]);
        return result.rows[0];
    },

    async findAll() {
        const result = await pool.query(`
            SELECT pc.*, u.username as submitted_by_username,
                COUNT(DISTINCT uc.user_id) as collection_count
            FROM pending_cards pc
            LEFT JOIN users u ON u.id = pc.submitted_by
            LEFT JOIN user_collections uc ON uc.pending_card_id = pc.id
            GROUP BY pc.id, u.username
            ORDER BY collection_count DESC, pc.created_at DESC
        `);
        return result.rows;
    },

    async update(id, data) {
        const { card_name, set_name, card_number, manufacturer, insert_list, year, card_category, sport_type, notes } = data;
        const result = await pool.query(`
            UPDATE pending_cards SET
                card_name = $1,
                set_name = $2,
                card_number = $3,
                manufacturer = $4,
                insert_list = $5,
                year = $6,
                card_category = $7,
                sport_type = $8,
                notes = $9
            WHERE id = $10
            RETURNING *
        `, [card_name, set_name || null, card_number || null, manufacturer || null, insert_list || null, year || null, card_category || 'non_sport', sport_type || null, notes || null, id]);
        return result.rows[0];
    },

    // Promote to main catalogue: create cards entry, re-link all user_collections, delete pending
    async promote(id, extraData = {}) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const pending = await client.query('SELECT * FROM pending_cards WHERE id = $1', [id]);
            if (!pending.rows[0]) throw new Error('Pending card not found');
            const p = pending.rows[0];

            const { condition = null, price_nzd = null, quantity = 1, description = null, available = true } = extraData;

            const cardResult = await client.query(`
                INSERT INTO cards
                    (card_name, set_name, card_number, manufacturer, insert_list, year, card_category, sport_type, image_front, description, condition, price_nzd, quantity, available)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id
            `, [p.card_name, p.set_name, p.card_number, p.manufacturer, p.insert_list, p.year, p.card_category, p.sport_type, p.image_front, description, condition, price_nzd, quantity, available]);

            const newCardId = cardResult.rows[0].id;

            await client.query(`
                UPDATE user_collections
                SET card_id = $1, pending_card_id = NULL
                WHERE pending_card_id = $2
            `, [newCardId, id]);

            await client.query('DELETE FROM pending_cards WHERE id = $1', [id]);

            await client.query('COMMIT');
            return newCardId;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    async delete(id) {
        await pool.query('DELETE FROM pending_cards WHERE id = $1', [id]);
    }
};

module.exports = PendingCard;
