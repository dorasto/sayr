import type { ReactNode } from "react";

interface CalloutProps {
	label: string;
	description?: string;
	children?: ReactNode;
}

export function Callout({ label, description, children }: CalloutProps) {
	return (
		<div className="not-prose my-8 rounded-2xl border border-primary/20 bg-primary/[0.03] p-6">
			<p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">{label}</p>
			{description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
			{children}
		</div>
	);
}
