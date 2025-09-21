"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { type ComboBoxItem, ComboBoxResponsive } from "@repo/ui/components/tomui/combo-box-responsive";
import { IconPlus } from "@tabler/icons-react";
import { useMemo } from "react";

interface GlobalTaskLabelsProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	availableLabels?: Array<{ id: string; name: string; color?: string | null }>;
	onLabelsChange?: (labelIds: string[]) => void;
}

export default function GlobalTaskLabels({
	task,
	editable = false,
	availableLabels = [],
	onLabelsChange,
}: GlobalTaskLabelsProps) {
	// Convert available labels to combo box items
	const labelItems: ComboBoxItem[] = useMemo(
		() =>
			availableLabels.map((label) => ({
				value: label.id,
				label: label.name,
				icon: (
					<span
						className="h-2 w-2 flex-shrink-0 rounded-full"
						style={{ backgroundColor: label.color || "#cccccc" }}
					/>
				),
			})),
		[availableLabels]
	);

	// Get current selected label (just pick the first one for single select)
	const currentLabelId = task.labels?.[0]?.id || undefined;

	const handleLabelChange = (value: string | null) => {
		if (onLabelsChange) {
			onLabelsChange(value ? [value] : []);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Labels</Label>
			<div className="flex flex-wrap gap-1">
				{/* Display existing labels */}
				{task.labels && task.labels.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{task.labels.map((label) => (
							<Badge
								key={label.id}
								variant="outline"
								className="flex overflow-hidden justify-center flex-shrink-0 items-center rounded px-2.5 text-xs h-6"
							>
								<div className="flex items-center gap-1.5 overflow-hidden">
									<span
										className="h-2 w-2 flex-shrink-0 rounded-full"
										style={{ backgroundColor: label.color || "#cccccc" }}
									/>
									<div className="line-clamp-1 inline-block w-auto max-w-[120px] truncate">{label.name}</div>
								</div>
							</Badge>
						))}
					</div>
				)}

				{/* Dropdown for selecting labels */}
				<ComboBoxResponsive
					items={labelItems}
					value={currentLabelId}
					onValueChange={handleLabelChange}
					placeholder="Search labels..."
					emptyText="No labels found."
					buttonText="Select label"
					buttonWidth="justify-start"
					popoverWidth="w-[220px]"
					disabled={editable === false}
					customTrigger={
						<Button size={"icon"} variant={"accent"} className="h-6 w-6">
							<IconPlus />
						</Button>
					}
				/>
			</div>
		</div>
	);
}
