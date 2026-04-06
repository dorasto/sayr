import { Hono } from "hono";

type AppEnv = {
	Variables: {
		user?: unknown;
		session?: unknown;
		orgId: string;
	};
};

import { getIntegrationConfig, setIntegrationConfig, getIntegrationStorage, setIntegrationStorage, db, schema, getIntegrationConfigByValue } from "@repo/database";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { integrationConfigValueType } from "../src/types";

export interface DiscordTemplate {
	id: string;
	name: string;
	titlePrefix: string;
	description: string;
	questions: {
		question_1: string;
		question_2: string;
		question_3: string;
		question_4: string;
	};
	defaults: {
		status: string;
		priority: string;
		categoryId: string;
	};
}

const DEFAULT_TEMPLATE_DEFAULTS = {
	status: "todo",
	priority: "none",
	categoryId: "",
};

const INTEGRATION_ID = "discordbot";

export const apiRoute = new Hono<AppEnv>();

// ─── Settings ────────────────────────────────────────────────────────────────

apiRoute.get("/settings", async (c) => {
	const orgId = c.get("orgId");
	const settings = await getIntegrationConfig<integrationConfigValueType>(orgId, INTEGRATION_ID, "settings")
	const value = settings?.value
	return c.json({
		success: true,
		data: value
	});
});
export async function getGuildOwner(
	integrationId: string,
	guildId: string
): Promise<string | null> {
	const existing = await getIntegrationConfigByValue(
		"settings",
		integrationId,
		"guildId",
		guildId
	);
	return existing?.organizationId ?? null;
}
apiRoute.patch("/settings", async (c) => {
	const orgId = c.get("orgId")
	const body = await c.req.json()

	const current = await getIntegrationConfig<integrationConfigValueType>(
		orgId,
		INTEGRATION_ID,
		"settings"
	)

	// Base value
	const updated: integrationConfigValueType = {
		...current?.value
	}

	if (body.guildId !== undefined) {
		const ownerOrg = await getGuildOwner(INTEGRATION_ID, body.guildId)

		if (ownerOrg && ownerOrg !== orgId) {
			return c.json({ error: "Guild already in use" }, 400)
		}

		updated.guildId = body.guildId // safe for snowflakes
	}

	if (body.channelId !== undefined) {
		updated.channelId = body.channelId // safe for snowflakes
	}

	// Save once
	await setIntegrationConfig<integrationConfigValueType>(
		orgId,
		INTEGRATION_ID,
		"settings",
		updated
	)

	return c.json({ success: true })
})

// ─── Templates ───────────────────────────────────────────────────────────────

apiRoute.get("/templates", async (c) => {
	const orgId = c.get("orgId");
	const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
	const data = (storage?.data ?? {}) as Record<string, unknown>;
	const templates = (data.templates ?? []) as DiscordTemplate[];

	const categories = await db
		.select({ id: schema.category.id, name: schema.category.name })
		.from(schema.category)
		.where(eq(schema.category.organizationId, orgId));

	return c.json({
		success: true,
		data: {
			templates,
			categories: categories.map((cat) => ({ value: cat.id, label: cat.name ?? cat.id })),
		},
	});
});

apiRoute.post("/templates", async (c) => {
	const orgId = c.get("orgId");
	const body = await c.req.json();

	const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
	const data = (storage?.data ?? {}) as Record<string, unknown>;
	const templates = [...((data.templates ?? []) as DiscordTemplate[])];

	const newTemplate: DiscordTemplate = {
		id: randomUUID(),
		name: String(body.name ?? "New Template"),
		titlePrefix: String(body.titlePrefix ?? ""),
		description: String(body.description ?? ""),
		questions: {
			question_1: String(body.question_1 ?? ""),
			question_2: String(body.question_2 ?? ""),
			question_3: String(body.question_3 ?? ""),
			question_4: String(body.question_4 ?? ""),
		},
		defaults: {
			status: String(body.status ?? DEFAULT_TEMPLATE_DEFAULTS.status),
			priority: String(body.priority ?? DEFAULT_TEMPLATE_DEFAULTS.priority),
			categoryId: String(body.categoryId ?? DEFAULT_TEMPLATE_DEFAULTS.categoryId),
		},
	};

	templates.push(newTemplate);
	await setIntegrationStorage(orgId, INTEGRATION_ID, { ...data, templates });

	return c.json({ success: true, data: newTemplate });
});

apiRoute.patch("/templates/:id", async (c) => {
	const orgId = c.get("orgId");
	const templateId = c.req.param("id");
	const body = await c.req.json();

	const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
	const data = (storage?.data ?? {}) as Record<string, unknown>;
	const templates = [...((data.templates ?? []) as DiscordTemplate[])];

	const idx = templates.findIndex((t) => t.id === templateId);
	if (idx === -1) {
		return c.json({ success: false, error: "Template not found" }, 404);
	}

	const existing = templates[idx]!;
	const updated: DiscordTemplate = {
		...existing,
		name: body.name !== undefined ? String(body.name) : existing.name,
		titlePrefix: body.titlePrefix !== undefined ? String(body.titlePrefix) : existing.titlePrefix,
		description: body.description !== undefined ? String(body.description) : existing.description,
		questions: {
			question_1: body.question_1 !== undefined ? String(body.question_1) : existing.questions.question_1,
			question_2: body.question_2 !== undefined ? String(body.question_2) : existing.questions.question_2,
			question_3: body.question_3 !== undefined ? String(body.question_3) : existing.questions.question_3,
			question_4: body.question_4 !== undefined ? String(body.question_4) : existing.questions.question_4,
		},
		defaults: {
			status: body.status !== undefined ? String(body.status) : existing.defaults.status,
			priority: body.priority !== undefined ? String(body.priority) : existing.defaults.priority,
			categoryId: body.categoryId !== undefined ? String(body.categoryId) : existing.defaults.categoryId,
		},
	};

	templates[idx] = updated;
	await setIntegrationStorage(orgId, INTEGRATION_ID, { ...data, templates });

	return c.json({ success: true, data: updated });
});

apiRoute.delete("/templates/:id", async (c) => {
	const orgId = c.get("orgId");
	const templateId = c.req.param("id");

	const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
	const data = (storage?.data ?? {}) as Record<string, unknown>;
	const templates = ((data.templates ?? []) as DiscordTemplate[]).filter((t) => t.id !== templateId);

	await setIntegrationStorage(orgId, INTEGRATION_ID, { ...data, templates });

	return c.json({ success: true });
});
