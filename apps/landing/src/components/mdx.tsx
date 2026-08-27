import type { GeneratedPageProps } from "fumadocs-openapi";
import { createOpenAPIPage, type OpenAPIPageProps_Spec } from "fumadocs-openapi/ui";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/features/callout";
import { ComparisonCallout } from "@/components/features/comparison-callout";
import { FeatureStep } from "@/components/features/feature-step";
import openapiDocument from "@/data/openapi-public.json";

const OpenAPIPageBase = createOpenAPIPage();

// Generated reference pages (see `scripts/generate-openapi.ts` and
// `content/docs/api/reference/**`) render through `src/routes/docs/$.tsx`,
// which loads MDX purely client-side via `browserCollections` — there's no
// per-request server render to preload the schema through, so instead of
// `openapi.preloadOpenAPIPage()` (the server-component pattern from
// fumadocs' own docs) we bundle the spec directly into the client chunk,
// same as the existing `@/data/pricing.json` convention, and hand it to the
// page component as `payload.bundled`.
function APIPage(props: GeneratedPageProps) {
	return (
		<OpenAPIPageBase
			{...props}
			payload={{
				bundled: openapiDocument as unknown as OpenAPIPageProps_Spec["payload"]["bundled"],
				proxyUrl: "/api/openapi-proxy",
			}}
		/>
	);
}

export function getMDXComponents(components?: MDXComponents) {
	return {
		...defaultMdxComponents,
		Callout,
		ComparisonCallout,
		FeatureStep,
		APIPage,
		...components,
	} satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
