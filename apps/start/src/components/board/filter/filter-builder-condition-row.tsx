"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Input } from "@repo/ui/components/input";
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
import { getInitials } from "@repo/util";
import { IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import { FIELD_CONFIGS } from "./filter-config";
import { getOperatorLabel } from "./operators";
import type { FilterCondition, FilterOperator } from "./types";

interface FilterBuilderConditionRowProps {
	condition: FilterCondition;
	onOperatorChange: (operator: FilterOperator) => void;
	onValuesChange: (values: string[]) => void;
	onTextChange: (value: string) => void;
	onRemove: () => void;
}

/**
 * One active filter condition — field label, an operator picker (only shown
 * when the field allows more than one), and a value control. Multi-select
 * fields (everything with FIELD_CONFIGS' getOptions) get a checkbox-style
 * ComboBox; "title" gets a plain text input. Date fields (created/updated)
 * aren't addable yet — see filter-builder.tsx's ADDABLE_FIELDS — so there's
 * no date-range control here.
 */
export function FilterBuilderConditionRow({
	condition,
	onOperatorChange,
	onValuesChange,
	onTextChange,
	onRemove,
}: FilterBuilderConditionRowProps) {
	const { tasks, labels, categories, releases } = useLanderData();
	const [search, setSearch] = useState("");

	const config = FIELD_CONFIGS.find((c) => c.field === condition.field);
	const needsValue = condition.operator !== "empty" && condition.operator !== "not_empty";

	// Assignee/creator both resolve against "every user seen across the
	// loaded tasks" — there's no separate org-membership list loaded on the
	// lander, and this mirrors field-assignee.tsx's same derivation.
	const users = useMemo(() => {
		const map = new Map<string, schema.UserSummary>();
		for (const task of tasks) {
			for (const user of task.assignees) {
				map.set(user.id, user);
			}
			if (task.createdBy) map.set(task.createdBy.id, task.createdBy);
		}
		return Array.from(map.values());
	}, [tasks]);

	if (!config) return null;

	const selectedValues = Array.isArray(condition.value)
		? condition.value
		: condition.value
			? [String(condition.value)]
			: [];
	const options = config.getOptions?.(tasks, labels, users, search, categories, releases) ?? [];

	return (
		<div className="flex items-center gap-1.5 py-1">
			<span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-20">
				{config.icon}
				<span className="truncate">{config.label}</span>
			</span>
			{config.operators.length > 1 && (
				<ComboBox
					value={condition.operator}
					onValueChange={(value) => value && onOperatorChange(value as FilterOperator)}
				>
					<ComboBoxTrigger asChild>
						<button
							type="button"
							className="text-xs text-muted-foreground hover:text-foreground shrink-0 underline decoration-dotted underline-offset-2"
						>
							{getOperatorLabel(condition.operator)}
						</button>
					</ComboBoxTrigger>
					<ComboBoxContent className="w-44" align="start">
						<ComboBoxList>
							<ComboBoxGroup>
								{config.operators.map((operator) => (
									<ComboBoxItem key={operator} value={operator} showCheck={false}>
										{getOperatorLabel(operator)}
									</ComboBoxItem>
								))}
							</ComboBoxGroup>
						</ComboBoxList>
					</ComboBoxContent>
				</ComboBox>
			)}
			{needsValue && config.field === "title" ? (
				<Input
					type="text"
					value={typeof condition.value === "string" ? condition.value : ""}
					onChange={(event) => onTextChange(event.target.value)}
					placeholder="Search title..."
					className="h-6 min-w-0 flex-1 px-2 text-xs"
				/>
			) : needsValue && config.getOptions ? (
				<ComboBox values={selectedValues} onValuesChange={onValuesChange}>
					<ComboBoxTrigger asChild>
						<button
							type="button"
							className="flex items-center gap-1 flex-1 min-w-0 text-xs text-left truncate hover:text-foreground"
						>
							{selectedValues.length === 0 ? (
								<span className="text-muted-foreground">Select {config.label.toLowerCase()}...</span>
							) : (
								`${selectedValues.length} selected`
							)}
						</button>
					</ComboBoxTrigger>
					<ComboBoxContent align="start">
						<ComboBoxSearch placeholder={`Search ${config.label.toLowerCase()}...`} onValueChange={setSearch} />
						<ComboBoxList>
							<ComboBoxEmpty>No options found.</ComboBoxEmpty>
							<ComboBoxGroup>
								{options.map((option) => (
									<ComboBoxItem
										key={option.value}
										value={option.value}
										searchValue={option.label}
										onSelect={
											option.mergedValues
												? () => {
														const merged = option.mergedValues as string[];
														const allSelected = merged.every((v) => selectedValues.includes(v));
														const next = allSelected
															? selectedValues.filter((v) => !merged.includes(v))
															: [
																	...selectedValues,
																	...merged.filter((v) => !selectedValues.includes(v)),
																];
														onValuesChange(next);
													}
												: undefined
										}
									>
										{option.image !== undefined ? (
											<Avatar className="size-4 shrink-0">
												<AvatarImage src={option.image || undefined} alt={option.label} />
												<AvatarFallback className="text-[8px]">{getInitials(option.label)}</AvatarFallback>
											</Avatar>
										) : option.color ? (
											<span
												className="size-2.5 rounded-full shrink-0"
												style={{ backgroundColor: option.color }}
												aria-hidden="true"
											/>
										) : (
											option.icon
										)}
										<span className="truncate">{option.label}</span>
										{option.orgName && (
											<span className="ml-auto shrink-0 text-[10px] text-muted-foreground truncate max-w-16">
												{option.orgName}
											</span>
										)}
									</ComboBoxItem>
								))}
							</ComboBoxGroup>
						</ComboBoxList>
					</ComboBoxContent>
				</ComboBox>
			) : (
				<div className="flex-1" />
			)}
			<button
				type="button"
				data-no-propagate
				onClick={onRemove}
				className="shrink-0 text-muted-foreground hover:text-foreground"
			>
				<IconX className="size-3.5" />
			</button>
		</div>
	);
}
