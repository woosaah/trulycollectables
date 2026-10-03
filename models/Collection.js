const pool = require('../config/database');

const Collection = {
    // Add card to user collection
    async add(userId, cardData) {
        const {
            card_name, set_name, card_number, manufacturer, insert_list, year, sport_type,
            quantity, status, notes
        } = cardData;

        const query = `
            INSERT INTO user_collections (
                user_id, card_name, set_name, card_number, manufacturer, insert_list, year, sport_type,
                quantity, status, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const result = await pool.query(query, [
            userId, card_name, set_name, card_number, manufacturer, insert_list, year, sport_type,
            quantity, status, notes
        ]);

        return result.rows[0];
    },

    // Link a user collection entry to a catalogue card
    async addFromCatalogue(userId, card, status) {
        const result = await pool.query(`
            INSERT INTO user_collections
                (user_id, card_id, card_name, set_name, card_number, manufacturer, insert_list, year, sport_type, quantity, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10)
            RETURNING *
        `, [userId, card.id, card.card_name, card.set_name || null, card.card_number || null, card.manufacturer || null, card.insert_list || null, card.year || null, card.sport_type || null, status]);
        return result.rows[0];
    },

    // Link a user collection entry to an existing pending card
    async addFromPending(userId, pendingCardId, cardData, status) {
        const { card_name, set_name, card_number, manufacturer, insert_list, year, sport_type } = cardData;
        const result = await pool.query(`
            INSERT INTO user_collections
                (user_id, pending_card_id, card_name, set_name, card_number, manufacturer, insert_list, year, sport_type, quantity, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10)
            RETURNING *
        `, [userId, pendingCardId, card_name, set_name || null, card_number || null, manufacturer || null, insert_list || null, year || null, sport_type || null, status]);
        return result.rows[0];
    },

    async hasPendingCard(userId, pendingCardId, status) {
        const result = await pool.query(
            'SELECT id FROM user_collections WHERE user_id = $1 AND pending_card_id = $2 AND status = $3',
            [userId, pendingCardId, status]
        );
        return result.rows[0] || null;
    },

    // Get user's collection
    async findByUser(userId, status = null) {
        let query = `
            SELECT uc.*,
                pc.image_front as pending_image_front,
                CASE WHEN uc.card_id IS NOT NULL THEN 'catalogue'
                     WHEN uc.pending_card_id IS NOT NULL THEN 'pending'
                     ELSE 'manual' END as entry_type
            FROM user_collections uc
            LEFT JOIN pending_cards pc ON pc.id = uc.pending_card_id
            WHERE uc.user_id = $1
        `;
        const params = [userId];

        if (status) {
            query += ' AND uc.status = $2';
            params.push(status);
        }

        query += ' ORDER BY uc.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Get collection item by ID
    async findById(id, userId) {
        const query = 'SELECT * FROM user_collections WHERE id = $1 AND user_id = $2';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    },

    // Update collection item
    async update(id, userId, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && key !== 'user_id') {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        values.push(id, userId);
        const query = `
            UPDATE user_collections
            SET ${fields.join(', ')}
            WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Delete collection item
    async delete(id, userId) {
        const query = 'DELETE FROM user_collections WHERE id = $1 AND user_id = $2';
        await pool.query(query, [id, userId]);
    },

    // Export user's collection as CSV data
    async exportToCSV(userId, status = null) {
        let query = 'SELECT * FROM user_collections WHERE user_id = $1';
        const params = [userId];

        if (status) {
            query += ' AND status = $2';
            params.push(status);
        }

        query += ' ORDER BY card_name, set_name';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Find matches with seller inventory
    async findMatches(userId) {
        const query = `
            SELECT
                uc.id as collection_id,
                uc.card_name,
                uc.set_name,
                uc.card_number,
                uc.manufacturer,
                uc.insert_list,
                c.id as card_id,
                c.price_nzd,
                c.condition,
                c.quantity as available_quantity,
                c.image_front
            FROM user_collections uc
            INNER JOIN cards c ON
                LOWER(uc.card_name) = LOWER(c.card_name)
                AND (uc.set_name IS NULL OR LOWER(uc.set_name) = LOWER(c.set_name))
                AND (uc.card_number IS NULL OR uc.card_number = c.card_number)
                AND (uc.manufacturer IS NULL OR LOWER(uc.manufacturer) = LOWER(c.manufacturer))
                AND (uc.insert_list IS NULL OR LOWER(uc.insert_list) = LOWER(c.insert_list))
            WHERE uc.user_id = $1
                AND uc.status = 'want'
                AND c.available = true
            ORDER BY uc.created_at DESC
        `;

        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // Check if user has a specific card (optionally a specific variation) with a given status
    async hasCard(userId, cardId, status = 'have', variationId = null) {
        let query = 'SELECT id FROM user_collections WHERE user_id = $1 AND card_id = $2 AND status = $3';
        const params = [userId, cardId, status];
        if (variationId) {
            query += ' AND variation_id = $4';
            params.push(variationId);
        } else {
            query += ' AND variation_id IS NULL';
        }
        const result = await pool.query(query, params);
        return result.rows[0] || null;
    },

    // Toggle a card (or specific variation) in/out of the user's collection
    async toggleStatus(userId, cardId, status, variationId = null) {
        const existing = await this.hasCard(userId, cardId, status, variationId);
        if (existing) {
            await pool.query('DELETE FROM user_collections WHERE id = $1', [existing.id]);
            return false;
        }

        const card = await pool.query('SELECT * FROM cards WHERE id = $1', [cardId]);
        if (!card.rows[0]) throw new Error('Card not found');
        const c = card.rows[0];

        await pool.query(
            `INSERT INTO user_collections
                (user_id, card_id, card_name, set_name, card_number, manufacturer, insert_list, year, sport_type, quantity, status, variation_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $11)`,
            [userId, cardId, c.card_name, c.set_name, c.card_number, c.manufacturer, c.insert_list, c.year, c.sport_type, status, variationId || null]
        );
        return true;
    },

    async toggleHave(userId, cardId, variationId = null) { return this.toggleStatus(userId, cardId, 'have', variationId); },
    async toggleWant(userId, cardId, variationId = null) { return this.toggleStatus(userId, cardId, 'want', variationId); },

    async toggleFigurine(userId, figurineId, status) {
        const existing = await pool.query(
            'SELECT id FROM user_collections WHERE user_id = $1 AND figurine_id = $2 AND status = $3',
            [userId, figurineId, status]
        );
        if (existing.rows[0]) {
            await pool.query('DELETE FROM user_collections WHERE id = $1', [existing.rows[0].id]);
            return false;
        }
        const fig = await pool.query('SELECT * FROM figurines WHERE id = $1', [figurineId]);
        if (!fig.rows[0]) throw new Error('Figurine not found');
        const f = fig.rows[0];
        await pool.query(
            `INSERT INTO user_collections (user_id, figurine_id, card_name, set_name, quantity, status)
             VALUES ($1, $2, $3, $4, 1, $5)`,
            [userId, figurineId, f.product_name, f.supplier, status]
        );
        return true;
    },

    async getFigurinesByUser(userId, status) {
        const result = await pool.query(
            `SELECT f.id, f.product_name, f.image_url, f.price_nzd, f.supplier, f.sku,
                    uc.id AS collection_id, uc.status
             FROM user_collections uc
             JOIN figurines f ON f.id = uc.figurine_id
             WHERE uc.user_id = $1 AND uc.status = $2 AND uc.figurine_id IS NOT NULL
             ORDER BY f.product_name ASC`,
            [userId, status]
        );
        return result.rows;
    },

    // Get community have/want counts for a card
    async getCardStats(cardId) {
        const result = await pool.query(
            `SELECT status, COUNT(DISTINCT user_id) as count
             FROM user_collections WHERE card_id = $1 GROUP BY status`,
            [cardId]
        );
        const stats = { have: 0, want: 0 };
        result.rows.forEach(r => { stats[r.status] = parseInt(r.count); });
        return stats;
    },

    // Get completion stats per set + insert_list for a user
    async getCompletionStats(userId) {
        const query = `
            WITH user_sets AS (
                SELECT DISTINCT c.set_name
                FROM cards c
                JOIN user_collections uc ON uc.card_id = c.id AND uc.user_id = $1 AND uc.status = 'have'
                WHERE c.set_name IS NOT NULL
            )
            SELECT
                c.set_name,
                COALESCE(c.insert_list, 'Base Set') as insert_list,
                COUNT(DISTINCT c.id) as total,
                COUNT(DISTINCT uc.card_id) as have
            FROM cards c
            LEFT JOIN user_collections uc
                ON uc.card_id = c.id AND uc.user_id = $1 AND uc.status = 'have'
            WHERE c.available = true
              AND c.set_name IN (SELECT set_name FROM user_sets)
            GROUP BY c.set_name, c.insert_list
            ORDER BY c.set_name, c.insert_list NULLS FIRST
        `;
        const result = await pool.query(query, [userId]);

        // Group by set_name
        const sets = {};
        result.rows.forEach(row => {
            if (!sets[row.set_name]) sets[row.set_name] = { inserts: [], total: 0, have: 0 };
            const pct = row.total > 0 ? Math.round((row.have / row.total) * 100) : 0;
            sets[row.set_name].inserts.push({
                insert_list: row.insert_list,
                total: parseInt(row.total),
                have: parseInt(row.have),
                pct
            });
            sets[row.set_name].total += parseInt(row.total);
            sets[row.set_name].have += parseInt(row.have);
        });

        // Add overall pct per set
        Object.values(sets).forEach(s => {
            s.pct = s.total > 0 ? Math.round((s.have / s.total) * 100) : 0;
        });

        return sets;
    },

    // Get all wanted cards across all users (for admin)
    async getAllWanted() {
        const query = `
            SELECT
                uc.id,
                uc.card_name,
                uc.set_name,
                uc.card_number,
                uc.manufacturer,
                uc.insert_list,
                uc.year,
                uc.sport_type,
                uc.notes,
                uc.created_at,
                u.username,
                u.email,
                dc.user_count as want_count
            FROM user_collections uc
            INNER JOIN users u ON uc.user_id = u.id
            LEFT JOIN (
                SELECT card_name,
                       COALESCE(set_name, '') as set_name,
                       COALESCE(manufacturer, '') as manufacturer,
                       COUNT(DISTINCT user_id) as user_count
                FROM user_collections
                WHERE status = 'want'
                GROUP BY card_name, COALESCE(set_name, ''), COALESCE(manufacturer, '')
            ) dc ON dc.card_name = uc.card_name
                AND dc.set_name = COALESCE(uc.set_name, '')
                AND dc.manufacturer = COALESCE(uc.manufacturer, '')
            WHERE uc.status = 'want'
            ORDER BY dc.user_count DESC, uc.created_at DESC
        `;

        const result = await pool.query(query);
        return result.rows;
    },

    // Get per-user want summary (for admin)
    async getUserWantSummary() {
        const result = await pool.query(`
            SELECT
                u.id,
                u.username,
                u.email,
                COUNT(uc.id) as want_count,
                JSON_AGG(
                    JSON_BUILD_OBJECT('set_name', sc.set_name, 'count', sc.cnt)
                    ORDER BY sc.cnt DESC
                ) as sets_wanted
            FROM users u
            JOIN user_collections uc ON uc.user_id = u.id AND uc.status = 'want'
            JOIN (
                SELECT user_id, set_name, COUNT(*) as cnt
                FROM user_collections
                WHERE status = 'want' AND set_name IS NOT NULL
                GROUP BY user_id, set_name
            ) sc ON sc.user_id = u.id
            GROUP BY u.id, u.username, u.email
            ORDER BY want_count DESC
        `);
        return result.rows;
    },

    // Get most wanted cards summary (for admin dashboard)
    async getMostWanted(limit = 20) {
        const query = `
            SELECT
                card_name,
                set_name,
                manufacturer,
                insert_list,
                sport_type,
                COUNT(DISTINCT user_id) as user_count,
                STRING_AGG(DISTINCT u.username, ', ' ORDER BY u.username) as users_wanting
            FROM user_collections uc
            INNER JOIN users u ON uc.user_id = u.id
            WHERE uc.status = 'want'
            GROUP BY card_name, set_name, manufacturer, insert_list, sport_type
            ORDER BY user_count DESC, card_name
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        return result.rows;
    },

    async getSetProgress(userId) {
        const query = `
            SELECT
                c.set_name,
                COUNT(DISTINCT c.id)::int AS total,
                COUNT(DISTINCT uc.card_id)::int AS have
            FROM cards c
            LEFT JOIN user_collections uc
                ON uc.card_id = c.id AND uc.user_id = $1 AND uc.status = 'have'
            WHERE c.available = true AND c.set_name IS NOT NULL
            GROUP BY c.set_name
            ORDER BY (COUNT(DISTINCT uc.card_id) > 0) DESC, c.set_name ASC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    async getSetCards(userId, setName) {
        const query = `
            SELECT
                c.id,
                c.card_name,
                c.card_number,
                c.image_front,
                c.insert_list,
                EXISTS(
                    SELECT 1 FROM user_collections uc
                    WHERE uc.card_id = c.id AND uc.user_id = $1
                      AND uc.status = 'have' AND uc.variation_id IS NULL
                ) AS user_has,
                EXISTS(
                    SELECT 1 FROM user_collections uc
                    WHERE uc.card_id = c.id AND uc.user_id = $1
                      AND uc.status = 'want' AND uc.variation_id IS NULL
                ) AS user_wants
            FROM cards c
            WHERE c.available = true AND c.set_name = $2
            ORDER BY
                regexp_replace(c.card_number, '[0-9]+$', '') ASC,
                CAST(NULLIF(regexp_replace(c.card_number, '[^0-9]', '', 'g'), '') AS INTEGER) ASC NULLS LAST
        `;
        const result = await pool.query(query, [userId, setName]);
        return result.rows.map(row => ({
            ...row,
            user_has: !!row.user_has,
            user_wants: !!row.user_wants,
        }));
    }
};

module.exports = Collection;
