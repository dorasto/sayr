import { ServerBlockNoteEditor } from "@blocknote/server-util";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdmin } from "./admin";
import { apiRouteFile } from "./file";

// Main API router
export const apiRoute = new Hono<AppEnv>();
apiRoute.use("*", async (c, next) => {
	c.header("X-API-Version", "1.0.0");
	return next();
});
apiRoute.get("/test", async (c) => {
	const markdown =
		"# Hello\n\nThis is markdown for testing\n\n| heading | heading2 |\n|--------|--------|\n| test | test |\n| test | test | ";
	const editor = ServerBlockNoteEditor.create();
	const blocks = await editor.tryParseMarkdownToBlocks(markdown);

	return c.json(blocks);
});

// Admin routes
apiRoute.route("/admin", apiRouteAdmin);

// File routes
apiRoute.route("/file", apiRouteFile);
