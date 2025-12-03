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
	const markdown = "# Hello\n\nTesting markdown";
	// Dynamically import at runtime → guarantees single load
	const { ServerBlockNoteEditor } = await import("@blocknote/server-util");
	const editor = ServerBlockNoteEditor.create();
	const blocks = await editor.tryParseMarkdownToBlocks(markdown);

	const githubIssue = {
		id: crypto.randomUUID(),
		type: "paragraph",
		props: {},
		content: [
			{
				type: "text",
				text: "View related GitHub issue #42",
				href: "https://github.com/sayr-dev/sayr-core/issues/42",
			},
		],
		children: [],
	};

	return c.json({ ok: true, blocks: [...blocks, githubIssue] });
});

// Admin routes
apiRoute.route("/admin", apiRouteAdmin);

// File routes
apiRoute.route("/file", apiRouteFile);
