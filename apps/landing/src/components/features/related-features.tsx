import { getFeature } from "@/data/features";

interface RelatedFeaturesProps {
	slugs: string[];
}

export function RelatedFeatures({ slugs }: RelatedFeaturesProps) {
	const related = slugs.map((slug) => getFeature(slug)).filter((feature) => feature !== undefined);

	if (related.length === 0) {
		return null;
	}

	return (
		<div className="not-prose mt-16 pt-10">
			<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-6">Related Features</p>
			<div className="grid sm:grid-cols-3 gap-4">
				{related.map((feature) => (
					<a
						key={feature.slug}
						href={`/features/${feature.slug}`}
						className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02] transition-colors p-4 block"
					>
						<p className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">
							{feature.title}
						</p>
						<p className="text-xs text-muted-foreground leading-relaxed">{feature.navDesc}</p>
					</a>
				))}
			</div>
		</div>
	);
}
