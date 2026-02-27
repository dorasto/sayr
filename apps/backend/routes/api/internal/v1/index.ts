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
        const { email } = await c.req.json();
        if (!email) {
            return c.json({ error: "Email is required" }, 400);
        }
        const apiKey = process.env.SAYR_EMAIL;
        const bookId = process.env.SAYR_WAITLIST_BOOK_ID;
        const templateId = process.env.SAYR_WAITLIST_TEMPLATE_ID;
        const fromEmail = process.env.SAYR_FROM_EMAIL;
        if (!apiKey || !bookId || !templateId || !fromEmail) {
            console.error("Missing waitlist env configuration");
            return c.json({ error: "Server misconfigured" }, 500);
        }
        const usesend = new UseSend(apiKey);
        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await checkUsesendContactExists(apiKey, bookId, normalizedEmail);
        if (existing) {
            return c.json(
                {
                    message: "Successfully added to waitlist",
                },
                409,
            );
        }
        // 2️⃣ Add to contact book
        await usesend.contacts.create(bookId, {
            email: normalizedEmail,
        });
        // 1️⃣ Check if already exists in contact book
        await usesend.emails.send({
            to: normalizedEmail,
            templateId,
            from: fromEmail,
            text: "Sayr.io waitlist confirmation",
        });
        return c.json({
            message: "Successfully added to waitlist",
        });
    } catch (err) {
        console.error("Waitlist error:", err);
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