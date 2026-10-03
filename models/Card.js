const pool = require('../config/database');

const Card = {
    // Helper function to normalize card data (convert string numbers to actual numbers)
    normalizeCard(card) {
        if (!card) return null;
        return {
            ...card,
            price_nzd: card.price_nzd ? parseFloat(card.price_nzd) : null,
            quantity: card.quantity ? parseInt(card.quantity) : 0,
            year: card.year ? parseInt(card.year) : null,
            is_rookie_card: !!card.is_rookie_card,
            product_type: card.product_type || 'single'
        };
    },

    normalizeCards(cards) {
        return cards.map(card => this.normalizeCard(card));
    },

    // Create a new card
    async create(cardData) {
        const {
            card_name, set_name, card_number, year, card_category, sport_type, manufacturer, insert_list,
            condition, price_nzd, quantity, image_front, image_back, description,
            team, variation, notes, is_rookie_card, product_type, player_id
        } = cardData;

        const query = `
            INSERT INTO cards (
                card_name, set_name, card_number, year, card_category, sport_type, manufacturer, insert_list,
                condition, price_nzd, quantity, image_front, image_back, description,
                team, variation, notes, is_rookie_card, product_type, player_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `;

        const result = await pool.query(query, [
            card_name, set_name, card_number, year, card_category, sport_type, manufacturer, insert_list,
            condition, price_nzd, quantity, image_front, image_back, description,
            team || null, variation || null, notes || null,
            is_rookie_card === 'on' || is_rookie_card === true || is_rookie_card === 'true' ? true : false,
            product_type || 'single',
            player_id || null
        ]);

        return this.normalizeCard(result.rows[0]);
    },

    // Get all cards with pagination and filters
    async findAll(filters = {}, limit = 20, offset = 0, includeUnavailable = false) {
        let query = includeUnavailable ? 'SELECT * FROM cards WHERE 1=1' : 'SELECT * FROM cards WHERE available = true';
        const params = [];
        let paramCount = 1;

        if (filters.card_category) {
            query += ` AND card_category = $${paramCount}`;
            params.push(filters.card_category);
            paramCount++;
        }

        if (filters.sport_type) {
            query += ` AND sport_type = $${paramCount}`;
            params.push(filters.sport_type);
            paramCount++;
        }

        if (filters.set_name) {
            query += ` AND set_name ILIKE $${paramCount}`;
            params.push(`%${filters.set_name}%`);
            paramCount++;
        }

        if (filters.year) {
            query += ` AND year = $${paramCount}`;
            params.push(filters.year);
            paramCount++;
        }

        if (filters.condition) {
            query += ` AND condition = $${paramCount}`;
            params.push(filters.condition);
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

        if (filters.manufacturer) {
            query += ` AND manufacturer ILIKE $${paramCount}`;
            params.push(`%${filters.manufacturer}%`);
            paramCount++;
        }

        if (filters.search) {
            query += ` AND (card_name ILIKE $${paramCount} OR set_name ILIKE $${paramCount} OR card_number ILIKE $${paramCount} OR manufacturer ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }

        if (filters.product_type) {
            query += ` AND product_type = $${paramCount}`;
            params.push(filters.product_type);
            paramCount++;
        }

        if (filters.team) {
            query += ` AND team ILIKE $${paramCount}`;
            params.push(`%${filters.team}%`);
            paramCount++;
        }

        if (filters.is_rookie_card === 'true' || filters.is_rookie_card === true) {
            query += ' AND is_rookie_card = true';
        }

        if (filters.player_id) {
            query += ` AND player_id = $${paramCount}`;
            params.push(filters.player_id);
            paramCount++;
        }

        // Sorting
        const validSorts = ['created_at', 'card_name', 'price_nzd', 'year', 'card_number'];
        const sortBy = validSorts.includes(filters.sort) ? filters.sort : 'created_at';
        const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';

        if (sortBy === 'card_number') {
            // Natural alphanumeric sort: pure numbers first, then prefixed (LE1, LL1 etc.)
            query += ` ORDER BY regexp_replace(card_number, '[0-9]+$', '') ${sortOrder}, CAST(NULLIF(regexp_replace(card_number, '[^0-9]', '', 'g'), '') AS INTEGER) ${sortOrder}`;
        } else {
            query += ` ORDER BY ${sortBy} ${sortOrder}`;
        }

        // Pagination
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return this.normalizeCards(result.rows);
    },

    // Get total count of cards (for pagination)
    async count(filters = {}, includeUnavailable = false) {
        let query = includeUnavailable ? 'SELECT COUNT(*) FROM cards WHERE 1=1' : 'SELECT COUNT(*) FROM cards WHERE available = true';
        const params = [];
        let paramCount = 1;

        if (filters.card_category) {
            query += ` AND card_category = $${paramCount}`;
            params.push(filters.card_category);
            paramCount++;
        }

        if (filters.sport_type) {
            query += ` AND sport_type = $${paramCount}`;
            params.push(filters.sport_type);
            paramCount++;
        }

        if (filters.set_name) {
            query += ` AND set_name ILIKE $${paramCount}`;
            params.push(`%${filters.set_name}%`);
            paramCount++;
        }

        if (filters.year) {
            query += ` AND year = $${paramCount}`;
            params.push(filters.year);
            paramCount++;
        }

        if (filters.condition) {
            query += ` AND condition = $${paramCount}`;
            params.push(filters.condition);
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

        if (filters.manufacturer) {
            query += ` AND manufacturer ILIKE $${paramCount}`;
            params.push(`%${filters.manufacturer}%`);
            paramCount++;
        }

        if (filters.search) {
            query += ` AND (card_name ILIKE $${paramCount} OR set_name ILIKE $${paramCount} OR card_number ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }

        if (filters.product_type) {
            query += ` AND product_type = $${paramCount}`;
            params.push(filters.product_type);
            paramCount++;
        }

        if (filters.team) {
            query += ` AND team ILIKE $${paramCount}`;
            params.push(`%${filters.team}%`);
            paramCount++;
        }

        if (filters.is_rookie_card === 'true' || filters.is_rookie_card === true) {
            query += ' AND is_rookie_card = true';
        }

        if (filters.player_id) {
            query += ` AND player_id = $${paramCount}`;
            params.push(filters.player_id);
            paramCount++;
        }

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    },

    // Get card by ID
    async findById(id) {
        const query = 'SELECT * FROM cards WHERE id = $1';
        const result = await pool.query(query, [id]);
        return this.normalizeCard(result.rows[0]);
    },

    async search(term) {
        const like = `%${term}%`;
        const result = await pool.query(`
            SELECT id, card_name, set_name, card_number, manufacturer, year, sport_type, card_category, image_front, price_nzd, quantity
            FROM cards
            WHERE available = true
              AND (LOWER(card_name) LIKE LOWER($1)
                OR LOWER(COALESCE(set_name, '')) LIKE LOWER($1)
                OR LOWER(COALESCE(manufacturer, '')) LIKE LOWER($1))
            ORDER BY card_name
            LIMIT 100
        `, [like]);
        return result.rows;
    },

    // Update card
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
            UPDATE cards
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return this.normalizeCard(result.rows[0]);
    },

    // Delete card
    async delete(id) {
        const query = 'DELETE FROM cards WHERE id = $1';
        await pool.query(query, [id]);
    },

    // Get unique sport types
    async getSportTypes(card_category = null) {
        let query, result;
        if (card_category) {
            query = 'SELECT DISTINCT sport_type AS name FROM cards WHERE sport_type IS NOT NULL AND card_category = $1 ORDER BY sport_type';
            result = await pool.query(query, [card_category]);
        } else {
            query = 'SELECT name FROM sport_types ORDER BY name';
            result = await pool.query(query);
        }
        return result.rows.map(row => row.name);
    },

    // Get unique sets
    async getSets() {
        const query = 'SELECT DISTINCT set_name FROM cards WHERE set_name IS NOT NULL ORDER BY set_name';
        const result = await pool.query(query);
        return result.rows.map(row => row.set_name);
    },

    // Get unique manufacturers
    async getManufacturers() {
        const query = `
            SELECT DISTINCT manufacturer FROM (
                SELECT manufacturer FROM cards WHERE manufacturer IS NOT NULL
                UNION
                SELECT manufacturer FROM sets WHERE manufacturer IS NOT NULL
            ) combined
            ORDER BY manufacturer
        `;
        const result = await pool.query(query);
        return result.rows.map(row => row.manufacturer);
    },

    // Get manufacturers by sport type
    async getManufacturersByType(sportType) {
        const query = `
            SELECT DISTINCT manufacturer
            FROM cards
            WHERE manufacturer IS NOT NULL
            AND sport_type = $1
            ORDER BY manufacturer
        `;
        const result = await pool.query(query, [sportType]);
        return result.rows.map(row => row.manufacturer);
    },

    // Get sets by manufacturer and sport type
    async getSetsByManufacturer(manufacturer, sportType = null) {
        let query = `
            SELECT DISTINCT set_name
            FROM cards
            WHERE set_name IS NOT NULL
            AND manufacturer = $1
        `;
        const params = [manufacturer];

        if (sportType) {
            query += ` AND sport_type = $2`;
            params.push(sportType);
        }

        query += ` ORDER BY set_name`;

        const result = await pool.query(query, params);
        return result.rows.map(row => row.set_name);
    },

    // Get navigation tree (category -> sport/manufacturer -> year -> set)
    async getNavigationTree() {
        const query = `
            SELECT
                card_category,
                sport_type,
                manufacturer,
                year,
                set_name,
                COUNT(*) as card_count
            FROM cards
            WHERE available = true
            GROUP BY card_category, sport_type, manufacturer, year, set_name
            ORDER BY card_category, sport_type, manufacturer, year, set_name
        `;
        const result = await pool.query(query);

        // Build tree structure
        const tree = {
            sport: {},
            non_sport: {}
        };

        result.rows.forEach(row => {
            const category = row.card_category || 'sport';
            const sportType = row.sport_type || 'Uncategorized';
            const manufacturer = row.manufacturer || 'Unknown';
            const year = row.year || 'No Year';

            // For non-sport: manufacturer -> year -> set
            if (category === 'non_sport') {
                if (!tree.non_sport[manufacturer]) {
                    tree.non_sport[manufacturer] = {};
                }
                if (!tree.non_sport[manufacturer][year]) {
                    tree.non_sport[manufacturer][year] = [];
                }
                tree.non_sport[manufacturer][year].push({
                    name: row.set_name,
                    count: parseInt(row.card_count)
                });
            } else {
                // For sport: sport -> manufacturer -> year -> set
                if (!tree.sport[sportType]) {
                    tree.sport[sportType] = {};
                }
                if (!tree.sport[sportType][manufacturer]) {
                    tree.sport[sportType][manufacturer] = {};
                }
                if (!tree.sport[sportType][manufacturer][year]) {
                    tree.sport[sportType][manufacturer][year] = [];
                }
                tree.sport[sportType][manufacturer][year].push({
                    name: row.set_name,
                    count: parseInt(row.card_count)
                });
            }
        });

        return tree;
    },

    // Get unique teams
    async getTeams() {
        const query = "SELECT DISTINCT team FROM cards WHERE team IS NOT NULL AND team != '' ORDER BY team";
        const result = await pool.query(query);
        return result.rows.map(row => row.team);
    },

    // Get unique sport/product types actually present in the catalogue
    async getSportTypes() {
        const query = "SELECT DISTINCT sport_type FROM cards WHERE sport_type IS NOT NULL AND sport_type != '' ORDER BY sport_type";
        const result = await pool.query(query);
        return result.rows.map(row => row.sport_type);
    },

    // Get featured cards (most recent)
    async getFeatured(limit = 6) {
        const query = `
            SELECT * FROM cards
            WHERE available = true
            ORDER BY created_at DESC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return this.normalizeCards(result.rows);
    }
};

module.exports = Card;
