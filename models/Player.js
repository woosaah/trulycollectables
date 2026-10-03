const pool = require('../config/database');

const toTitleCase = (str) => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const SPORTS_LIST = ['AFL', 'Basketball', 'Boxing', 'Cricket', 'F1', 'Rugby', 'Rugby League', 'Rugby Sevens', 'Other'];
const REP_TEAMS = [
    { key: 'played_for_all_blacks', label: 'All Blacks' },
    { key: 'played_for_maori', label: 'Maori All Blacks' },
    { key: 'played_for_kiwis', label: 'Kiwis' },
    { key: 'played_for_maori_rl', label: 'Maori RL' },
    { key: 'played_for_black_caps', label: 'Black Caps' },
    { key: 'played_for_white_ferns', label: 'White Ferns' },
    { key: 'played_for_black_ferns', label: 'Black Ferns' },
    { key: 'played_for_kiwi_ferns', label: 'Kiwi Ferns' },
    { key: 'played_for_tall_blacks', label: 'Tall Blacks' },
    { key: 'played_for_other', label: 'Other' }
];

const Player = {
    SPORTS_LIST,
    REP_TEAMS,

    async findAll(filters = {}, limit = 50, offset = 0) {
        let query = 'SELECT p.*, (SELECT COUNT(*) FROM cards c WHERE c.player_id = p.id) as card_count FROM players p WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (filters.search) {
            paramCount++;
            query += ` AND p.name ILIKE $${paramCount}`;
            params.push(`%${filters.search}%`);
        }

        if (filters.sport) {
            paramCount++;
            query += ` AND $${paramCount} = ANY(p.sports_played)`;
            params.push(filters.sport);
        }

        if (filters.born_in_nz === 'true' || filters.born_in_nz === true) {
            query += ' AND p.born_in_nz = true';
        }

        if (filters.rep_team) {
            const validTeams = REP_TEAMS.map(t => t.key);
            if (validTeams.includes(filters.rep_team)) {
                query += ` AND p.${filters.rep_team} = true`;
            }
        }

        query += ` ORDER BY p.name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    },

    async count(filters = {}) {
        let query = 'SELECT COUNT(*) FROM players WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (filters.search) {
            paramCount++;
            query += ` AND name ILIKE $${paramCount}`;
            params.push(`%${filters.search}%`);
        }

        if (filters.sport) {
            paramCount++;
            query += ` AND $${paramCount} = ANY(sports_played)`;
            params.push(filters.sport);
        }

        if (filters.born_in_nz === 'true' || filters.born_in_nz === true) {
            query += ' AND born_in_nz = true';
        }

        if (filters.rep_team) {
            const validTeams = REP_TEAMS.map(t => t.key);
            if (validTeams.includes(filters.rep_team)) {
                query += ` AND ${filters.rep_team} = true`;
            }
        }

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    },

    async findById(id) {
        const query = 'SELECT * FROM players WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    async findByName(name) {
        const query = 'SELECT * FROM players WHERE LOWER(name) = LOWER($1)';
        const result = await pool.query(query, [name]);
        return result.rows[0];
    },

    async search(q, limit = 20) {
        const query = 'SELECT id, name FROM players WHERE name ILIKE $1 ORDER BY name LIMIT $2';
        const result = await pool.query(query, [`%${q}%`, limit]);
        return result.rows;
    },

    async create(data) {
        const query = `
            INSERT INTO players (
                name, born_in_nz, is_female, sports_played,
                played_for_all_blacks, played_for_maori, played_for_kiwis,
                played_for_maori_rl, played_for_black_caps, played_for_white_ferns,
                played_for_black_ferns, played_for_kiwi_ferns,
                played_for_tall_blacks, played_for_other, other_teams,
                image_url, bio
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `;
        const result = await pool.query(query, [
            toTitleCase(data.name),
            data.born_in_nz || false,
            data.is_female || false,
            data.sports_played || [],
            data.played_for_all_blacks || false,
            data.played_for_maori || false,
            data.played_for_kiwis || false,
            data.played_for_maori_rl || false,
            data.played_for_black_caps || false,
            data.played_for_white_ferns || false,
            data.played_for_black_ferns || false,
            data.played_for_kiwi_ferns || false,
            data.played_for_tall_blacks || false,
            data.played_for_other || false,
            data.other_teams || null,
            data.image_url || null,
            data.bio || null
        ]);
        return result.rows[0];
    },

    async update(id, data) {
        const query = `
            UPDATE players SET
                name = $1, born_in_nz = $2, is_female = $3, sports_played = $4,
                played_for_all_blacks = $5, played_for_maori = $6, played_for_kiwis = $7,
                played_for_maori_rl = $8, played_for_black_caps = $9, played_for_white_ferns = $10,
                played_for_black_ferns = $11, played_for_kiwi_ferns = $12,
                played_for_tall_blacks = $13, played_for_other = $14,
                other_teams = $15, image_url = $16, bio = $17
            WHERE id = $18
            RETURNING *
        `;
        const result = await pool.query(query, [
            toTitleCase(data.name),
            data.born_in_nz || false,
            data.is_female || false,
            data.sports_played || [],
            data.played_for_all_blacks || false,
            data.played_for_maori || false,
            data.played_for_kiwis || false,
            data.played_for_maori_rl || false,
            data.played_for_black_caps || false,
            data.played_for_white_ferns || false,
            data.played_for_black_ferns || false,
            data.played_for_kiwi_ferns || false,
            data.played_for_tall_blacks || false,
            data.played_for_other || false,
            data.other_teams || null,
            data.image_url || null,
            data.bio || null,
            id
        ]);
        return result.rows[0];
    },

    async delete(id) {
        // Unlink cards first
        await pool.query('UPDATE cards SET player_id = NULL WHERE player_id = $1', [id]);
        await pool.query('DELETE FROM players WHERE id = $1', [id]);
    },

    async getCards(playerId) {
        const query = 'SELECT * FROM cards WHERE player_id = $1 AND available = true ORDER BY set_name, card_number';
        const result = await pool.query(query, [playerId]);
        return result.rows;
    },

    async getTeams() {
        const query = "SELECT DISTINCT team FROM cards WHERE team IS NOT NULL AND team != '' ORDER BY team";
        const result = await pool.query(query);
        return result.rows.map(r => r.team);
    },

    // Auto-match players to unlinked cards by name
    async findMatches(playerId) {
        const player = await this.findById(playerId);
        if (!player) return [];

        const tokens = player.name.trim().split(/\s+/).filter(t => t.length > 1);
        if (tokens.length === 0) return [];

        // Build query: card_name must contain ALL name tokens
        let query = 'SELECT id, card_name, set_name, card_number, manufacturer FROM cards WHERE player_id IS NULL';
        const params = [];
        tokens.forEach((token, i) => {
            params.push(`%${token}%`);
            query += ` AND card_name ILIKE $${i + 1}`;
        });
        query += ' ORDER BY card_name LIMIT 100';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Bulk match: find matches for all unlinked players
    async findAllMatches() {
        const players = await pool.query('SELECT * FROM players ORDER BY name');
        const matches = [];

        for (const player of players.rows) {
            const cards = await this.findMatches(player.id);
            if (cards.length > 0) {
                matches.push({ player, cards });
            }
        }
        return matches;
    },

    // Link cards to a player
    async linkCards(playerId, cardIds) {
        if (!cardIds || cardIds.length === 0) return 0;
        const query = 'UPDATE cards SET player_id = $1 WHERE id = ANY($2::int[])';
        const result = await pool.query(query, [playerId, cardIds]);
        return result.rowCount;
    },

    // Unlink a card from its player
    async unlinkCard(cardId) {
        await pool.query('UPDATE cards SET player_id = NULL WHERE id = $1', [cardId]);
    },

    async getFeatured(limit = 8) {
        const query = `
            SELECT p.*, (SELECT COUNT(*) FROM cards c WHERE c.player_id = p.id AND c.available = true) as card_count
            FROM players p
            WHERE (SELECT COUNT(*) FROM cards c WHERE c.player_id = p.id AND c.available = true) > 0
            ORDER BY card_count DESC, p.name ASC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return result.rows;
    }
};

module.exports = Player;
