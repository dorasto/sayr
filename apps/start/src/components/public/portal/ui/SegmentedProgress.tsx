import { cn } from "@repo/ui/lib/utils";

export interface ProgressSegment {
	value: number;
	tone: "ok" | "accent" | "muted";
}

const TONES: Record<ProgressSegment["tone"], string> = {
	ok: "bg-success",
	accent: "bg-primary",
	muted: "bg-border",
};

interface SegmentedProgressProps {
	/** In display order, e.g. done (ok), in progress (accent), planned (muted). Zero-value segments are skipped. */
	segments: ReadonlyArray<ProgressSegment>;
	/** Accessible summary, e.g. "4 of 9 tasks done". */
	label: string;
	className?: string;
}

/** 10px segmented bar with 3px gaps and rounded segments, sized by each segment's share of the total. */
export function SegmentedProgress({ segments, label, className }: SegmentedProgressProps) {
	const total = segments.reduce((sum, segment) => sum + segment.value, 0);

	return (
		<div role="img" aria-label={label} className={cn("flex h-2.5 gap-[3px]", className)}>
			{total > 0 &&
				segments
					.filter((segment) => segment.value > 0)
					.map((segment) => (
						<i
							key={segment.tone}
							className={cn("block rounded-[4px]", TONES[segment.tone])}
							style={{ width: `${(segment.value / total) * 100}%` }}
						/>
					))}
		</div>
	);
}
