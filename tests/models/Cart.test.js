const Cart = require('../../models/Cart');
const { cleanupTestData, createTestUser, createTestCard, createTestFigurine, pool } = require('../helpers/test-db-setup');

describe('Cart Model', () => {
    let testUser;
    let testCard;
    let testFigurine;

    beforeAll(async () => {
        await cleanupTestData();
    });

    beforeEach(async () => {
        testUser = await createTestUser();
        testCard = await createTestCard();
        testFigurine = await createTestFigurine();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('getOrCreateCart', () => {
        it('should create new cart for user if none exists', async () => {
            const cart = await Cart.getOrCreateCart(testUser.id);

            expect(cart).toBeDefined();
            expect(cart.id).toBeDefined();
            expect(cart.user_id).toBe(testUser.id);
        });

        it('should return existing cart for user', async () => {
            const cart1 = await Cart.getOrCreateCart(testUser.id);
            const cart2 = await Cart.getOrCreateCart(testUser.id);

            expect(cart1.id).toBe(cart2.id);
        });
    });

    describe('addCard', () => {
        it('should add card to cart', async () => {
            const result = await Cart.addCard(testUser.id, testCard.id, 2);

            expect(result).toBeDefined();
            expect(result.card_id).toBe(testCard.id);
            expect(result.quantity).toBe(2);
        });

        it('should update quantity if card already in cart', async () => {
            await Cart.addCard(testUser.id, testCard.id, 2);
            const result = await Cart.addCard(testUser.id, testCard.id, 3);

            expect(result.quantity).toBe(3);
        });

        it('should not add card with quantity exceeding stock', async () => {
            const limitedCard = await createTestCard({ quantity: 2 });

            await expect(
                Cart.addCard(testUser.id, limitedCard.id, 5)
            ).rejects.toThrow();
        });
    });

    describe('addFigurine', () => {
        it('should add figurine to cart', async () => {
            const result = await Cart.addFigurine(testUser.id, testFigurine.id, 1);

            expect(result).toBeDefined();
            expect(result.figurine_id).toBe(testFigurine.id);
            expect(result.quantity).toBe(1);
        });

        it('should update quantity if figurine already in cart', async () => {
            await Cart.addFigurine(testUser.id, testFigurine.id, 1);
            const result = await Cart.addFigurine(testUser.id, testFigurine.id, 2);

            expect(result.quantity).toBe(2);
        });
    });

    describe('getCartItems', () => {
        it('should get all items in cart with product details', async () => {
            await Cart.addCard(testUser.id, testCard.id, 2);
            await Cart.addFigurine(testUser.id, testFigurine.id, 1);

            const items = await Cart.getCartItems(testUser.id);

            expect(items).toBeDefined();
            expect(items.length).toBe(2);
        });

        it('should return empty array for empty cart', async () => {
            const items = await Cart.getCartItems(testUser.id);

            expect(items).toBeDefined();
            expect(items.length).toBe(0);
        });
    });

    describe('getCartTotal', () => {
        it('should calculate correct cart total', async () => {
            await Cart.addCard(testUser.id, testCard.id, 2);
            await Cart.addFigurine(testUser.id, testFigurine.id, 1);

            const total = await Cart.getCartTotal(testUser.id);
            const expectedTotal = (testCard.price_nzd * 2) + testFigurine.price_nzd;

            expect(parseFloat(total)).toBeCloseTo(expectedTotal, 2);
        });

        it('should return 0 for empty cart', async () => {
            const total = await Cart.getCartTotal(testUser.id);

            expect(parseFloat(total)).toBe(0);
        });
    });

    describe('updateItemQuantity', () => {
        it('should update item quantity', async () => {
            const item = await Cart.addCard(testUser.id, testCard.id, 2);
            const updated = await Cart.updateItemQuantity(item.id, 5);

            expect(updated.quantity).toBe(5);
        });

        it('should not update quantity exceeding stock', async () => {
            const limitedCard = await createTestCard({ quantity: 3 });
            const item = await Cart.addCard(testUser.id, limitedCard.id, 2);

            await expect(
                Cart.updateItemQuantity(item.id, 10)
            ).rejects.toThrow();
        });
    });

    describe('removeItem', () => {
        it('should remove item from cart', async () => {
            const item = await Cart.addCard(testUser.id, testCard.id, 2);
            await Cart.removeItem(item.id);

            const items = await Cart.getCartItems(testUser.id);
            expect(items.length).toBe(0);
        });
    });

    describe('clearCart', () => {
        it('should remove all items from cart', async () => {
            await Cart.addCard(testUser.id, testCard.id, 2);
            await Cart.addFigurine(testUser.id, testFigurine.id, 1);

            await Cart.clearCart(testUser.id);

            const items = await Cart.getCartItems(testUser.id);
            expect(items.length).toBe(0);
        });
    });

    describe('getItemCount', () => {
        it('should return correct item count', async () => {
            await Cart.addCard(testUser.id, testCard.id, 2);
            await Cart.addFigurine(testUser.id, testFigurine.id, 3);

            const count = await Cart.getItemCount(testUser.id);

            expect(count).toBe(5); // 2 + 3
        });

        it('should return 0 for empty cart', async () => {
            const count = await Cart.getItemCount(testUser.id);

            expect(count).toBe(0);
        });
    });
});
