import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { getEditionCapabilities } from "@repo/edition";
import { db, schema, auth } from "@repo/database";
import { eq, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlatformEventType =
	| "user.registered"
	| "org.created"
	| "org.settings_changed"
	| "member.invited"
	| "member.joined"
	| "member.removed"
	| "task.created"
	| "task.status_changed"
	| "task.priority_changed"
	| "task.updated"
	| "task.category_changed"
	| "task.release_changed"
	| "task.label_added"
	| "task.label_removed"
	| "task.assignee_added"
	| "task.assignee_removed"
	| "task.parent_set"
	| "task.parent_removed"
	| "task.subtask_added"
	| "task.subtask_removed"
	| "task.relation_added"
	| "task.relation_removed"
	| "task.github_pr_linked"
	| "task.github_pr_merged"
	| "task.github_commit_ref"
	| "task.github_branch_linked"
	| "ai.summary_requested";

export interface PlatformEvent {
	event_type: PlatformEventType;
	actor_id: string;
	target_id?: string;
	org_id?: string;
	metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Singleton client (null when ClickHouse is disabled)
// ---------------------------------------------------------------------------

let client: ClickHouseClient | null = null;

function getClient(): ClickHouseClient | null {
	if (!getEditionCapabilities().clickhouseEnabled) {
		return null;
	}
	if (client) {
		return client;
	}

	const url = process.env.CLICKHOUSE_URL;
	const username = process.env.CLICKHOUSE_USER;
	const password = process.env.CLICKHOUSE_PASSWORD;
	const database = process.env.CLICKHOUSE_DB;

	if (!url || !username || !password || !database) {
		console.warn("[clickhouse] Missing env vars, ClickHouse events disabled");
		return null;
	}

	client = createClient({
		url,
		username,
		password,
		database,
	});

	return client;
}

// ---------------------------------------------------------------------------
// emitEvent — fire-and-forget, never throws, never awaited
// ---------------------------------------------------------------------------

/**
 * Emit an analytics event to ClickHouse.
 * Fire-and-forget: this function never throws and should not be awaited.
 * No-ops silently when ClickHouse is not enabled (CE/Enterprise).
 */
export function emitEvent(event: PlatformEvent): void {
	const ch = getClient();
	if (!ch) return;

	ch.insert({
		table: "platform_events",
		values: [
			{
				event_type: event.event_type,
				actor_id: event.actor_id,
				target_id: event.target_id ?? "",
				org_id: event.org_id ?? "",
				metadata: JSON.stringify(event.metadata ?? {}),
			},
		],
		format: "JSONEachRow",
	}).catch((err) => {
		console.error("[clickhouse] Failed to emit event:", event.event_type, err);
	});
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export interface SnapshotRow {
	snapshot_date: string; // YYYY-MM-DD
	metric: string;
	value: number;
}

/**
 * Collect aggregate metrics from Postgres and insert them into ClickHouse
 * `platform_snapshots`. Optionally pass a specific date (defaults to today).
 * Returns { inserted: number } on success, throws on error.
 */
export async function collectAndInsertSnapshots(dateOverride?: string): Promise<{ inserted: number }> {
	const ch = getClient();
	if (!ch) throw new Error("ClickHouse is not enabled on this edition");

	const snapshotDate = dateOverride ?? new Date().toISOString().slice(0, 10);

	const [
		usersTotal,
		orgsTotal,
		orgsFree,
		orgsPro,
		membersTotal,
		membersSeated,
		tasksTotal,
	] = await Promise.all([
		db.select({ count: sql<number>`count(*)` }).from(auth.user),
		db
			.select({ count: sql<number>`count(*)` })
			.from(schema.organization)
			.where(eq(schema.organization.isSystemOrg, false)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(schema.organization)
			.where(sql`${schema.organization.isSystemOrg} = false AND ${schema.organization.plan} = 'free'`),
		db
			.select({ count: sql<number>`count(*)` })
			.from(schema.organization)
			.where(sql`${schema.organization.isSystemOrg} = false AND ${schema.organization.plan} = 'pro'`),
		db.select({ count: sql<number>`count(*)` }).from(schema.member),
		db
			.select({ count: sql<number>`count(*)` })
			.from(schema.member)
			.where(eq(schema.member.seatAssigned, true)),
		db.select({ count: sql<number>`count(*)` }).from(schema.task),
	]);

	const rows: SnapshotRow[] = [
		{ snapshot_date: snapshotDate, metric: "users.total", value: Number(usersTotal[0]?.count ?? 0) },
		{ snapshot_date: snapshotDate, metric: "orgs.total", value: Number(orgsTotal[0]?.count ?? 0) },
		{ snapshot_date: snapshotDate, metric: "orgs.plan.free", value: Number(orgsFree[0]?.count ?? 0) },
		{ snapshot_date: snapshotDate, metric: "orgs.plan.pro", value: Number(orgsPro[0]?.count ?? 0) },
		{ snapshot_date: snapshotDate, metric: "members.total", value: Number(membersTotal[0]?.count ?? 0) },
		{ snapshot_date: snapshotDate, metric: "members.seat_assigned", value: Number(membersSeated[0]?.count ?? 0) },
		{ snapshot_date: snapshotDate, metric: "tasks.total", value: Number(tasksTotal[0]?.count ?? 0) },
	];

	await ch.insert({
		table: "platform_snapshots",
		values: rows,
		format: "JSONEachRow",
	});

	return { inserted: rows.length };
}
