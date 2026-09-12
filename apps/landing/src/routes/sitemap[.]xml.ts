import { createFileRoute } from "@tanstack/react-router";
import { FEATURES } from "@/data/features";
import { SITE_URL } from "@/lib/seo";
import { source } from "@/lib/source";

const STATIC_PATHS = ["/", "/pricing", "/legal/privacy", "/legal/terms", "/legal/subprocessors"];

function urlEntry(path: string): string {
	return `<url><loc>${SITE_URL}${path}</loc></url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: () => {
				const featurePaths = FEATURES.map((f) => `/features/${f.slug}`);
				const docsPaths = source.getPages().map((page) => page.url);
				const paths = [...STATIC_PATHS, ...featurePaths, ...docsPaths];

				const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(urlEntry).join("\n")}
</urlset>`;

				return new Response(body, {
					headers: {
						"Content-Type": "application/xml",
						"Cache-Control": "public, max-age=3600",
					},
				});
			},
		},
	},
});
