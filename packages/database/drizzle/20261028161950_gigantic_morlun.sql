DROP INDEX "account_issuer_accountId_uidx";--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" DROP NOT NULL;