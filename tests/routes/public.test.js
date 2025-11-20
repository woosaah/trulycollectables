const request = require('supertest');
const app = require('../../server');
const { cleanupTestData, createTestCard, createTestFigurine, pool } = require('../helpers/test-db-setup');

describe('Public Routes', () => {
    beforeAll(async () => {
        await cleanupTestData();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('GET /', () => {
        it('should render homepage', async () => {
            const response = await request(app)
                .get('/');

            expect(response.status).toBe(200);
            expect(response.text).toContain('TrulyCollectables');
        });
    });

    describe('GET /browse/cards', () => {
        it('should render cards browse page', async () => {
            const response = await request(app)
                .get('/browse/cards');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Browse Cards');
        });

        it('should display cards in inventory', async () => {
            const card = await createTestCard({
                card_name: 'Display Test Card',
                quantity: 5
            });

            const response = await request(app)
                .get('/browse/cards');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Display Test Card');
        });

        it('should filter cards by sport', async () => {
            await createTestCard({ sport: 'basketball', card_name: 'Basketball Card' });
            await createTestCard({ sport: 'football', card_name: 'Football Card' });

            const response = await request(app)
                .get('/browse/cards')
                .query({ sport: 'basketball' });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Basketball Card');
        });

        it('should filter cards by condition', async () => {
            await createTestCard({ condition: 'mint', card_name: 'Mint Card' });

            const response = await request(app)
                .get('/browse/cards')
                .query({ condition: 'mint' });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Mint Card');
        });
    });

    describe('GET /browse/figurines', () => {
        it('should render figurines browse page', async () => {
            const response = await request(app)
                .get('/browse/figurines');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Browse Figurines');
        });

        it('should display approved figurines only', async () => {
            await createTestFigurine({
                product_name: 'Approved Figurine',
                status: 'approved'
            });

            await createTestFigurine({
                product_name: 'Pending Figurine',
                status: 'pending'
            });

            const response = await request(app)
                .get('/browse/figurines');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Approved Figurine');
            expect(response.text).not.toContain('Pending Figurine');
        });
    });

    describe('GET /card/:id', () => {
        it('should render card details page', async () => {
            const card = await createTestCard({
                card_name: 'Detail Test Card',
                description: 'Test description for details page'
            });

            const response = await request(app)
                .get(`/card/${card.id}`);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Detail Test Card');
            expect(response.text).toContain('Test description for details page');
        });

        it('should return 404 for non-existent card', async () => {
            const response = await request(app)
                .get('/card/999999');

            expect(response.status).toBe(404);
        });
    });

    describe('GET /figurine/:id', () => {
        it('should render figurine details page', async () => {
            const figurine = await createTestFigurine({
                product_name: 'Detail Test Figurine',
                description: 'Test figurine description',
                status: 'approved'
            });

            const response = await request(app)
                .get(`/figurine/${figurine.id}`);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Detail Test Figurine');
        });

        it('should return 404 for non-existent figurine', async () => {
            const response = await request(app)
                .get('/figurine/999999');

            expect(response.status).toBe(404);
        });
    });

    describe('GET /search', () => {
        it('should search for cards', async () => {
            await createTestCard({
                card_name: 'Searchable Card Name',
                set_name: 'Search Set'
            });

            const response = await request(app)
                .get('/search')
                .query({ q: 'Searchable' });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Searchable Card Name');
        });

        it('should return results for empty query', async () => {
            const response = await request(app)
                .get('/search');

            expect(response.status).toBe(200);
        });
    });

    describe('GET /about', () => {
        it('should render about page', async () => {
            const response = await request(app)
                .get('/about');

            expect(response.status).toBe(200);
            expect(response.text).toContain('About');
        });
    });

    describe('GET /contact', () => {
        it('should render contact page', async () => {
            const response = await request(app)
                .get('/contact');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Contact');
        });
    });

    describe('POST /contact', () => {
        it('should submit contact form with valid data', async () => {
            const contactData = {
                name: 'Test User',
                email: 'test@test.com',
                subject: 'Test Subject',
                message: 'Test message content'
            };

            const response = await request(app)
                .post('/contact')
                .send(contactData);

            expect(response.status).toBe(302);
            expect(response.header.location).toBe('/contact');
        });

        it('should reject contact form with invalid email', async () => {
            const contactData = {
                name: 'Test User',
                email: 'invalid-email',
                subject: 'Test Subject',
                message: 'Test message'
            };

            const response = await request(app)
                .post('/contact')
                .send(contactData);

            expect(response.status).toBe(400);
        });
    });
});
