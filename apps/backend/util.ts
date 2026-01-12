import { db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
export async function getOrganization(
	orgId: string,
	userId: string,
): Promise<{ id: string } | null> {
	// Check if the user is a member of this org
	const membership = await db.query.member.findFirst({
		where: and(
			eq(schema.member.organizationId, orgId),
			eq(schema.member.userId, userId),
		),
	});

	// If no membership found, deny access
	if (!membership) {
		return null; // or throw new Error("Unauthorized");
	}

	// Fetch the organization itself
	const [organization] = await db
		.select({ id: schema.organization.id })
		.from(schema.organization)
		.where(eq(schema.organization.id, orgId));

	if (!organization) return null;

	return organization;
}

export async function safeGetOrganization(
	orgId: string,
	userId: string,
	ms = 5000,
) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);

	try {
		return await getOrganization(orgId, userId);
	} catch (err) {
		console.warn("DB timeout / error in getOrganization", err);
		return null;
	} finally {
		clearTimeout(timer);
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <need for the cursor>
export function encodeCursor(obj: Record<string, any>): string {
	return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

// biome-ignore lint/suspicious/noExplicitAny: <need for the cursor>
export function decodeCursor<T = any>(cursor?: string): T | undefined {
	if (!cursor) return undefined;
	try {
		const str = Buffer.from(cursor, "base64url").toString("utf8");
		return JSON.parse(str);
	} catch {
		return undefined;
	}
}

export function getCookieValue(headers: Headers, name: string): string | null {
	const cookieHeader = headers.get("cookie") ?? "";
	const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
	return match ? (match[1] ?? null) : null;
}

export function getAnonHash(
	ip: string,
	userAgent: string,
	cookieId?: string
) {
	return createHash("sha256")
		.update(
			`${ip}|${userAgent}|${cookieId ?? ""}|${process.env.VOTE_SALT}`
		)
		.digest("hex");
}
