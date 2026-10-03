const pool = require('../config/database');

/**
 * API Authentication Middleware using HTTP Basic Auth
 * Checks username:api_key against users table
 */
const requireApiAuth = async (req, res, next) => {
    try {
        // Get Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'API authentication required. Use Basic Auth with username:api_key'
            });
        }

        // Decode Base64 credentials
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, apiKey] = credentials.split(':');

        if (!username || !apiKey) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid credentials format'
            });
        }

        // Query user with API access
        const query = `
            SELECT id, username, email, role, api_enabled
            FROM users
            WHERE username = $1 AND api_key = $2 AND api_enabled = true
        `;
        const result = await pool.query(query, [username, apiKey]);

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid credentials or API access not enabled'
            });
        }

        // Attach user to request
        req.apiUser = result.rows[0];
        next();
    } catch (error) {
        console.error('API authentication error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed'
        });
    }
};

/**
 * Require API user to be admin
 */
const requireApiAdmin = async (req, res, next) => {
    if (!req.apiUser) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }

    if (req.apiUser.role !== 'admin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin privileges required'
        });
    }

    next();
};

module.exports = {
    requireApiAuth,
    requireApiAdmin
};
