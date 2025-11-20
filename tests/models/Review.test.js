const Review = require('../../models/Review');
const { cleanupTestData, createTestUser, createTestCard, pool } = require('../helpers/test-db-setup');

describe('Review Model', () => {
    let testUser;
    let testCard;

    beforeAll(async () => {
        await cleanupTestData();
    });

    beforeEach(async () => {
        testUser = await createTestUser();
        testCard = await createTestCard();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('create', () => {
        it('should create a new review for card', async () => {
            const reviewData = {
                userId: testUser.id,
                cardId: testCard.id,
                rating: 5,
                reviewText: 'Excellent card!',
                verifiedPurchase: true
            };

            const review = await Review.create(reviewData);

            expect(review).toBeDefined();
            expect(review.id).toBeDefined();
            expect(review.user_id).toBe(testUser.id);
            expect(review.card_id).toBe(testCard.id);
            expect(review.rating).toBe(5);
            expect(review.review_text).toBe('Excellent card!');
        });

        it('should not create review with rating outside 1-5', async () => {
            const reviewData = {
                userId: testUser.id,
                cardId: testCard.id,
                rating: 6,
                reviewText: 'Invalid rating'
            };

            await expect(Review.create(reviewData)).rejects.toThrow();
        });
    });

    describe('findByProductId', () => {
        it('should find all reviews for a card', async () => {
            const user2 = await createTestUser();

            await Review.create({
                userId: testUser.id,
                cardId: testCard.id,
                rating: 5,
                reviewText: 'Great!'
            });

            await Review.create({
                userId: user2.id,
                cardId: testCard.id,
                rating: 4,
                reviewText: 'Good'
            });

            const reviews = await Review.findByProductId('card', testCard.id);

            expect(reviews).toBeDefined();
            expect(reviews.length).toBe(2);
        });
    });

    describe('getAverageRating', () => {
        it('should calculate correct average rating', async () => {
            const user2 = await createTestUser();

            await Review.create({
                userId: testUser.id,
                cardId: testCard.id,
                rating: 5,
                reviewText: 'Great!'
            });

            await Review.create({
                userId: user2.id,
                cardId: testCard.id,
                rating: 3,
                reviewText: 'OK'
            });

            const avg = await Review.getAverageRating('card', testCard.id);

            expect(parseFloat(avg)).toBe(4.0);
        });
    });

    describe('update', () => {
        it('should update review', async () => {
            const review = await Review.create({
                userId: testUser.id,
                cardId: testCard.id,
                rating: 4,
                reviewText: 'Good'
            });

            const updated = await Review.update(review.id, {
                rating: 5,
                review_text: 'Excellent!'
            });

            expect(updated.rating).toBe(5);
            expect(updated.review_text).toBe('Excellent!');
        });
    });

    describe('delete', () => {
        it('should delete review', async () => {
            const review = await Review.create({
                userId: testUser.id,
                cardId: testCard.id,
                rating: 5,
                reviewText: 'Great!'
            });

            await Review.delete(review.id);

            const reviews = await Review.findByProductId('card', testCard.id);
            expect(reviews.length).toBe(0);
        });
    });

    describe('markHelpful', () => {
        it('should increment helpful count', async () => {
            const review = await Review.create({
                userId: testUser.id,
                cardId: testCard.id,
                rating: 5,
                reviewText: 'Great!'
            });

            const updated = await Review.markHelpful(review.id);

            expect(updated.helpful_count).toBe(1);
        });
    });
});
