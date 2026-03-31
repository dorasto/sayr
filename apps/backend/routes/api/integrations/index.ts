import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { traceOrgPermissionCheck } from "@/util";
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
const API_URL =
    process.env.APP_ENV === "development"
        ? "http://localhost:8080"
        : "http://integrations:8080";
console.log("🚀 ~ API_URL:", API_URL)
export const apiRouteIntegrations = new Hono<AppEnv>();

apiRouteIntegrations.all("/:orgId/*", async (c) => {
    const orgId = c.req.param("orgId");
    // Admin check first
    const error = await requireAdmin(c, orgId);
    if (error) return error;
    // Compute internal path
    const path = c.req.path.replace(`/api/integrations/${orgId}/`, "");
    const INTERNAL_URL = `${API_URL}/${orgId}/integrations/${path}`;

    // Forward request
    const res = await fetch(INTERNAL_URL, {
        method: c.req.method,
        headers: c.req.header(),
        body:
            c.req.method === "GET" || c.req.method === "HEAD"
                ? undefined
                : await c.req.raw.body,
    });

    return new Response(res.body, {
        status: res.status,
        headers: res.headers,
    });
});