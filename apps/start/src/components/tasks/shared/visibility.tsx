"use client";

import type { schema } from "@repo/database";
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
import { IconLock, IconLockOpen2 } from "@tabler/icons-react";
import { getVisibilityUpdatePayload, useTaskFieldAction } from "@/components/tasks/actions";

const visibilityConfig = {
	public: {
		label: "Public",
		icon: (className?: string) => <IconLockOpen2 className={className} />,
		className: "text-muted-foreground",
		description: "Visible to everyone",
	},
	private: {
		label: "Private",
		icon: (className?: string) => <IconLock className={className} />,
		className: "text-primary",
		description: "Only visible to team members",
	},
} as const;

interface GlobalTaskVisibilityProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (visibility: "public" | "private") => void;
	// Props for internal logic (delegated to the unified action system)
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;
	useInternalLogic?: boolean;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	customTrigger?: React.ReactNode;
	showLabel?: boolean;
	showChevron?: boolean;
	className?: string;
	/** Compact mode shows only the icon without text label */
	compact?: boolean;
}

export default function GlobalTaskVisibility({
	task,
	editable = false,
	onChange,
	tasks = [],
	setTasks,
	setSelectedTask,
	useInternalLogic = false,
	open,
	setOpen,
	customTrigger,
	showLabel = true,
	showChevron = true,
	className,
	compact = false,
}: GlobalTaskVisibilityProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const currentVisibility = (task.visible ?? "public") || "public";

	const { execute } = useTaskFieldAction(
		task,
		tasks,
		setSelectedTask ?? (() => {}),
		setTasks ?? (() => {}),
		wsClientId,
	);

	const handleVisibilityChange = async (value: string | null) => {
		if (!value || (value !== "public" && value !== "private")) return;

		// Always call onChange first if provided (for external side effects)
		if (onChange) {
			onChange(value as "public" | "private");
		}

		if (useInternalLogic && setTasks && setSelectedTask) {
			execute(getVisibilityUpdatePayload(task, value));
		}
	};

	const config = visibilityConfig[currentVisibility as keyof typeof visibilityConfig];

	return (
		<div className="flex flex-col gap-3">
			{!customTrigger && showLabel && <Label variant={"subheading"}>Visibility</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox value={currentVisibility} onValueChange={handleVisibilityChange} open={open} onOpenChange={setOpen}>
					{customTrigger ? (
						// Wrap customTrigger in ComboBoxTrigger asChild so it opens the ComboBox
						<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
					) : (
						<ComboBoxTrigger disabled={!editable} className={className}>
							<ComboBoxValue placeholder="Visibility">
								{currentVisibility && config && (
								<div className={cn("flex items-center gap-2", compact && "max-w-20 text-xs")}>
									{config.icon(cn(config.className, "h-4 w-4"))}
									{!compact && <span className="truncate">{config.label}</span>}
								</div>
								)}
							</ComboBoxValue>
							{showChevron && <ComboBoxIcon />}
						</ComboBoxTrigger>
					)}
					<ComboBoxContent>
						<ComboBoxSearch icon placeholder="Change visibility..." />
						<ComboBoxList>
							<ComboBoxEmpty>Not found</ComboBoxEmpty>
							<ComboBoxGroup>
								{Object.entries(visibilityConfig).map(([key, config]) => (
									<ComboBoxItem key={key} value={key}>
										{config.icon(cn(config.className, "h-4 w-4"))}
										<div className="ml-2 flex flex-col">
											<span>{config.label}</span>
											<span className="text-xs text-muted-foreground">{config.description}</span>
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
