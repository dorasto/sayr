import { randomUUID } from "node:crypto";
import { relations, sql } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { savedView } from "./saveView.schema";

/**
 * What a favourite points at. Only saved views today (personal and org views alike); each new kind gets its own
 * nullable target column below, with its own foreign key, so deleting the target removes it from everyone's
 * favourites.
 */
export const favouriteKindEnum = v.pgEnum("favourite_kind", ["saved_view"]);

/**
 * A user's sidebar Favourites (SAY-104): one row per pinned item, in the user's own `position` order. Per user,
 * so pinning an org's shared view never changes it for anyone else. Replaces `saved_view.pinned`.
 */
export const favourite = table(
	"favourite",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		userId: v
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		kind: favouriteKindEnum("kind").notNull(),
		savedViewId: v.text("saved_view_id").references(() => savedView.id, { onDelete: "cascade" }),
		position: v.integer("position").notNull().default(0),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	},
	(t) => [
		v.unique("unq_favourite_user_saved_view").on(t.userId, t.savedViewId),
		v.index("idx_favourite_user_position").on(t.userId, t.position),
		// Exactly the kind's own target column is set.
		v.check("chk_favourite_target", sql`(${t.kind} = 'saved_view') = (${t.savedViewId} is not null)`),
	]
);

export type favouriteType = typeof favourite.$inferSelect;

export const favouriteRelations = relations(favourite, ({ one }) => ({
	user: one(user, { fields: [favourite.userId], references: [user.id] }),
	savedView: one(savedView, { fields: [favourite.savedViewId], references: [savedView.id] }),
}));
