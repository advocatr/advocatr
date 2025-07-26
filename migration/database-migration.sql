
-- Google Cloud SQL Migration Script
-- Run this script on your new Cloud SQL PostgreSQL instance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Import the schema
\i schema.sql

-- If you have exported data, import it here
-- \i import-data.sql

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_progress(completed);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_exercises_order ON exercises("order");

-- Grant permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Update statistics
ANALYZE;

-- Verify migration
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY tablename;
