import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { getEditionCapabilities } from "@repo/edition";

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
		console.warn("[clickhouse] Missing env vars, ClickHouse snapshots disabled");
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
// insertSnapshots — batch-insert daily snapshot metrics
// ---------------------------------------------------------------------------

export interface SnapshotRow {
	snapshot_date: string; // YYYY-MM-DD
	metric: string;
	value: number;
}

/**
 * Batch-insert snapshot rows into ClickHouse `platform_snapshots`.
 * Returns true on success, false on failure.
 */
export async function insertSnapshots(rows: SnapshotRow[]): Promise<boolean> {
	const ch = getClient();
	if (!ch) return false;

	try {
		await ch.insert({
			table: "platform_snapshots",
			values: rows,
			format: "JSONEachRow",
		});
		return true;
	} catch (err) {
		console.error("[clickhouse] Failed to insert snapshots:", err);
		return false;
	}
}
