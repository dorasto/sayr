import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { AppEnv } from "@/index";

export const renderRoute = new Hono<AppEnv>();
renderRoute.get("/ws", serveStatic({ path: "./public/render/ws.html" }));
renderRoute.get("/file", serveStatic({ path: "./public/render/file-test.html" }));
renderRoute.get("/test", serveStatic({ path: "./public/render/test.html" }));
renderRoute.get("/org/:org", serveStatic({ path: "./public/render/org.html" }));
renderRoute.get("/org/:org/:taskId", serveStatic({ path: "./public/render/task.html" }));
