import { cn } from "@repo/ui/lib/utils";
import { getHealthPill } from "@/lib/portal/release-page";

const TONE_TEXT = {
	ok: "text-success",
	accent: "text-primary",
	bad: "text-destructive",
} as const;

interface ReleaseHealthProps {
	/** A status update's health enum; renders nothing when missing or unknown. */
	health: string | null | undefined;
	className?: string;
}

/** Quiet inline health from the latest status update: a coloured dot and "On track" / "At risk" / "Off track". */
export function ReleaseHealth({ health, className }: ReleaseHealthProps) {
	const pill = getHealthPill(health);
	if (!pill) return null;

	return (
		<span className={cn("inline-flex items-center gap-1.5 font-medium text-xs", TONE_TEXT[pill.tone], className)}>
			<i aria-hidden className="block size-1.5 shrink-0 rounded-full bg-current" />
			{pill.label}
		</span>
	);
}
