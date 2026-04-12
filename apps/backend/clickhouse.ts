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
	| "member.invite_accepted"
	| "member.invite_declined"
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

// ---------------------------------------------------------------------------
// AI Usage — read queries (cloud-only)
// ---------------------------------------------------------------------------

export interface AiUsageRow {
	event_time: string;
	event_type: string;
	actor_id: string;
	target_id: string;
	model: string;
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
	cost_cents: number;
	success: number; // ClickHouse Bool returns 0/1
}

export interface AiMonthlySummary {
	month: string; // 'YYYY-MM'
	requests: number;
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
	cost_cents: number;
}

/**
 * Query AI usage events for a specific org from ClickHouse.
 * Returns null when ClickHouse is unavailable (CE, missing env vars, etc.).
 */
export async function queryAiUsageByOrg(
	orgId: string,
	days: number,
): Promise<{ rows: AiUsageRow[]; monthlySummary: AiMonthlySummary[] } | null> {
	const ch = getClient();
	if (!ch) return null;

	const safeDays = Math.min(Math.max(Math.floor(days), 1), 365);
	// Sanitize orgId — must be a UUID (alphanumeric + hyphens only)
	if (!/^[a-zA-Z0-9\-_]+$/.test(orgId)) return null;

	const [rowsResult, summaryResult] = await Promise.all([
		ch.query({
			query: `
				SELECT
					toString(created_at) AS event_time,
					event_type,
					actor_id,
					target_id,
					JSONExtractString(metadata, 'model')         AS model,
					JSONExtractInt(metadata, 'input_tokens')     AS input_tokens,
					JSONExtractInt(metadata, 'output_tokens')    AS output_tokens,
					JSONExtractInt(metadata, 'total_tokens')     AS total_tokens,
					JSONExtractFloat(metadata, 'cost_cents')     AS cost_cents,
					JSONExtractBool(metadata, 'success')         AS success
				FROM platform_events
				WHERE event_type = 'ai.summary_requested'
					AND org_id = '${orgId}'
					AND created_at >= now() - INTERVAL ${safeDays} DAY
				ORDER BY created_at DESC
				LIMIT 500
			`,
			format: "JSONEachRow",
		}),
		ch.query({
			query: `
				SELECT
					formatDateTime(created_at, '%Y-%m') AS month,
					count()                                                    AS requests,
					sum(JSONExtractInt(metadata, 'input_tokens'))              AS input_tokens,
					sum(JSONExtractInt(metadata, 'output_tokens'))             AS output_tokens,
					sum(JSONExtractInt(metadata, 'total_tokens'))              AS total_tokens,
					sum(JSONExtractFloat(metadata, 'cost_cents'))              AS cost_cents
				FROM platform_events
				WHERE event_type = 'ai.summary_requested'
					AND org_id = '${orgId}'
					AND created_at >= now() - INTERVAL ${safeDays} DAY
				GROUP BY month
				ORDER BY month DESC
			`,
			format: "JSONEachRow",
		}),
	]);

	const rows = await rowsResult.json<AiUsageRow>();
	const monthlySummary = await summaryResult.json<AiMonthlySummary>();

	return { rows, monthlySummary };
}

// ---------------------------------------------------------------------------
// AI Usage Summary — all orgs, last N days (cloud-only, for org table)
// ---------------------------------------------------------------------------

export interface AiOrgSummary {
	org_id: string;
	requests: number;
	total_tokens: number;
	input_tokens: number;
	output_tokens: number;
}

/**
 * Returns per-org AI usage aggregates for the last `days` days.
 * Returns null when ClickHouse is unavailable.
 */
export async function queryAiUsageSummaryAllOrgs(
	days: number,
): Promise<AiOrgSummary[] | null> {
	const ch = getClient();
	if (!ch) return null;

	const safeDays = Math.min(Math.max(Math.floor(days), 1), 365);

	const result = await ch.query({
		query: `
			SELECT
				org_id,
				count()                                               AS requests,
				sum(JSONExtractInt(metadata, 'input_tokens'))         AS input_tokens,
				sum(JSONExtractInt(metadata, 'output_tokens'))        AS output_tokens,
				sum(JSONExtractInt(metadata, 'total_tokens'))         AS total_tokens
			FROM platform_events
			WHERE event_type = 'ai.summary_requested'
				AND created_at >= now() - INTERVAL ${safeDays} DAY
			GROUP BY org_id
		`,
		format: "JSONEachRow",
	});

	return result.json<AiOrgSummary>();
}
