const db = require('../config/database');

class CardImage {
  /**
   * Add image to card
   * @param {number} cardId - Card ID
   * @param {string} imageUrl - Image URL/path
   * @param {string} imageType - Type: 'front', 'back', 'detail', 'edge', 'corner'
   * @param {number} displayOrder - Display order
   */
  static async addImage(cardId, imageUrl, imageType = 'detail', displayOrder = 0) {
    const query = `
      INSERT INTO card_images (card_id, image_url, image_type, display_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [cardId, imageUrl, imageType, displayOrder]);
    return result.rows[0];
  }

  /**
   * Get all images for a card
   * @param {number} cardId - Card ID
   */
  static async getByCardId(cardId) {
    const query = `
      SELECT *
      FROM card_images
      WHERE card_id = $1
      ORDER BY display_order ASC, created_at ASC
    `;

    const result = await db.query(query, [cardId]);
    return result.rows;
  }

  /**
   * Delete image
   * @param {number} id - Image ID
   */
  static async delete(id) {
    const query = 'DELETE FROM card_images WHERE id = $1 RETURNING image_url';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update image order
   * @param {number} id - Image ID
   * @param {number} displayOrder - New display order
   */
  static async updateOrder(id, displayOrder) {
    const query = 'UPDATE card_images SET display_order = $1 WHERE id = $2';
    await db.query(query, [displayOrder, id]);
  }

  /**
   * Add multiple images at once
   * @param {number} cardId - Card ID
   * @param {array} images - Array of {url, type, order}
   */
  static async addMultiple(cardId, images) {
    const values = [];
    const placeholders = [];

    images.forEach((img, index) => {
      const offset = index * 4;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
      values.push(cardId, img.url, img.type || 'detail', img.order || index);
    });

    if (placeholders.length === 0) {
      return [];
    }

    const query = `
      INSERT INTO card_images (card_id, image_url, image_type, display_order)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = CardImage;
