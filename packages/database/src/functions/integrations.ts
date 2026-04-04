import { and, eq, sql } from "drizzle-orm";
import { db } from "../database";
import { integrationConfig, integrationStorage, type integrationConfigType, type integrationStorageType } from "../../schema/integrations";

export async function getIntegrationConfig<TValue = unknown>(
	orgId: string,
	integrationId: string,
	key: string
): Promise<
	(Omit<integrationConfigType, "value"> & { value: TValue }) | null
> {
	if (!orgId) {
		throw new Error("getIntegrationConfig called without orgId")
	}

	const result = await db
		.select()
		.from(integrationConfig)
		.where(
			and(
				eq(integrationConfig.organizationId, orgId),
				eq(integrationConfig.integrationId, integrationId),
				eq(integrationConfig.key, key)
			)
		)

	if (!result.length) return null

	const base = result[0] as integrationConfigType

	return {
		...base,
		value: base.value as TValue
	}
}


export async function getIntegrationConfigByValue<TValue = unknown>(
	key: string,
	integrationId: string,
	valueKey: string,
	value: string
): Promise<(Omit<integrationConfigType, "value"> & { value: TValue }) | null> {
	const result = await db
		.select()
		.from(integrationConfig)
		.where(
			and(
				eq(integrationConfig.integrationId, integrationId),
				eq(integrationConfig.key, key),
				sql`${integrationConfig.value} ->> ${valueKey} = ${value}`
			)
		)

	if (!result.length) return null

	const base = result[0] as integrationConfigType

	return {
		...base,
		value: base.value as TValue
	}
}

export async function setIntegrationConfig<TValue = unknown>(
	orgId: string,
	integrationId: string,
	key: string,
	value: TValue
): Promise<(Omit<integrationConfigType, "value"> & { value: TValue }) | undefined> {
	const existing = await db
		.select()
		.from(integrationConfig)
		.where(
			and(
				eq(integrationConfig.organizationId, orgId),
				eq(integrationConfig.integrationId, integrationId),
				eq(integrationConfig.key, key)
			)
		)

	if (existing.length) {
		const first = existing[0] as integrationConfigType

		await db
			.update(integrationConfig)
			.set({ value, updatedAt: new Date() })
			.where(eq(integrationConfig.id, first.id))

		return {
			...first,
			value
		}
	}

	const [created] = await db
		.insert(integrationConfig)
		.values({
			organizationId: orgId,
			integrationId,
			key,
			value
		})
		.returning()

	if (!created) return undefined

	return {
		...(created as integrationConfigType),
		value
	}
}

export async function getIntegrationEnabled(orgId: string, integrationId: string): Promise<boolean> {
	const result: any = await getIntegrationConfig(orgId, integrationId, "settings");
	return result?.value?.enabled === true;
}

export async function setIntegrationEnabled(orgId: string, integrationId: string, enabled: boolean): Promise<void> {
	const settings: any = await getIntegrationConfig(orgId, integrationId, "settings");
	await setIntegrationConfig(orgId, integrationId, "settings", { ...settings?.value, enabled: enabled });
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

export async function getOrganizationsWithIntegration(integrationId: string): Promise<string[]> {
	const settings = await db
		.select()
		.from(integrationConfig)
		.where(
			and(
				eq(integrationConfig.integrationId, integrationId),
				eq(integrationConfig.key, "settings")
			)
		);

	const orgIds = settings
		.filter((s: any) => s.value?.enabled === true)
		.map((s: any) => s.organizationId);

	return orgIds;
}
