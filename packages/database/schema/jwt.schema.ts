import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";

// --------------------
// JWKS (better-auth jwt() plugin — signs the MCP OAuth access tokens, SAY-31)
// --------------------
export const jwks = table("jwks", {
	id: v.text("id").primaryKey(),
	publicKey: v.text("public_key").notNull(),
	privateKey: v.text("private_key").notNull(),
	createdAt: v.timestamp("created_at").notNull(),
	expiresAt: v.timestamp("expires_at"),
	alg: v.text("alg"),
	crv: v.text("crv"),
});
