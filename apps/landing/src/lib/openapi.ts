import { createOpenAPI } from "fumadocs-openapi/server";

// Server-only: reads the spec from disk (via Node fs) and exposes the CORS
// proxy used by the "try it" playground. Never import this from
// `@/components/mdx` — that module is bundled into the browser chunk via
// `browserCollections` (see `src/routes/docs/$.tsx`), and this module isn't
// safe there.
export const openapi = createOpenAPI({
	input: ["./src/data/openapi-public.json"],
	proxyUrl: "/api/openapi-proxy",
});
