import { Hono } from "hono";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { getIntegration, getIntegrationList } from "@repo/integrations";
type AppEnv = {
    Variables: {
        user?: unknown;
        session?: unknown;
        orgId: string;
    };
};
const app = new Hono<AppEnv>();
app.use("/:orgId/*", async (c, next) => {
    const orgId = c.req.param("orgId");
    c.set("orgId", orgId)
    await next();
});

// Endpoint for listing integrations
app.get("/list", (c) => {
    const integrations = getIntegrationList()
    const data = Array.from(integrations.values()).map((i) => ({
        id: i.id,
        name: i.name,
        version: i.version,
        description: i.description,
        icon: i.icon,
        pages: Object.keys(i.ui.pages),
        enabled: false,
    }));

    return c.json({
        success: true,
        data,
    });
});
app.get("/ui/:id/pages", async (c) => {
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
            icon: integration.icon,
            docs: integration.docs ?? null,
            pages: integration.ui.pages,
        },
    });
});

(async () => {
    const base = join(__dirname, "services");

    const dynamicFolders = readdirSync(base, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => ({
            path: join(base, d.name),
            folder: d.name,
        }));

    //
    // STEP 1 — Register all integrations (load index.ts)
    //
    for (const entry of dynamicFolders) {
        const tag = `[${entry.folder}]`;
        try {
            await import(entry.path + "/integration.ts");
            console.log(`${tag} Registered`);
        } catch (e) {
            console.error(`${tag} Failed to register`, e);
        }
    }

    //
    // STEP 2 — Get full list after registration
    //
    const integrations = getIntegrationList()
    const list = Array.from(integrations.values());

    //
    // STEP 3 — Start services *ONLY* if requiresExternalService = false
    //
    for (const entry of dynamicFolders) {
        const integration = list.find((i) => i.id === entry.folder);
        const tag = `[${entry.folder}]`;

        if (!integration) {
            console.log(`${tag} No integration found in registry (skipped)`);
            continue;
        }

        if (integration.requiresExternalService) {
            console.log(`${tag} Skipped start (requiresExternalService = true)`);
            continue;
        }

        try {
            if (process.env.npm_lifecycle_event == "dev") {
                console.log(`${tag} Starting in development mode...`);
                await import(entry.path + "/src/index.ts");
            } else {
                await import(entry.path + "/dist/index.js");
                console.log(`${tag} Started`);
            }
        } catch (e) {
            console.error(`${tag} Failed to start`, e);
        }
    }

    //
    // STEP 4 — Register routes
    //
    for (const integration of list) {
        const tag = `[${integration.id}]`;

        if (integration.api) {
            app.route(`/:orgId/integrations/${integration.id}`, integration.api);
            console.log(`${tag} Route registered -> /:orgId/integrations/${integration.id}`);
        }
    }

    console.log("\nIntegration startup complete.\n");
})();

// Bun server export
export default {
    port: 8080,
    fetch: app.fetch,
    idleTimeout: 0,
    error(err: unknown) {
        console.error("🔥  Bun-level error:", err);
        return new Response("Server error", { status: 500 });
    },
};