const Wishlist = require('../../models/Wishlist');
const { cleanupTestData, createTestUser, createTestCard, createTestFigurine, pool } = require('../helpers/test-db-setup');

describe('Wishlist Model', () => {
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

    describe('addCard', () => {
        it('should add card to wishlist', async () => {
            const result = await Wishlist.addCard(testUser.id, testCard.id);

            expect(result).toBeDefined();
            expect(result.user_id).toBe(testUser.id);
            expect(result.card_id).toBe(testCard.id);
        });

        it('should not duplicate card in wishlist', async () => {
            await Wishlist.addCard(testUser.id, testCard.id);

            // Adding again should handle gracefully
            const result = await Wishlist.addCard(testUser.id, testCard.id);
            expect(result).toBeDefined();
        });
    });

    describe('addFigurine', () => {
        it('should add figurine to wishlist', async () => {
            const result = await Wishlist.addFigurine(testUser.id, testFigurine.id);

            expect(result).toBeDefined();
            expect(result.user_id).toBe(testUser.id);
            expect(result.figurine_id).toBe(testFigurine.id);
        });
    });

    describe('getUserWishlist', () => {
        it('should get all wishlist items for user', async () => {
            await Wishlist.addCard(testUser.id, testCard.id);
            await Wishlist.addFigurine(testUser.id, testFigurine.id);

            const wishlist = await Wishlist.getUserWishlist(testUser.id);

            expect(wishlist).toBeDefined();
            expect(wishlist.length).toBe(2);
        });

        it('should return empty array for user with no wishlist items', async () => {
            const newUser = await createTestUser();
            const wishlist = await Wishlist.getUserWishlist(newUser.id);

            expect(wishlist).toBeDefined();
            expect(wishlist.length).toBe(0);
        });
    });

    describe('removeCard', () => {
        it('should remove card from wishlist', async () => {
            await Wishlist.addCard(testUser.id, testCard.id);
            await Wishlist.removeCard(testUser.id, testCard.id);

            const wishlist = await Wishlist.getUserWishlist(testUser.id);
            const cardInWishlist = wishlist.find(item => item.card_id === testCard.id);

            expect(cardInWishlist).toBeUndefined();
        });
    });

    describe('removeFigurine', () => {
        it('should remove figurine from wishlist', async () => {
            await Wishlist.addFigurine(testUser.id, testFigurine.id);
            await Wishlist.removeFigurine(testUser.id, testFigurine.id);

            const wishlist = await Wishlist.getUserWishlist(testUser.id);
            const figurineInWishlist = wishlist.find(item => item.figurine_id === testFigurine.id);

            expect(figurineInWishlist).toBeUndefined();
        });
    });

    describe('clearWishlist', () => {
        it('should remove all items from wishlist', async () => {
            await Wishlist.addCard(testUser.id, testCard.id);
            await Wishlist.addFigurine(testUser.id, testFigurine.id);

            await Wishlist.clearWishlist(testUser.id);

            const wishlist = await Wishlist.getUserWishlist(testUser.id);
            expect(wishlist.length).toBe(0);
        });
    });

    describe('isInWishlist', () => {
        it('should return true if card is in wishlist', async () => {
            await Wishlist.addCard(testUser.id, testCard.id);

            const isInWishlist = await Wishlist.isInWishlist(testUser.id, 'card', testCard.id);

            expect(isInWishlist).toBe(true);
        });

        it('should return false if card is not in wishlist', async () => {
            const isInWishlist = await Wishlist.isInWishlist(testUser.id, 'card', testCard.id);

            expect(isInWishlist).toBe(false);
        });
    });

    describe('getItemCount', () => {
        it('should return correct item count', async () => {
            await Wishlist.addCard(testUser.id, testCard.id);
            await Wishlist.addFigurine(testUser.id, testFigurine.id);

            const count = await Wishlist.getItemCount(testUser.id);

            expect(count).toBe(2);
        });

        it('should return 0 for empty wishlist', async () => {
            const count = await Wishlist.getItemCount(testUser.id);

            expect(count).toBe(0);
        });
    });
});
