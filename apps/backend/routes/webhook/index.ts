import type { AppEnv } from "@/index";
import { Hono } from "hono";
import { PolarWebhookHandler } from "./polar";
import { GithubWebhookHandler } from "./github";

export const webhookRoute = new Hono<AppEnv>();
webhookRoute.route("/polar", PolarWebhookHandler);
webhookRoute.route("/github", GithubWebhookHandler);