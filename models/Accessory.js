const pool = require('../config/database');

const Accessory = {
    // Helper function to normalize accessory data
    normalizeAccessory(accessory) {
        if (!accessory) return null;
        return {
            ...accessory,
            price_nzd: accessory.price_nzd ? parseFloat(accessory.price_nzd) : null,
            quantity: accessory.quantity ? parseInt(accessory.quantity) : 0
        };
    },

    normalizeAccessories(accessories) {
        return accessories.map(accessory => this.normalizeAccessory(accessory));
    },

    // Create a new accessory
    async create(accessoryData) {
        const {
            product_name, category, description, price_nzd, quantity, image_url, manufacturer
        } = accessoryData;

        const query = `
            INSERT INTO accessories (
                product_name, category, description, price_nzd, quantity, image_url, manufacturer
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await pool.query(query, [
            product_name, category, description, price_nzd, quantity, image_url, manufacturer
        ]);

        return this.normalizeAccessory(result.rows[0]);
    },

    // Get all accessories with pagination and filters
    async findAll(filters = {}, limit = 20, offset = 0, includeUnavailable = false) {
        let query = includeUnavailable ? 'SELECT * FROM accessories WHERE 1=1' : 'SELECT * FROM accessories WHERE available = true';
        const params = [];
        let paramCount = 1;

        if (filters.category) {
            query += ` AND category = $${paramCount}`;
            params.push(filters.category);
            paramCount++;
        }

        if (filters.manufacturer) {
            query += ` AND manufacturer ILIKE $${paramCount}`;
            params.push(`%${filters.manufacturer}%`);
            paramCount++;
        }

        if (filters.search) {
            query += ` AND (product_name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR manufacturer ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }

        if (filters.min_price) {
            query += ` AND price_nzd >= $${paramCount}`;
            params.push(filters.min_price);
            paramCount++;
        }

        if (filters.max_price) {
            query += ` AND price_nzd <= $${paramCount}`;
            params.push(filters.max_price);
            paramCount++;
        }

        // Sorting
        const sortBy = filters.sort || 'created_at';
        const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // Pagination
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return this.normalizeAccessories(result.rows);
    },

    // Get total count of accessories (for pagination)
    async count(filters = {}, includeUnavailable = false) {
        let query = includeUnavailable ? 'SELECT COUNT(*) FROM accessories WHERE 1=1' : 'SELECT COUNT(*) FROM accessories WHERE available = true';
        const params = [];
        let paramCount = 1;

        if (filters.category) {
            query += ` AND category = $${paramCount}`;
            params.push(filters.category);
            paramCount++;
        }

        if (filters.search) {
            query += ` AND (product_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    },

    // Get accessory by ID
    async findById(id) {
        const query = 'SELECT * FROM accessories WHERE id = $1';
        const result = await pool.query(query, [id]);
        return this.normalizeAccessory(result.rows[0]);
    },

    // Update accessory
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
            UPDATE accessories
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return this.normalizeAccessory(result.rows[0]);
    },

    // Delete accessory
    async delete(id) {
        const query = 'DELETE FROM accessories WHERE id = $1';
        await pool.query(query, [id]);
    },

    // Get unique categories
    async getCategories() {
        const query = 'SELECT DISTINCT category FROM accessories WHERE category IS NOT NULL ORDER BY category';
        const result = await pool.query(query);
        return result.rows.map(row => row.category);
    },

    // Get unique manufacturers
    async getManufacturers() {
        const query = 'SELECT DISTINCT manufacturer FROM accessories WHERE manufacturer IS NOT NULL ORDER BY manufacturer';
        const result = await pool.query(query);
        return result.rows.map(row => row.manufacturer);
    },

    // Get featured accessories (most recent)
    async getFeatured(limit = 6) {
        const query = `
            SELECT * FROM accessories
            WHERE available = true
            ORDER BY created_at DESC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return this.normalizeAccessories(result.rows);
    },

    // Toggle availability
    async toggleAvailability(id) {
        const query = `
            UPDATE accessories
            SET available = NOT available
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [id]);
        return this.normalizeAccessory(result.rows[0]);
    }
};

module.exports = Accessory;
