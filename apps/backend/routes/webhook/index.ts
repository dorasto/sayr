import type { AppEnv } from "@/index";
import { Hono } from "hono";
import { PolarWebhookHandler } from "./polar";
import { GithubWebhookHandler } from "./github";

export const webhookRoute = new Hono<AppEnv>();
webhookRoute.route("/github", GithubWebhookHandler);
webhookRoute.route("/polar", PolarWebhookHandler);
