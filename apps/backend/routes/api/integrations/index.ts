import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { traceOrgPermissionCheck } from "@/util";
import { createTraceAsync } from "@repo/opentelemetry/trace";
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
export const apiRouteIntegrations = new Hono<AppEnv>();

apiRouteIntegrations.all("/:orgId/*", async (c) => {
    const traceAsync = createTraceAsync();
    const recordWideError = c.get("recordWideError");
    const orgId = c.req.param("orgId");

    const adminErr = await requireAdmin(c, orgId);
    if (adminErr) return adminErr;

    const requestUrl = new URL(c.req.url);
    // The admin check above is for `orgId` only — rebuild the rest of the path segment by segment so dot
    // segments or encoded separators can't climb out of `/${orgId}/integrations/` into another org's routes.
    const segments: string[] = [];
    for (const raw of c.req.path.replace(`/api/integrations/${orgId}/`, "").split("/")) {
        let segment: string;
        try {
            segment = decodeURIComponent(raw);
        } catch {
            return c.json({ success: false, error: "Invalid path" }, 400);
        }
        if (segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\")) {
            return c.json({ success: false, error: "Invalid path" }, 400);
        }
        segments.push(encodeURIComponent(segment));
    }
    const path = segments.join("/");
    const INTERNAL_URL = `${API_URL}/${orgId}/integrations/${path}${requestUrl.search}`;

    try {
        const res = await traceAsync(
            "integrations.proxy.forward",
            async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10_000);

                try {
                    return await fetch(INTERNAL_URL, {
                        method: c.req.method,
                        headers: c.req.header(),
                        signal: controller.signal,
                        body:
                            c.req.method === "GET" || c.req.method === "HEAD"
                                ? undefined
                                : await c.req.raw.body,
                    });
                } finally {
                    clearTimeout(timeout);
                }
            },
            {
                description: "Forwarding request to integration service",
                data: { method: c.req.method, path, internalUrl: INTERNAL_URL },
            }
        );

        return new Response(res.body, {
            status: res.status,
            headers: res.headers,
        });
    } catch (err) {
        recordWideError({
            name: "integrations.proxy.error",
            error: err instanceof Error ? err : new Error(String(err)),
            code: "INTEGRATIONS_UPSTREAM_FAILURE",
            message: "Upstream call failed",
            contextData: { orgId, path, internalUrl: INTERNAL_URL },
        });

        return c.json({ error: "error" }, 502);
    }
});