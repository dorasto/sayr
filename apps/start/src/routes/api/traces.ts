import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/traces")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const AXIOM_OTEL_DOMAIN = process.env.AXIOM_OTEL_DOMAIN;
                const AXIOM_OTEL_TOKEN = process.env.AXIOM_OTEL_TOKEN;
                const AXIOM_OTEL_DATASET = process.env.AXIOM_OTEL_DATASET;

                const headers = new Headers();
                headers.set("Access-Control-Allow-Origin", "*");
                headers.set("Content-Type", "application/json");

                if (!AXIOM_OTEL_DOMAIN || !AXIOM_OTEL_TOKEN) {
                    return new Response(JSON.stringify({ error: "Not configured" }), {
                        status: 503,
                        headers,
                    });
                }

                try {
                    const body = await request.arrayBuffer();

                    const response = await fetch(
                        `https://${AXIOM_OTEL_DOMAIN}/v1/traces`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${AXIOM_OTEL_TOKEN}`,
                                "X-Axiom-Dataset": AXIOM_OTEL_DATASET || "",
                            },
                            body,
                        }
                    );

                    return new Response(JSON.stringify({ ok: response.ok }), {
                        status: response.ok ? 202 : 502,
                        headers,
                    });
                } catch (error) {
                    console.error("Error forwarding traces:", error);
                    return new Response(JSON.stringify({ error: "Failed" }), {
                        status: 500,
                        headers,
                    });
                }
            },
        },
    },
});