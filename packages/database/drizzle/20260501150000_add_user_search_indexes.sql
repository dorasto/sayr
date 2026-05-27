-- Migration to add pg_trgm extension and GIN trigram indexes for user search
-- This enables efficient text search on user.name and user.display_name

-- Enable pg_trgm extension (required for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram indexes for fast ILIKE queries
CREATE INDEX IF NOT EXISTS idx_user_name_gin_trgm ON "user" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_display_name_gin_trgm ON "user" USING gin (display_name gin_trgm_ops);
