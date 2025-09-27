"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";
import { cn } from "@repo/ui/lib/utils";
import { IconCircleFilled, IconPlus } from "@tabler/icons-react";
import { XIcon } from "lucide-react";

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

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Labels</Label>
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap gap-2">
					{task.labels.map((label) => (
						<RenderLabel
							key={label.id}
							label={label}
							showRemove={editable}
							onRemove={(labelId) => {
								handleLabelsChange(currentLabelIds.filter((id) => id !== labelId));
							}}
						/>
					))}
					<ComboBox values={currentLabelIds} onValuesChange={handleLabelsChange}>
						<ComboBoxTrigger disabled={!editable} className="h-5 w-5 aspect-square p-0 justify-center">
							<IconPlus />
						</ComboBoxTrigger>
						<ComboBoxContent className="">
							<ComboBoxSearch placeholder="Search labels..." />
							<ComboBoxList>
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

interface RenderLabelProps {
	label: { id: string; name: string; color?: string | null };
	showRemove?: boolean;
	onRemove?: (labelId: string) => void;
	onClick?: (e: React.MouseEvent, labelId: string) => void;
	className?: string;
}

export function RenderLabel({ label, showRemove = false, onRemove, onClick, className = "" }: RenderLabelProps) {
	return (
		<Badge
			key={label.id}
			variant="secondary"
			className={cn(
				"flex items-center justify-center gap-1 bg-accent text-xs h-5 border border-border rounded-2xl truncate group/label cursor-pointer w-fit relative peer ps-5",
				showRemove && "pe-5",
				className
			)}
			// style={{
			// 	backgroundColor: label.color ? getHslaWithOpacity(label.color, 0.1) : "var(--muted)",
			// 	borderColor: label.color ? getHslaWithOpacity(label.color, 0.5) : "var(--border)",
			// }}
			onClick={onClick ? (e) => onClick(e, label.id) : undefined}
		>
			<div className="shrink-0 absolute inset-y-0 flex items-center justify-center start-0 ps-1">
				<IconCircleFilled
					size={12}
					style={{
						color: label.color || "var(--foreground)",
					}}
				/>
			</div>
			<span className="truncate">{label.name}</span>
			{showRemove && onRemove && (
				<div className="shrink-0 absolute inset-y-0 flex items-center justify-center end-0 pe-1">
					<XIcon
						size={12}
						className="cursor-pointer hover:bg-muted rounded-sm shrink-0 opacity-0 group-hover/label:opacity-100"
						onClick={(e) => {
							e.stopPropagation();
							onRemove(label.id);
						}}
					/>
				</div>
			)}
		</Badge>
	);
}
