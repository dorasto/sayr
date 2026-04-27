import { createFileRoute } from "@tanstack/react-router";
import { SITE_CONFIG } from "@/seo";

export const Route = createFileRoute("/llms.txt")({
	server: {
		handlers: {
			GET: async () => {
				// Derive base URLs from env so this works across all deployments.
				const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || "sayr.io";
				const apiBase = `https://api.${rootDomain}`;

				const content = `# ${SITE_CONFIG.name}

> ${SITE_CONFIG.description}

Sayr is a collaborative project management platform for developers, teams, and the public.
Organizations can create tasks, track work, and share progress publicly.

## Public Task Pages

Each task has a public URL in the format:
  https://<org-slug>.${rootDomain}/<short-id>

These pages are server-side rendered and contain:
- Task title, status, and priority
- Full task description (rich text, rendered as plain text)
- Public comments from team members with author names
- Labels and metadata

The page HTML includes:
- Open Graph meta tags with task title and description
- JSON-LD (schema.org/Article) with structured task data including comments
- Visually-hidden plain text content for AI extractors (data-llmo-content attribute)

## Public API

Public REST API base: ${apiBase}/api/public/v1/

### Get a task
GET /api/public/v1/organization/:slug/tasks/:shortId

### Get task comments
GET /api/public/v1/organization/:slug/tasks/:shortId/comments

## More Information

- Website: ${SITE_CONFIG.url}
- Source: https://github.com/dorasto/sayr
`;

				return new Response(content, {
					headers: {
						"content-type": "text/plain; charset=utf-8",
						"cache-control": "public, max-age=86400",
					},
				});
			},
		},
	},
});
