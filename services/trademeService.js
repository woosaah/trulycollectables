const crypto = require('crypto');
const https = require('https');
const pool = require('../config/database');

class TradeMeService {
    constructor() {
        this.sandboxBaseUrl = 'https://api.tmsandbox.co.nz/v1';
        this.productionBaseUrl = 'https://api.trademe.co.nz/v1';
        this.settings = {};
    }

    // Load settings from database
    async loadSettings() {
        const query = `
            SELECT setting_key, setting_value, setting_type
            FROM system_settings
            WHERE category = 'trademe'
        `;
        const result = await pool.query(query);

        this.settings = {};
        result.rows.forEach(row => {
            let value = row.setting_value;

            // Parse based on type
            if (row.setting_type === 'boolean') {
                value = value === 'true';
            } else if (row.setting_type === 'number') {
                value = parseFloat(value);
            } else if (row.setting_type === 'json') {
                value = JSON.parse(value);
            }

            this.settings[row.setting_key] = value;
        });

        return this.settings;
    }

    // Get base URL based on sandbox mode
    getBaseUrl() {
        return this.settings.trademe_sandbox_mode ? this.sandboxBaseUrl : this.productionBaseUrl;
    }

    // OAuth signature generation
    generateOAuthSignature(method, url, params, consumerSecret, tokenSecret = '') {
        // Sort parameters
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');

        // Create signature base string
        const signatureBaseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

        // Create signing key
        const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

        // Generate signature
        const signature = crypto
            .createHmac('sha1', signingKey)
            .update(signatureBaseString)
            .digest('base64');

        return signature;
    }

    // Generate OAuth parameters
    generateOAuthParams(consumerKey) {
        return {
            oauth_consumer_key: consumerKey,
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_version: '1.0'
        };
    }

    // Make authenticated API request
    async makeRequest(method, endpoint, data = null, accessToken = null, accessTokenSecret = null) {
        await this.loadSettings();

        if (!this.settings.trademe_enabled) {
            throw new Error('TradeMe integration is not enabled');
        }

        const consumerKey = this.settings.trademe_consumer_key;
        const consumerSecret = this.settings.trademe_consumer_secret;

        if (!consumerKey || !consumerSecret) {
            throw new Error('TradeMe API credentials not configured');
        }

        const baseUrl = this.getBaseUrl();
        const url = `${baseUrl}${endpoint}`;

        // Generate OAuth parameters
        const oauthParams = this.generateOAuthParams(consumerKey);

        if (accessToken) {
            oauthParams.oauth_token = accessToken;
        }

        // Combine with query/body parameters
        const allParams = { ...oauthParams };
        if (method === 'GET' && data) {
            Object.assign(allParams, data);
        }

        // Generate signature
        const signature = this.generateOAuthSignature(
            method,
            url,
            allParams,
            consumerSecret,
            accessTokenSecret || ''
        );

        oauthParams.oauth_signature = signature;

        // Build Authorization header
        const authHeader = 'OAuth ' + Object.keys(oauthParams)
            .sort()
            .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
            .join(', ');

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            // Add query parameters for GET requests
            if (method === 'GET' && data) {
                Object.keys(data).forEach(key => {
                    urlObj.searchParams.append(key, data[key]);
                });
            }

            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(parsed.ErrorDescription || `HTTP ${res.statusCode}`));
                        }
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (method !== 'GET' && data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    // Get categories
    async getCategories() {
        return await this.makeRequest('GET', '/Categories.json');
    }

    // Search listings
    async searchListings(query, params = {}) {
        const endpoint = `/Search/General.json`;
        const searchParams = {
            search_string: query,
            ...params
        };
        return await this.makeRequest('GET', endpoint, searchParams);
    }

    // Get listing details
    async getListingDetails(listingId) {
        return await this.makeRequest('GET', `/Listings/${listingId}.json`);
    }

    // Create listing (requires OAuth tokens)
    async createListing(listingData, accessToken, accessTokenSecret) {
        const endpoint = '/Selling.json';
        return await this.makeRequest('POST', endpoint, listingData, accessToken, accessTokenSecret);
    }

    // Update listing
    async updateListing(listingId, listingData, accessToken, accessTokenSecret) {
        const endpoint = `/Selling/Edit/${listingId}.json`;
        return await this.makeRequest('POST', endpoint, listingData, accessToken, accessTokenSecret);
    }

    // Withdraw listing
    async withdrawListing(listingId, reason, accessToken, accessTokenSecret) {
        const endpoint = `/Selling/Withdraw/${listingId}.json`;
        return await this.makeRequest('POST', endpoint, {
            Type: reason // 'Sold', 'Unsuccessful', 'Relisting'
        }, accessToken, accessTokenSecret);
    }

    // Relist item
    async relistItem(listingId, accessToken, accessTokenSecret) {
        const endpoint = `/Selling/Relist/${listingId}.json`;
        return await this.makeRequest('POST', endpoint, {}, accessToken, accessTokenSecret);
    }

    // Get questions for a listing
    async getQuestions(listingId, accessToken, accessTokenSecret) {
        const endpoint = `/Selling/Questions/${listingId}.json`;
        return await this.makeRequest('GET', endpoint, null, accessToken, accessTokenSecret);
    }

    // Answer a question
    async answerQuestion(listingId, questionId, answer, accessToken, accessTokenSecret) {
        const endpoint = `/Selling/AnswerQuestion.json`;
        return await this.makeRequest('POST', endpoint, {
            ListingId: listingId,
            QuestionId: questionId,
            Answer: answer
        }, accessToken, accessTokenSecret);
    }

    // Get seller listings
    async getSellerListings(accessToken, accessTokenSecret, filter = 'All') {
        // filter: 'All', 'Current', 'Sold', 'Unsold', 'Unanswered'
        const endpoint = `/MyTradeMe/SellingItems/${filter}.json`;
        return await this.makeRequest('GET', endpoint, null, accessToken, accessTokenSecret);
    }

    // Get selling fees
    async getSellingFees(categoryId) {
        const endpoint = `/Categories/${categoryId}/Details.json`;
        return await this.makeRequest('GET', endpoint);
    }

    // Sync categories to database
    async syncCategories() {
        const startTime = Date.now();

        try {
            const categories = await this.getCategories();

            // Flatten category tree
            const flatCategories = [];

            const flatten = (cat, parentId = null, path = '') => {
                const currentPath = path ? `${path} > ${cat.Name}` : cat.Name;

                flatCategories.push({
                    category_id: cat.Number,
                    category_name: cat.Name,
                    parent_category_id: parentId,
                    path: currentPath,
                    can_list_in: cat.CanListAuctions || false,
                    area: cat.Area || 'marketplace'
                });

                if (cat.Subcategories) {
                    cat.Subcategories.forEach(sub => {
                        flatten(sub, cat.Number, currentPath);
                    });
                }
            };

            if (categories.Subcategories) {
                categories.Subcategories.forEach(cat => flatten(cat));
            }

            // Insert/update categories
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                for (const cat of flatCategories) {
                    const query = `
                        INSERT INTO trademe_categories (
                            category_id, category_name, parent_category_id, path, can_list_in, area
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (category_id) DO UPDATE SET
                            category_name = EXCLUDED.category_name,
                            parent_category_id = EXCLUDED.parent_category_id,
                            path = EXCLUDED.path,
                            can_list_in = EXCLUDED.can_list_in,
                            area = EXCLUDED.area,
                            cached_at = CURRENT_TIMESTAMP
                    `;

                    await client.query(query, [
                        cat.category_id,
                        cat.category_name,
                        cat.parent_category_id,
                        cat.path,
                        cat.can_list_in,
                        cat.area
                    ]);
                }

                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

            // Log sync
            await this.logSync('categories_sync', null, 'category', 'success',
                { count: flatCategories.length },
                { synced: flatCategories.length },
                null,
                Date.now() - startTime
            );

            return { success: true, count: flatCategories.length };

        } catch (error) {
            await this.logSync('categories_sync', null, 'category', 'failed',
                null, null, error.message, Date.now() - startTime
            );
            throw error;
        }
    }

    // Log API interactions
    async logSync(syncType, entityId, entityType, status, requestData, responseData, errorMessage, durationMs) {
        const query = `
            INSERT INTO trademe_sync_log (
                sync_type, entity_id, entity_type, status, request_data, response_data, error_message, duration_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await pool.query(query, [
            syncType,
            entityId,
            entityType,
            status,
            requestData ? JSON.stringify(requestData) : null,
            responseData ? JSON.stringify(responseData) : null,
            errorMessage,
            durationMs
        ]);
    }

    // Format listing for TradeMe API
    formatListingForTradeMe(listing) {
        return {
            Category: listing.category,
            Title: listing.title,
            Subtitle: listing.subtitle,
            Description: listing.description,
            StartPrice: listing.start_price,
            ReservePrice: listing.reserve_price,
            BuyNowPrice: listing.buy_now_price,
            Duration: listing.duration,
            Pickup: listing.pickup_allowed ? 1 : 0,
            ShippingOptions: listing.shipping_options || [],
            PaymentMethods: listing.payment_methods || [1, 2], // 1=Bank deposit, 2=Cash
            Photos: listing.photos || [],
            // Add more fields as needed
        };
    }
}

module.exports = new TradeMeService();
