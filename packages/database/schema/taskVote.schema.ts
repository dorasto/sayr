import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { task } from "./task.schema";
import { user } from "./auth";
import { organization } from "./organization.schema";

export const taskVote = table(
    "task_vote",
    {
        id: v
            .text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        organizationId: v
            .text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        taskId: v
            .text("task_id")
            .notNull()
            .references(() => task.id, { onDelete: "cascade" }),
        userId: v
            .text("user_id")
            .references(() => user.id, { onDelete: "set null" }),
        anonHash: v.text("anon_hash"),
        createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
    },
    (t) => [
        // Logged-in users: 1 vote per task
        v.unique("task_vote_user_unique").on(t.taskId, t.userId),
        // Anonymous users: 1 vote per fingerprint per task
        v.unique("task_vote_anon_unique").on(t.taskId, t.anonHash),
        v.index("idx_task_vote_task").on(t.taskId),
    ]
);
export type taskVoteType = typeof taskVote.$inferSelect;