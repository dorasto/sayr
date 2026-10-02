import { cn } from "@repo/ui/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { getStepperIndex, STEPPER_STEPS } from "@/lib/portal/status";

interface StepperProps {
	/** Internal task status. Renders nothing for `canceled` (Won't do has no path). */
	status: string;
	className?: string;
}

/**
 * Open → Planned → In progress → Done progress path as an ordered list (`aria-current="step"` on the current step).
 * Wrap in a `PortalCard` (padding `22px 28px 18px` in the design) when it should read as a card.
 */
export function Stepper({ status, className }: StepperProps) {
	const current = getStepperIndex(status);
	if (current === null) return null;
	const last = STEPPER_STEPS.length - 1;

	return (
		<ol aria-label="Progress" className={cn("flex items-start", className)}>
			{STEPPER_STEPS.map((label, index) => {
				const isCurrent = index === current;
				const isComplete = index < current || (isCurrent && index === last);
				const isActiveDot = isCurrent && !isComplete;

				return (
					<li
						key={label}
						aria-current={isCurrent ? "step" : undefined}
						className="flex flex-1 flex-col items-center gap-2"
					>
						<div className="flex w-full items-center">
							<span
								aria-hidden
								className={cn(
									"h-0.5 flex-1",
									index === 0 ? "bg-transparent" : index <= current ? "bg-portal-ok" : "bg-portal-line-2"
								)}
							/>
							{isComplete ? (
								<span className="flex size-[22px] items-center justify-center rounded-full bg-portal-ok text-portal-surface">
									<IconCheck aria-hidden className="size-3.5" stroke={3} />
								</span>
							) : isActiveDot ? (
								<span className="flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-portal-accent bg-portal-accent-soft">
									<i className="block size-2 rounded-full bg-portal-accent" />
								</span>
							) : (
								<span
									aria-hidden
									className="block size-[22px] rounded-full border-[1.5px] border-portal-line-2"
								/>
							)}
							<span
								aria-hidden
								className={cn(
									"h-0.5 flex-1",
									index === last ? "bg-transparent" : index < current ? "bg-portal-ok" : "bg-portal-line-2"
								)}
							/>
						</div>
						<span
							className={cn(
								"text-[13px]",
								isCurrent
									? "font-semibold text-portal-fg"
									: index < current
										? "font-medium text-portal-fg"
										: "font-medium text-portal-fg-3"
							)}
						>
							{label}
						</span>
					</li>
				);
			})}
		</ol>
	);
}
