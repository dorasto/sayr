import type React from "react";

interface PriorityIconProps {
	className?: string;
	size?: number;
	color?: string;
	bars?: 1 | 2 | 3 | "none";
}

export default function PriorityIcon({
	className = "",
	size = 16,
	color = "var(--muted-foreground)",
	bars = 3,
}: PriorityIconProps) {
	// Define heights for each bar based on priority level
	const getBarHeights = () => {
		switch (bars) {
			case "none":
				return { first: 3, second: 3, third: 3 }; // All minimal height
			case 1:
				return { first: 6, second: 3, third: 3 }; // Only first bar at low height
			case 2:
				return { first: 6, second: 9, third: 3 }; // First two bars active
			case 3:
				return { first: 6, second: 9, third: 12 }; // All bars at full height
			default:
				return { first: 6, second: 9, third: 12 };
		}
	};

	const getBarYPositions = () => {
		switch (bars) {
			case "none":
				return { first: 6.5, second: 6.5, third: 6.5 }; // All centered as dots
			case 1:
				return { first: 8, second: 11.5, third: 11.5 }; // First normal, others at bottom
			case 2:
				return { first: 8, second: 5.5, third: 11.5 }; // First two normal, third at bottom
			case 3:
				return { first: 8, second: 5.5, third: 2 }; // All at normal positions
			default:
				return { first: 8, second: 5.5, third: 2 };
		}
	};

	const heights = getBarHeights();
	const yPositions = getBarYPositions();

	return (
		<svg
			aria-label="Priority"
			className={className}
			style={{ color } as React.CSSProperties}
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			fill={color}
			role="img"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* First bar - always shown */}
			<rect x="1.5" y={yPositions.first} width="3" height={heights.first} rx="1" />

			{/* Second bar - shown with varying height */}
			<rect x="6.5" y={yPositions.second} width="3" height={heights.second} rx="1" />

			{/* Third bar - shown with varying height */}
			<rect x="11.5" y={yPositions.third} width="3" height={heights.third} rx="1" />
		</svg>
	);
}
