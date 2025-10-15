import { IconCircleCheck, IconCircleCheckFilled, IconCircleX, IconCircleXFilled, IconX } from "@tabler/icons-react";
import { CircleCheck, CircleX } from "lucide-react";

interface StatusIconProps {
	status: "backlog" | "todo" | "in-progress" | "done" | "canceled" | null;
	className?: string;
	size?: number;
}

export default function StatusIcon({ status, className = "", size = 16 }: StatusIconProps) {
	// For done and canceled, use the existing lucide icons
	if (status === "done") {
		return <IconCircleCheck size={size} className={`text-success ${className}`} />;
	}

	if (status === "canceled") {
		return <IconCircleX size={size} className={`text-muted-foreground ${className}`} />;
	}

	// For other statuses, use custom SVG with circle-in-circle design
	const center = size / 2;
	const outerRadius = size * 0.375; // Outer circle radius
	const innerRadius = size * 0.15; // Inner circle radius (smaller)

	const getCircleConfig = () => {
		switch (status) {
			case "backlog":
				return {
					outerStrokeDasharray: "2,2", // Dashed outer circle
					showInner: false,
					innerFillPercentage: 0,
				};
			case "todo":
				return {
					outerStrokeDasharray: "none",
					showInner: true,
					innerFillPercentage: 25, // 1/4 filled
				};
			case "in-progress":
				return {
					outerStrokeDasharray: "none",
					showInner: true,
					innerFillPercentage: 50, // 1/2 filled
				};
			default:
				return {
					outerStrokeDasharray: "none",
					showInner: false,
					innerFillPercentage: 0,
				};
		}
	};

	const config = getCircleConfig();

	// Calculate inner circle progress
	const innerCircumference = 2 * Math.PI * innerRadius;
	const innerStrokeDasharray = `${(innerCircumference * config.innerFillPercentage) / 100} ${innerCircumference}`;

	if (status === null) return null;

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			fill="none"
			className={className}
			role="img"
			aria-label={`Status: ${status}`}
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Outer circle - always visible */}
			<circle
				cx={center}
				cy={center}
				r={outerRadius}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeDasharray={config.outerStrokeDasharray}
				opacity="0.4"
			/>

			{/* Inner progress circle - only for todo and in-progress */}
			{config.showInner && (
				<circle
					cx={center}
					cy={center}
					r={innerRadius}
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeDasharray={innerStrokeDasharray}
					strokeDashoffset="0"
					transform={`rotate(-90 ${center} ${center})`} // Start from top
					opacity="0.9"
				/>
			)}
		</svg>
	);
}
