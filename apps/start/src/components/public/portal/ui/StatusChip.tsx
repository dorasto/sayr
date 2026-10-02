import { cn } from "@repo/ui/lib/utils";
import { getPortalStatus, type PortalStatusVariant } from "@/lib/portal/status";

const CHIP_STYLES: Record<PortalStatusVariant, { chip: string; dot: string }> = {
	// Hollow dot
	open: {
		chip: "bg-portal-neutral-soft text-portal-fg-2",
		dot: "border-[1.5px] border-current",
	},
	// Half-filled dot
	planned: {
		chip: "bg-portal-neutral-soft text-portal-fg",
		dot: "border-[1.5px] border-current bg-[conic-gradient(currentColor_0_50%,transparent_0)]",
	},
	// Solid dot
	progress: {
		chip: "bg-portal-accent-soft text-portal-accent-ink",
		dot: "bg-current",
	},
	done: {
		chip: "bg-portal-ok-soft text-portal-ok",
		dot: "bg-current",
	},
	// Won't do: hollow dot
	closed: {
		chip: "bg-portal-bad-soft text-portal-bad",
		dot: "border-[1.5px] border-current",
	},
};

interface StatusChipProps {
	/** Internal task status (`backlog | todo | in-progress | done | canceled`); relabelled for end users. */
	status: string;
	className?: string;
}

/** 24px status pill: Open / Planned / In progress / Done / Won't do, with a hollow/half/solid dot. */
export function StatusChip({ status, className }: StatusChipProps) {
	const { label, variant } = getPortalStatus(status);
	const styles = CHIP_STYLES[variant];

	return (
		<span
			className={cn(
				"inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full pr-2.5 pl-[9px] font-semibold text-[12.5px] tracking-[-0.003em]",
				styles.chip,
				className
			)}
		>
			<i aria-hidden className={cn("block size-2 shrink-0 rounded-full", styles.dot)} />
			{label}
		</span>
	);
}
