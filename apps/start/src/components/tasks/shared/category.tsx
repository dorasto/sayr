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
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { XIcon } from "lucide-react";
import RenderIcon from "@/components/generic/RenderIcon";
import { getCategoryOptions, getCategoryDisplay, getCategoryUpdatePayload, useTaskFieldAction } from "@/components/tasks/actions";
import { Button } from "@repo/ui/components/button";
import { Link } from "@tanstack/react-router";
import { InlineLabel } from "./inlinelabel";

interface GlobalTaskCategoryProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (categoryId: string) => void;
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	customTrigger?: React.ReactNode;
	categories: schema.categoryType[];
	showLabel?: boolean;
	showChevron?: boolean;
	className?: string;
	/** Compact mode shows only the icon without text label */
	compact?: boolean;
}

export default function GlobalTaskCategory({
	task,
	editable = false,
	onChange,
	tasks = [],
	setTasks,
	setSelectedTask,
	open,
	setOpen,
	customTrigger,
	categories,
	showLabel = true,
	showChevron = true,
	className,
	compact = false,
}: GlobalTaskCategoryProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");

	const { execute } = useTaskFieldAction(
		task,
		tasks,
		setSelectedTask ?? (() => {}),
		setTasks ?? (() => {}),
		wsClientId,
	);

	const handleCategoryChange = (categoryId: string | null) => {
		onChange?.(categoryId || "");
		execute(getCategoryUpdatePayload(task, categoryId || null, categories));
	};

	// Get options from the action system (skip the "none" option for ComboBox — deselection is handled natively)
	const options = getCategoryOptions(categories).filter((opt) => opt.id !== "none");
	const display = getCategoryDisplay(task, categories);

	return customTrigger ? (
		<ComboBox
			value={task.category || ""}
			onValueChange={handleCategoryChange}
			open={open}
			onOpenChange={setOpen}
		>
			<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch icon placeholder="Search categories..." />
				<ComboBoxList>
					<ComboBoxEmpty className="px-3 pt-3 flex flex-col items-center w-full">
						<div className="flex flex-col gap-1">
							<Label>No categories found</Label>
							<Link to="/settings/org/$orgId/categories" params={{ orgId: task.organizationId }}>
								<Button variant="primary" size={"sm"}>
									Create new
								</Button>
							</Link>
						</div>
					</ComboBoxEmpty>
					<ComboBoxGroup>
						{options.map((opt) => (
							<ComboBoxItem key={opt.id} value={opt.id} searchValue={opt.label.toLowerCase()}>
								<div className="flex items-center gap-2">
									{opt.icon}
									<span>{opt.label}</span>
								</div>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	) : (
		<div className="flex flex-col gap-3">
			{showLabel && <Label variant={"subheading"}>Category</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox
					value={task.category || ""}
					onValueChange={handleCategoryChange}
					open={open}
					onOpenChange={setOpen}
				>
					<ComboBoxTrigger disabled={!editable} className={className}>
						<ComboBoxValue placeholder="Select category">
							<div className={cn("flex items-center gap-2", compact && "max-w-20 text-xs")}>
								{display.icon}
								{!compact && <span className="truncate">{display.label}</span>}
							</div>
						</ComboBoxValue>
						{showChevron && <ComboBoxIcon />}
					</ComboBoxTrigger>
					<ComboBoxContent>
						<ComboBoxSearch icon placeholder="Search categories..." />
						<ComboBoxList>
							<ComboBoxEmpty className="px-3 pt-3 flex flex-col items-center w-full">
								<div className="flex flex-col gap-1">
									<Label>No categories found</Label>
									<Link to="/settings/org/$orgId/categories" params={{ orgId: task.organizationId }}>
										<Button variant="primary" size={"sm"}>
											Create new
										</Button>
									</Link>
								</div>
							</ComboBoxEmpty>
							<ComboBoxGroup>
								{options.map((opt) => (
									<ComboBoxItem key={opt.id} value={opt.id} searchValue={opt.label.toLowerCase()}>
										<div className="flex items-center gap-2">
											{opt.icon}
											<span>{opt.label}</span>
										</div>
									</ComboBoxItem>
								))}
							</ComboBoxGroup>
						</ComboBoxList>
					</ComboBoxContent>
				</ComboBox>
			</div>
		</div>
	);
}

interface RenderCategoryProps {
	category: {
		id: string;
		name: string;
		color?: string | null;
		icon?: string | null;
	};
	showRemove?: boolean;
	onRemove?: (categoryId: string) => void;
	onClick?: (e: React.MouseEvent, categoryId: string) => void;
	className?: string;
}

export function RenderCategory({
	category,
	showRemove = false,
	onRemove,
	onClick,
	className = "",
}: RenderCategoryProps) {
	return (
		<Badge
			data-no-propagate
			key={category.id}
			variant="secondary"
			className={cn(
				"flex items-center justify-center gap-1 bg-accent ps-0 text-xs h-5 border border-border rounded-2xl truncate group/category cursor-pointer w-fit relative",
				showRemove && "pe-5",
				className
			)}
			onClick={onClick ? (e) => onClick(e, category.id) : undefined}
		>
			<InlineLabel
				text={category.name}
				icon={
					<RenderIcon
						iconName={category.icon || "IconCategory"}
						size={12}
						color={category.color || undefined}
						raw
					/>
				}
				className=""
			/>
			{showRemove && onRemove && (
				<div className="shrink-0 absolute inset-y-0 flex items-center justify-center end-0 pe-1">
					<XIcon
						size={12}
						className="cursor-pointer hover:bg-muted rounded-sm shrink-0 opacity-0 group-hover/category:opacity-100"
						onClick={(e) => {
							e.stopPropagation();
							onRemove(category.id);
						}}
					/>
				</div>
			)}
		</Badge>
	);
}
