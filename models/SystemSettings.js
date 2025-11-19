const pool = require('../config/database');
const crypto = require('crypto');

class SystemSettings {
    // Encryption key from environment
    static getEncryptionKey() {
        const key = process.env.SETTINGS_ENCRYPTION_KEY || 'default-key-change-in-production';
        return crypto.createHash('sha256').update(key).digest();
    }

    // Encrypt sensitive data
    static encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    // Decrypt sensitive data
    static decrypt(encryptedData) {
        try {
            const parts = encryptedData.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    // Get setting
    static async get(key) {
        const query = 'SELECT * FROM system_settings WHERE setting_key = $1';
        const result = await pool.query(query, [key]);

        if (result.rows.length === 0) {
            return null;
        }

        const setting = result.rows[0];
        let value = setting.setting_value;

        // Decrypt if encrypted
        if (setting.setting_type === 'encrypted' && value) {
            value = this.decrypt(value);
        }

        // Parse based on type
        if (setting.setting_type === 'boolean') {
            value = value === 'true';
        } else if (setting.setting_type === 'number') {
            value = parseFloat(value);
        } else if (setting.setting_type === 'json') {
            value = JSON.parse(value);
        }

        return value;
    }

    // Get all settings by category
    static async getByCategory(category) {
        const query = 'SELECT * FROM system_settings WHERE category = $1';
        const result = await pool.query(query, [category]);

        const settings = {};
        for (const row of result.rows) {
            let value = row.setting_value;

            // Decrypt if encrypted
            if (row.setting_type === 'encrypted' && value) {
                value = this.decrypt(value);
            }

            // Parse based on type
            if (row.setting_type === 'boolean') {
                value = value === 'true';
            } else if (row.setting_type === 'number') {
                value = parseFloat(value);
            } else if (row.setting_type === 'json' && value) {
                value = JSON.parse(value);
            }

            settings[row.setting_key] = value;
        }

        return settings;
    }

    // Set setting
    static async set(key, value, updatedBy = null) {
        // Get setting to check type
        const getSetting = await pool.query('SELECT * FROM system_settings WHERE setting_key = $1', [key]);

        if (getSetting.rows.length === 0) {
            throw new Error(`Setting ${key} does not exist`);
        }

        const setting = getSetting.rows[0];
        let finalValue = value;

        // Convert to string based on type
        if (setting.setting_type === 'boolean') {
            finalValue = value ? 'true' : 'false';
        } else if (setting.setting_type === 'number') {
            finalValue = value.toString();
        } else if (setting.setting_type === 'json') {
            finalValue = JSON.stringify(value);
        } else if (setting.setting_type === 'encrypted') {
            finalValue = this.encrypt(value);
        } else {
            finalValue = value.toString();
        }

        const query = `
            UPDATE system_settings
            SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
            WHERE setting_key = $3
            RETURNING *
        `;

        const result = await pool.query(query, [finalValue, updatedBy, key]);
        return result.rows[0];
    }

    // Get all settings (for admin)
    static async getAll() {
        const query = 'SELECT * FROM system_settings ORDER BY category, setting_key';
        const result = await pool.query(query);

        return result.rows.map(row => {
            // Don't decrypt for display, just mark as encrypted
            if (row.setting_type === 'encrypted' && row.setting_value) {
                row.setting_value = '********';
            }
            return row;
        });
    }

    // Create new setting
    static async create(settingData) {
        const { setting_key, setting_value, setting_type, description, category } = settingData;

        let finalValue = setting_value;
        if (setting_type === 'encrypted') {
            finalValue = this.encrypt(setting_value);
        }

        const query = `
            INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await pool.query(query, [setting_key, finalValue, setting_type, description, category]);
        return result.rows[0];
    }

    // Delete setting
    static async delete(key) {
        const query = 'DELETE FROM system_settings WHERE setting_key = $1';
        await pool.query(query, [key]);
    }
}

module.exports = SystemSettings;
