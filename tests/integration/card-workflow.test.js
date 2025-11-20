const { describe, test, expect } = require('@jest/globals');

// Mock database
const mockDb = {
  query: jest.fn(),
  pool: {
    getClient: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn()
    }))
  }
};

jest.mock('../../config/database', () => mockDb);

const Card = require('../../models/Card');
const SocialProof = require('../../models/SocialProof');

describe('Card Workflow Integration Tests', () => {
  describe('Complete Card Lifecycle', () => {
    test('should create card, track views, and record sale', async () => {
      // Step 1: Create card
      const cardData = {
        card_name: 'Test Integration Card',
        set_name: 'Test Set',
        price_nzd: 100,
        quantity: 5
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, ...cardData }]
      });

      const card = await Card.create(cardData);
      expect(card).toBeDefined();
      expect(card.id).toBe(1);

      // Step 2: Track views
      mockDb.query.mockResolvedValueOnce({});
      mockDb.query.mockResolvedValueOnce({});

      await SocialProof.trackView(card.id, 10, null);
      expect(mockDb.query).toHaveBeenCalled();

      // Step 3: Record sale
      mockDb.query.mockResolvedValueOnce({});
      mockDb.query.mockResolvedValueOnce({});

      await SocialProof.recordSale(card.id, card.card_name, card.set_name, card.price_nzd);
      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should handle card search and filtering workflow', async () => {
      const mockCards = [
        { id: 1, card_name: 'Basketball Card 1', sport_type: 'basketball', price_nzd: 50 },
        { id: 2, card_name: 'Basketball Card 2', sport_type: 'basketball', price_nzd: 75 }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCards });

      const results = await Card.findAll({
        sport_type: 'basketball',
        min_price: 40,
        max_price: 100
      }, 20, 0);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    test('should handle price update and history tracking', async () => {
      const cardId = 1;
      const newPrice = 125.00;

      // Mock update
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: cardId,
          card_name: 'Test Card',
          price_nzd: newPrice
        }]
      });

      const updated = await Card.update(cardId, { price_nzd: newPrice });
      expect(updated.price_nzd).toBe(newPrice);

      // Mock price history retrieval
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { price_nzd: 100, created_at: new Date('2024-01-01') },
          { price_nzd: newPrice, created_at: new Date() }
        ]
      });

      const history = await SocialProof.getPriceHistory(cardId);
      expect(history).toBeDefined();
      expect(history.length).toBe(2);
    });
  });

  describe('Inventory Management Workflow', () => {
    test('should manage card quantity updates', async () => {
      const cardId = 1;
      const soldQuantity = 2;

      // Get initial card
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: cardId, quantity: 5 }]
      });

      const card = await Card.findById(cardId);
      expect(card.quantity).toBe(5);

      // Update quantity after sale
      const newQuantity = card.quantity - soldQuantity;
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: cardId, quantity: newQuantity }]
      });

      const updated = await Card.update(cardId, { quantity: newQuantity });
      expect(updated.quantity).toBe(3);
    });

    test('should mark card as unavailable when out of stock', async () => {
      const cardId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: cardId,
          quantity: 0,
          available: false
        }]
      });

      const updated = await Card.update(cardId, {
        quantity: 0,
        available: false
      });

      expect(updated.quantity).toBe(0);
      expect(updated.available).toBe(false);
    });
  });

  describe('Social Proof Integration', () => {
    test('should track popularity and display trending cards', async () => {
      // Track multiple views
      mockDb.query.mockResolvedValue({});

      for (let i = 0; i < 5; i++) {
        await SocialProof.trackView(1, i, null);
      }

      // Get popular cards
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 1, card_name: 'Popular Card', view_count: 100 },
          { id: 2, card_name: 'Regular Card', view_count: 20 }
        ]
      });

      const popular = await SocialProof.getPopularCards(10, 7);
      expect(popular).toBeDefined();
      expect(popular[0].view_count).toBeGreaterThan(popular[1].view_count);
    });

    test('should track recent sales for social proof', async () => {
      // Record sales
      mockDb.query.mockResolvedValue({});

      await SocialProof.recordSale(1, 'Card A', 'Set 1', 100);
      await SocialProof.recordSale(2, 'Card B', 'Set 2', 75);

      // Get recent sales
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 1, card_name: 'Card A', price_nzd: 100, sold_at: new Date() },
          { id: 2, card_name: 'Card B', price_nzd: 75, sold_at: new Date() }
        ]
      });

      const recent = await SocialProof.getRecentlySold(10);
      expect(recent).toBeDefined();
      expect(recent.length).toBe(2);
    });
  });
});
