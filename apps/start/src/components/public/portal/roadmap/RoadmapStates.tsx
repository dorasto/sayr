import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { PortalButton } from "../ui/PortalButton";

/** The roadmap could not be loaded. */
export function RoadmapErrorState({ onRetry }: { onRetry: () => void }) {
	return (
		<div
			role="alert"
			className="flex items-center gap-3.5 rounded-portal-lg border border-[color-mix(in_oklch,var(--portal-bad)_45%,transparent)] bg-portal-surface px-[22px] py-5 shadow-portal-hl"
		>
			<span
				aria-hidden
				className="flex size-9 shrink-0 items-center justify-center rounded-portal-md bg-portal-bad-soft text-portal-bad"
			>
				<IconAlertTriangle className="size-5" />
			</span>
			<div className="min-w-0 flex-1">
				<div className="font-semibold text-[15px]">We could not load the roadmap</div>
				<div className="text-[13.5px] text-portal-fg-2">Check your connection and try again.</div>
			</div>
			<PortalButton onClick={onRetry}>
				<IconRefresh aria-hidden />
				Retry
			</PortalButton>
		</div>
	);
}
