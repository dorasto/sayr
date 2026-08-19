-- Enable pg_vector extension (required for the task.embedding column below).
-- drizzle-kit doesn't auto-generate CREATE EXTENSION statements — added by hand,
-- matching 20260501150000_add_user_search_indexes.sql's precedent for pg_trgm.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "settings" SET DEFAULT '{"allowActionsOnClosedTasks":true,"publicActions":true,"enablePublicPage":true,"publicTaskAllowBlank":true,"publicTaskFields":{"labels":true,"category":true,"priority":true},"ai":{"disabled":false,"rateLimited":null,"taskSummary":true,"taskSummaryCustomPrompt":null,"urlFetchEnabled":false,"selectedModels":{},"featureToggles":{}}}'::json;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "embedding" vector(1024);