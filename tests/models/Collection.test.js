const Collection = require('../../models/Collection');
const { cleanupTestData, createTestUser, createTestCard, pool } = require('../helpers/test-db-setup');

describe('Collection Model', () => {
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

    describe('addToHave', () => {
        it('should add card to have list', async () => {
            const result = await Collection.addToHave(testUser.id, testCard.id);

            expect(result).toBeDefined();
            expect(result.user_id).toBe(testUser.id);
            expect(result.card_id).toBe(testCard.id);
            expect(result.have).toBe(true);
            expect(result.want).toBe(false);
        });

        it('should not duplicate card in have list', async () => {
            await Collection.addToHave(testUser.id, testCard.id);

            // Adding again should not throw error
            const result = await Collection.addToHave(testUser.id, testCard.id);
            expect(result).toBeDefined();
        });
    });

    describe('addToWant', () => {
        it('should add card to want list', async () => {
            const result = await Collection.addToWant(testUser.id, testCard.id);

            expect(result).toBeDefined();
            expect(result.user_id).toBe(testUser.id);
            expect(result.card_id).toBe(testCard.id);
            expect(result.have).toBe(false);
            expect(result.want).toBe(true);
        });
    });

    describe('getUserCollection', () => {
        it('should get all collection items for user', async () => {
            const card1 = await createTestCard({ card_name: 'Card 1' });
            const card2 = await createTestCard({ card_name: 'Card 2' });

            await Collection.addToHave(testUser.id, card1.id);
            await Collection.addToWant(testUser.id, card2.id);

            const collection = await Collection.getUserCollection(testUser.id);

            expect(collection).toBeDefined();
            expect(collection.length).toBe(2);
        });

        it('should return empty array for user with no collection', async () => {
            const newUser = await createTestUser();
            const collection = await Collection.getUserCollection(newUser.id);

            expect(collection).toBeDefined();
            expect(collection.length).toBe(0);
        });
    });

    describe('getHaveList', () => {
        it('should get only have list items', async () => {
            const card1 = await createTestCard({ card_name: 'Have Card' });
            const card2 = await createTestCard({ card_name: 'Want Card' });

            await Collection.addToHave(testUser.id, card1.id);
            await Collection.addToWant(testUser.id, card2.id);

            const haveList = await Collection.getHaveList(testUser.id);

            expect(haveList).toBeDefined();
            expect(haveList.length).toBe(1);
            expect(haveList[0].have).toBe(true);
        });
    });

    describe('getWantList', () => {
        it('should get only want list items', async () => {
            const card1 = await createTestCard({ card_name: 'Have Card' });
            const card2 = await createTestCard({ card_name: 'Want Card' });

            await Collection.addToHave(testUser.id, card1.id);
            await Collection.addToWant(testUser.id, card2.id);

            const wantList = await Collection.getWantList(testUser.id);

            expect(wantList).toBeDefined();
            expect(wantList.length).toBe(1);
            expect(wantList[0].want).toBe(true);
        });
    });

    describe('removeFromHave', () => {
        it('should remove card from have list', async () => {
            await Collection.addToHave(testUser.id, testCard.id);
            await Collection.removeFromHave(testUser.id, testCard.id);

            const haveList = await Collection.getHaveList(testUser.id);
            expect(haveList.length).toBe(0);
        });
    });

    describe('removeFromWant', () => {
        it('should remove card from want list', async () => {
            await Collection.addToWant(testUser.id, testCard.id);
            await Collection.removeFromWant(testUser.id, testCard.id);

            const wantList = await Collection.getWantList(testUser.id);
            expect(wantList.length).toBe(0);
        });
    });

    describe('removeFromCollection', () => {
        it('should remove card completely from collection', async () => {
            await Collection.addToHave(testUser.id, testCard.id);
            await Collection.removeFromCollection(testUser.id, testCard.id);

            const collection = await Collection.getUserCollection(testUser.id);
            expect(collection.length).toBe(0);
        });
    });

    describe('findMatchingCards', () => {
        it('should find cards in inventory that match want list', async () => {
            const wantedCard = await createTestCard({
                card_name: 'Wanted Card',
                quantity: 5
            });

            await Collection.addToWant(testUser.id, wantedCard.id);

            const matches = await Collection.findMatchingCards(testUser.id);

            expect(matches).toBeDefined();
            expect(matches.length).toBeGreaterThan(0);
        });
    });

    describe('exportToCSV', () => {
        it('should export collection to CSV format', async () => {
            const card1 = await createTestCard({ card_name: 'Export Card 1' });
            const card2 = await createTestCard({ card_name: 'Export Card 2' });

            await Collection.addToHave(testUser.id, card1.id);
            await Collection.addToWant(testUser.id, card2.id);

            const csv = await Collection.exportToCSV(testUser.id);

            expect(csv).toBeDefined();
            expect(csv).toContain('Export Card 1');
            expect(csv).toContain('Export Card 2');
        });
    });
});
