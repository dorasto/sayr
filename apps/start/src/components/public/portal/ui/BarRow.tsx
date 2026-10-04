import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

interface BarRowProps {
	label: ReactNode;
	count: number;
	/** Fraction of the whole (0-1) that fills the track. */
	share: number;
	/** Any CSS colour; defaults to the primary colour. */
	color?: string | null;
	className?: string;
}

/** Label + count over a 6px track — one row of "What it touches". */
export function BarRow({ label, count, share, color, className }: BarRowProps) {
	const fill = color || "var(--primary)";
	const width = Math.min(100, Math.max(0, share * 100));

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div className="flex items-center justify-between text-[13px]">
				<span className="inline-flex items-center gap-1.5 text-foreground">
					<i aria-hidden className="block size-2 shrink-0 rounded-[3px]" style={{ background: fill }} />
					{label}
				</span>
				<span className="text-muted-foreground tabular-nums">{count}</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-[3px] bg-muted">
				<i className="block h-1.5 rounded-[3px]" style={{ width: `${width}%`, background: fill }} />
			</div>
		</div>
	);
}
