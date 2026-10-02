import { cn } from "@repo/ui/lib/utils";

export type RoadmapView = "status" | "release";

const OPTIONS: ReadonlyArray<{ value: RoadmapView; label: string }> = [
	{ value: "status", label: "By status" },
	{ value: "release", label: "By release" },
];

interface RoadmapSegmentedProps {
	value: RoadmapView;
	onChange: (value: RoadmapView) => void;
	className?: string;
}

/** "By status / By release" two-way switch: a raised track with a surface-coloured active segment. */
export function RoadmapSegmented({ value, onChange, className }: RoadmapSegmentedProps) {
	return (
		<div className={cn("inline-flex rounded-portal-md bg-portal-raised p-[3px]", className)}>
			{OPTIONS.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={active}
						onClick={() => onChange(option.value)}
						className={cn(
							"h-[30px] cursor-pointer rounded-[8px] max-md:h-11 px-3.5 font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-portal-focus",
							active
								? "bg-portal-surface text-portal-fg shadow-[0_1px_2px_oklch(0_0_0/0.25)]"
								: "text-portal-fg-2 hover:text-portal-fg focus-visible:text-portal-fg"
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
