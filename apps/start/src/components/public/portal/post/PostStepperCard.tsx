import { PortalCard } from "@/components/public/portal/ui/PortalCard";
import { Stepper } from "@/components/public/portal/ui/Stepper";

interface PostStepperCardProps {
	/** Internal task status. Renders nothing for `canceled` (Won't do has no path). */
	status: string;
	/** Tighter padding for narrow containers (Peek, mobile). */
	compact?: boolean;
	className?: string;
}

/** Open, Planned, In progress, Done path in a card. */
export function PostStepperCard({ status, compact = false, className }: PostStepperCardProps) {
	if (status === "canceled") return null;

	return (
		<PortalCard padded={false} className={className}>
			<div className={compact ? "px-2 pt-4 pb-3" : "px-4 pt-[18px] pb-3 md:px-7 md:pt-[22px] md:pb-[18px]"}>
				<Stepper status={status} />
			</div>
		</PortalCard>
	);
}
