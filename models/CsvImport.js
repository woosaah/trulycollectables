const db = require('../config/database');
const fs = require('fs');
const { parse } = require('csv-parse');
const Card = require('./Card');

class CsvImport {
  /**
   * Parse and validate CSV file
   * @param {string} filePath - Path to CSV file
   * @param {object} columnMapping - Map CSV columns to database fields
   * @returns {Promise<object>} - Parsed rows and validation results
   */
  static async parseCSV(filePath, columnMapping = {}) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let rowNumber = 0;

      fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_quotes: true
        }))
        .on('data', (row) => {
          rowNumber++;
          try {
            const mappedRow = this.mapRow(row, columnMapping);
            const validation = this.validateRow(mappedRow, rowNumber);

            if (validation.valid) {
              results.push(mappedRow);
            } else {
              errors.push({
                row: rowNumber,
                data: row,
                errors: validation.errors
              });
            }
          } catch (error) {
            errors.push({
              row: rowNumber,
              data: row,
              errors: [error.message]
            });
          }
        })
        .on('end', () => {
          resolve({ results, errors, totalRows: rowNumber });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Map CSV row to database fields
   */
  static mapRow(row, columnMapping) {
    const mapped = {};

    // Apply custom column mapping or use default field names
    const fieldMap = {
      card_name: columnMapping.card_name || 'card_name',
      set_name: columnMapping.set_name || 'set_name',
      card_number: columnMapping.card_number || 'card_number',
      manufacturer: columnMapping.manufacturer || 'manufacturer',
      insert_list: columnMapping.insert_list || 'insert_list',
      year: columnMapping.year || 'year',
      card_category: columnMapping.card_category || 'card_category',
      sport_type: columnMapping.sport_type || 'sport_type',
      condition: columnMapping.condition || 'condition',
      price_nzd: columnMapping.price_nzd || 'price_nzd',
      quantity: columnMapping.quantity || 'quantity',
      image_front: columnMapping.image_front || 'image_front',
      image_back: columnMapping.image_back || 'image_back',
      description: columnMapping.description || 'description'
    };

    for (const [dbField, csvField] of Object.entries(fieldMap)) {
      if (row[csvField] !== undefined && row[csvField] !== '') {
        mapped[dbField] = row[csvField];
      }
    }

    return mapped;
  }

  /**
   * Validate row data
   */
  static validateRow(row, rowNumber) {
    const errors = [];

    // Required fields
    if (!row.card_name || row.card_name.trim() === '') {
      errors.push('Card name is required');
    }

    // Validate card_category
    const validCategories = ['sport', 'non_sport'];
    if (row.card_category && !validCategories.includes(row.card_category.toLowerCase())) {
      errors.push(`Invalid category: ${row.card_category}. Must be one of: ${validCategories.join(', ')}`);
    }

    // Validate year
    if (row.year) {
      const year = parseInt(row.year);
      if (isNaN(year) || year < 1800 || year > new Date().getFullYear() + 1) {
        errors.push(`Invalid year: ${row.year}`);
      }
    }

    // Validate price
    if (row.price_nzd) {
      const price = parseFloat(row.price_nzd);
      if (isNaN(price) || price < 0) {
        errors.push(`Invalid price: ${row.price_nzd}`);
      }
    }

    // Validate quantity
    if (row.quantity) {
      const qty = parseInt(row.quantity);
      if (isNaN(qty) || qty < 0) {
        errors.push(`Invalid quantity: ${row.quantity}`);
      }
    }

    // Validate condition
    const validConditions = ['mint', 'near_mint', 'excellent', 'good', 'played'];
    if (row.condition && !validConditions.includes(row.condition.toLowerCase())) {
      errors.push(`Invalid condition: ${row.condition}. Must be one of: ${validConditions.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for duplicates in database
   * @param {array} rows - Parsed rows to check
   * @returns {Promise<object>} - Duplicate detection results
   */
  static async detectDuplicates(rows) {
    const duplicates = [];
    const unique = [];

    for (const row of rows) {
      try {
        // Check for exact match on card_name, set_name, and card_number
        const query = `
          SELECT id, card_name, set_name, card_number, price_nzd, quantity
          FROM cards
          WHERE card_name ILIKE $1
            AND (set_name ILIKE $2 OR ($2 IS NULL AND set_name IS NULL))
            AND (card_number = $3 OR ($3 IS NULL AND card_number IS NULL))
          LIMIT 1
        `;

        const result = await db.query(query, [
          row.card_name,
          row.set_name || null,
          row.card_number || null
        ]);

        if (result.rows.length > 0) {
          duplicates.push({
            csvRow: row,
            existingCard: result.rows[0],
            action: 'skip' // Can be 'skip', 'update', or 'merge'
          });
        } else {
          unique.push(row);
        }
      } catch (error) {
        console.error('Error checking duplicate:', error);
        unique.push(row); // If check fails, treat as unique
      }
    }

    return { duplicates, unique };
  }

  /**
   * Import cards from parsed CSV data
   * @param {array} rows - Validated rows to import
   * @param {number} userId - User performing the import
   * @param {string} filename - Original filename
   * @param {string} duplicateAction - How to handle duplicates ('skip', 'update', 'merge')
   * @returns {Promise<object>} - Import results
   */
  static async importCards(rows, userId, filename, duplicateAction = 'skip') {
    const client = await db.pool.getClient();
    let importId;
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const errorLog = [];

    try {
      await client.query('BEGIN');

      // Create import record
      const importResult = await client.query(
        `INSERT INTO csv_imports (user_id, filename, total_rows, status)
         VALUES ($1, $2, $3, 'processing')
         RETURNING id`,
        [userId, filename, rows.length]
      );
      importId = importResult.rows[0].id;

      // Detect duplicates
      const { duplicates, unique } = await this.detectDuplicates(rows);

      // Process unique cards
      for (const row of unique) {
        try {
          await this.insertCard(client, row, userId);
          successful++;
        } catch (error) {
          failed++;
          errorLog.push({
            card_name: row.card_name,
            error: error.message
          });
        }
      }

      // Handle duplicates based on action
      for (const dup of duplicates) {
        if (duplicateAction === 'skip') {
          skipped++;
        } else if (duplicateAction === 'update') {
          try {
            await this.updateCard(client, dup.existingCard.id, dup.csvRow, userId);
            successful++;
          } catch (error) {
            failed++;
            errorLog.push({
              card_name: dup.csvRow.card_name,
              error: error.message
            });
          }
        } else if (duplicateAction === 'merge') {
          try {
            await this.mergeCard(client, dup.existingCard.id, dup.csvRow);
            successful++;
          } catch (error) {
            failed++;
            errorLog.push({
              card_name: dup.csvRow.card_name,
              error: error.message
            });
          }
        }
      }

      // Update import record
      await client.query(
        `UPDATE csv_imports
         SET successful_rows = $1,
             failed_rows = $2,
             duplicates_skipped = $3,
             status = 'completed',
             error_log = $4
         WHERE id = $5`,
        [successful, failed, skipped, JSON.stringify(errorLog), importId]
      );

      await client.query('COMMIT');

      return {
        importId,
        successful,
        failed,
        skipped,
        totalRows: rows.length,
        errors: errorLog
      };
    } catch (error) {
      await client.query('ROLLBACK');

      // Update import as failed
      if (importId) {
        await client.query(
          `UPDATE csv_imports SET status = 'failed', error_log = $1 WHERE id = $2`,
          [JSON.stringify([{ error: error.message }]), importId]
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert new card from CSV data
   */
  static async insertCard(client, row, userId) {
    const query = `
      INSERT INTO cards (
        card_name, set_name, card_number, manufacturer, insert_list,
        year, card_category, sport_type, condition, price_nzd, quantity,
        image_front, image_back, description, available
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      RETURNING id
    `;

    const values = [
      row.card_name,
      row.set_name || null,
      row.card_number || null,
      row.manufacturer || null,
      row.insert_list || null,
      row.year ? parseInt(row.year) : null,
      row.card_category ? row.card_category.toLowerCase() : null,
      row.sport_type || null,
      row.condition ? row.condition.toLowerCase() : null,
      row.price_nzd ? parseFloat(row.price_nzd) : null,
      row.quantity ? parseInt(row.quantity) : 1,
      row.image_front || null,
      row.image_back || null,
      row.description || null
    ];

    const result = await client.query(query, values);

    // Track initial price in history (will be done by trigger)
    return result.rows[0].id;
  }

  /**
   * Update existing card with CSV data
   */
  static async updateCard(client, cardId, row, userId) {
    const query = `
      UPDATE cards
      SET card_name = $1,
          set_name = $2,
          card_number = $3,
          manufacturer = $4,
          insert_list = $5,
          year = $6,
          card_category = $7,
          sport_type = $8,
          condition = $9,
          price_nzd = $10,
          quantity = $11,
          image_front = $12,
          image_back = $13,
          description = $14
      WHERE id = $15
    `;

    const values = [
      row.card_name,
      row.set_name || null,
      row.card_number || null,
      row.manufacturer || null,
      row.insert_list || null,
      row.year ? parseInt(row.year) : null,
      row.card_category ? row.card_category.toLowerCase() : null,
      row.sport_type || null,
      row.condition ? row.condition.toLowerCase() : null,
      row.price_nzd ? parseFloat(row.price_nzd) : null,
      row.quantity ? parseInt(row.quantity) : 1,
      row.image_front || null,
      row.image_back || null,
      row.description || null,
      cardId
    ];

    await client.query(query, values);
  }

  /**
   * Merge CSV data with existing card (add quantity, keep other data)
   */
  static async mergeCard(client, cardId, row) {
    const query = `
      UPDATE cards
      SET quantity = quantity + $1
      WHERE id = $2
    `;

    const newQuantity = row.quantity ? parseInt(row.quantity) : 1;
    await client.query(query, [newQuantity, cardId]);
  }

  /**
   * Get import history
   */
  static async getImportHistory(limit = 20) {
    const query = `
      SELECT ci.*, u.username
      FROM csv_imports ci
      LEFT JOIN users u ON ci.user_id = u.id
      ORDER BY ci.created_at DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get import details by ID
   */
  static async getImportById(id) {
    const query = `
      SELECT ci.*, u.username
      FROM csv_imports ci
      LEFT JOIN users u ON ci.user_id = u.id
      WHERE ci.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Generate sample CSV template
   */
  static generateTemplate() {
    const headers = [
      'card_name',
      'set_name',
      'card_number',
      'manufacturer',
      'insert_list',
      'year',
      'card_category',
      'sport_type',
      'condition',
      'price_nzd',
      'quantity',
      'image_front',
      'image_back',
      'description'
    ];

    const sampleRows = [
      [
        'Michael Jordan Rookie',
        '1986 Fleer Basketball',
        '57',
        'Fleer',
        'Base Set',
        '1986',
        'sport',
        'Basketball',
        'near_mint',
        '125.00',
        '1',
        '',
        '',
        'Iconic rookie card in excellent condition'
      ],
      [
        'Pikachu',
        'Base Set',
        '58',
        'Wizards of the Coast',
        'Common',
        '1999',
        'non_sport',
        'Pokemon',
        'mint',
        '45.00',
        '3',
        '',
        '',
        'Classic Pokemon card from the original base set'
      ],
      [
        'Lewis Hamilton Podium Power',
        'F1 2023 Season',
        '44',
        'Topps',
        'Master Set',
        '2023',
        'sport',
        'Other',
        'mint',
        '15.00',
        '2',
        '',
        '',
        'F1 racing card featuring Lewis Hamilton'
      ]
    ];

    const csvLines = [headers.join(',')];
    sampleRows.forEach(row => {
      // Properly escape CSV values that contain commas or quotes
      const escapedRow = row.map(value => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(escapedRow.join(','));
    });

    return {
      headers,
      sampleRows,
      csv: csvLines.join('\n')
    };
  }
}

module.exports = CsvImport;
