const SystemSettings = require('../../models/SystemSettings');
const { cleanupTestData, pool } = require('../helpers/test-db-setup');

describe('SystemSettings Model', () => {
    beforeAll(async () => {
        await cleanupTestData();
    });

    afterEach(async () => {
        // Clean up test settings
        await pool.query("DELETE FROM system_settings WHERE setting_key LIKE 'test_%'");
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('set', () => {
        it('should set a string setting', async () => {
            const result = await SystemSettings.set('test_string', 'test_value', 'string');

            expect(result).toBeDefined();
            expect(result.setting_key).toBe('test_string');
            expect(result.setting_value).toBe('test_value');
            expect(result.setting_type).toBe('string');
        });

        it('should set an encrypted setting', async () => {
            const result = await SystemSettings.set('test_api_key', 'secret123', 'encrypted');

            expect(result).toBeDefined();
            expect(result.setting_key).toBe('test_api_key');
            expect(result.setting_type).toBe('encrypted');
            // Value should be encrypted, not plain text
            expect(result.setting_value).not.toBe('secret123');
        });

        it('should set a boolean setting', async () => {
            const result = await SystemSettings.set('test_boolean', 'true', 'boolean');

            expect(result).toBeDefined();
            expect(result.setting_key).toBe('test_boolean');
            expect(result.setting_value).toBe('true');
            expect(result.setting_type).toBe('boolean');
        });

        it('should set a number setting', async () => {
            const result = await SystemSettings.set('test_number', '42', 'number');

            expect(result).toBeDefined();
            expect(result.setting_key).toBe('test_number');
            expect(result.setting_value).toBe('42');
            expect(result.setting_type).toBe('number');
        });

        it('should update existing setting', async () => {
            await SystemSettings.set('test_update', 'old_value', 'string');
            const result = await SystemSettings.set('test_update', 'new_value', 'string');

            expect(result.setting_value).toBe('new_value');
        });
    });

    describe('get', () => {
        it('should get a string setting', async () => {
            await SystemSettings.set('test_get_string', 'my_value', 'string');
            const value = await SystemSettings.get('test_get_string');

            expect(value).toBe('my_value');
        });

        it('should get and decrypt an encrypted setting', async () => {
            const secretValue = 'my_secret_api_key';
            await SystemSettings.set('test_encrypted', secretValue, 'encrypted');
            const value = await SystemSettings.get('test_encrypted');

            expect(value).toBe(secretValue);
        });

        it('should return default value if setting does not exist', async () => {
            const value = await SystemSettings.get('nonexistent_setting', 'default_value');

            expect(value).toBe('default_value');
        });

        it('should return null if setting does not exist and no default provided', async () => {
            const value = await SystemSettings.get('nonexistent_setting');

            expect(value).toBeNull();
        });
    });

    describe('getBoolean', () => {
        it('should return true for boolean true setting', async () => {
            await SystemSettings.set('test_bool_true', 'true', 'boolean');
            const value = await SystemSettings.getBoolean('test_bool_true');

            expect(value).toBe(true);
        });

        it('should return false for boolean false setting', async () => {
            await SystemSettings.set('test_bool_false', 'false', 'boolean');
            const value = await SystemSettings.getBoolean('test_bool_false');

            expect(value).toBe(false);
        });

        it('should return default value if setting does not exist', async () => {
            const value = await SystemSettings.getBoolean('nonexistent_bool', true);

            expect(value).toBe(true);
        });
    });

    describe('getNumber', () => {
        it('should return number value', async () => {
            await SystemSettings.set('test_num', '42', 'number');
            const value = await SystemSettings.getNumber('test_num');

            expect(value).toBe(42);
        });

        it('should return default value if setting does not exist', async () => {
            const value = await SystemSettings.getNumber('nonexistent_num', 100);

            expect(value).toBe(100);
        });

        it('should parse float correctly', async () => {
            await SystemSettings.set('test_float', '3.14', 'number');
            const value = await SystemSettings.getNumber('test_float');

            expect(value).toBeCloseTo(3.14);
        });
    });

    describe('getAll', () => {
        it('should return all settings', async () => {
            await SystemSettings.set('test_all_1', 'value1', 'string');
            await SystemSettings.set('test_all_2', 'value2', 'string');

            const settings = await SystemSettings.getAll();

            expect(settings).toBeDefined();
            expect(Array.isArray(settings)).toBe(true);
            expect(settings.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('delete', () => {
        it('should delete a setting', async () => {
            await SystemSettings.set('test_delete', 'value', 'string');
            await SystemSettings.delete('test_delete');

            const value = await SystemSettings.get('test_delete');
            expect(value).toBeNull();
        });
    });

    describe('exists', () => {
        it('should return true if setting exists', async () => {
            await SystemSettings.set('test_exists', 'value', 'string');
            const exists = await SystemSettings.exists('test_exists');

            expect(exists).toBe(true);
        });

        it('should return false if setting does not exist', async () => {
            const exists = await SystemSettings.exists('nonexistent_key');

            expect(exists).toBe(false);
        });
    });

    describe('TradeMe integration settings', () => {
        it('should store and retrieve TradeMe credentials securely', async () => {
            const consumerKey = 'test_consumer_key';
            const consumerSecret = 'test_consumer_secret';

            await SystemSettings.set('trademe_consumer_key', consumerKey, 'encrypted');
            await SystemSettings.set('trademe_consumer_secret', consumerSecret, 'encrypted');

            const retrievedKey = await SystemSettings.get('trademe_consumer_key');
            const retrievedSecret = await SystemSettings.get('trademe_consumer_secret');

            expect(retrievedKey).toBe(consumerKey);
            expect(retrievedSecret).toBe(consumerSecret);
        });

        it('should handle TradeMe sandbox mode setting', async () => {
            await SystemSettings.set('trademe_sandbox_mode', 'true', 'boolean');

            const isSandbox = await SystemSettings.getBoolean('trademe_sandbox_mode');

            expect(isSandbox).toBe(true);
        });
    });
});
