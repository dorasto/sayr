import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { UseSend } from "usesend-js";

import { apiRouteAdmin } from "./admin";
import { apiRouteFile } from "./file";
import { apiRouteConsole } from "./console";

export const internalApiV1 = new Hono<AppEnv>();
internalApiV1.route("/admin", apiRouteAdmin);
internalApiV1.route("/file", apiRouteFile);
internalApiV1.route("/console", apiRouteConsole);

internalApiV1.post("/waitlist", async (c) => {
    try {
        const { email, captchaToken } = await c.req.json();
        console.log("[waitlist] Received request for email:", email);
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
            console.log("[waitlist] Missing captcha token");
            return c.json({ error: "Captcha verification required" }, 400);
        }
        console.log("[waitlist] Verifying captcha token");
        const capRes = await fetch(`${capApiEndpoint}/siteverify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret: capSecret, response: captchaToken }),
        });
        const capData = await capRes.json() as { success: boolean };
        console.log("[waitlist] Captcha verify result:", capData);
        if (!capData.success) {
            return c.json({ error: "Captcha verification failed" }, 403);
        }
        const apiKey = process.env.SAYR_EMAIL;
        const bookId = process.env.SAYR_WAITLIST_BOOK_ID;
        const templateId = process.env.SAYR_WAITLIST_TEMPLATE_ID;
        const fromEmail = process.env.SAYR_FROM_EMAIL;
        console.log("[waitlist] Config check:", {
            hasApiKey: !!apiKey,
            hasBookId: !!bookId,
            hasTemplateId: !!templateId,
            hasFromEmail: !!fromEmail,
            bookId,
            templateId,
            fromEmail,
        });
        if (!apiKey || !bookId || !templateId || !fromEmail) {
            console.error("[waitlist] Missing waitlist env configuration");
            return c.json({ error: "Server misconfigured" }, 500);
        }
        const usesend = new UseSend(apiKey);
        const normalizedEmail = email.toLowerCase().trim();
        console.log("[waitlist] Checking if contact exists:", normalizedEmail);
        const existing = await checkUsesendContactExists(apiKey, bookId, normalizedEmail);
        console.log("[waitlist] Contact exists:", existing);
        if (existing) {
            // Allow @doras.to emails to bypass duplicate check for testing
            if (normalizedEmail.endsWith("@doras.to")) {
                console.log("[waitlist] Contact exists but @doras.to domain, skipping duplicate check for testing");
            } else {
                console.log("[waitlist] Contact already exists, returning 409");
                return c.json(
                    {
                        message: "Successfully added to waitlist",
                    },
                    409,
                );
            }
        }
        // Add to contact book
        console.log("[waitlist] Creating contact in book:", bookId);
        const createResult = await usesend.contacts.create(bookId, {
            email: normalizedEmail,
        });
        console.log("[waitlist] Contact create result:", createResult);
        // Brief delay to avoid UseSend rate limiting between sequential API calls
        await new Promise((resolve) => setTimeout(resolve, 1500));
        // Send confirmation email
        console.log("[waitlist] Sending email with templateId:", templateId, "from:", fromEmail);
        const emailResult = await usesend.emails.send({
            to: normalizedEmail,
            templateId,
            from: `Sayr.io <${fromEmail}>`,
            text: "Sayr.io waitlist confirmation",
        });
        console.log("[waitlist] Email send result:", emailResult);
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