import { cn } from "@repo/ui/lib/utils";

interface LabelTagProps {
	label: { name: string; color?: string | null };
	className?: string;
}

/** Read-only label: an 8px rounded colour square and the name. */
export function LabelTag({ label, className }: LabelTagProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted-foreground",
				className
			)}
		>
			<i
				aria-hidden
				className="block size-2 shrink-0 rounded-[3px] bg-muted-foreground"
				style={label.color ? { background: label.color } : undefined}
			/>
			{label.name}
		</span>
	);
}
