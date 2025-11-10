const db = require('../config/database');

class Notification {
  /**
   * Create wishlist notification when card matches want list
   */
  static async createWishlistAlert(userId, cardId, collectionItemId) {
    const query = `
      INSERT INTO wishlist_notifications (user_id, card_id, collection_item_id, notification_type, sent)
      VALUES ($1, $2, $3, 'new_match', false)
      RETURNING *
    `;

    const result = await db.query(query, [userId, cardId, collectionItemId]);
    return result.rows[0];
  }

  /**
   * Get pending notifications for user
   */
  static async getPending(userId) {
    const query = `
      SELECT wn.*, c.card_name, c.set_name, c.price_nzd, c.image_front
      FROM wishlist_notifications wn
      JOIN cards c ON wn.card_id = c.id
      WHERE wn.user_id = $1 AND wn.sent = false
      ORDER BY wn.created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Mark notification as sent
   */
  static async markSent(id) {
    const query = `
      UPDATE wishlist_notifications
      SET sent = true, sent_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await db.query(query, [id]);
  }

  /**
   * Get user notification preferences
   */
  static async getPreferences(userId) {
    const query = `
      SELECT * FROM notification_preferences WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      // Create default preferences
      return this.createPreferences(userId);
    }

    return result.rows[0];
  }

  /**
   * Create default notification preferences
   */
  static async createPreferences(userId) {
    const query = `
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      RETURNING *
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(userId, preferences) {
    const query = `
      UPDATE notification_preferences
      SET wishlist_alerts = COALESCE($2, wishlist_alerts),
          price_drop_alerts = COALESCE($3, price_drop_alerts),
          new_stock_alerts = COALESCE($4, new_stock_alerts),
          order_updates = COALESCE($5, order_updates),
          marketing_emails = COALESCE($6, marketing_emails),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      userId,
      preferences.wishlist_alerts,
      preferences.price_drop_alerts,
      preferences.new_stock_alerts,
      preferences.order_updates,
      preferences.marketing_emails
    ]);

    return result.rows[0];
  }

  /**
   * Check for wishlist matches and create notifications
   */
  static async checkWishlistMatches() {
    // Find all "want" items in user collections
    const query = `
      SELECT uc.id, uc.user_id, uc.card_name, uc.set_name, uc.card_number,
             c.id as card_id, c.price_nzd
      FROM user_collections uc
      JOIN cards c ON LOWER(c.card_name) LIKE LOWER(uc.card_name)
        AND (uc.set_name IS NULL OR LOWER(c.set_name) LIKE LOWER(uc.set_name))
        AND (uc.card_number IS NULL OR c.card_number = uc.card_number)
      WHERE uc.status = 'want'
        AND c.available = true
        AND c.quantity > 0
        AND NOT EXISTS (
          SELECT 1 FROM wishlist_notifications wn
          WHERE wn.collection_item_id = uc.id
            AND wn.card_id = c.id
        )
    `;

    const result = await db.query(query);

    // Create notifications for matches
    for (const match of result.rows) {
      await this.createWishlistAlert(match.user_id, match.card_id, match.id);
    }

    return result.rows.length;
  }

  /**
   * Send email notification (placeholder - integrate with actual email service)
   */
  static async sendEmail(userId, subject, message) {
    // TODO: Integrate with nodemailer or email service
    console.log(`[EMAIL] To User ${userId}: ${subject}`);
    console.log(`[EMAIL] Message: ${message}`);

    // For now, just log. In production, use:
    // const nodemailer = require('nodemailer');
    // Send actual email via SMTP or email service API
    return true;
  }
}

module.exports = Notification;
