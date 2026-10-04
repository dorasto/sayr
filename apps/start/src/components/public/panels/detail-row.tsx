import type { ReactNode } from "react";

interface DetailRowProps {
	label: string;
	children: ReactNode;
}

/** One label/value row of the Details card's `<dl>`. */
export function DetailRow({ label, children }: DetailRowProps) {
	return (
		<div className="flex min-h-10 items-center justify-between gap-3 border-t py-1 text-[13.5px] first:border-t-0">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-foreground">
				{children}
			</dd>
		</div>
	);
}
