import { Hono } from "hono";

type AppEnv = {
	Variables: {
		user?: unknown;
		session?: unknown;
		orgId: string;
	};
};

import { getIntegrationConfig, setIntegrationConfig, getIntegrationEnabled, getIntegrationStorage, setIntegrationStorage, db, schema } from "@repo/database";
import { eq } from "drizzle-orm";

const DEFAULT_QUESTIONS: Record<string, string> = {
	question_1: "",
	question_2: "",
	question_3: "",
	question_4: ""
};

const DEFAULT_DEFAULTS = {
	status: "todo",
	priority: "none",
	categoryId: ""
};

const INTEGRATION_ID = "discordbot";

export const apiRoute = new Hono<AppEnv>();

apiRoute.get("/settings", async (c) => {
	const orgId = c.get("orgId");
	const enabled = await getIntegrationEnabled(orgId, INTEGRATION_ID);
	const guildId = await getIntegrationConfig(orgId, INTEGRATION_ID, "guildId");
	const channelId = await getIntegrationConfig(orgId, INTEGRATION_ID, "channelId");

	return c.json({
		success: true,
		data: {
			enabled,
			guildId: guildId?.value ?? "",
			channelId: channelId?.value ?? "",
		},
	});
});

apiRoute.patch("/settings", async (c) => {
	const orgId = c.get("orgId");
	const body = await c.req.json();
	if (body.guildId !== undefined) {
		await setIntegrationConfig(orgId, INTEGRATION_ID, "guildId", body.guildId);
	}
	if (body.channelId !== undefined) {
		await setIntegrationConfig(orgId, INTEGRATION_ID, "channelId", body.channelId);
	}

	return c.json({ success: true });
});

apiRoute.get("/questions", async (c) => {
	const orgId = c.get("orgId");
	const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
	const data = (storage?.data ?? {}) as Record<string, unknown>;

	const storedDefaults = (data.defaults ?? DEFAULT_DEFAULTS) as Record<string, unknown>;
	const storedQuestions = (data.questions ?? DEFAULT_QUESTIONS) as Record<string, string>;

	const categories = await db.select({ id: schema.category.id, name: schema.category.name })
		.from(schema.category)
		.where(eq(schema.category.organizationId, orgId));

	return c.json({
		success: true,
		data: {
			...storedQuestions,
			defaults: storedDefaults,
			categories: categories.map(c => ({ value: c.id, label: c.name ?? c.id }))
		}
	});
});

apiRoute.patch("/questions", async (c) => {
	const orgId = c.get("orgId");
	const body = await c.req.json();
	const questions: Record<string, string> = {};
	if (body.question_1 !== undefined) questions.question_1 = body.question_1;
	if (body.question_2 !== undefined) questions.question_2 = body.question_2;
	if (body.question_3 !== undefined) questions.question_3 = body.question_3;
	if (body.question_4 !== undefined) questions.question_4 = body.question_4;

	// Handle both flat body (from UI) and nested structure
	const incomingDefaults = (body.defaults ?? body) as Record<string, unknown>;

	await setIntegrationStorage(orgId, INTEGRATION_ID, {
		questions: { ...DEFAULT_QUESTIONS, ...questions },
		defaults: {
			status: String(incomingDefaults.status ?? incomingDefaults.status ?? "todo"),
			priority: String(incomingDefaults.priority ?? incomingDefaults.priority ?? "none"),
			categoryId: String(incomingDefaults.categoryId ?? incomingDefaults.categoryId ?? "")
		}
	});

	return c.json({ success: true });
});