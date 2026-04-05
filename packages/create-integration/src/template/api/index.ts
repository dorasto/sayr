import { Hono } from "hono";
import {
	getIntegrationConfig,
	setIntegrationConfig,
	getIntegrationStorage,
	setIntegrationStorage,
} from "@repo/database";
import { fetchFromApi } from "../src";

type AppEnv = {
	Variables: {
		user?: unknown;
		session?: unknown;
		orgId: string;
	};
};

const INTEGRATION_ID = "{{id}}";

export interface Settings {
	enabled: boolean;
	baseUrl: string;
}

export interface Item {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
}

export const apiRoute = new Hono<AppEnv>();

// -------------------------
// Settings
// -------------------------
apiRoute.get("/settings", async (c) => {
	const orgId = c.get("orgId");
	const settings = await getIntegrationConfig<Settings>(
		orgId,
		INTEGRATION_ID,
		"settings"
	);

	return c.json({
		success: true,
		data: settings?.value ?? { enabled: false, baseUrl: "" },
	});
});

apiRoute.patch("/settings", async (c) => {
	const orgId = c.get("orgId");
	const body = await c.req.json();

	const current = await getIntegrationConfig<Settings>(
		orgId,
		INTEGRATION_ID,
		"settings"
	);

	const updated: Settings = {
		enabled:
			body.enabled !== undefined
				? Boolean(body.enabled)
				: current?.value?.enabled ?? false,
		baseUrl:
			body.baseUrl !== undefined
				? String(body.baseUrl)
				: current?.value?.baseUrl ?? "",
	};

	await setIntegrationConfig(orgId, INTEGRATION_ID, "settings", updated);

	return c.json({ success: true, data: updated });
});

// -------------------------
// Items CRUD
// -------------------------
apiRoute.get("/items", async (c) => {
	const orgId = c.get("orgId");

	const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
	const data = (storage?.data ?? {}) as { items?: Item[] };

	return c.json({
		success: true,
		data: data.items ?? [],
	});
});

apiRoute.post("/items", async (c) => {
	const orgId = c.get("orgId");
	const body = await c.req.json();

	const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
	const data = (storage?.data ?? {}) as { items?: Item[] };

	const items = [...(data.items ?? [])];

	const newItem: Item = {
		id: crypto.randomUUID(),
		name: String(body.name ?? "New Item"),
		description: String(body.description ?? ""),
		enabled: Boolean(body.enabled ?? true),
	};

	items.push(newItem);

	await setIntegrationStorage(orgId, INTEGRATION_ID, { ...data, items });

	return c.json({ success: true, data: newItem });
});

apiRoute.patch("/items/:id", async (c) => {
	const orgId = c.get("orgId");
	const id = c.req.param("id");
	const body = await c.req.json();

	const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
	const data = (storage?.data ?? {}) as { items?: Item[] };

	const items: any = [...(data.items ?? [])];
	const idx = items.findIndex((i: any) => i.id === id);

	if (idx === -1) {
		return c.json({ success: false, error: "Item not found" }, 404);
	}

	items[idx] = {
		...items[idx],
		name: body.name ?? items[idx].name,
		description: body.description ?? items[idx].description,
		enabled:
			body.enabled !== undefined ? Boolean(body.enabled) : items[idx].enabled,
	};

	await setIntegrationStorage(orgId, INTEGRATION_ID, { ...data, items });

	return c.json({ success: true, data: items[idx] });
});

apiRoute.delete("/items/:id", async (c) => {
	const orgId = c.get("orgId");
	const id = c.req.param("id");

	const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
	const data = (storage?.data ?? {}) as { items?: Item[] };

	const items = (data.items ?? []).filter((i) => i.id !== id);

	await setIntegrationStorage(orgId, INTEGRATION_ID, { ...data, items });

	return c.json({ success: true });
});

// Preview external items
apiRoute.get("/sync/preview", async (c) => {
	const orgId = c.get("orgId");
	try {
		const data = await fetchFromApi(orgId);
		return c.json({
			success: true,
			data: {
				preview: data,
			}
		});
	} catch (err) {
		return c.json(
			{
				success: false,
				error: String(err),
			},
			500
		);
	}
});