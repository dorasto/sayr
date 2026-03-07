import type { schema } from "@repo/database";
import { IconCategory } from "@tabler/icons-react";
import type { FieldDisplay, FieldOption, SingleFieldUpdatePayload } from "./types";

const ICON_CLASS = "h-3 w-3 rounded-full border shrink-0";

/**
 * Builds the list of category options from the org's categories.
 * Includes a "No Category" option at the top.
 */
export function getCategoryOptions(categories: schema.categoryType[]): FieldOption<string | null>[] {
	const noneOption: FieldOption<string | null> = {
		id: "none",
		label: "No Category",
		icon: <IconCategory className="h-4 w-4 text-muted-foreground" />,
		value: null,
		keywords: "category none remove",
	};

	const catOptions: FieldOption<string | null>[] = categories.map((cat) => ({
		id: cat.id,
		label: cat.name,
		icon: (
			<div
				className={ICON_CLASS}
				style={{ backgroundColor: cat.color || "#cccccc" }}
			/>
		),
		value: cat.id,
		keywords: `category ${cat.name}`,
	}));

	return [noneOption, ...catOptions];
}

export function getCategoryDisplay(
	task: schema.TaskWithLabels,
	categories: schema.categoryType[],
): FieldDisplay {
	const name = categories.find((c) => c.id === task.category)?.name ?? "None";
	return {
		label: name,
		icon: <IconCategory className="h-4 w-4 opacity-60" />,
	};
}

export function getCategoryUpdatePayload(
	task: schema.TaskWithLabels,
	newCategoryId: string | null,
	categories: schema.categoryType[],
): SingleFieldUpdatePayload {
	const name = newCategoryId
		? (categories.find((c) => c.id === newCategoryId)?.name ?? "Unknown")
		: null;

	return {
		kind: "single",
		field: "category",
		updateData: { category: newCategoryId },
		optimisticTask: { ...task, category: newCategoryId },
		toastMessages: {
			loading: { title: newCategoryId ? "Updating category..." : "Removing category..." },
			success: {
				title: newCategoryId ? "Category updated" : "Category removed",
				description: name ? `Changed to ${name}` : undefined,
			},
			error: { title: "Failed to update category" },
		},
	};
}
