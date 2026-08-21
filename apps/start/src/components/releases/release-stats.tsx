"use client";

interface StatsItem {
	label: string;
	value: number;
	cssVar: string; // CSS variable name like "success", "primary", "muted-foreground"
}

interface ReleaseStatsProps {
	items: StatsItem[];
}

export function ReleaseStats({ items }: ReleaseStatsProps) {
	const total = items.reduce((sum, item) => sum + item.value, 0);

	return (
		<div className="mt-2">
			{/* Progress Bar */}
			<div className="flex items-center gap-0.5">
				{items.map((item) => {
					const percentage = total > 0 ? (item.value / total) * 100 : 0;
					if (percentage === 0) return null;
					return (
						<div
							key={item.label}
							className="h-1.5 rounded-xs"
							style={{
								width: `${percentage}%`,
								backgroundColor: `var(--${item.cssVar})`,
							}}
						/>
					);
				})}
			</div>

			{/* Legend */}
			<ul className="mt-3 space-y-2">
				{items.map((item) => {
					const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
					return (
						<li key={item.label} className="flex items-center gap-2 text-xs">
							<span
								className="size-2.5 rounded-xs shrink-0"
								style={{ backgroundColor: `var(--${item.cssVar})` }}
								aria-hidden="true"
							/>
							<span className="text-foreground font-medium">{item.label}</span>
							<span className="text-muted-foreground">
								({item.value} / {percentage}%)
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
