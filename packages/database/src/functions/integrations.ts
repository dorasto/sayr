import { and, eq } from "drizzle-orm";
import { db } from "../database";
import { integrationConfig, integrationStorage, type integrationConfigType, type integrationStorageType } from "../../schema/integrations";

export async function getIntegrationConfig(
	orgId: string,
	integrationId: string,
	key: string
): Promise<integrationConfigType | null> {
	const result = await db.select().from(integrationConfig).where(
		and(
			eq(integrationConfig.organizationId, orgId),
			eq(integrationConfig.integrationId, integrationId),
			eq(integrationConfig.key, key)
		)
	);
	if (!result.length) return null;
	return result[0] ?? null;
}

export async function getIntegrationConfigByValue(
	key: string,
	integrationId: string,
	value: unknown
): Promise<integrationConfigType | null> {
	const result = await db.select().from(integrationConfig).where(
		and(
			eq(integrationConfig.key, key),
			eq(integrationConfig.integrationId, integrationId),
			eq(integrationConfig.value, value)
		)
	);
	if (!result.length) return null;
	return result[0] ?? null;
}

export async function setIntegrationConfig(
	orgId: string,
	integrationId: string,
	key: string,
	value: unknown
): Promise<integrationConfigType | undefined> {
	const existing = await db.select().from(integrationConfig).where(
		and(
			eq(integrationConfig.organizationId, orgId),
			eq(integrationConfig.integrationId, integrationId),
			eq(integrationConfig.key, key)
		)
	);

	if (existing.length) {
		const first = existing[0]!;
		await db
			.update(integrationConfig)
			.set({ value, updatedAt: new Date() })
			.where(eq(integrationConfig.id, first.id));
		return { ...first, value };
	}

	const [created] = await db
		.insert(integrationConfig)
		.values({
			organizationId: orgId,
			integrationId,
			key,
			value,
		})
		.returning();
	return created;
}

export async function getIntegrationEnabled(orgId: string, integrationId: string): Promise<boolean> {
	const result = await getIntegrationConfig(orgId, integrationId, "enabled");
	return result?.value === true;
}

export async function setIntegrationEnabled(orgId: string, integrationId: string, enabled: boolean): Promise<void> {
	await setIntegrationConfig(orgId, integrationId, "enabled", enabled);
}

export async function getIntegrationStorage(
	orgId: string,
	integrationId: string
): Promise<integrationStorageType | null> {
	const result = await db.select().from(integrationStorage).where(
		and(
			eq(integrationStorage.organizationId, orgId),
			eq(integrationStorage.integrationId, integrationId)
		)
	);
	if (!result.length) return null;
	return result[0] ?? null;
}

export async function setIntegrationStorage(
	orgId: string,
	integrationId: string,
	data: Record<string, unknown>
): Promise<integrationStorageType | undefined> {
	const existing = await getIntegrationStorage(orgId, integrationId);

	if (existing) {
		await db
			.update(integrationStorage)
			.set({ data, updatedAt: new Date() })
			.where(eq(integrationStorage.id, existing.id));
		return { ...existing, data };
	}

	const [created] = await db
		.insert(integrationStorage)
		.values({
			organizationId: orgId,
			integrationId,
			data,
		})
		.returning();
	return created;
}
