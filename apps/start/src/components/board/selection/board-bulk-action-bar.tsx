import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { type TriState, TriStateCheckbox } from "@repo/ui/components/doras-ui/tri-state-checkbox";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Separator } from "@repo/ui/components/separator";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
	IconCategory,
	IconDots,
	IconFlag,
	IconListCheck,
	IconRocket,
	IconTag,
	IconUser,
	IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import { useRegisterCommands } from "@/hooks/useRegisterCommands";
import { useTaskSelection } from "@/hooks/useTaskSelection";
import { commandActions, commandStore } from "@/lib/command-store";
import { updateAssigneesToTaskAction, updateLabelToTaskAction, updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import type { CommandMap } from "@/types/command";
import {
	PRIORITY_CONFIG,
	type PriorityValue,
	STATUS_CONFIG,
	type StatusValue,
	VISIBILITY_CONFIG,
	type VisibilityValue,
} from "../config/field-config";
import { BOARD_TASK_SELECTION_KEY } from "./board-selection-constants";

// The command-palette sub-view id the "More" button drills straight into.
// Also the id the "Bulk edit N tasks" root item's own subId points at, so
// the same view is reachable either way (imperative "More" click, or a
// normal Cmd+K open while a selection is active).
const BULK_ACTIONS_VIEW_ID = "board-bulk-actions";

function computeTriState(
	tasks: schema.TaskWithLabels[],
	predicate: (task: schema.TaskWithLabels) => boolean
): TriState {
	if (tasks.length === 0) return "none";
	const count = tasks.filter(predicate).length;
	if (count === tasks.length) return "all";
	if (count > 0) return "some";
	return "none";
}

interface BoardBulkActionBarProps {
	/** The full, currently-visible (filtered/sorted) task list — used both for select-all scope and to resolve selected tasks. */
	tasks: schema.TaskWithLabels[];
}

/**
 * Floating bulk-edit bar for the board's multi-select. Deliberately minimal —
 * select-all + count, two quick inline pickers (Status, Label), then "More",
 * which opens the Cmd+K command palette pre-drilled into a "Bulk actions"
 * sub-view listing every other field ("Change priority to...", "Change
 * assignee...", etc.), each drilling one level further into the actual
 * value list. Everything reachable from "More" is also reachable via a
 * normal Cmd+K open while a selection is active (same registered commands),
 * not just via the button.
 *
 * Reads the SAME useTaskSelection cache entry (BOARD_TASK_SELECTION_KEY)
 * that board-row.tsx/board-card.tsx write to, so it just appears/disappears
 * as selection changes with no props/context threaded down for that.
 *
 * The old org-scoped system was single-org, so bulk-assigning one category/
 * release/label id across every selected task was always safe. Board
 * selections can span multiple orgs, and category/release/label rows are
 * per-org (two orgs' "Bug" label are different rows with different ids) —
 * bulk-applying one across orgs would silently misapply. So those three stay
 * gated to a single-org selection; Status/Priority/Visibility (org-agnostic
 * enums) and Assignee (global user id, scoped to users already seen on a
 * task in one of the selected orgs) stay available regardless.
 */
export function BoardBulkActionBar({ tasks }: BoardBulkActionBarProps) {
	const { setTasks, categories, releases, labels } = useLanderData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { runWithToast } = useToastAction();
	const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
	const { selectedSet, selectedCount, selectAll, deselectAll, isAllSelected, isIndeterminate } = useTaskSelection(
		taskIds,
		BOARD_TASK_SELECTION_KEY
	);

	const selectedTasks = useMemo(() => tasks.filter((task) => selectedSet.has(task.id)), [tasks, selectedSet]);
	const selectedOrgIds = useMemo(() => new Set(selectedTasks.map((task) => task.organizationId)), [selectedTasks]);
	const singleOrgId = selectedOrgIds.size === 1 ? [...selectedOrgIds][0] : undefined;

	const availableUsers = useMemo(() => {
		const users = new Map<string, schema.UserSummary>();
		for (const task of tasks) {
			if (!selectedOrgIds.has(task.organizationId)) continue;
			for (const user of task.assignees) users.set(user.id, user);
		}
		return Array.from(users.values());
	}, [tasks, selectedOrgIds]);

	const availableCategories = useMemo(
		() => (singleOrgId ? categories.filter((category) => category.organizationId === singleOrgId) : []),
		[categories, singleOrgId]
	);
	const availableReleases = useMemo(
		() => (singleOrgId ? releases.filter((release) => release.organizationId === singleOrgId) : []),
		[releases, singleOrgId]
	);
	const availableLabels = useMemo(
		() => (singleOrgId ? labels.filter((label) => label.organizationId === singleOrgId) : []),
		[labels, singleOrgId]
	);

	/** Optimistic update + one API call per selected task, reconciled from the returned records. Preserves task.organization (updateTaskAction's response doesn't carry the board's cross-org enrichment). */
	const applySingleValueUpdate = useCallback(
		async (
			actionId: string,
			updateData: Parameters<typeof updateTaskAction>[2],
			toastMessages: Parameters<typeof runWithToast>[1]
		) => {
			const orgById = new Map(selectedTasks.map((task) => [task.id, task.organization]));
			setTasks(
				tasks.map((task) =>
					selectedSet.has(task.id) ? ({ ...task, ...updateData } as schema.TaskWithLabels) : task
				)
			);

			await runWithToast(actionId, toastMessages, async () => {
				const results = await Promise.all(
					selectedTasks.map((task) => updateTaskAction(task.organizationId, task.id, updateData, sseClientId))
				);
				const success = results.every((result) => result.success);
				if (success) {
					const updatedById = new Map(results.map((result) => [result.data.id, result.data]));
					setTasks(
						tasks.map((task) => {
							const updated = updatedById.get(task.id);
							if (!updated) return task;
							return updated.organization ? updated : { ...updated, organization: orgById.get(task.id) };
						})
					);
				}
				return { success };
			});
			deselectAll();
		},
		[selectedTasks, selectedSet, tasks, setTasks, runWithToast, sseClientId, deselectAll]
	);

	/** Same shape as the single-value path, but each task keeps its own existing ids ± add/remove. */
	const applyMultiValueUpdate = useCallback(
		async (
			actionId: string,
			add: string[],
			remove: string[],
			optimisticField: "assignees" | "labels",
			apiFn: (
				task: schema.TaskWithLabels,
				nextIds: string[]
			) => Promise<{ success: boolean; data: schema.TaskWithLabels }>,
			resolveNext: (nextIds: string[]) => (schema.UserSummary | schema.labelType)[],
			toastMessages: Parameters<typeof runWithToast>[1]
		) => {
			const orgById = new Map(selectedTasks.map((task) => [task.id, task.organization]));
			const nextIdsByTask = new Map(
				selectedTasks.map((task) => {
					const currentIds = (task[optimisticField] as { id: string }[]).map((item) => item.id);
					const next = Array.from(new Set([...currentIds.filter((id) => !remove.includes(id)), ...add]));
					return [task.id, next];
				})
			);

			setTasks(
				tasks.map((task) => {
					const nextIds = nextIdsByTask.get(task.id);
					if (!nextIds) return task;
					return { ...task, [optimisticField]: resolveNext(nextIds) };
				})
			);

			await runWithToast(actionId, toastMessages, async () => {
				const results = await Promise.all(
					selectedTasks.map((task) => apiFn(task, nextIdsByTask.get(task.id) ?? []))
				);
				const success = results.every((result) => result.success);
				if (success) {
					const updatedById = new Map(results.map((result) => [result.data.id, result.data]));
					setTasks(
						tasks.map((task) => {
							const updated = updatedById.get(task.id);
							if (!updated) return task;
							return updated.organization ? updated : { ...updated, organization: orgById.get(task.id) };
						})
					);
				}
				return { success };
			});
			deselectAll();
		},
		[selectedTasks, tasks, setTasks, runWithToast, deselectAll]
	);

	const openBulkActionsMenu = () => {
		commandActions.setInitialView(BULK_ACTIONS_VIEW_ID, `${selectedCount} selected`);
		commandActions.open();
	};

	// Clears the drill target once selection is gone, so a later, unrelated
	// Cmd+K open doesn't land on a now-commandless bulk-actions view. Guarded
	// by viewId so this never clobbers some other context's initialView.
	useEffect(() => {
		if (selectedCount === 0 && commandStore.state.initialView?.viewId === BULK_ACTIONS_VIEW_ID) {
			commandActions.clearInitialView();
		}
	}, [selectedCount]);

	const commands: CommandMap = useMemo(() => {
		if (selectedCount === 0) return {} as CommandMap;

		const successMessage = { title: `Updated ${selectedCount} task${selectedCount === 1 ? "" : "s"}` };

		const statusItems = (Object.keys(STATUS_CONFIG) as StatusValue[]).map((status) => ({
			id: `board-bulk-status-${status}`,
			label: STATUS_CONFIG[status].label,
			icon: STATUS_CONFIG[status].icon("size-4 opacity-60"),
			action: () =>
				applySingleValueUpdate(
					"bulk-update-status",
					{ status },
					{
						loading: { title: "Updating status..." },
						success: successMessage,
						error: { title: "Failed to update status" },
					}
				),
		}));

		const priorityItems = (Object.keys(PRIORITY_CONFIG) as PriorityValue[]).map((priority) => ({
			id: `board-bulk-priority-${priority}`,
			label: PRIORITY_CONFIG[priority].label,
			icon: PRIORITY_CONFIG[priority].icon("size-4 opacity-60"),
			action: () =>
				applySingleValueUpdate(
					"bulk-update-priority",
					{ priority },
					{
						loading: { title: "Updating priority..." },
						success: successMessage,
						error: { title: "Failed to update priority" },
					}
				),
		}));

		const visibilityItems = (Object.keys(VISIBILITY_CONFIG) as VisibilityValue[]).map((visible) => ({
			id: `board-bulk-visibility-${visible}`,
			label: VISIBILITY_CONFIG[visible].label,
			icon: VISIBILITY_CONFIG[visible].icon("size-4 opacity-60"),
			action: () =>
				applySingleValueUpdate(
					"bulk-update-visibility",
					{ visible },
					{
						loading: { title: "Updating visibility..." },
						success: successMessage,
						error: { title: "Failed to update visibility" },
					}
				),
		}));

		const assigneeItems = availableUsers.map((user) => {
			const state = computeTriState(selectedTasks, (task) => task.assignees.some((a) => a.id === user.id));
			return {
				id: `board-bulk-assignee-${user.id}`,
				label: user.name ?? "Unknown user",
				icon: <IconUser className="size-4 opacity-60" />,
				metadata: state === "all" ? "Assigned" : state === "some" ? "Some" : undefined,
				closeOnSelect: false,
				action: () =>
					applyMultiValueUpdate(
						"bulk-update-assignees",
						state === "all" ? [] : [user.id],
						state === "all" ? [user.id] : [],
						"assignees",
						(task, nextIds) => updateAssigneesToTaskAction(task.organizationId, task.id, nextIds, sseClientId),
						(nextIds) => availableUsers.filter((u) => nextIds.includes(u.id)),
						{
							loading: { title: "Updating assignees..." },
							success: successMessage,
							error: { title: "Failed to update assignees" },
						}
					),
			};
		});

		const labelItems = availableLabels.map((label) => {
			const state = computeTriState(selectedTasks, (task) => task.labels.some((l) => l.id === label.id));
			return {
				id: `board-bulk-label-${label.id}`,
				label: label.name,
				icon: (
					<span
						className="size-2.5 rounded-full inline-block"
						style={{ backgroundColor: label.color ?? "#9CA3AF" }}
					/>
				),
				metadata: state === "all" ? "Applied" : state === "some" ? "Some" : undefined,
				closeOnSelect: false,
				action: () =>
					applyMultiValueUpdate(
						"bulk-update-labels",
						state === "all" ? [] : [label.id],
						state === "all" ? [label.id] : [],
						"labels",
						(task, nextIds) => updateLabelToTaskAction(task.organizationId, task.id, nextIds, sseClientId),
						(nextIds) => availableLabels.filter((l) => nextIds.includes(l.id)),
						{
							loading: { title: "Updating labels..." },
							success: successMessage,
							error: { title: "Failed to update labels" },
						}
					),
			};
		});

		const categoryItems = [
			{
				id: "board-bulk-category-none",
				label: "No category",
				icon: <IconCategory className="size-4 opacity-60" />,
				action: () =>
					applySingleValueUpdate(
						"bulk-update-category",
						{ category: null },
						{
							loading: { title: "Removing category..." },
							success: successMessage,
							error: { title: "Failed to update category" },
						}
					),
			},
			...availableCategories.map((category) => ({
				id: `board-bulk-category-${category.id}`,
				label: category.name,
				icon: (
					<span
						className="size-2.5 rounded-full inline-block"
						style={{ backgroundColor: category.color ?? "#9CA3AF" }}
					/>
				),
				action: () =>
					applySingleValueUpdate(
						"bulk-update-category",
						{ category: category.id },
						{
							loading: { title: "Updating category..." },
							success: successMessage,
							error: { title: "Failed to update category" },
						}
					),
			})),
		];

		const releaseItems = [
			{
				id: "board-bulk-release-none",
				label: "No release",
				icon: <IconRocket className="size-4 opacity-60" />,
				action: () =>
					applySingleValueUpdate(
						"bulk-update-release",
						{ releaseId: null },
						{
							loading: { title: "Removing release..." },
							success: successMessage,
							error: { title: "Failed to update release" },
						}
					),
			},
			...availableReleases.map((release) => ({
				id: `board-bulk-release-${release.id}`,
				label: release.name,
				icon: <IconRocket className="size-4 opacity-60" style={{ color: release.color ?? undefined }} />,
				action: () =>
					applySingleValueUpdate(
						"bulk-update-release",
						{ releaseId: release.id },
						{
							loading: { title: "Updating release..." },
							success: successMessage,
							error: { title: "Failed to update release" },
						}
					),
			})),
		];

		return {
			root: [
				{
					heading: "Selection",
					priority: 5,
					items: [
						{
							id: "board-bulk-open-menu",
							label: `Bulk edit ${selectedCount} selected task${selectedCount === 1 ? "" : "s"}`,
							icon: <IconDots className="size-4 opacity-60" />,
							subId: BULK_ACTIONS_VIEW_ID,
							keywords: "bulk multi select edit",
						},
					],
				},
			],
			[BULK_ACTIONS_VIEW_ID]: [
				{
					heading: "Bulk actions",
					priority: 5,
					items: [
						{
							id: "board-bulk-status-menu",
							label: "Change status to...",
							icon: <IconListCheck className="size-4 opacity-60" />,
							subId: "board-bulk-status",
						},
						{
							id: "board-bulk-priority-menu",
							label: "Change priority to...",
							icon: <IconFlag className="size-4 opacity-60" />,
							subId: "board-bulk-priority",
						},
						{
							id: "board-bulk-visibility-menu",
							label: "Change visibility to...",
							icon: VISIBILITY_CONFIG.public.icon("size-4 opacity-60"),
							subId: "board-bulk-visibility",
						},
						{
							id: "board-bulk-assignee-menu",
							label: "Change assignee...",
							icon: <IconUser className="size-4 opacity-60" />,
							subId: "board-bulk-assignee",
							show: availableUsers.length > 0,
						},
						{
							id: "board-bulk-label-menu",
							label: "Change label...",
							icon: <IconTag className="size-4 opacity-60" />,
							subId: "board-bulk-label",
							show: availableLabels.length > 0,
						},
						{
							id: "board-bulk-category-menu",
							label: "Change category...",
							icon: <IconCategory className="size-4 opacity-60" />,
							subId: "board-bulk-category",
							show: !!singleOrgId && availableCategories.length > 0,
						},
						{
							id: "board-bulk-release-menu",
							label: "Change release...",
							icon: <IconRocket className="size-4 opacity-60" />,
							subId: "board-bulk-release",
							show: !!singleOrgId && availableReleases.length > 0,
						},
						{
							id: "board-bulk-deselect",
							label: "Deselect all",
							icon: <IconX className="size-4 opacity-60" />,
							action: deselectAll,
						},
					],
				},
			],
			"board-bulk-status": [{ heading: "Set status", priority: 5, items: statusItems }],
			"board-bulk-priority": [{ heading: "Set priority", priority: 5, items: priorityItems }],
			"board-bulk-visibility": [{ heading: "Set visibility", priority: 5, items: visibilityItems }],
			"board-bulk-assignee": [{ heading: "Toggle assignee", priority: 5, items: assigneeItems }],
			"board-bulk-label": [{ heading: "Toggle label", priority: 5, items: labelItems }],
			"board-bulk-category": [{ heading: "Set category", priority: 5, items: categoryItems }],
			"board-bulk-release": [{ heading: "Set release", priority: 5, items: releaseItems }],
		};
	}, [
		selectedCount,
		selectedTasks,
		availableUsers,
		availableLabels,
		availableCategories,
		availableReleases,
		singleOrgId,
		sseClientId,
		deselectAll,
		applySingleValueUpdate,
		applyMultiValueUpdate,
	]);

	useRegisterCommands("board-bulk-commands", selectedCount > 0 ? commands : null);

	return (
		<AnimatePresence>
			{selectedCount > 0 && (
				<motion.div
					initial={{ y: 80, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 80, opacity: 0 }}
					transition={{ type: "spring", damping: 25, stiffness: 300 }}
					className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg px-2 py-1.5"
				>
					<div className="flex items-center gap-2 px-2">
						<TriStateCheckbox
							state={isAllSelected ? "all" : isIndeterminate ? "some" : "none"}
							onClick={() => (isAllSelected ? deselectAll() : selectAll(taskIds))}
							aria-label="Select all tasks"
						/>
						<button
							type="button"
							className="text-xs font-medium whitespace-nowrap hover:underline cursor-pointer"
							onClick={() => (isAllSelected ? deselectAll() : selectAll(taskIds))}
						>
							{selectedCount} selected
						</button>
					</div>

					<Separator orientation="vertical" className="h-5" />

					<StatusBulkPicker
						selectedTasks={selectedTasks}
						onSelect={(status) =>
							applySingleValueUpdate(
								"bulk-update-status",
								{ status },
								{
									loading: { title: "Updating status..." },
									success: { title: `Updated ${selectedCount} tasks` },
									error: { title: "Failed to update status" },
								}
							)
						}
					/>
					{singleOrgId && availableLabels.length > 0 && (
						<LabelBulkPicker
							availableLabels={availableLabels}
							selectedTasks={selectedTasks}
							onSelect={({ add, remove }) =>
								applyMultiValueUpdate(
									"bulk-update-labels",
									add,
									remove,
									"labels",
									(task, nextIds) =>
										updateLabelToTaskAction(task.organizationId, task.id, nextIds, sseClientId),
									(nextIds) => availableLabels.filter((label) => nextIds.includes(label.id)),
									{
										loading: { title: "Updating labels..." },
										success: { title: `Updated ${selectedCount} tasks` },
										error: { title: "Failed to update labels" },
									}
								)
							}
						/>
					)}

					<Separator orientation="vertical" className="h-5" />

					<Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2" onClick={openBulkActionsMenu}>
						<IconDots className="h-3.5 w-3.5" />
						<span>More</span>
					</Button>

					<Separator orientation="vertical" className="h-5" />

					<Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={deselectAll}>
						<IconX className="h-3.5 w-3.5" />
					</Button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

function StatusBulkPicker({
	selectedTasks,
	onSelect,
}: {
	selectedTasks: schema.TaskWithLabels[];
	onSelect: (status: StatusValue) => void;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2">
						{STATUS_CONFIG.todo.icon("h-3.5 w-3.5")}
						<span>Status</span>
					</Button>
				}
			/>
			<PopoverContent className="w-44 p-1" side="top" align="center">
				<div className="flex flex-col">
					<p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Set Status</p>
					{(Object.keys(STATUS_CONFIG) as StatusValue[]).map((status) => {
						const state = computeTriState(selectedTasks, (task) => task.status === status);
						return (
							<button
								key={status}
								type="button"
								className={cn(
									"flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors cursor-pointer",
									state === "all" && "opacity-50 cursor-default"
								)}
								onClick={() => {
									if (state === "all") return;
									onSelect(status);
									setOpen(false);
								}}
							>
								{STATUS_CONFIG[status].icon("h-3.5 w-3.5")}
								<span>{STATUS_CONFIG[status].label}</span>
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function LabelBulkPicker({
	availableLabels,
	selectedTasks,
	onSelect,
}: {
	availableLabels: schema.labelType[];
	selectedTasks: schema.TaskWithLabels[];
	onSelect: (value: { add: string[]; remove: string[] }) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

	const initialStates = useMemo(() => {
		const map = new Map<string, TriState>();
		for (const label of availableLabels) {
			map.set(
				label.id,
				computeTriState(selectedTasks, (task) => task.labels.some((l) => l.id === label.id))
			);
		}
		return map;
	}, [availableLabels, selectedTasks]);

	const filteredLabels = availableLabels.filter((label) => label.name.toLowerCase().includes(search.toLowerCase()));

	const getEffectiveState = (labelId: string): TriState => {
		const override = overrides.get(labelId);
		if (override === true) return "all";
		if (override === false) return "none";
		return initialStates.get(labelId) ?? "none";
	};

	const handleToggle = (labelId: string) => {
		const current = getEffectiveState(labelId);
		const next = new Map(overrides);
		next.set(labelId, current !== "all");
		setOverrides(next);
	};

	const hasChanges = useMemo(() => {
		for (const [labelId, wantLabel] of overrides) {
			const initial = initialStates.get(labelId) ?? "none";
			if (wantLabel && initial !== "all") return true;
			if (!wantLabel && initial !== "none") return true;
		}
		return false;
	}, [overrides, initialStates]);

	const handleApply = () => {
		const add: string[] = [];
		const remove: string[] = [];
		for (const [labelId, wantLabel] of overrides) {
			const initial = initialStates.get(labelId) ?? "none";
			if (wantLabel && initial !== "all") add.push(labelId);
			else if (!wantLabel && initial !== "none") remove.push(labelId);
		}
		if (add.length > 0 || remove.length > 0) onSelect({ add, remove });
		setOpen(false);
		setOverrides(new Map());
		setSearch("");
	};

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) {
					setOverrides(new Map());
					setSearch("");
				}
			}}
		>
			<PopoverTrigger
				render={
					<Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2">
						<IconTag className="h-3.5 w-3.5" />
						<span>Labels</span>
					</Button>
				}
			/>
			<PopoverContent className="w-52 p-0" side="top" align="center">
				<div className="flex flex-col">
					<div className="p-2 border-b">
						<Input
							variant="ghost"
							className="h-7 text-xs"
							placeholder="Search labels..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<div className="max-h-48 overflow-y-auto p-1">
						{filteredLabels.length > 0 ? (
							filteredLabels.map((label) => (
								<button
									key={label.id}
									type="button"
									className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors w-full cursor-pointer"
									onClick={() => handleToggle(label.id)}
								>
									<TriStateCheckbox state={getEffectiveState(label.id)} className="pointer-events-none" />
									<span
										className="size-2 rounded-full shrink-0"
										style={{ backgroundColor: label.color ?? "#9CA3AF" }}
									/>
									<span className="text-sm truncate">{label.name}</span>
								</button>
							))
						) : (
							<p className="text-xs text-muted-foreground px-2 py-3 text-center">No labels found</p>
						)}
					</div>
					{hasChanges && (
						<div className="border-t p-1.5">
							<Button size="sm" className="w-full h-7 text-xs" onClick={handleApply}>
								Apply changes
							</Button>
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
