const pool = require('../config/database');

const Settings = {
    async get(key) {
        const result = await pool.query('SELECT value FROM site_settings WHERE key = $1', [key]);
        return result.rows[0] ? result.rows[0].value : null;
    },

    async getMultiple(keys) {
        const result = await pool.query('SELECT key, value FROM site_settings WHERE key = ANY($1)', [keys]);
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        return settings;
    },

    async getAll() {
        const result = await pool.query('SELECT key, value FROM site_settings ORDER BY key');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        return settings;
    },

    async set(key, value) {
        await pool.query(
            `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, value]
        );
    },

    async setMultiple(keyValuePairs) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const [key, value] of Object.entries(keyValuePairs)) {
                await client.query(
                    `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW())
                     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                    [key, value]
                );
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getShippingRates() {
        const settings = await this.getMultiple([
            'shipping_small_bag_price', 'shipping_medium_bag_price', 'shipping_large_bag_price',
            'shipping_small_bag_label', 'shipping_medium_bag_label', 'shipping_large_bag_label',
            'shipping_pickup_available', 'shipping_pickup_instructions'
        ]);
        return {
            small: { price: parseFloat(settings.shipping_small_bag_price) || 7, label: settings.shipping_small_bag_label || 'Single Card' },
            medium: { price: parseFloat(settings.shipping_medium_bag_price) || 9, label: settings.shipping_medium_bag_label || 'Box of Cards' },
            large: { price: parseFloat(settings.shipping_large_bag_price) || 11, label: settings.shipping_large_bag_label || 'Ultra Pro Pages' },
            pickupAvailable: settings.shipping_pickup_available === 'true',
            pickupInstructions: settings.shipping_pickup_instructions || ''
        };
    },

    async getBankDetails() {
        const settings = await this.getMultiple([
            'bank_name', 'bank_account_name', 'bank_account_number', 'bank_reference_instructions'
        ]);
        return {
            bankName: settings.bank_name || '',
            accountName: settings.bank_account_name || '',
            accountNumber: settings.bank_account_number || '',
            referenceInstructions: settings.bank_reference_instructions || ''
        };
    }
};

module.exports = Settings;
