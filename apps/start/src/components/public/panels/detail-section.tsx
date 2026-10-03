import { Label } from "@repo/ui/components/label";
import type { ReactNode } from "react";

interface DetailSectionProps {
	label: string;
	children: ReactNode;
}

/** One section of the post's Details panel: a small label over its value, like the admin task sidebar. */
export function DetailSection({ label, children }: DetailSectionProps) {
	return (
		<section aria-label={label} className="flex flex-col gap-1.5">
			<Label variant="description">{label}</Label>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">{children}</div>
		</section>
	);
}
