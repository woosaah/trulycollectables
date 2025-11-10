const db = require('../config/database');

class Bundle {
  static async create(bundleData) {
    const query = `
      INSERT INTO bundles (
        bundle_name, description, bundle_type, price_nzd,
        original_value_nzd, quantity, image_url, available
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      bundleData.bundle_name,
      bundleData.description,
      bundleData.bundle_type || 'themed',
      bundleData.price_nzd,
      bundleData.original_value_nzd || null,
      bundleData.quantity || 1,
      bundleData.image_url || null,
      bundleData.available !== false
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async addCards(bundleId, cardIds) {
    const values = [];
    const placeholders = [];

    cardIds.forEach((cardId, index) => {
      const offset = index * 3;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
      values.push(bundleId, cardId, 1);
    });

    const query = `
      INSERT INTO bundle_items (bundle_id, card_id, quantity)
      VALUES ${placeholders.join(', ')}
    `;

    await db.query(query, values);
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM bundles WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.bundle_type) {
      query += ` AND bundle_type = $${paramCount}`;
      params.push(filters.bundle_type);
      paramCount++;
    }

    if (filters.available !== undefined) {
      query += ` AND available = $${paramCount}`;
      params.push(filters.available);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM bundles WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getItems(bundleId) {
    const query = `
      SELECT bi.*, c.card_name, c.set_name, c.image_front, c.price_nzd
      FROM bundle_items bi
      JOIN cards c ON bi.card_id = c.id
      WHERE bi.bundle_id = $1
    `;

    const result = await db.query(query, [bundleId]);
    return result.rows;
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    values.push(id);

    const query = `
      UPDATE bundles
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM bundles WHERE id = $1';
    await db.query(query, [id]);
  }
}

module.exports = Bundle;
