interface FeatureStepProps {
	number: string;
	title: string;
	description: string;
}

export function FeatureStep({ number, title, description }: FeatureStepProps) {
	return (
		<div className="not-prose flex gap-4 py-4">
			<div className="shrink-0 size-10 rounded-xl bg-primary/10 flex items-center justify-center">
				<span className="text-sm font-bold text-primary font-mono">{number}</span>
			</div>
			<div className="pt-1.5">
				<h4 className="text-base font-semibold mb-1">{title}</h4>
				<p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
			</div>
		</div>
	);
}
