import crypto from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { member } from "./member.schema";

export const organization = table("organization", {
	id: v.text("id").primaryKey(),
	name: v.text("name").notNull(),
	slug: v.text("slug").notNull(),
	logo: v.text("logo"),
	bannerImg: v.text("banner_img"),
	description: v.text("description").default(""),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	privateId: v.text("private_id").$defaultFn(() => generatePrivateId()),
});

export type organizationType = typeof organization.$inferSelect;

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
}));

function generatePrivateId(): string {
	// Mix strong entropy sources
	const randomPart = crypto.randomBytes(64);
	const timeEntropy = Buffer.from(`${Date.now()}-${Math.random()}`);

	// HMAC provides keyed randomness for additional unpredictability
	const id = crypto
		.createHmac("sha512", crypto.randomBytes(32))
		.update(randomPart)
		.update(timeEntropy)
		.digest("base64url");

	// Optionally truncate to keep it manageable for URLs or DB storage
	return id.slice(0, 43); // 256-bit hash ≈ 43 chars in base64url
}
