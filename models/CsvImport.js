const db = require('../config/database');
const fs = require('fs');
const { parse } = require('csv-parse');
const Card = require('./Card');
const Set = require('./Set');

class CsvImport {
  /**
   * Ensure sport type exists in sport_types table, create if not
   */
  static async ensureSportType(client, name) {
    if (!name || name.trim() === '') return null;
    const trimmed = name.trim();
    const existing = await client.query('SELECT id FROM sport_types WHERE LOWER(name) = LOWER($1)', [trimmed]);
    if (existing.rows.length > 0) return existing.rows[0].id;
    const result = await client.query('INSERT INTO sport_types (name) VALUES ($1) RETURNING id', [trimmed]);
    return result.rows[0].id;
  }

  /**
   * Ensure manufacturer exists in manufacturers table, create if not
   */
  static async ensureManufacturer(client, name) {
    if (!name || name.trim() === '') return null;
    const trimmed = name.trim();
    const existing = await client.query('SELECT id FROM manufacturers WHERE LOWER(name) = LOWER($1)', [trimmed]);
    if (existing.rows.length > 0) return existing.rows[0].id;
    const result = await client.query('INSERT INTO manufacturers (name) VALUES ($1) RETURNING id', [trimmed]);
    return result.rows[0].id;
  }

  /**
   * Ensure card set exists in card_sets table, create if not
   */
  static async ensureCardSet(client, setName, manufacturerId, year) {
    if (!setName || setName.trim() === '') return null;
    const trimmed = setName.trim();

    let query = 'SELECT id FROM card_sets WHERE LOWER(set_name) = LOWER($1)';
    const params = [trimmed];
    if (manufacturerId) {
      query += ' AND manufacturer_id = $2';
      params.push(manufacturerId);
    }
    const existing = await client.query(query, params);
    if (existing.rows.length > 0) return existing.rows[0].id;

    const result = await client.query(
      'INSERT INTO card_sets (set_name, manufacturer_id, year) VALUES ($1, $2, $3) RETURNING id',
      [trimmed, manufacturerId, year ? parseInt(year) : null]
    );
    return result.rows[0].id;
  }

  /**
   * Ensure insert exists in card_inserts table, create if not
   */
  static async ensureInsert(client, insertName, cardSetId) {
    if (!insertName || insertName.trim() === '') return null;
    if (!cardSetId) return null;
    const trimmed = insertName.trim();
    const existing = await client.query(
      'SELECT id FROM card_inserts WHERE LOWER(insert_name) = LOWER($1) AND card_set_id = $2',
      [trimmed, cardSetId]
    );
    if (existing.rows.length > 0) return existing.rows[0].id;
    const result = await client.query(
      'INSERT INTO card_inserts (card_set_id, insert_name) VALUES ($1, $2) RETURNING id',
      [cardSetId, trimmed]
    );
    return result.rows[0].id;
  }

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
      description: columnMapping.description || 'description',
      team: columnMapping.team || 'team',
      variation: columnMapping.variation || 'variation',
      notes: columnMapping.notes || 'notes',
      is_rookie_card: columnMapping.is_rookie_card || 'is_rookie_card',
      product_type: columnMapping.product_type || 'product_type'
    };

    for (const [dbField, csvField] of Object.entries(fieldMap)) {
      if (row[csvField] !== undefined && row[csvField] !== '') {
        mapped[dbField] = row[csvField];
      }
    }

    return mapped;
  }

  /**
   * Validate row data — mirrors the card-add form requirements
   */
  static validateRow(row, rowNumber) {
    const errors = [];

    // Required fields (same as card-add form)
    if (!row.card_name || row.card_name.trim() === '') {
      errors.push('Card name is required');
    }

    // card_category is required (sport or non_sport)
    const validCategories = ['sport', 'non_sport'];
    if (!row.card_category || row.card_category.trim() === '') {
      errors.push('Category is required (sport or non_sport)');
    } else if (!validCategories.includes(row.card_category.toLowerCase())) {
      errors.push(`Invalid category: ${row.card_category}. Must be one of: ${validCategories.join(', ')}`);
    }

    // price_nzd is required
    if (!row.price_nzd || row.price_nzd.toString().trim() === '') {
      errors.push('Price (NZD) is required');
    } else {
      const price = parseFloat(row.price_nzd);
      if (isNaN(price) || price < 0) {
        errors.push(`Invalid price: ${row.price_nzd}`);
      }
    }

    // quantity is optional, 0 is valid (out of stock)
    if (row.quantity !== undefined && row.quantity !== '') {
      const qty = parseInt(row.quantity);
      if (isNaN(qty) || qty < 0) {
        errors.push(`Invalid quantity: ${row.quantity}. Must be 0 or more`);
      }
    }

    // Validate year if provided
    if (row.year) {
      const year = parseInt(row.year);
      if (isNaN(year) || year < 1800 || year > new Date().getFullYear() + 1) {
        errors.push(`Invalid year: ${row.year}`);
      }
    }

    // Validate condition if provided
    const validConditions = ['mint', 'near_mint', 'excellent', 'good', 'played'];
    if (row.condition && !validConditions.includes(row.condition.toLowerCase())) {
      errors.push(`Invalid condition: ${row.condition}. Must be one of: ${validConditions.join(', ')}`);
    }

    // Validate product_type if provided
    const validProductTypes = ['single', 'pack', 'box'];
    if (row.product_type && !validProductTypes.includes(row.product_type.toLowerCase())) {
      errors.push(`Invalid product type: ${row.product_type}. Must be one of: ${validProductTypes.join(', ')}`);
    }

    // Validate variation if provided
    const validVariations = ['error', 'correction', 'uer', 'short print', 'other'];
    if (row.variation && !validVariations.includes(row.variation.toLowerCase())) {
      errors.push(`Invalid variation: ${row.variation}. Must be one of: Error, Correction, UER, Short Print, Other`);
    }

    // Validate is_rookie_card if provided
    if (row.is_rookie_card) {
      const val = row.is_rookie_card.toString().toLowerCase();
      const validBools = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'];
      if (!validBools.includes(val)) {
        errors.push(`Invalid is_rookie_card: ${row.is_rookie_card}. Use yes/no or true/false`);
      }
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
    const client = await db.connect();
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
      const createdCards = [];
      for (const row of unique) {
        try {
          const cardId = await this.insertCard(client, row, userId);
          if (cardId && row.set_name) createdCards.push({ id: cardId, set_name: row.set_name });
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
             error_log = $4,
             completed_at = NOW()
         WHERE id = $5`,
        [successful, failed, skipped, JSON.stringify(errorLog), importId]
      );

      await client.query('COMMIT');

      // Apply set parallels to newly created cards (after commit so cards are visible)
      for (const card of createdCards) {
        try {
          await Set.applyParallelsToCard(card.id, card.set_name);
        } catch (e) {
          console.warn(`Failed to apply parallels to card ${card.id}:`, e.message);
        }
      }

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
   * Insert new card from CSV data — auto-creates sport types, manufacturers, sets, and inserts
   */
  static async insertCard(client, row, userId) {
    // Auto-create related entities if they don't exist
    if (row.sport_type) {
      await this.ensureSportType(client, row.sport_type);
    }

    let manufacturerId = null;
    if (row.manufacturer) {
      manufacturerId = await this.ensureManufacturer(client, row.manufacturer);
    }

    let cardSetId = null;
    if (row.set_name) {
      cardSetId = await this.ensureCardSet(client, row.set_name, manufacturerId, row.year);
    }

    if (row.insert_list) {
      await this.ensureInsert(client, row.insert_list, cardSetId);
    }

    // Parse is_rookie_card boolean
    const isRookie = row.is_rookie_card ?
      ['true', 'yes', '1', 'y'].includes(row.is_rookie_card.toString().toLowerCase()) : false;

    const query = `
      INSERT INTO cards (
        card_name, set_name, card_number, manufacturer, insert_list,
        year, card_category, sport_type, condition, price_nzd, quantity,
        image_front, image_back, description, available,
        team, variation, notes, is_rookie_card, product_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, $16, $17, $18, $19)
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
      row.description || null,
      row.team || null,
      row.variation || null,
      row.notes || null,
      isRookie,
      row.product_type ? row.product_type.toLowerCase() : 'single'
    ];

    const result = await client.query(query, values);
    return result.rows[0].id;
  }

  /**
   * Update existing card with CSV data — auto-creates related entities
   */
  static async updateCard(client, cardId, row, userId) {
    // Auto-create related entities if they don't exist
    if (row.sport_type) {
      await this.ensureSportType(client, row.sport_type);
    }
    let manufacturerId = null;
    if (row.manufacturer) {
      manufacturerId = await this.ensureManufacturer(client, row.manufacturer);
    }
    if (row.set_name) {
      const cardSetId = await this.ensureCardSet(client, row.set_name, manufacturerId, row.year);
      if (row.insert_list) {
        await this.ensureInsert(client, row.insert_list, cardSetId);
      }
    }

    const isRookie = row.is_rookie_card ?
      ['true', 'yes', '1', 'y'].includes(row.is_rookie_card.toString().toLowerCase()) : false;

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
          description = $14,
          team = $15,
          variation = $16,
          notes = $17,
          is_rookie_card = $18,
          product_type = $19
      WHERE id = $20
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
      row.team || null,
      row.variation || null,
      row.notes || null,
      isRookie,
      row.product_type ? row.product_type.toLowerCase() : 'single',
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
   * Generate sample CSV template — matches card-add form fields
   */
  static generateTemplate() {
    const headers = [
      'card_name',
      'manufacturer',
      'set_name',
      'insert_list',
      'card_number',
      'year',
      'card_category',
      'sport_type',
      'condition',
      'price_nzd',
      'quantity',
      'product_type',
      'team',
      'variation',
      'is_rookie_card',
      'notes',
      'description',
      'image_front',
      'image_back'
    ];

    const sampleRows = [
      [
        'Beauden Barrett',
        'Tap N Play',
        '2024 All Blacks',
        'Base Set',
        '10',
        '2024',
        'sport',
        'Rugby',
        'mint',
        '5.00',
        '4',
        'single',
        'All Blacks',
        '',
        'no',
        '',
        'All Blacks first five-eighth',
        '',
        ''
      ],
      [
        'Kane Williamson',
        'Tap N Play',
        '2023 NZ Cricket',
        'Double Trouble',
        '22',
        '2023',
        'sport',
        'Cricket',
        'near_mint',
        '8.00',
        '1',
        'single',
        'Black Caps',
        '',
        'no',
        '',
        'NZ cricket captain',
        '',
        ''
      ],
      [
        'Shaun Johnson Rookie',
        'Select',
        '2012 NRL',
        'Base Set',
        '99',
        '2012',
        'sport',
        'Rugby League',
        'near_mint',
        '25.00',
        '1',
        'single',
        'Warriors',
        '',
        'yes',
        '',
        'Rookie card',
        '',
        ''
      ],
      [
        'Pikachu',
        'Wizards of the Coast',
        'Base Set',
        '',
        '58',
        '1999',
        'non_sport',
        'Pokemon',
        'mint',
        '45.00',
        '3',
        'single',
        '',
        '',
        'no',
        '',
        'Original base set',
        '',
        ''
      ],
      [
        '2024 All Blacks Box',
        'Tap N Play',
        '2024 All Blacks',
        '',
        '',
        '2024',
        'sport',
        'Rugby',
        'mint',
        '89.99',
        '2',
        'box',
        '',
        '',
        'no',
        'Sealed box',
        '36 packs per box',
        '',
        ''
      ],
      [
        '2024 All Blacks Pack',
        'Tap N Play',
        '2024 All Blacks',
        '',
        '',
        '2024',
        'sport',
        'Rugby',
        'mint',
        '4.99',
        '10',
        'pack',
        '',
        '',
        'no',
        '',
        '8 cards per pack',
        '',
        ''
      ]
    ];

    const csvLines = [headers.join(',')];
    sampleRows.forEach(row => {
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
