import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { UseSend } from "usesend-js";

import { apiRouteAdmin } from "./admin";
import { apiRouteFile } from "./file";
import { apiRouteConsole } from "./console";
import { apiRoutePolar } from "./polar";
import { getEditionCapabilities } from "@repo/edition";

export const internalApiV1 = new Hono<AppEnv>();
internalApiV1.route("/admin", apiRouteAdmin);
internalApiV1.route("/file", apiRouteFile);
internalApiV1.route("/console", apiRouteConsole);
const { polarBillingEnabled } = getEditionCapabilities()
if (polarBillingEnabled) {
    internalApiV1.route("/polar", apiRoutePolar);
}

internalApiV1.post("/waitlist", async (c) => {
    try {
        const { email, captchaToken } = await c.req.json();
        if (!email) {
            return c.json({ error: "Email is required" }, 400);
        }

        // Verify captcha token
        const capApiEndpoint = process.env.CAP_API_ENDPOINT;
        const capSecret = process.env.CAP_SECRET_KEY;
        if (!capApiEndpoint || !capSecret) {
            console.error("[waitlist] Missing CAP captcha env configuration");
            return c.json({ error: "Server misconfigured" }, 500);
        }
        if (!captchaToken) {
            return c.json({ error: "Captcha verification required" }, 400);
        }
        const capRes = await fetch(`${capApiEndpoint}/siteverify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret: capSecret, response: captchaToken }),
        });
        const capData = await capRes.json() as { success: boolean };
        if (!capData.success) {
            return c.json({ error: "Captcha verification failed" }, 403);
        }
        const apiKey = process.env.SAYR_EMAIL;
        const bookId = process.env.SAYR_WAITLIST_BOOK_ID;
        const templateId = process.env.SAYR_WAITLIST_TEMPLATE_ID;
        const fromEmail = process.env.SAYR_FROM_EMAIL;
        if (!apiKey || !bookId || !templateId || !fromEmail) {
            console.error("[waitlist] Missing waitlist env configuration");
            return c.json({ error: "Server misconfigured" }, 500);
        }
        const usesend = new UseSend(apiKey);
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await checkUsesendContactExists(apiKey, bookId, normalizedEmail);
        if (existing) {
            // Allow @doras.to emails to bypass duplicate check for testing
            if (!normalizedEmail.endsWith("@doras.to")) {
                return c.json(
                    {
                        message: "Successfully added to waitlist",
                    },
                    409,
                );
            }
        }
        // Add to contact book
        await usesend.contacts.create(bookId, {
            email: normalizedEmail,
        });
        // Brief delay to avoid UseSend rate limiting between sequential API calls
        await new Promise((resolve) => setTimeout(resolve, 1500));
        // Send confirmation email
        await usesend.emails.send({
            to: normalizedEmail,
            templateId,
            from: `Sayr.io <${fromEmail}>`,
            text: "Sayr.io waitlist confirmation",
        });
        return c.json({
            message: "Successfully added to waitlist",
        });
    } catch (err) {
        console.error("[waitlist] Error:", err);
        return c.json(
            { error: "Something went wrong. Please try again." },
            500,
        );
    }
});

async function checkUsesendContactExists(
    apiKey: string,
    bookId: string,
    email: string,
) {
    const normalizedEmail = email.toLowerCase().trim();

    const res = await fetch(
        `https://app.usesend.com/api/v1/contactBooks/${bookId}/contacts?emails=${encodeURIComponent(
            normalizedEmail,
        )}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
        },
    );

    if (!res.ok) {
        throw new Error("Usesend contact lookup failed");
    }

    const data = await res.json();
    return Boolean(data[0]);
}