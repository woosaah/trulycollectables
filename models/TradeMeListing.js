const pool = require('../config/database');

const TradeMeListing = {
    // Create listing
    async create(listingData) {
        const {
            card_id, figurine_id, title, category, subtitle, description,
            duration, start_price, reserve_price, buy_now_price, shipping_price,
            pickup_allowed, payment_methods, shipping_options, photos, created_by
        } = listingData;

        const query = `
            INSERT INTO trademe_listings (
                card_id, figurine_id, title, category, subtitle, description,
                duration, start_price, reserve_price, buy_now_price, shipping_price,
                pickup_allowed, payment_methods, shipping_options, photos, created_by, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'draft')
            RETURNING *
        `;

        const result = await pool.query(query, [
            card_id, figurine_id, title, category, subtitle, description,
            duration, start_price, reserve_price, buy_now_price, shipping_price,
            pickup_allowed,
            payment_methods ? JSON.stringify(payment_methods) : null,
            shipping_options ? JSON.stringify(shipping_options) : null,
            photos ? JSON.stringify(photos) : null,
            created_by
        ]);

        return result.rows[0];
    },

    // Get all listings
    async findAll(filters = {}) {
        let query = `
            SELECT
                tl.*,
                c.card_name,
                c.set_name,
                c.image_front,
                f.product_name,
                f.image_url,
                u.username as created_by_username
            FROM trademe_listings tl
            LEFT JOIN cards c ON tl.card_id = c.id
            LEFT JOIN figurines f ON tl.figurine_id = f.id
            LEFT JOIN users u ON tl.created_by = u.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        if (filters.status) {
            query += ` AND tl.status = $${paramCount}`;
            params.push(filters.status);
            paramCount++;
        }

        if (filters.card_id) {
            query += ` AND tl.card_id = $${paramCount}`;
            params.push(filters.card_id);
            paramCount++;
        }

        if (filters.figurine_id) {
            query += ` AND tl.figurine_id = $${paramCount}`;
            params.push(filters.figurine_id);
            paramCount++;
        }

        query += ' ORDER BY tl.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Get listing by ID
    async findById(id) {
        const query = `
            SELECT
                tl.*,
                c.card_name,
                c.set_name,
                c.image_front,
                c.price_nzd as card_price,
                f.product_name,
                f.image_url,
                f.price_nzd as figurine_price
            FROM trademe_listings tl
            LEFT JOIN cards c ON tl.card_id = c.id
            LEFT JOIN figurines f ON tl.figurine_id = f.id
            WHERE tl.id = $1
        `;

        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Update listing
    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id') {
                // Handle JSON fields
                if (['payment_methods', 'shipping_options', 'photos'].includes(key)) {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(JSON.stringify(value));
                } else {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(value);
                }
                paramCount++;
            }
        }

        values.push(id);
        const query = `
            UPDATE trademe_listings
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Update from TradeMe response
    async updateFromTradeMe(id, trademeData) {
        const updates = {
            trademe_listing_id: trademeData.ListingId,
            trademe_status: trademeData.Status,
            trademe_url: trademeData.Url || `https://www.trademe.co.nz/Browse/Listing.aspx?id=${trademeData.ListingId}`,
            status: 'active',
            start_date: trademeData.StartDate,
            end_date: trademeData.EndDate,
            last_synced_at: new Date()
        };

        if (trademeData.CurrentBid) {
            updates.current_bid = trademeData.CurrentBid;
        }

        if (trademeData.BidCount !== undefined) {
            updates.bid_count = trademeData.BidCount;
        }

        if (trademeData.ViewCount !== undefined) {
            updates.view_count = trademeData.ViewCount;
        }

        return await this.update(id, updates);
    },

    // Delete listing
    async delete(id) {
        const query = 'DELETE FROM trademe_listings WHERE id = $1';
        await pool.query(query, [id]);
    },

    // Get active listings
    async getActive() {
        return await this.findAll({ status: 'active' });
    },

    // Get draft listings
    async getDrafts() {
        return await this.findAll({ status: 'draft' });
    },

    // Sync listing with TradeMe
    async syncFromTradeMe(id, trademeData) {
        const updates = {
            trademe_status: trademeData.Status,
            current_bid: trademeData.CurrentBid || 0,
            bid_count: trademeData.BidCount || 0,
            view_count: trademeData.ViewCount || 0,
            watchlist_count: trademeData.WatchlistCount || 0,
            last_synced_at: new Date()
        };

        // Update status based on TradeMe status
        if (trademeData.Status === 'Closed') {
            if (trademeData.SuccessfulBidder) {
                updates.status = 'sold';
            } else {
                updates.status = 'unsold';
            }
        }

        return await this.update(id, updates);
    },

    // Get listings needing sync
    async getNeedingSync() {
        const query = `
            SELECT * FROM trademe_listings
            WHERE status = 'active'
            AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '1 hour')
            ORDER BY last_synced_at ASC NULLS FIRST
            LIMIT 50
        `;

        const result = await pool.query(query);
        return result.rows;
    },

    // Get questions for listing
    async getQuestions(listingId) {
        const query = `
            SELECT * FROM trademe_questions
            WHERE trademe_listing_id = $1
            ORDER BY asked_at DESC
        `;

        const result = await pool.query(query, [listingId]);
        return result.rows;
    },

    // Add question
    async addQuestion(listingId, questionData) {
        const query = `
            INSERT INTO trademe_questions (
                trademe_listing_id, question_id, question_text,
                asker_nickname, asked_at
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (question_id) DO UPDATE SET
                question_text = EXCLUDED.question_text
            RETURNING *
        `;

        const result = await pool.query(query, [
            listingId,
            questionData.QuestionId,
            questionData.Question,
            questionData.AskerNickname,
            questionData.AskedDate
        ]);

        return result.rows[0];
    },

    // Answer question
    async answerQuestion(questionId, answer) {
        const query = `
            UPDATE trademe_questions
            SET answer_text = $1, is_answered = true, answered_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [answer, questionId]);
        return result.rows[0];
    }
};

module.exports = TradeMeListing;
