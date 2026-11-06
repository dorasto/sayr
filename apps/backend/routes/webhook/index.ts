import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { GithubWebhookHandler } from "./github";
import { PolarWebhookHandler } from "./polar";

export const webhookRoute = new Hono<AppEnv>();
webhookRoute.route("/github", GithubWebhookHandler);
webhookRoute.route("/polar", PolarWebhookHandler);
