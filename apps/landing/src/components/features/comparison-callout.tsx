interface ComparisonCalloutProps {
	competitor: string;
	sayrDoes: string;
	theyDont?: string;
}

export function ComparisonCallout({ competitor, sayrDoes, theyDont }: ComparisonCalloutProps) {
	return (
		<div className="not-prose my-8 rounded-2xl border border-border bg-card overflow-hidden">
			<div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
				<div className="p-5 flex gap-3">
					<div className="mt-0.5 size-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
						<svg
							className="size-3 text-destructive"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2.5}
						>
							<title>Not supported</title>
							<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<div>
						<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
							{competitor}
						</p>
						<p className="text-sm text-muted-foreground">{theyDont ?? "Doesn't have this"}</p>
					</div>
				</div>
				<div className="p-5 flex gap-3 bg-primary/[0.03]">
					<div className="mt-0.5 size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
						<svg
							className="size-3 text-primary"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2.5}
						>
							<title>Supported</title>
							<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<div>
						<p className="text-xs font-semibold text-primary/70 uppercase tracking-wide mb-1">Sayr</p>
						<p className="text-sm">{sayrDoes}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
