import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { getIntegration, getIntegrationList } from "@repo/integrations";
import { traceOrgPermissionCheck } from "@/util";

import "@/../../integrations/index";

async function requireAdmin(c: any, orgId: string) {
    const user = c.get("user") as { id: string } | undefined;
    if (!user?.id) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const hasPermission = await traceOrgPermissionCheck(user.id, orgId, "admin.administrator");
    if (!hasPermission) {
        return c.json({ success: false, error: "Forbidden - Admin access required" }, 403);
    }

    return null;
}

const integrationRoutes = new Hono<AppEnv>();

for (const integration of getIntegrationList()) {
    if (integration.api) {
        integrationRoutes.route(`/${integration.id}`, integration.api);
    }
}

export const apiRouteIntegrations = new Hono<AppEnv>();

apiRouteIntegrations.use("/:orgId/*", async (c, next) => {
    const orgId = c.req.param("orgId");
    //@ts-expect-error
    c.set("orgId", orgId)
    const error = await requireAdmin(c, orgId);
    if (error) return error;
    await next();
});

apiRouteIntegrations.route("/:orgId", integrationRoutes);

apiRouteIntegrations.get("/:id", async (c) => {
    const id = c.req.param("id");
    const integration = getIntegration(id);

    if (!integration) {
        return c.json({ success: false, error: "Integration not found" }, 404);
    }

    return c.json({ success: true, data: integration });
});

apiRouteIntegrations.get("/", async (c) => {
    const integrations = getIntegrationList();
    return c.json({
        success: true,
        data: integrations.map((i) => ({
            id: i.id,
            name: i.name,
            version: i.version,
            description: i.description,
        })),
    });
});
