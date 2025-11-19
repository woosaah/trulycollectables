const pool = require('../config/database');

const Coupon = {
    // Create coupon
    async create(couponData) {
        const {
            code, discount_type, discount_value, min_purchase_amount,
            max_discount_amount, usage_limit, valid_from, valid_until
        } = couponData;

        const query = `
            INSERT INTO coupons (
                code, discount_type, discount_value, min_purchase_amount,
                max_discount_amount, usage_limit, valid_from, valid_until
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const result = await pool.query(query, [
            code.toUpperCase(), discount_type, discount_value, min_purchase_amount,
            max_discount_amount, usage_limit, valid_from, valid_until
        ]);

        return result.rows[0];
    },

    // Find by code
    async findByCode(code) {
        const query = 'SELECT * FROM coupons WHERE code = $1';
        const result = await pool.query(query, [code.toUpperCase()]);
        return result.rows[0];
    },

    // Validate coupon
    async validate(code, subtotal) {
        const coupon = await this.findByCode(code);

        if (!coupon) {
            return { valid: false, message: 'Invalid coupon code' };
        }

        if (!coupon.active) {
            return { valid: false, message: 'This coupon is no longer active' };
        }

        const now = new Date();

        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
            return { valid: false, message: 'This coupon is not yet valid' };
        }

        if (coupon.valid_until && new Date(coupon.valid_until) < now) {
            return { valid: false, message: 'This coupon has expired' };
        }

        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return { valid: false, message: 'This coupon has reached its usage limit' };
        }

        if (coupon.min_purchase_amount && subtotal < coupon.min_purchase_amount) {
            return {
                valid: false,
                message: `Minimum purchase of NZD $${coupon.min_purchase_amount.toFixed(2)} required`
            };
        }

        // Calculate discount
        let discountAmount = 0;

        if (coupon.discount_type === 'percentage') {
            discountAmount = (subtotal * coupon.discount_value) / 100;
        } else if (coupon.discount_type === 'fixed') {
            discountAmount = coupon.discount_value;
        }

        // Apply max discount cap
        if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
            discountAmount = coupon.max_discount_amount;
        }

        // Don't exceed subtotal
        if (discountAmount > subtotal) {
            discountAmount = subtotal;
        }

        return {
            valid: true,
            coupon,
            discountAmount
        };
    },

    // Record usage
    async recordUsage(couponId, userId, orderId, discountAmount) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Increment used count
            await client.query(
                'UPDATE coupons SET used_count = used_count + 1 WHERE id = $1',
                [couponId]
            );

            // Record usage
            const query = `
                INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;

            const result = await client.query(query, [couponId, userId, orderId, discountAmount]);

            await client.query('COMMIT');

            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Get all coupons (admin)
    async findAll() {
        const query = `
            SELECT * FROM coupons
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query);
        return result.rows;
    },

    // Update coupon
    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id') {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        values.push(id);
        const query = `
            UPDATE coupons
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Delete coupon
    async delete(id) {
        const query = 'DELETE FROM coupons WHERE id = $1';
        await pool.query(query, [id]);
    }
};

module.exports = Coupon;
