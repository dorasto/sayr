ALTER TABLE "organization" ALTER COLUMN "settings" SET DEFAULT '{"allowActionsOnClosedTasks":true,"publicActions":true,"enablePublicPage":true,"publicTaskAllowBlank":true,"publicTaskFields":{"labels":true,"category":true,"priority":true},"ai":{"disabled":false,"rateLimited":null,"taskSummary":true,"taskSummaryCustomPrompt":null,"urlFetchEnabled":false,"selectedModels":{},"featureToggles":{},"customPrompts":{},"templates":{}}}'::json;--> statement-breakpoint
ALTER TABLE "api_key" ADD COLUMN "config_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_key" ADD COLUMN "reference_id" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
ALTER TABLE "twoFactor" ADD COLUMN "verified" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "twoFactor" ADD COLUMN "failed_verification_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "twoFactor" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
CREATE INDEX "apikey_configId_idx" ON "api_key" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "api_key" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");