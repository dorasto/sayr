import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
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
import { useBoardCapabilities, useBoardData, useBoardItemActions } from "../core/board-data";
import { StaticField } from "./static-field";

interface FieldCategoryProps {
	task: schema.TaskWithLabels;
}

/**
 * Compact category pill — hidden entirely when the task has no category
 * (matches the existing org-scoped row's CategoryBadgeButton, which also
 * renders null on empty), a colored-dot pill when it does. Still a full
 * ComboBox trigger underneath, so clicking it reassigns/clears the category
 * — assigning a category to a task that has none is done from the task
 * detail page, not from this compact row/card badge.
 */
export function FieldCategory({ task }: FieldCategoryProps) {
	const { categories } = useBoardData();
	const { canEditFields } = useBoardCapabilities();
	const { execute } = useBoardItemActions(task);
	const availableCategories = categories.filter((category) => category.organizationId === task.organizationId);
	const current = availableCategories.find((category) => category.id === task.category);

	if (!current) return null;

	const pill = (
		<Badge variant="secondary" className="flex h-5 max-w-24 items-center gap-1 px-1.5 text-[11px] font-medium">
			<span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: current.color ?? "#9CA3AF" }} />
			<span className="truncate">{current.name}</span>
		</Badge>
	);

	if (!canEditFields) {
		return (
			<StaticField className="shrink-0" title={current.name}>
				{pill}
			</StaticField>
		);
	}

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
			<ComboBoxTrigger asChild>
				<button type="button" data-no-propagate className="shrink-0 cursor-pointer" title={current.name}>
					{pill}
				</button>
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
