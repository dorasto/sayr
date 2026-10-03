import { Label } from "@repo/ui/components/label";
import type { ReactNode } from "react";

interface DetailSectionProps {
	label: string;
	children: ReactNode;
}

/** One row of the post's Details panel: a small label with its value beside it. */
export function DetailSection({ label, children }: DetailSectionProps) {
	return (
		<div className="flex min-h-7 items-center gap-3">
			<Label variant="description" className="w-24 shrink-0">
				{label}
			</Label>
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm">{children}</div>
		</div>
	);
}
