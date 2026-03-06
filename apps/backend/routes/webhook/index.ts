import type { AppEnv } from "@/index";
import { Hono } from "hono";
import { PolarWebhookHandler } from "./polar";
import { GithubWebhookHandler } from "./github";
import { getEditionCapabilities } from "@repo/edition";

export const webhookRoute = new Hono<AppEnv>();
webhookRoute.route("/github", GithubWebhookHandler);
const { polarBillingEnabled } = getEditionCapabilities()
if (polarBillingEnabled) {
    webhookRoute.route("/polar", PolarWebhookHandler);
}