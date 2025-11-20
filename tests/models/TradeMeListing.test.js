const TradeMeListing = require('../../models/TradeMeListing');
const { cleanupTestData, createTestUser, createTestCard, pool } = require('../helpers/test-db-setup');

describe('TradeMeListing Model', () => {
    let testUser;
    let testCard;

    beforeAll(async () => {
        await cleanupTestData();
    });

    beforeEach(async () => {
        testUser = await createTestUser({ role: 'admin' });
        testCard = await createTestCard();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('create', () => {
        it('should create a new TradeMe listing for a card', async () => {
            const listingData = {
                card_id: testCard.id,
                title: 'Test Card Listing',
                category: '0001',
                subtitle: 'Great condition',
                description: 'Excellent trading card for sale',
                duration: 7,
                start_price: 1.00,
                reserve_price: 10.00,
                buy_now_price: 20.00,
                shipping_price: 3.00,
                pickup_allowed: true,
                payment_methods: ['Bank Transfer', 'Cash'],
                shipping_options: ['Courier', 'NZ Post'],
                photos: ['photo1.jpg', 'photo2.jpg'],
                created_by: testUser.id
            };

            const listing = await TradeMeListing.create(listingData);

            expect(listing).toBeDefined();
            expect(listing.id).toBeDefined();
            expect(listing.card_id).toBe(testCard.id);
            expect(listing.title).toBe('Test Card Listing');
            expect(listing.status).toBe('draft');
            expect(parseFloat(listing.start_price)).toBe(1.00);
        });

        it('should create listing with correct JSON fields', async () => {
            const listingData = {
                card_id: testCard.id,
                title: 'Test Listing',
                category: '0001',
                description: 'Test description',
                duration: 7,
                start_price: 1.00,
                payment_methods: ['Bank Transfer'],
                shipping_options: ['Courier'],
                photos: ['photo.jpg'],
                created_by: testUser.id
            };

            const listing = await TradeMeListing.create(listingData);
            const retrieved = await TradeMeListing.findById(listing.id);

            expect(retrieved.payment_methods).toBeDefined();
            expect(Array.isArray(retrieved.payment_methods)).toBe(true);
            expect(retrieved.shipping_options).toBeDefined();
            expect(retrieved.photos).toBeDefined();
        });
    });

    describe('findById', () => {
        it('should find listing by id with product details', async () => {
            const listingData = {
                card_id: testCard.id,
                title: 'Find By ID Test',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            };

            const created = await TradeMeListing.create(listingData);
            const listing = await TradeMeListing.findById(created.id);

            expect(listing).toBeDefined();
            expect(listing.id).toBe(created.id);
            expect(listing.card_name).toBe(testCard.card_name);
            expect(listing.set_name).toBe(testCard.set_name);
        });

        it('should return undefined for non-existent id', async () => {
            const listing = await TradeMeListing.findById(999999);
            expect(listing).toBeUndefined();
        });
    });

    describe('findAll', () => {
        it('should find all listings', async () => {
            await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Listing 1',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Listing 2',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            const listings = await TradeMeListing.findAll();

            expect(listings).toBeDefined();
            expect(listings.length).toBeGreaterThanOrEqual(2);
        });

        it('should filter listings by status', async () => {
            await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Draft Listing',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            const listings = await TradeMeListing.findAll({ status: 'draft' });

            expect(listings).toBeDefined();
            listings.forEach(listing => {
                expect(listing.status).toBe('draft');
            });
        });
    });

    describe('update', () => {
        it('should update listing fields', async () => {
            const listing = await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Original Title',
                category: '0001',
                description: 'Original description',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            const updated = await TradeMeListing.update(listing.id, {
                title: 'Updated Title',
                description: 'Updated description',
                start_price: 5.00
            });

            expect(updated.title).toBe('Updated Title');
            expect(updated.description).toBe('Updated description');
            expect(parseFloat(updated.start_price)).toBe(5.00);
        });

        it('should update JSON fields correctly', async () => {
            const listing = await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Test',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                payment_methods: ['Cash'],
                created_by: testUser.id
            });

            const updated = await TradeMeListing.update(listing.id, {
                payment_methods: ['Bank Transfer', 'Cash', 'Credit Card']
            });

            expect(Array.isArray(updated.payment_methods)).toBe(true);
            expect(updated.payment_methods.length).toBe(3);
        });
    });

    describe('updateFromTradeMe', () => {
        it('should update listing from TradeMe response', async () => {
            const listing = await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Test',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            const trademeData = {
                ListingId: 12345678,
                Status: 'Active',
                Url: 'https://www.trademe.co.nz/Browse/Listing.aspx?id=12345678',
                StartDate: new Date(),
                EndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                CurrentBid: 5.00,
                BidCount: 3,
                ViewCount: 25
            };

            const updated = await TradeMeListing.updateFromTradeMe(listing.id, trademeData);

            expect(updated.trademe_listing_id).toBe('12345678');
            expect(updated.status).toBe('active');
            expect(parseFloat(updated.current_bid)).toBe(5.00);
            expect(updated.bid_count).toBe(3);
            expect(updated.view_count).toBe(25);
        });
    });

    describe('getActive', () => {
        it('should get only active listings', async () => {
            const listing = await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Active Test',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            await TradeMeListing.update(listing.id, { status: 'active' });

            const activeListings = await TradeMeListing.getActive();

            expect(activeListings).toBeDefined();
            activeListings.forEach(l => {
                expect(l.status).toBe('active');
            });
        });
    });

    describe('getDrafts', () => {
        it('should get only draft listings', async () => {
            await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Draft Test',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            const drafts = await TradeMeListing.getDrafts();

            expect(drafts).toBeDefined();
            drafts.forEach(listing => {
                expect(listing.status).toBe('draft');
            });
        });
    });

    describe('syncFromTradeMe', () => {
        it('should sync listing data from TradeMe', async () => {
            const listing = await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Sync Test',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            await TradeMeListing.update(listing.id, { status: 'active' });

            const trademeData = {
                Status: 'Active',
                CurrentBid: 10.00,
                BidCount: 5,
                ViewCount: 50,
                WatchlistCount: 3
            };

            const synced = await TradeMeListing.syncFromTradeMe(listing.id, trademeData);

            expect(parseFloat(synced.current_bid)).toBe(10.00);
            expect(synced.bid_count).toBe(5);
            expect(synced.view_count).toBe(50);
            expect(synced.watchlist_count).toBe(3);
        });

        it('should mark listing as sold when closed with bidder', async () => {
            const listing = await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Sold Test',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            const trademeData = {
                Status: 'Closed',
                SuccessfulBidder: 'BuyerNickname',
                CurrentBid: 20.00,
                BidCount: 10,
                ViewCount: 100
            };

            const synced = await TradeMeListing.syncFromTradeMe(listing.id, trademeData);

            expect(synced.status).toBe('sold');
        });

        it('should mark listing as unsold when closed without bidder', async () => {
            const listing = await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Unsold Test',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            const trademeData = {
                Status: 'Closed',
                BidCount: 0,
                ViewCount: 50
            };

            const synced = await TradeMeListing.syncFromTradeMe(listing.id, trademeData);

            expect(synced.status).toBe('unsold');
        });
    });

    describe('delete', () => {
        it('should delete listing', async () => {
            const listing = await TradeMeListing.create({
                card_id: testCard.id,
                title: 'Delete Test',
                category: '0001',
                description: 'Test',
                duration: 7,
                start_price: 1.00,
                created_by: testUser.id
            });

            await TradeMeListing.delete(listing.id);

            const deleted = await TradeMeListing.findById(listing.id);
            expect(deleted).toBeUndefined();
        });
    });
});
