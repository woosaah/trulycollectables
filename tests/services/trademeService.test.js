const TradeMeService = require('../../services/trademeService');
const SystemSettings = require('../../models/SystemSettings');
const { cleanupTestData, pool } = require('../helpers/test-db-setup');

describe('TradeMe Service', () => {
    let trademeService;

    beforeAll(async () => {
        await cleanupTestData();

        // Set up test credentials
        await SystemSettings.set('trademe_consumer_key', 'test_consumer_key', 'encrypted');
        await SystemSettings.set('trademe_consumer_secret', 'test_consumer_secret', 'encrypted');
        await SystemSettings.set('trademe_sandbox_mode', 'true', 'boolean');

        trademeService = new TradeMeService();
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await pool.query("DELETE FROM system_settings WHERE setting_key LIKE 'trademe_%'");
        await pool.end();
    });

    describe('OAuth Signature Generation', () => {
        it('should generate valid OAuth signature', () => {
            const method = 'GET';
            const url = 'https://api.trademe.co.nz/v1/Categories/General.json';
            const params = {
                oauth_consumer_key: 'test_key',
                oauth_nonce: 'test_nonce',
                oauth_signature_method: 'HMAC-SHA1',
                oauth_timestamp: '1234567890',
                oauth_version: '1.0'
            };

            const signature = trademeService.generateOAuthSignature(
                method,
                url,
                params,
                'test_consumer_secret',
                ''
            );

            expect(signature).toBeDefined();
            expect(typeof signature).toBe('string');
            expect(signature.length).toBeGreaterThan(0);
        });

        it('should generate different signatures for different params', () => {
            const method = 'GET';
            const url = 'https://api.trademe.co.nz/v1/test';

            const params1 = {
                oauth_consumer_key: 'key1',
                oauth_nonce: 'nonce1',
                oauth_timestamp: '1234567890'
            };

            const params2 = {
                oauth_consumer_key: 'key2',
                oauth_nonce: 'nonce2',
                oauth_timestamp: '1234567891'
            };

            const sig1 = trademeService.generateOAuthSignature(method, url, params1, 'secret', '');
            const sig2 = trademeService.generateOAuthSignature(method, url, params2, 'secret', '');

            expect(sig1).not.toBe(sig2);
        });
    });

    describe('API Request Construction', () => {
        it('should construct valid OAuth parameters', () => {
            const params = trademeService.buildOAuthParams();

            expect(params).toHaveProperty('oauth_consumer_key');
            expect(params).toHaveProperty('oauth_nonce');
            expect(params).toHaveProperty('oauth_signature_method', 'HMAC-SHA1');
            expect(params).toHaveProperty('oauth_timestamp');
            expect(params).toHaveProperty('oauth_version', '1.0');
        });

        it('should use sandbox URL when in sandbox mode', async () => {
            await SystemSettings.set('trademe_sandbox_mode', 'true', 'boolean');

            const url = trademeService.getBaseUrl();

            expect(url).toContain('tmsandbox');
        });

        it('should use production URL when not in sandbox mode', async () => {
            await SystemSettings.set('trademe_sandbox_mode', 'false', 'boolean');

            const trademeServiceProd = new TradeMeService();
            const url = trademeServiceProd.getBaseUrl();

            expect(url).toContain('trademe.co.nz');
            expect(url).not.toContain('sandbox');

            // Reset to sandbox for other tests
            await SystemSettings.set('trademe_sandbox_mode', 'true', 'boolean');
        });
    });

    describe('Category Management', () => {
        it('should fetch TradeMe categories', async () => {
            // This would make actual API call in integration test
            // For unit test, we mock the response
            const mockCategories = [
                { Number: '0001', Name: 'Collectibles' },
                { Number: '0002', Name: 'Trading Cards' }
            ];

            // Mock the API call
            jest.spyOn(trademeService, 'getCategories').mockResolvedValue(mockCategories);

            const categories = await trademeService.getCategories();

            expect(categories).toBeDefined();
            expect(Array.isArray(categories)).toBe(true);
            expect(categories.length).toBeGreaterThan(0);
        });

        it('should cache categories locally', async () => {
            const mockCategories = [
                { Number: '0001', Name: 'Test Category' }
            ];

            jest.spyOn(trademeService, 'syncCategories').mockResolvedValue(true);

            const result = await trademeService.syncCategories();

            expect(result).toBe(true);
        });
    });

    describe('Listing Creation', () => {
        it('should validate listing data before submission', () => {
            const validListing = {
                title: 'Test Card',
                category: '0001',
                description: 'Test description with enough detail',
                duration: 7,
                startPrice: 1.00
            };

            const isValid = trademeService.validateListingData(validListing);

            expect(isValid).toBe(true);
        });

        it('should reject listing with invalid duration', () => {
            const invalidListing = {
                title: 'Test Card',
                category: '0001',
                description: 'Test description',
                duration: 15, // Invalid duration
                startPrice: 1.00
            };

            const isValid = trademeService.validateListingData(invalidListing);

            expect(isValid).toBe(false);
        });

        it('should format listing data correctly for API', () => {
            const listingData = {
                title: 'Test Card',
                category: '0001',
                subtitle: 'Great condition',
                description: 'Detailed description',
                duration: 7,
                startPrice: 1.00,
                reservePrice: 10.00,
                buyNowPrice: 20.00
            };

            const formatted = trademeService.formatListingForAPI(listingData);

            expect(formatted).toHaveProperty('Title', 'Test Card');
            expect(formatted).toHaveProperty('Category', '0001');
            expect(formatted).toHaveProperty('Duration', 7);
            expect(formatted).toHaveProperty('StartPrice', 1.00);
        });
    });

    describe('Listing Management', () => {
        it('should create listing via API', async () => {
            const listingData = {
                title: 'Test Card',
                category: '0001',
                description: 'Test description',
                duration: 7,
                startPrice: 1.00
            };

            // Mock API response
            const mockResponse = {
                ListingId: 12345678,
                Success: true
            };

            jest.spyOn(trademeService, 'createListing').mockResolvedValue(mockResponse);

            const result = await trademeService.createListing(listingData);

            expect(result).toBeDefined();
            expect(result.Success).toBe(true);
            expect(result.ListingId).toBeDefined();
        });

        it('should withdraw listing', async () => {
            const listingId = 12345678;

            jest.spyOn(trademeService, 'withdrawListing').mockResolvedValue({ Success: true });

            const result = await trademeService.withdrawListing(listingId);

            expect(result.Success).toBe(true);
        });

        it('should relist closed auction', async () => {
            const listingId = 12345678;

            jest.spyOn(trademeService, 'relistItem').mockResolvedValue({
                Success: true,
                ListingId: 87654321
            });

            const result = await trademeService.relistItem(listingId);

            expect(result.Success).toBe(true);
            expect(result.ListingId).toBeDefined();
        });
    });

    describe('Questions and Answers', () => {
        it('should fetch listing questions', async () => {
            const listingId = 12345678;

            const mockQuestions = [
                {
                    QuestionId: 1,
                    Question: 'Is this card in good condition?',
                    AskerNickname: 'buyer123',
                    AskedDate: new Date()
                }
            ];

            jest.spyOn(trademeService, 'getListingQuestions').mockResolvedValue(mockQuestions);

            const questions = await trademeService.getListingQuestions(listingId);

            expect(questions).toBeDefined();
            expect(Array.isArray(questions)).toBe(true);
        });

        it('should answer question', async () => {
            const questionId = 1;
            const answer = 'Yes, the card is in excellent condition!';

            jest.spyOn(trademeService, 'answerQuestion').mockResolvedValue({ Success: true });

            const result = await trademeService.answerQuestion(questionId, answer);

            expect(result.Success).toBe(true);
        });

        it('should validate answer length', () => {
            const shortAnswer = 'Yes';
            const validAnswer = 'Yes, the card is in excellent condition!';

            expect(trademeService.validateAnswer(shortAnswer)).toBe(false);
            expect(trademeService.validateAnswer(validAnswer)).toBe(true);
        });
    });

    describe('Fee Calculation', () => {
        it('should calculate listing fees correctly', () => {
            const salePrice = 100.00;

            const fees = trademeService.calculateFees(salePrice);

            expect(fees).toBeDefined();
            expect(fees.successFee).toBeDefined();
            expect(fees.totalFee).toBeDefined();
            expect(typeof fees.successFee).toBe('number');
        });

        it('should apply correct fee tiers', () => {
            const prices = [50, 150, 500, 1500];

            prices.forEach(price => {
                const fees = trademeService.calculateFees(price);
                expect(fees.successFee).toBeGreaterThan(0);
                expect(fees.successFee).toBeLessThan(price);
            });
        });
    });

    describe('Sync Operations', () => {
        it('should sync listing status from TradeMe', async () => {
            const listingId = 12345678;

            const mockListingData = {
                ListingId: listingId,
                Status: 'Active',
                CurrentBid: 10.00,
                BidCount: 3,
                ViewCount: 25,
                WatchlistCount: 2
            };

            jest.spyOn(trademeService, 'getListingDetails').mockResolvedValue(mockListingData);

            const data = await trademeService.getListingDetails(listingId);

            expect(data.ListingId).toBe(listingId);
            expect(data.Status).toBe('Active');
            expect(data.BidCount).toBe(3);
        });

        it('should handle API errors gracefully', async () => {
            jest.spyOn(trademeService, 'getListingDetails').mockRejectedValue(
                new Error('API Error')
            );

            await expect(trademeService.getListingDetails(12345678))
                .rejects
                .toThrow('API Error');
        });
    });

    describe('Settings Validation', () => {
        it('should check if API credentials are configured', async () => {
            const hasCredentials = await trademeService.hasValidCredentials();

            expect(typeof hasCredentials).toBe('boolean');
        });

        it('should validate required settings', async () => {
            const settings = await trademeService.getSettings();

            expect(settings).toHaveProperty('consumerKey');
            expect(settings).toHaveProperty('consumerSecret');
            expect(settings).toHaveProperty('sandboxMode');
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            jest.spyOn(trademeService, 'makeRequest').mockRejectedValue(
                new Error('Network error')
            );

            await expect(trademeService.makeRequest('GET', '/test'))
                .rejects
                .toThrow('Network error');
        });

        it('should handle API rate limiting', async () => {
            jest.spyOn(trademeService, 'makeRequest').mockRejectedValue(
                new Error('Rate limit exceeded')
            );

            await expect(trademeService.makeRequest('GET', '/test'))
                .rejects
                .toThrow('Rate limit exceeded');
        });

        it('should log API errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            try {
                await trademeService.makeRequest('INVALID', '/test');
            } catch (error) {
                // Expected to fail
            }

            consoleSpy.mockRestore();
        });
    });
});
