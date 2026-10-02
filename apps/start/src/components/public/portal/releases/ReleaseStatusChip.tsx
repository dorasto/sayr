import { cn } from "@repo/ui/lib/utils";

type ChipStatus = "planned" | "in-progress" | "released";

// Same chip as the task StatusChip (hollow / half / solid dot) — that one is keyed on the task status enum and
// relabels it, so a release status needs its own label ("Released") rather than a borrowed task status.
const RELEASE_CHIP: Record<ChipStatus, { label: string; chip: string; dot: string }> = {
	planned: {
		label: "Planned",
		chip: "bg-portal-neutral-soft text-portal-fg",
		dot: "border-[1.5px] border-current bg-[conic-gradient(currentColor_0_50%,transparent_0)]",
	},
	"in-progress": {
		label: "In progress",
		chip: "bg-portal-accent-soft text-portal-accent-ink",
		dot: "bg-current",
	},
	released: {
		label: "Released",
		chip: "bg-portal-ok-soft text-portal-ok",
		dot: "bg-current",
	},
};

interface ReleaseStatusChipProps {
	/** Release status enum. `archived` is never shown on the portal and falls back to Planned. */
	status: string;
	className?: string;
}

/** 24px release status pill: Planned / In progress / Released. */
export function ReleaseStatusChip({ status, className }: ReleaseStatusChipProps) {
	const styles = RELEASE_CHIP[status as ChipStatus] ?? RELEASE_CHIP.planned;

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
