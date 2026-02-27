import type { APIRoute } from "astro";

const BACKEND_URL = (import.meta.env.BACKEND_URL ?? "http://localhost:5468").trim();

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const res = await fetch(`${BACKEND_URL}/api/internal/v1/waitlist`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
		const data = await res.json();
		return new Response(JSON.stringify(data), {
			status: res.status,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("Waitlist proxy error:", err);
		return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
