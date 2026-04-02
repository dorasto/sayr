import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { getIntegrationEnabled, setIntegrationEnabled, getOrganizationsWithIntegration } from "@repo/database";
import { traceOrgPermissionCheck } from "@/util";

async function requireAdmin(c: any, orgId: string) {
	const user = c.get("user") as { id: string } | undefined;
	if (!user?.id) {
		return c.json({ success: false, error: "Unauthorized" }, 401);
	}

	const hasPermission = await traceOrgPermissionCheck(user.id, orgId, "admin.administrator");
	if (!hasPermission) {
		return c.json({ success: false, error: "Forbidden" }, 403);
	}

	return null;
}
const API_URL =
	process.env.APP_ENV === "development"
		? "http://localhost:8080"
		: "http://integrations:8080";
export const apiRouteAdminIntegrations = new Hono<AppEnv>();

apiRouteAdminIntegrations.get("/all", async (c) => {
	const session = c.get("session");
	const user = c.get("user");
	if (!session?.userId) {
		return c.json({ error: "UNAUTHORIZED" }, 401);
	}
	if (user?.role !== "admin") {
		return c.json({ error: "FORBIDDEN" }, 403);
	}
	const INTERNAL_URL = `${API_URL}/all`;
	const res = await fetch(INTERNAL_URL);
	const data = await res.json();
	const integrations = data.data || [];
	const enriched = await Promise.all(
		integrations.map(async (i: any) => {
			const orgIds = await getOrganizationsWithIntegration(i.id);
			return { ...i, enabledOrgCount: orgIds.length };
		})
	);
	return new Response(
		JSON.stringify({
			success: true,
			data: enriched,
		}),
		{
			headers: { "Content-Type": "application/json" },
		}
	);
});

apiRouteAdminIntegrations.get("/list", async (c) => {
	const orgId = c.req.query("orgId");
	const error = await requireAdmin(c, orgId || "");
	if (error) return error;
	const INTERNAL_URL = `${API_URL}/list`;
	const res = await fetch(INTERNAL_URL);
	const data = await res.json();
	const integrations = data.data || [];
	const enriched = await Promise.all(
		integrations.map(async (i: any) => {
			let enabled = false;
			if (orgId) {
				enabled = await getIntegrationEnabled(orgId, i.id);
			}
			return { ...i, enabled };
		})
	);
	return new Response(
		JSON.stringify({
			success: true,
			data: enriched,
		}),
		{
			headers: { "Content-Type": "application/json" },
		}
	);
});

apiRouteAdminIntegrations.get("/ui/:id/pages", async (c) => {
	const id = c.req.param("id");
	const INTERNAL_URL = `${API_URL}/ui/${id}/pages`;

	const res = await fetch(INTERNAL_URL);
	const data = await res.json();

	return new Response(JSON.stringify(data), {
		headers: { "Content-Type": "application/json" },
	});
});

apiRouteAdminIntegrations.post("/:orgId/:integrationId/enable", async (c) => {
	const orgId = c.req.param("orgId");
	const integrationId = c.req.param("integrationId");

	const error = await requireAdmin(c, orgId);
	if (error) return error;

	await setIntegrationEnabled(orgId, integrationId, true);
	return c.json({ success: true, data: { enabled: true } });
});

apiRouteAdminIntegrations.post("/:orgId/:integrationId/disable", async (c) => {
	const orgId = c.req.param("orgId");
	const integrationId = c.req.param("integrationId");

	const error = await requireAdmin(c, orgId);
	if (error) return error;

	await setIntegrationEnabled(orgId, integrationId, false);
	return c.json({ success: true, data: { enabled: false } });
});