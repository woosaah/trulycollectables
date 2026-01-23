-- TrulyCollectables Database Schema
-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS user_collections CASCADE;
DROP TABLE IF EXISTS card_images CASCADE;
DROP TABLE IF EXISTS figurines CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS card_inserts CASCADE;
DROP TABLE IF EXISTS card_sets CASCADE;
DROP TABLE IF EXISTS manufacturers CASCADE;
DROP TABLE IF EXISTS sport_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer', -- 'customer', 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sport types table
CREATE TABLE sport_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturers table
CREATE TABLE manufacturers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Card sets table
CREATE TABLE card_sets (
    id SERIAL PRIMARY KEY,
    manufacturer_id INTEGER REFERENCES manufacturers(id) ON DELETE CASCADE,
    set_name VARCHAR(255) NOT NULL,
    year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(manufacturer_id, set_name)
);

-- Card inserts/subsets table
CREATE TABLE card_inserts (
    id SERIAL PRIMARY KEY,
    card_set_id INTEGER REFERENCES card_sets(id) ON DELETE CASCADE,
    insert_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(card_set_id, insert_name)
);

-- Cards table (seller inventory)
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    card_name VARCHAR(255) NOT NULL,
    set_name VARCHAR(255),
    card_number VARCHAR(50),
    manufacturer VARCHAR(100), -- 'Topps', 'Select', 'Card Crazy', etc.
    insert_list VARCHAR(255), -- 'Master', 'Double Trouble', etc.
    year INTEGER,
    card_category VARCHAR(20), -- 'sport' or 'non_sport'
    sport_type VARCHAR(50), -- 'basketball', 'pokemon', 'magic', etc.
    condition VARCHAR(50), -- 'mint', 'near_mint', 'excellent', 'good', 'played'
    price_nzd DECIMAL(10,2),
    quantity INTEGER DEFAULT 1,
    image_front TEXT, -- URL or path
    image_back TEXT,
    description TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Card images table (additional images for cards)
CREATE TABLE card_images (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type VARCHAR(50) DEFAULT 'detail', -- 'front', 'back', 'detail', 'edge', 'corner'
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accessories table (pages, albums, sleeves, protectors, etc.)
CREATE TABLE accessories (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'Pages', 'Albums', 'Sleeves', 'Protectors', 'Boxes', 'Binders', etc.
    description TEXT,
    price_nzd DECIMAL(10,2),
    quantity INTEGER DEFAULT 1,
    image_url TEXT,
    manufacturer VARCHAR(100),
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Figurines table (seller inventory)
CREATE TABLE figurines (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    price_aud DECIMAL(10,2),
    price_nzd DECIMAL(10,2),
    quantity INTEGER DEFAULT 1,
    image_url TEXT,
    supplier VARCHAR(255),
    approved BOOLEAN DEFAULT false,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User collections table
CREATE TABLE user_collections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_name VARCHAR(255) NOT NULL,
    set_name VARCHAR(255),
    card_number VARCHAR(50),
    manufacturer VARCHAR(100),
    insert_list VARCHAR(255),
    year INTEGER,
    sport_type VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    status VARCHAR(20) NOT NULL, -- 'have', 'want'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart table
CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    )
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_nzd DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'completed', 'cancelled'
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    shipping_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    card_id INTEGER REFERENCES cards(id),
    figurine_id INTEGER REFERENCES figurines(id),
    quantity INTEGER NOT NULL,
    price_nzd DECIMAL(10,2) NOT NULL,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    )
);

-- Inquiries table
CREATE TABLE inquiries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    card_id INTEGER REFERENCES cards(id),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'replied', 'closed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_card_sets_manufacturer ON card_sets(manufacturer_id);
CREATE INDEX idx_card_sets_name ON card_sets(set_name);
CREATE INDEX idx_card_inserts_set ON card_inserts(card_set_id);
CREATE INDEX idx_cards_sport_type ON cards(sport_type);
CREATE INDEX idx_cards_available ON cards(available);
CREATE INDEX idx_cards_set_name ON cards(set_name);
CREATE INDEX idx_cards_manufacturer ON cards(manufacturer);
CREATE INDEX idx_cards_insert_list ON cards(insert_list);
CREATE INDEX idx_card_images_card_id ON card_images(card_id);
CREATE INDEX idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX idx_user_collections_status ON user_collections(status);
CREATE INDEX idx_user_collections_manufacturer ON user_collections(manufacturer);
CREATE INDEX idx_cart_user_id ON cart(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_sport_types_name ON sport_types(name);

-- Insert initial sport types
INSERT INTO sport_types (name) VALUES
    ('Basketball'),
    ('Pokemon'),
    ('Magic: The Gathering'),
    ('Baseball'),
    ('Football'),
    ('Cricket'),
    ('Rugby'),
    ('Rugby League'),
    ('Other')
ON CONFLICT (name) DO NOTHING;
