-- Migration: Add API fields to users table
-- This migration adds api_enabled and api_key fields for REST API access

-- Add api_enabled column
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT false;

-- Add api_key column
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(64) UNIQUE;

-- Enable API access for all admin users by default
UPDATE users SET api_enabled = true WHERE role = 'admin' AND api_enabled = false;

-- Create index for faster API key lookups
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key) WHERE api_key IS NOT NULL;
