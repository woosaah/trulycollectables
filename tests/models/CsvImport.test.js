const { describe, test, expect, beforeEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

// Mock database
const mockDb = {
  query: jest.fn(),
  pool: {
    getClient: jest.fn()
  }
};

jest.mock('../../config/database', () => mockDb);

const CsvImport = require('../../models/CsvImport');

describe('CsvImport Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapRow', () => {
    test('should map CSV row with default column names', () => {
      const row = {
        card_name: 'Jordan Rookie',
        set_name: '1986 Fleer',
        price_nzd: '125.00',
        quantity: '1'
      };

      const result = CsvImport.mapRow(row, {});

      expect(result.card_name).toBe('Jordan Rookie');
      expect(result.set_name).toBe('1986 Fleer');
      expect(result.price_nzd).toBe('125.00');
    });

    test('should map CSV row with custom column mapping', () => {
      const row = {
        'Card Name': 'Test Card',
        'Set': 'Test Set',
        'Price': '50.00'
      };

      const columnMapping = {
        card_name: 'Card Name',
        set_name: 'Set',
        price_nzd: 'Price'
      };

      const result = CsvImport.mapRow(row, columnMapping);

      expect(result.card_name).toBe('Test Card');
      expect(result.set_name).toBe('Test Set');
      expect(result.price_nzd).toBe('50.00');
    });

    test('should skip empty fields', () => {
      const row = {
        card_name: 'Test',
        set_name: '',
        price_nzd: '10.00'
      };

      const result = CsvImport.mapRow(row, {});

      expect(result.card_name).toBe('Test');
      expect(result.set_name).toBeUndefined();
      expect(result.price_nzd).toBe('10.00');
    });
  });

  describe('validateRow', () => {
    test('should pass validation for valid row', () => {
      const row = {
        card_name: 'Valid Card',
        year: '2020',
        price_nzd: '50.00',
        quantity: '2',
        condition: 'mint'
      };

      const result = CsvImport.validateRow(row, 1);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation for missing card name', () => {
      const row = {
        price_nzd: '50.00'
      };

      const result = CsvImport.validateRow(row, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Card name is required');
    });

    test('should fail validation for invalid year', () => {
      const row = {
        card_name: 'Test',
        year: '3000'
      };

      const result = CsvImport.validateRow(row, 1);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid year'))).toBe(true);
    });

    test('should fail validation for invalid price', () => {
      const row = {
        card_name: 'Test',
        price_nzd: 'not-a-number'
      };

      const result = CsvImport.validateRow(row, 1);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid price'))).toBe(true);
    });

    test('should fail validation for invalid condition', () => {
      const row = {
        card_name: 'Test',
        condition: 'perfect'
      };

      const result = CsvImport.validateRow(row, 1);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid condition'))).toBe(true);
    });

    test('should validate condition case-insensitively', () => {
      const row = {
        card_name: 'Test',
        condition: 'MINT'
      };

      const result = CsvImport.validateRow(row, 1);

      expect(result.valid).toBe(true);
    });
  });

  describe('detectDuplicates', () => {
    test('should detect duplicate cards', async () => {
      const rows = [
        { card_name: 'Jordan Rookie', set_name: '1986 Fleer', card_number: '57' }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          card_name: 'Jordan Rookie',
          set_name: '1986 Fleer',
          card_number: '57',
          price_nzd: 100
        }]
      });

      const result = await CsvImport.detectDuplicates(rows);

      expect(result.duplicates).toHaveLength(1);
      expect(result.unique).toHaveLength(0);
      expect(result.duplicates[0].csvRow.card_name).toBe('Jordan Rookie');
    });

    test('should identify unique cards', async () => {
      const rows = [
        { card_name: 'Unique Card', set_name: 'Test Set' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await CsvImport.detectDuplicates(rows);

      expect(result.duplicates).toHaveLength(0);
      expect(result.unique).toHaveLength(1);
      expect(result.unique[0].card_name).toBe('Unique Card');
    });
  });

  describe('generateTemplate', () => {
    test('should generate CSV template', () => {
      const template = CsvImport.generateTemplate();

      expect(template.headers).toBeDefined();
      expect(template.sample).toBeDefined();
      expect(template.csv).toBeDefined();
      expect(template.headers).toContain('card_name');
      expect(template.headers).toContain('price_nzd');
      expect(template.csv).toContain('card_name');
    });

    test('should include all required fields in template', () => {
      const template = CsvImport.generateTemplate();

      expect(template.headers).toContain('card_name');
      expect(template.headers).toContain('set_name');
      expect(template.headers).toContain('year');
      expect(template.headers).toContain('condition');
      expect(template.headers).toContain('price_nzd');
    });
  });

  describe('getImportHistory', () => {
    test('should return import history', async () => {
      const mockHistory = [
        {
          id: 1,
          filename: 'test.csv',
          total_rows: 100,
          successful_rows: 95,
          failed_rows: 5,
          username: 'admin'
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockHistory });

      const result = await CsvImport.getImportHistory(20);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('test.csv');
      expect(result[0].successful_rows).toBe(95);
    });
  });

  describe('getImportById', () => {
    test('should return import by id', async () => {
      const mockImport = {
        id: 1,
        filename: 'test.csv',
        status: 'completed',
        username: 'admin'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockImport] });

      const result = await CsvImport.getImportById(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.status).toBe('completed');
    });
  });
});
