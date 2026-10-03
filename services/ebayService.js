const BROWSE_API_BASE = 'https://api.ebay.com/buy/browse/v1';
const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const MARKETPLACE = 'EBAY_AU';

let _tokenCache = null;

async function getAccessToken() {
    if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60000) {
        return _tokenCache.token;
    }

    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not configured');

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    });

    if (!response.ok) throw new Error(`eBay token request failed: HTTP ${response.status}`);
    const data = await response.json();
    if (!data.access_token) throw new Error('No access token in eBay response');

    _tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return _tokenCache.token;
}

async function searchListings(card) {
    const parts = [card.card_name];
    if (card.year) parts.push(card.year);
    if (card.set_name) parts.push(card.set_name);
    const query = parts.join(' ');

    const token = await getAccessToken();
    const params = new URLSearchParams({
        q: query,
        limit: '20',
        filter: 'buyingOptions:{FIXED_PRICE}',
        sort: 'price',
    });

    const response = await fetch(`${BROWSE_API_BASE}/item_summary/search?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE,
        },
    });

    if (!response.ok) throw new Error(`eBay Browse API HTTP ${response.status}`);
    const data = await response.json();

    if (data.errors?.length) {
        throw new Error(data.errors[0].longMessage || data.errors[0].message);
    }

    const items = data.itemSummaries || [];
    const prices = items.map(i => parseFloat(i.price?.value || 0)).filter(p => p > 0);

    return {
        query,
        type: 'active_listings',
        total: data.total || 0,
        items: items.map(item => ({
            title: item.title,
            price: parseFloat(item.price?.value || 0),
            currency: item.price?.currency || 'AUD',
            condition: item.condition,
            url: item.itemWebUrl,
            image: item.image?.imageUrl,
        })),
        stats: prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: prices.reduce((a, b) => a + b, 0) / prices.length,
            count: prices.length,
        } : null,
    };
}

module.exports = { searchListings };
