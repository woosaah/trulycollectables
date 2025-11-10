const db = require('../config/database');

class SocialProof {
  /**
   * Track card view
   */
  static async trackView(cardId, userId = null, sessionId = null) {
    const query = `
      INSERT INTO card_views (card_id, user_id, session_id)
      VALUES ($1, $2, $3)
    `;

    await db.query(query, [cardId, userId, sessionId]);

    // Update view count on card
    await db.query('UPDATE cards SET view_count = view_count + 1 WHERE id = $1', [cardId]);
  }

  /**
   * Get recent viewers count (last 24 hours)
   */
  static async getRecentViewers(cardId, hours = 24) {
    const query = `
      SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id)) as viewer_count
      FROM card_views
      WHERE card_id = $1
        AND viewed_at > NOW() - INTERVAL '${hours} hours'
    `;

    const result = await db.query(query, [cardId]);
    return parseInt(result.rows[0].viewer_count) || 0;
  }

  /**
   * Record card sale
   */
  static async recordSale(cardId, cardName, setName, priceNzd) {
    const query = `
      INSERT INTO sold_cards (card_id, card_name, set_name, price_nzd)
      VALUES ($1, $2, $3, $4)
    `;

    await db.query(query, [cardId, cardName, setName, priceNzd]);

    // Update times_sold on card
    await db.query('UPDATE cards SET times_sold = times_sold + 1 WHERE id = $1', [cardId]);
  }

  /**
   * Get recently sold cards
   */
  static async getRecentlySold(limit = 10) {
    const query = `
      SELECT *
      FROM sold_cards
      ORDER BY sold_at DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get price history for card
   */
  static async getPriceHistory(cardId) {
    const query = `
      SELECT *
      FROM price_history
      WHERE card_id = $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [cardId]);
    return result.rows;
  }

  /**
   * Get price trend (percentage change)
   */
  static async getPriceTrend(cardId) {
    const query = `
      SELECT
        price_nzd,
        created_at,
        LAG(price_nzd) OVER (ORDER BY created_at DESC) as previous_price
      FROM price_history
      WHERE card_id = $1
      ORDER BY created_at DESC
      LIMIT 2
    `;

    const result = await db.query(query, [cardId]);

    if (result.rows.length < 2) {
      return null;
    }

    const current = parseFloat(result.rows[0].price_nzd);
    const previous = parseFloat(result.rows[0].previous_price || result.rows[1].price_nzd);

    if (previous === 0) return null;

    const change = ((current - previous) / previous) * 100;

    return {
      current,
      previous,
      change: change.toFixed(2),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  }

  /**
   * Get popular cards (most viewed)
   */
  static async getPopularCards(limit = 10, days = 7) {
    const query = `
      SELECT c.*, COUNT(cv.id) as view_count
      FROM cards c
      LEFT JOIN card_views cv ON c.id = cv.card_id
        AND cv.viewed_at > NOW() - INTERVAL '${days} days'
      WHERE c.available = true
      GROUP BY c.id
      ORDER BY view_count DESC, c.created_at DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }
}

module.exports = SocialProof;
