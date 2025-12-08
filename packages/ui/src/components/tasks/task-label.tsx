import { Badge } from "@repo/components/ui/badge";

interface TaskLabelProps {
	label: string;
}

const labelConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
	bug: { variant: "destructive" },
	feature: { variant: "default" },
	documentation: { variant: "secondary" },
};

export function TaskLabel({ label }: TaskLabelProps) {
	const config = labelConfig[label.toLowerCase()] || { variant: "outline" as const };

	return (
		<Badge variant={config.variant} className="capitalize">
			{label}
		</Badge>
	);
}
