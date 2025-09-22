"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxIcon,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxSelected,
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { getHslaWithOpacity } from "@repo/util";
import { IconCircleFilled, IconPlus } from "@tabler/icons-react";
import { XIcon } from "lucide-react";
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
	// Get current selected label IDs
	const currentLabelIds = task.labels?.map((label) => label.id) || [];

	const handleLabelsChange = (values: string[]) => {
		if (onLabelsChange) {
			onLabelsChange(values);
		}
	};

	// Create a map for easy label lookup
	const labelMap = useMemo(() => {
		const map = new Map();
		availableLabels.forEach((label) => {
			map.set(label.id, label);
		});
		return map;
	}, [availableLabels]);

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Labels</Label>
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap gap-2">
					{task.labels.map((label) => (
						<Badge
							key={label.id}
							variant="secondary"
							className="flex items-center gap-1 text-xs h-5 border border-border rounded"
							style={{
								backgroundColor: label.color ? getHslaWithOpacity(label.color, 0.1) : "var(--muted)",
								borderColor: label.color ? getHslaWithOpacity(label.color, 0.5) : "var(--border)",
							}}
						>
							<IconCircleFilled
								className="h-3 w-3"
								style={{
									color: label.color || "var(--foreground)",
								}}
							/>
							<span className="truncate">{label.name}</span>
							<XIcon
								className="h-3 w-3 cursor-pointer hover:bg-muted rounded-sm"
								onClick={(e) => {
									e.stopPropagation();
									handleLabelsChange(currentLabelIds.filter((labelId) => labelId !== label.id));
								}}
							/>
						</Badge>
					))}
					<ComboBox values={currentLabelIds} onValuesChange={handleLabelsChange}>
						<ComboBoxTrigger disabled={!editable} className="h-5 w-5 aspect-square p-0 justify-center">
							<IconPlus />
						</ComboBoxTrigger>
						<ComboBoxContent className="w-[220px]">
							<ComboBoxList>
								<ComboBoxSearch placeholder="Search labels..." />
								<ComboBoxEmpty>No labels found.</ComboBoxEmpty>
								<ComboBoxGroup>
									{availableLabels.map((label) => (
										<ComboBoxItem key={label.name} value={label.id}>
											<span
												className="h-2 w-2 flex-shrink-0 rounded-full mr-2"
												style={{ backgroundColor: label.color || "#cccccc" }}
											/>
											<span className="flex-1">{label.name}</span>
										</ComboBoxItem>
									))}
								</ComboBoxGroup>
							</ComboBoxList>
						</ComboBoxContent>
					</ComboBox>
				</div>
			</div>
		</div>
	);
}
