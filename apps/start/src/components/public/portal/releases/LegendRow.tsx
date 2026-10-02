interface LegendRowProps {
	label: string;
	count: number;
	/** Background class of the coloured square, matching its progress-bar segment. */
	dotClass: string;
}

/** One legend line under the release drawer's progress bar: coloured square, label, count. */
export function LegendRow({ label, count, dotClass }: LegendRowProps) {
	return (
		<span className="flex items-center justify-between">
			<span className="inline-flex items-center gap-1.5 text-foreground">
				<i aria-hidden className={`block size-2 shrink-0 rounded-[3px] ${dotClass}`} />
				{label}
			</span>
			<span className="text-muted-foreground tabular-nums">{count}</span>
		</span>
	);
}
