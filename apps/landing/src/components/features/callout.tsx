import type { ReactNode } from "react";

interface FeatureCalloutProps {
	label: string;
	description?: string;
	children?: ReactNode;
}

// Distinct from fumadocs-ui's own <Callout title= type=> (info/warn/error/
// success/idea, with icon and colored border) used across content/docs/**.
// This is a plainer marketing-page callout box for content/features/**
// MDX only — keep it registered under its own tag name in mdx.tsx rather
// than overriding `Callout`, or docs pages silently lose their real
// fumadocs Callout (title/type are just unused/undefined props on this one).
export function FeatureCallout({ label, description, children }: FeatureCalloutProps) {
	return (
		<div className="not-prose my-8 rounded-2xl border border-primary/20 bg-primary/[0.03] p-6">
			<p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">{label}</p>
			{description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
			{children}
		</div>
	);
}
