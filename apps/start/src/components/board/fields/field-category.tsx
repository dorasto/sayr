import type { schema } from "@repo/database";
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
import { IconCategory } from "@tabler/icons-react";
import { useLanderData } from "@/contexts/ContextLander";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

interface FieldCategoryProps {
	task: schema.TaskWithLabels;
}

export function FieldCategory({ task }: FieldCategoryProps) {
	const { categories } = useLanderData();
	const { execute } = useBoardTaskFieldAction(task);
	const availableCategories = categories.filter((category) => category.organizationId === task.organizationId);
	const current = availableCategories.find((category) => category.id === task.category);

	return (
		<ComboBox
			value={task.category ?? undefined}
			onValueChange={(value) => {
				const category = value || null;
				execute({
					kind: "single",
					field: "category",
					updateData: { category },
					optimisticTask: { ...task, category },
					toastMessages: {
						loading: { title: category ? "Updating category..." : "Removing category..." },
						success: { title: category ? "Category updated" : "Category removed" },
						error: { title: "Failed to update category" },
					},
				});
			}}
		>
			<ComboBoxTrigger className="w-auto gap-2">
				<ComboBoxValue>
					<IconCategory className="h-4 w-4 text-muted-foreground" />
					<span>{current?.name ?? "Category"}</span>
				</ComboBoxValue>
				<ComboBoxIcon />
			</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch placeholder="Search categories..." />
				<ComboBoxList>
					<ComboBoxEmpty>No categories found.</ComboBoxEmpty>
					<ComboBoxGroup>
						<ComboBoxItem value="" searchValue="No category">
							No category
						</ComboBoxItem>
						{availableCategories.map((category) => (
							<ComboBoxItem key={category.id} value={category.id} searchValue={category.name}>
								<span
									className="size-2 rounded-full"
									style={{ backgroundColor: category.color ?? "#9CA3AF" }}
								/>
								<span>{category.name}</span>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	);
}
