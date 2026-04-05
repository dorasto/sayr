import { getIntegrationConfig } from "@repo/database";
import type { Settings } from "../api/index";

export interface SyncResult {
	success: boolean;
	synced: number;
	errors: string[];
}

const INTEGRATION_ID = "{{id}}";

// -------------------------
// Fetch Any Endpoint
// -------------------------
export async function fetchFromApi(
	orgId: string,
): Promise<unknown> {
	const settings = await getIntegrationConfig<Settings>(
		orgId,
		INTEGRATION_ID,
		"settings"
	);

	if (!settings?.value?.enabled) {
		throw new Error("Integration not enabled");
	}

	if (!settings.value.baseUrl) {
		throw new Error("Base URL not configured");
	}

	const url = settings.value.baseUrl;

	const res = await fetch(url);

	if (!res.ok) {
		const txt = await res.text();
		throw new Error(`API error ${res.status}: ${txt}`);
	}

	return res.json();
}