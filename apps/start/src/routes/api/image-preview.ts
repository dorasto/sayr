import { createFileRoute } from "@tanstack/react-router";

const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/;
const OG_TITLE_REGEX = /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/;
const DESCRIPTION_REGEX = /<meta[^>]*name="description"[^>]*content="([^"]+)"/;
const OG_DESCRIPTION_REGEX = /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/;
const OG_IMAGE_REGEX = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/;
const OG_URL_REGEX = /<meta[^>]*property="og:url"[^>]*content="([^"]+)"/;

async function fetchPreview(url: string) {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Sayr/1.0",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch: ${response.statusText}`);
		}

		const data = await response.text();
		const titleMatch = data.match(OG_TITLE_REGEX) || data.match(TITLE_REGEX);
		const descriptionMatch = data.match(OG_DESCRIPTION_REGEX) || data.match(DESCRIPTION_REGEX);
		const imageMatch = data.match(OG_IMAGE_REGEX);
		const urlMatch = data.match(OG_URL_REGEX);

		return {
			title: titleMatch?.at(1) ?? null,
			description: descriptionMatch?.at(1) ?? null,
			image: imageMatch?.at(1) ?? null,
			url: urlMatch?.at(1) ?? url,
		};
	} catch (error) {
		console.error("Error fetching preview:", error);
		return {
			title: null,
			description: null,
			image: null,
			url,
		};
	}
}

export const Route = createFileRoute("/api/image-preview")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url).searchParams.get("url");

				if (!url) {
					return Response.json({ error: "URL parameter is required" }, { status: 400 });
				}

				try {
					const metadata = await fetchPreview(url);
					return Response.json(metadata);
				} catch (_error) {
					return Response.json({ error: "Failed to fetch preview" }, { status: 500 });
				}
			},
		},
	},
});
