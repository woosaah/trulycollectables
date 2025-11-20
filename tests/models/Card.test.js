const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');

// Mock database
const mockDb = {
  query: jest.fn(),
  pool: {
    getClient: jest.fn()
  }
};

jest.mock('../../config/database', () => mockDb);

const Card = require('../../models/Card');

describe('Card Model', () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    test('should create a new card with all fields', async () => {
      const cardData = {
        card_name: 'Michael Jordan Rookie',
        set_name: '1986 Fleer',
        card_number: '57',
        year: 1986,
        sport_type: 'basketball',
        condition: 'mint',
        price_nzd: 125.00,
        quantity: 1,
        player_name: 'Michael Jordan',
        rarity: 'rare'
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, ...cardData }]
      });

      const result = await Card.create(cardData);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should create card with minimal required fields', async () => {
      const cardData = {
        card_name: 'Test Card',
        price_nzd: 10.00,
        quantity: 1
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 2, ...cardData }]
      });

      const result = await Card.create(cardData);

      expect(result).toBeDefined();
      expect(result.card_name).toBe('Test Card');
    });
  });

  describe('findAll', () => {
    test('should return all cards with no filters', async () => {
      const mockCards = [
        { id: 1, card_name: 'Card 1', price_nzd: 10 },
        { id: 2, card_name: 'Card 2', price_nzd: 20 }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCards });

      const result = await Card.findAll({}, 20, 0);

      expect(result).toHaveLength(2);
      expect(result[0].card_name).toBe('Card 1');
    });

    test('should filter cards by sport_type', async () => {
      const mockCards = [
        { id: 1, card_name: 'Basketball Card', sport_type: 'basketball' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCards });

      const result = await Card.findAll({ sport_type: 'basketball' }, 20, 0);

      expect(result).toHaveLength(1);
      expect(result[0].sport_type).toBe('basketball');
    });

    test('should filter cards by price range', async () => {
      const mockCards = [
        { id: 1, card_name: 'Affordable Card', price_nzd: 15 }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCards });

      const result = await Card.findAll({ min_price: 10, max_price: 20 }, 20, 0);

      expect(result).toHaveLength(1);
      expect(result[0].price_nzd).toBe(15);
    });

    test('should search cards by name', async () => {
      const mockCards = [
        { id: 1, card_name: 'Jordan Rookie Card' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCards });

      const result = await Card.findAll({ search: 'jordan' }, 20, 0);

      expect(result).toHaveLength(1);
      expect(result[0].card_name).toContain('Jordan');
    });
  });

  describe('findById', () => {
    test('should return card by id', async () => {
      const mockCard = {
        id: 1,
        card_name: 'Test Card',
        price_nzd: 50
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCard] });

      const result = await Card.findById(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.card_name).toBe('Test Card');
    });

    test('should return undefined for non-existent card', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await Card.findById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    test('should update card fields', async () => {
      const updates = {
        price_nzd: 100.00,
        quantity: 5
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, card_name: 'Test Card', ...updates }]
      });

      const result = await Card.update(1, updates);

      expect(result).toBeDefined();
      expect(result.price_nzd).toBe(100.00);
      expect(result.quantity).toBe(5);
    });
  });

  describe('delete', () => {
    test('should delete card by id', async () => {
      mockDb.query.mockResolvedValueOnce({ rowCount: 1 });

      await Card.delete(1);

      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    test('should count total cards', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '42' }] });

      const result = await Card.count({});

      expect(result).toBe(42);
    });

    test('should count filtered cards', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '10' }] });

      const result = await Card.count({ sport_type: 'basketball' });

      expect(result).toBe(10);
    });
  });

  describe('getSportTypes', () => {
    test('should return distinct sport types', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { sport_type: 'basketball' },
          { sport_type: 'pokemon' },
          { sport_type: 'magic' }
        ]
      });

      const result = await Card.getSportTypes();

      expect(result).toHaveLength(3);
      expect(result).toContain('basketball');
      expect(result).toContain('pokemon');
    });
  });

  describe('getSets', () => {
    test('should return distinct set names', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { set_name: '1986 Fleer' },
          { set_name: 'Base Set' }
        ]
      });

      const result = await Card.getSets();

      expect(result).toHaveLength(2);
      expect(result).toContain('1986 Fleer');
    });
  });

  describe('getFeatured', () => {
    test('should return featured cards', async () => {
      const mockCards = [
        { id: 1, card_name: 'Featured 1' },
        { id: 2, card_name: 'Featured 2' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCards });

      const result = await Card.getFeatured(6);

      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalled();
    });
  });
});
