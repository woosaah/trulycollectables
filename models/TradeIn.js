const db = require('../config/database');

class TradeIn {
  static async submit(userId, submissionData) {
    const query = `
      INSERT INTO trade_submissions (
        user_id, card_name, set_name, card_number, year,
        sport_type, condition, asking_price_nzd, description,
        image_urls, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *
    `;

    const values = [
      userId,
      submissionData.card_name,
      submissionData.set_name || null,
      submissionData.card_number || null,
      submissionData.year || null,
      submissionData.sport_type || null,
      submissionData.condition || null,
      submissionData.asking_price_nzd || null,
      submissionData.description || null,
      submissionData.image_urls || []
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT ts.*, u.username, u.email
      FROM trade_submissions ts
      LEFT JOIN users u ON ts.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND ts.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.user_id) {
      query += ` AND ts.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }

    query += ' ORDER BY ts.created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT ts.*, u.username, u.email
      FROM trade_submissions ts
      LEFT JOIN users u ON ts.user_id = u.id
      WHERE ts.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async updateStatus(id, status, offerAmount = null, adminNotes = null) {
    const query = `
      UPDATE trade_submissions
      SET status = $1,
          offer_amount_nzd = COALESCE($2, offer_amount_nzd),
          admin_notes = COALESCE($3, admin_notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(query, [status, offerAmount, adminNotes, id]);
    return result.rows[0];
  }

  static async acceptOffer(id) {
    return this.updateStatus(id, 'accepted');
  }

  static async declineOffer(id) {
    return this.updateStatus(id, 'declined');
  }

  static async complete(id) {
    return this.updateStatus(id, 'completed');
  }
}

module.exports = TradeIn;
