import type { schema } from "@repo/database";
import { IconCategory } from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";
import type { FieldDisplay, FieldOption, SingleFieldUpdatePayload } from "./types";

export interface CategoryOptionMeta {
	color: string | null;
	icon: string | null;
}

/**
 * Builds the list of category options from the org's categories.
 * Includes a "No Category" option at the top.
 */
export function getCategoryOptions(
	categories: schema.categoryType[],
): FieldOption<string | null, CategoryOptionMeta | undefined>[] {
	const noneOption: FieldOption<string | null, CategoryOptionMeta | undefined> = {
		id: "none",
		label: "No Category",
		icon: <IconCategory className="h-4 w-4 text-muted-foreground" />,
		value: null,
		keywords: "category none remove",
	};

	const catOptions: FieldOption<string | null, CategoryOptionMeta | undefined>[] = categories.map((cat) => ({
		id: cat.id,
		label: cat.name,
		icon: (
			<RenderIcon
				iconName={cat.icon || "IconCircleFilled"}
				size={14}
				color={cat.color || undefined}
				raw
			/>
		),
		value: cat.id,
		keywords: `category ${cat.name}`,
		metadata: {
			color: cat.color,
			icon: cat.icon,
		},
	}));

	return [noneOption, ...catOptions];
}

export function getCategoryDisplay(
	task: schema.TaskWithLabels,
	categories: schema.categoryType[],
): FieldDisplay {
	const cat = categories.find((c) => c.id === task.category);
	return {
		label: cat?.name ?? "None",
		icon: cat ? (
			<RenderIcon
				iconName={cat.icon || "IconCircleFilled"}
				size={14}
				color={cat.color || undefined}
				raw
			/>
		) : (
			<IconCategory className="h-4 w-4 opacity-60" />
		),
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
