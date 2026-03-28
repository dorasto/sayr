import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { getIntegration, getIntegrationList } from "@repo/integrations";
import { getIntegrationEnabled, setIntegrationEnabled } from "@repo/database";
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

export const apiRouteAdminIntegrations = new Hono<AppEnv>();

apiRouteAdminIntegrations.get("/list", async (c) => {
	const orgId = c.req.query("orgId");
	const integrations = getIntegrationList();

	const data = await Promise.all(
		integrations.map(async (i) => {
			let enabled = false;
			if (orgId) {
				enabled = await getIntegrationEnabled(orgId, i.id);
			}
			return {
				id: i.id,
				name: i.name,
				version: i.version,
				description: i.description,
				icon: i.icon,
				pages: Object.keys(i.ui.pages),
				enabled,
			};
		})
	);

	return c.json({
		success: true,
		data,
	});
});

apiRouteAdminIntegrations.get("/ui/:id/pages", async (c) => {
	const id = c.req.param("id");
	const integration = getIntegration(id);

	if (!integration) {
		return c.json({ success: false, error: "Integration not found" }, 404);
	}

	return c.json({
		success: true,
		data: {
			id: integration.id,
			name: integration.name,
			pages: integration.ui.pages,
		},
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
