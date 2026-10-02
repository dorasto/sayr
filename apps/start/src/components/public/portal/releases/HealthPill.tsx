import { cn } from "@repo/ui/lib/utils";
import { getHealthPill } from "@/lib/portal/release-page";

const TONES = {
	ok: "bg-portal-ok-soft text-portal-ok",
	accent: "bg-portal-accent-soft text-portal-accent-ink",
	bad: "bg-portal-bad-soft text-portal-bad",
} as const;

interface HealthPillProps {
	/** A status update's `health` (`on_track | at_risk | off_track`). Renders nothing when absent or unknown. */
	health: string | null | undefined;
	className?: string;
}

/** 22px health pill on a status update: On track, At risk or Off track. */
export function HealthPill({ health, className }: HealthPillProps) {
	const pill = getHealthPill(health);
	if (!pill) return null;

	return (
		<span
			className={cn(
				"inline-flex h-[22px] items-center whitespace-nowrap rounded-portal-tag px-2 font-semibold text-xs",
				TONES[pill.tone],
				className
			)}
		>
			{pill.label}
		</span>
	);
}
