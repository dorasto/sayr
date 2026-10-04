import { cn } from "@repo/ui/lib/utils";

type ChipStatus = "planned" | "in-progress" | "released";

// Same chip as the task StatusChip (hollow / half / solid dot) — that one is keyed on the task status enum and
// relabels it, so a release status needs its own label ("Released") rather than a borrowed task status.
const RELEASE_CHIP: Record<ChipStatus, { label: string; chip: string; text: string; dot: string }> = {
	planned: {
		label: "Planned",
		chip: "bg-muted text-foreground",
		text: "text-foreground",
		dot: "border-[1.5px] border-current bg-[conic-gradient(currentColor_0_50%,transparent_0)]",
	},
	"in-progress": {
		label: "In progress",
		chip: "bg-primary/15 text-primary",
		text: "text-primary",
		dot: "bg-current",
	},
	released: {
		label: "Released",
		chip: "bg-success/15 text-success",
		text: "text-success",
		dot: "bg-current",
	},
};

interface ReleaseStatusChipProps {
	/** Release status enum. `archived` is never shown on the portal and falls back to Planned. */
	status: string;
	/** `plain`: dot and label only, no pill (for label/value rows, where it lines up with other plain values). */
	variant?: "chip" | "plain";
	className?: string;
}

/** 24px release status pill: Planned / In progress / Released. */
export function ReleaseStatusChip({ status, variant = "chip", className }: ReleaseStatusChipProps) {
	const styles = RELEASE_CHIP[status as ChipStatus] ?? RELEASE_CHIP.planned;

	if (variant === "plain") {
		return (
			<span className={cn("inline-flex items-center gap-1.5 font-medium", styles.text, className)}>
				<i aria-hidden className={cn("block size-2 shrink-0 rounded-full", styles.dot)} />
				{styles.label}
			</span>
		);
	}

	return (
		<span
			className={cn(
				"inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full pr-2.5 pl-[9px] font-semibold text-[12.5px] tracking-[-0.003em]",
				styles.chip,
				className
			)}
		>
			<i aria-hidden className={cn("block size-2 shrink-0 rounded-full", styles.dot)} />
			{styles.label}
		</span>
	);
}
