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
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { updateTaskAction } from "@/app/lib/fetches";
import { useToastAction } from "@/app/lib/util";

interface GlobalTaskCategoryProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (categoryId: string) => void;

	// Optional internal logic for linked state management with task list
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;

	useInternalLogic?: boolean;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	customTrigger?: React.ReactNode;
	categories: schema.categoryType[];
}

export default function GlobalTaskCategory({
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
	categories,
}: GlobalTaskCategoryProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast } = useToastAction();

	const handleCategoryChange = async (categoryId: string | null) => {
		if (!categoryId) return;

		// Always call onChange first
		if (onChange) {
			onChange(categoryId);
		}

		if (useInternalLogic && tasks && setTasks && setSelectedTask) {
			// Find the category object for display
			const selectedCategory = categories.find((c) => c.id === categoryId)?.id || "";

			// Optimistic UI update
			const updatedTasks = tasks.map((t) => (t.id === task.id ? { ...task, category: selectedCategory } : t));
			setTasks(updatedTasks);
			if (task) {
				setSelectedTask({ ...task, category: selectedCategory });
			}

			// Server update
			const data = await runWithToast(
				"update-task-category",
				{
					loading: {
						title: "Updating task...",
						description: "Updating your task category...",
					},
					success: {
						title: "Task updated",
						description: "The category has been saved successfully.",
					},
					error: {
						title: "Save failed",
						description: "Your change is visible, but couldn't be saved. Please try again.",
					},
				},
				() =>
					updateTaskAction(
						task.organizationId,
						task.id,
						{ category: categoryId }, // <-- Make sure your API expects categoryId or category
						wsClientId
					)
			);

			if (data?.success && data.data) {
				const finalTasks = tasks.map((t) => (t.id === task.id && data.data ? data.data : t));
				setTasks(finalTasks);

				if (task && task.id === data.data.id) {
					setSelectedTask(data.data);
					sendWindowMessage(
						window,
						{
							type: "timeline-update",
							payload: data.data.id,
						},
						"*"
					);
				}
			}
		}
	};

	const currentCategory = categories.find((c) => c.id === task.category);

	return (
		<div className="flex flex-col gap-3">
			{!customTrigger && <Label variant={"subheading"}>Category</Label>}

			<div className="flex flex-col gap-2">
				<ComboBox
					value={currentCategory?.id || ""}
					onValueChange={handleCategoryChange}
					open={open}
					onOpenChange={setOpen}
				>
					{customTrigger ? (
						<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
					) : (
						<ComboBoxTrigger disabled={!editable}>
							<ComboBoxValue placeholder="Select category">
								{currentCategory ? (
									<div className="flex items-center gap-2">
										<div
											className="h-3 w-3 rounded-full border"
											style={{
												backgroundColor: currentCategory.color || "#cccccc",
											}}
										/>
										<span>{currentCategory.name}</span>
									</div>
								) : (
									<span>Select category</span>
								)}
							</ComboBoxValue>
							<ComboBoxIcon />
						</ComboBoxTrigger>
					)}

					<ComboBoxContent>
						<ComboBoxSearch icon placeholder="Search categories..." />
						<ComboBoxList>
							<ComboBoxEmpty>No categories found</ComboBoxEmpty>
							<ComboBoxGroup>
								{categories.map((cat) => (
									<ComboBoxItem key={cat.id} value={cat.id}>
										<div className="flex items-center gap-2">
											<div
												className="h-3 w-3 rounded-full border"
												style={{
													backgroundColor: cat.color || "#cccccc",
												}}
											/>
											<span>{cat.name}</span>
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
