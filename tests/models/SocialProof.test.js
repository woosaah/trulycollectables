const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock database
const mockDb = {
  query: jest.fn()
};

jest.mock('../../config/database', () => mockDb);

const SocialProof = require('../../models/SocialProof');

describe('SocialProof Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackView', () => {
    test('should track card view with user', async () => {
      mockDb.query.mockResolvedValueOnce({});
      mockDb.query.mockResolvedValueOnce({});

      await SocialProof.trackView(1, 10, null);

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    test('should track card view with session', async () => {
      mockDb.query.mockResolvedValueOnce({});
      mockDb.query.mockResolvedValueOnce({});

      await SocialProof.trackView(1, null, 'session-123');

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRecentViewers', () => {
    test('should return viewer count for last 24 hours', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ viewer_count: '15' }]
      });

      const result = await SocialProof.getRecentViewers(1, 24);

      expect(result).toBe(15);
    });

    test('should return 0 for no viewers', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ viewer_count: null }]
      });

      const result = await SocialProof.getRecentViewers(1, 24);

      expect(result).toBe(0);
    });
  });

  describe('recordSale', () => {
    test('should record card sale', async () => {
      mockDb.query.mockResolvedValueOnce({});
      mockDb.query.mockResolvedValueOnce({});

      await SocialProof.recordSale(1, 'Jordan Rookie', '1986 Fleer', 125.00);

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRecentlySold', () => {
    test('should return recently sold cards', async () => {
      const mockSales = [
        {
          id: 1,
          card_name: 'Jordan Rookie',
          price_nzd: 125.00,
          sold_at: new Date()
        },
        {
          id: 2,
          card_name: 'Pikachu',
          price_nzd: 45.00,
          sold_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockSales });

      const result = await SocialProof.getRecentlySold(10);

      expect(result).toHaveLength(2);
      expect(result[0].card_name).toBe('Jordan Rookie');
    });
  });

  describe('getPriceHistory', () => {
    test('should return price history for card', async () => {
      const mockHistory = [
        { price_nzd: 100, created_at: new Date('2024-01-01') },
        { price_nzd: 110, created_at: new Date('2024-02-01') },
        { price_nzd: 125, created_at: new Date('2024-03-01') }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockHistory });

      const result = await SocialProof.getPriceHistory(1);

      expect(result).toHaveLength(3);
      expect(result[0].price_nzd).toBe(100);
    });
  });

  describe('getPriceTrend', () => {
    test('should calculate price increase', async () => {
      const mockPrices = [
        { price_nzd: '125.00', created_at: new Date(), previous_price: '100.00' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockPrices });

      const result = await SocialProof.getPriceTrend(1);

      expect(result).toBeDefined();
      expect(result.current).toBe(125);
      expect(result.previous).toBe(100);
      expect(result.change).toBe('25.00');
      expect(result.direction).toBe('up');
    });

    test('should calculate price decrease', async () => {
      const mockPrices = [
        { price_nzd: '80.00', created_at: new Date(), previous_price: '100.00' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockPrices });

      const result = await SocialProof.getPriceTrend(1);

      expect(result.direction).toBe('down');
      expect(result.change).toBe('-20.00');
    });

    test('should return null for insufficient data', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await SocialProof.getPriceTrend(1);

      expect(result).toBeNull();
    });
  });

  describe('getPopularCards', () => {
    test('should return most viewed cards', async () => {
      const mockCards = [
        { id: 1, card_name: 'Popular Card', view_count: 100 },
        { id: 2, card_name: 'Less Popular', view_count: 50 }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCards });

      const result = await SocialProof.getPopularCards(10, 7);

      expect(result).toBeDefined();
      expect(result[0].view_count).toBeGreaterThan(result[1].view_count);
    });
  });
});
