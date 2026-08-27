import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/features/callout";
import { ComparisonCallout } from "@/components/features/comparison-callout";
import { FeatureStep } from "@/components/features/feature-step";

export function getMDXComponents(components?: MDXComponents) {
	return {
		...defaultMdxComponents,
		Callout,
		ComparisonCallout,
		FeatureStep,
		...components,
	} satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
