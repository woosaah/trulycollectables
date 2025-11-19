-- Advanced Enterprise Features Schema

-- Stock Notifications ("Notify me when back in stock")
CREATE TABLE IF NOT EXISTS stock_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    notified BOOLEAN DEFAULT false,
    notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    )
);

-- Search History
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    search_query VARCHAR(500) NOT NULL,
    filters JSONB,
    results_count INTEGER,
    clicked_result_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Popular Searches (aggregated)
CREATE TABLE IF NOT EXISTS popular_searches (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(500) UNIQUE NOT NULL,
    search_count INTEGER DEFAULT 1,
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    period VARCHAR(20) DEFAULT 'all-time' -- 'today', 'week', 'month', 'all-time'
);

-- Product Views (for analytics and recommendations)
CREATE TABLE IF NOT EXISTS product_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    referrer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    )
);

-- Product Recommendations (frequently bought together)
CREATE TABLE IF NOT EXISTS product_recommendations (
    id SERIAL PRIMARY KEY,
    source_card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    source_figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    recommended_card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    recommended_figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    score DECIMAL(5,2) DEFAULT 0, -- Recommendation strength
    purchase_together_count INTEGER DEFAULT 0,
    view_together_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT source_product CHECK (
        (source_card_id IS NOT NULL AND source_figurine_id IS NULL) OR
        (source_card_id IS NULL AND source_figurine_id IS NOT NULL)
    ),
    CONSTRAINT recommended_product CHECK (
        (recommended_card_id IS NOT NULL AND recommended_figurine_id IS NULL) OR
        (recommended_card_id IS NULL AND recommended_figurine_id IS NOT NULL)
    )
);

-- Abandoned Carts (for analytics)
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    cart_data JSONB,
    cart_total DECIMAL(10,2),
    recovery_email_sent BOOLEAN DEFAULT false,
    recovered BOOLEAN DEFAULT false,
    recovered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Analytics (daily aggregates)
CREATE TABLE IF NOT EXISTS sales_analytics (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_items_sold INTEGER DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    revenue_cards DECIMAL(12,2) DEFAULT 0,
    revenue_figurines DECIMAL(12,2) DEFAULT 0,
    top_selling_card_id INTEGER REFERENCES cards(id) ON DELETE SET NULL,
    top_selling_figurine_id INTEGER REFERENCES figurines(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Low Stock Alerts
CREATE TABLE IF NOT EXISTS low_stock_alerts (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    threshold INTEGER DEFAULT 5,
    current_quantity INTEGER,
    alert_sent BOOLEAN DEFAULT false,
    alert_sent_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    )
);

-- Bulk Import Jobs
CREATE TABLE IF NOT EXISTS bulk_import_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    import_type VARCHAR(50) NOT NULL, -- 'cards', 'figurines', 'prices'
    file_name VARCHAR(255),
    file_path TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    error_log JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Meta (SEO)
CREATE TABLE IF NOT EXISTS product_meta (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    og_title VARCHAR(255),
    og_description TEXT,
    og_image TEXT,
    canonical_url TEXT,
    schema_markup JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    ),
    CONSTRAINT unique_product UNIQUE (card_id, figurine_id)
);

-- Customer Lifetime Value Cache
CREATE TABLE IF NOT EXISTS customer_ltv (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_spent DECIMAL(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    first_purchase_date DATE,
    last_purchase_date DATE,
    days_as_customer INTEGER DEFAULT 0,
    predicted_ltv DECIMAL(12,2),
    customer_segment VARCHAR(50), -- 'new', 'regular', 'vip', 'at-risk', 'inactive'
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_notifications_user ON stock_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_card ON stock_notifications(card_id);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_figurine ON stock_notifications(figurine_id);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_notified ON stock_notifications(notified);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(search_query);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at);

CREATE INDEX IF NOT EXISTS idx_popular_searches_count ON popular_searches(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_popular_searches_query ON popular_searches(search_query);

CREATE INDEX IF NOT EXISTS idx_product_views_card ON product_views(card_id);
CREATE INDEX IF NOT EXISTS idx_product_views_figurine ON product_views(figurine_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_session ON product_views(session_id);
CREATE INDEX IF NOT EXISTS idx_product_views_created ON product_views(created_at);

CREATE INDEX IF NOT EXISTS idx_product_recommendations_source_card ON product_recommendations(source_card_id);
CREATE INDEX IF NOT EXISTS idx_product_recommendations_source_figurine ON product_recommendations(source_figurine_id);
CREATE INDEX IF NOT EXISTS idx_product_recommendations_score ON product_recommendations(score DESC);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user ON abandoned_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session ON abandoned_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovered ON abandoned_carts(recovered);

CREATE INDEX IF NOT EXISTS idx_sales_analytics_date ON sales_analytics(date DESC);

CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_card ON low_stock_alerts(card_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_figurine ON low_stock_alerts(figurine_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_resolved ON low_stock_alerts(resolved);

CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_status ON bulk_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_user ON bulk_import_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_product_meta_card ON product_meta(card_id);
CREATE INDEX IF NOT EXISTS idx_product_meta_figurine ON product_meta(figurine_id);

CREATE INDEX IF NOT EXISTS idx_customer_ltv_user ON customer_ltv(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_ltv_segment ON customer_ltv(customer_segment);

-- Function to calculate and update customer LTV
CREATE OR REPLACE FUNCTION calculate_customer_ltv()
RETURNS void AS $$
BEGIN
    INSERT INTO customer_ltv (
        user_id, total_spent, total_orders, average_order_value,
        first_purchase_date, last_purchase_date, days_as_customer,
        customer_segment, last_calculated_at
    )
    SELECT
        user_id,
        SUM(total_nzd) as total_spent,
        COUNT(*) as total_orders,
        AVG(total_nzd) as average_order_value,
        MIN(created_at::DATE) as first_purchase_date,
        MAX(created_at::DATE) as last_purchase_date,
        EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) as days_as_customer,
        CASE
            WHEN COUNT(*) = 1 THEN 'new'
            WHEN COUNT(*) >= 10 AND SUM(total_nzd) > 1000 THEN 'vip'
            WHEN COUNT(*) >= 3 THEN 'regular'
            WHEN MAX(created_at) < NOW() - INTERVAL '90 days' THEN 'inactive'
            WHEN MAX(created_at) < NOW() - INTERVAL '30 days' THEN 'at-risk'
            ELSE 'regular'
        END as customer_segment,
        NOW() as last_calculated_at
    FROM orders
    WHERE status IN ('completed', 'shipped')
    GROUP BY user_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_spent = EXCLUDED.total_spent,
        total_orders = EXCLUDED.total_orders,
        average_order_value = EXCLUDED.average_order_value,
        first_purchase_date = EXCLUDED.first_purchase_date,
        last_purchase_date = EXCLUDED.last_purchase_date,
        days_as_customer = EXCLUDED.days_as_customer,
        customer_segment = EXCLUDED.customer_segment,
        last_calculated_at = EXCLUDED.last_calculated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily sales analytics
CREATE OR REPLACE FUNCTION update_sales_analytics(target_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO sales_analytics (
        date, total_sales, total_orders, total_items_sold, average_order_value,
        new_customers, returning_customers, revenue_cards, revenue_figurines
    )
    SELECT
        target_date,
        COALESCE(SUM(o.total_nzd), 0) as total_sales,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.quantity), 0) as total_items_sold,
        COALESCE(AVG(o.total_nzd), 0) as average_order_value,
        COUNT(DISTINCT CASE WHEN first_orders.user_id IS NOT NULL THEN o.user_id END) as new_customers,
        COUNT(DISTINCT CASE WHEN first_orders.user_id IS NULL THEN o.user_id END) as returning_customers,
        COALESCE(SUM(CASE WHEN oi.card_id IS NOT NULL THEN oi.price_nzd * oi.quantity ELSE 0 END), 0) as revenue_cards,
        COALESCE(SUM(CASE WHEN oi.figurine_id IS NOT NULL THEN oi.price_nzd * oi.quantity ELSE 0 END), 0) as revenue_figurines
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN (
        SELECT user_id, MIN(created_at::DATE) as first_order_date
        FROM orders
        GROUP BY user_id
    ) first_orders ON o.user_id = first_orders.user_id AND first_orders.first_order_date = target_date
    WHERE o.created_at::DATE = target_date
        AND o.status IN ('completed', 'shipped')
    ON CONFLICT (date) DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        total_orders = EXCLUDED.total_orders,
        total_items_sold = EXCLUDED.total_items_sold,
        average_order_value = EXCLUDED.average_order_value,
        new_customers = EXCLUDED.new_customers,
        returning_customers = EXCLUDED.returning_customers,
        revenue_cards = EXCLUDED.revenue_cards,
        revenue_figurines = EXCLUDED.revenue_figurines;
END;
$$ LANGUAGE plpgsql;

-- Function to track product recommendations
CREATE OR REPLACE FUNCTION update_product_recommendations()
RETURNS void AS $$
BEGIN
    -- Find products frequently bought together
    INSERT INTO product_recommendations (
        source_card_id, recommended_card_id, purchase_together_count, score
    )
    SELECT
        oi1.card_id as source_card_id,
        oi2.card_id as recommended_card_id,
        COUNT(*) as purchase_together_count,
        (COUNT(*) * 10.0) as score
    FROM order_items oi1
    JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.card_id != oi2.card_id
    WHERE oi1.card_id IS NOT NULL AND oi2.card_id IS NOT NULL
    GROUP BY oi1.card_id, oi2.card_id
    HAVING COUNT(*) >= 2
    ON CONFLICT ON CONSTRAINT product_recommendations_pkey DO NOTHING;

    -- Similar for figurines
    INSERT INTO product_recommendations (
        source_figurine_id, recommended_figurine_id, purchase_together_count, score
    )
    SELECT
        oi1.figurine_id as source_figurine_id,
        oi2.figurine_id as recommended_figurine_id,
        COUNT(*) as purchase_together_count,
        (COUNT(*) * 10.0) as score
    FROM order_items oi1
    JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.figurine_id != oi2.figurine_id
    WHERE oi1.figurine_id IS NOT NULL AND oi2.figurine_id IS NOT NULL
    GROUP BY oi1.figurine_id, oi2.figurine_id
    HAVING COUNT(*) >= 2
    ON CONFLICT ON CONSTRAINT product_recommendations_pkey DO NOTHING;
END;
$$ LANGUAGE plpgsql;
