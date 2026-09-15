"use client";

import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent, Over } from "@dnd-kit/core";
import {
	DndContext,
	DragOverlay,
	getFirstCollision,
	pointerWithin,
	PointerSensor,
	rectIntersection,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanderData } from "@/contexts/ContextLander";
import { applyNestedGrouping, type BoardTaskGroup, buildSubtaskMap, getTopLevelTasks } from "../config/groupings";
import { useBoardViewState } from "../filter/use-board-view-state";
import { type BoardDragMutation, BoardDragMutationExecutor } from "./board-drag-actions";
import { BoardRow } from "./board-row";
import { GroupHeaderContent } from "./group-header";

interface BoardListViewProps {
	tasks: schema.TaskWithLabels[];
}

interface DropTarget {
	groupId: string;
	subGroupId?: string;
}

/** Which task is currently being dragged over which group, for render-time-only display. */
interface DragOverride {
	taskId: string;
	groupId: string;
	subGroupId?: string;
}

/**
 * Moves the dragged task's entry into the hovered group/subgroup, for
 * rendering only — this is what makes sibling rows in the *target* group
 * shift to make room while dragging, the same way @dnd-kit's sortable
 * animation already does within a single group's own SortableContext. The
 * real committed grouping (`tasks` prop) never changes until the drop
 * actually persists via BoardDragMutationExecutor.
 */
function applyDragOverride(
	groups: BoardTaskGroup[],
	override: DragOverride,
	task: schema.TaskWithLabels | undefined
): BoardTaskGroup[] {
	if (!task) return groups;

	const removeTask = (list: BoardTaskGroup[]): BoardTaskGroup[] =>
		list.map((g) => ({
			...g,
			tasks: g.tasks.filter((t) => t.id !== override.taskId),
			subGroups: g.subGroups ? removeTask(g.subGroups) : g.subGroups,
		}));

	const insertTask = (list: BoardTaskGroup[]): BoardTaskGroup[] =>
		list.map((g) => {
			if (override.subGroupId) {
				if (g.id !== override.groupId || !g.subGroups) return g;
				return {
					...g,
					subGroups: g.subGroups.map((sg) =>
						sg.id === override.subGroupId ? { ...sg, tasks: [...sg.tasks, task] } : sg
					),
				};
			}
			if (g.id !== override.groupId) return g;
			return { ...g, tasks: [...g.tasks, task] };
		});

	return insertTask(removeTask(groups));
}

/**
 * Maps every task id to the group/subgroup it belongs to in `groups`
 * (call with baseGroups — the stable, un-overridden grouping — so this
 * doesn't shift mid-drag for tasks other than the one actively being
 * dragged).
 */
function buildTaskGroupTargets(groups: BoardTaskGroup[]): Map<string, DropTarget> {
	const map = new Map<string, DropTarget>();
	for (const group of groups) {
		for (const task of group.tasks) {
			map.set(task.id, { groupId: group.id });
		}
		for (const subGroup of group.subGroups ?? []) {
			for (const task of subGroup.tasks) {
				map.set(task.id, { groupId: group.id, subGroupId: subGroup.id });
			}
		}
	}
	return map;
}

function SortableBoardRow({ task }: { task: schema.TaskWithLabels }) {
	// id is deliberately just the task's own id, not container-prefixed: it
	// must stay stable for the whole drag gesture. Encoding the container into
	// the id (an earlier version of this did `${containerId}:${task.id}`)
	// breaks the moment onDragOver moves the task's render position into a
	// different group — its id would change mid-drag, which @dnd-kit doesn't
	// expect, and caused a genuine infinite render loop (resolved target kept
	// oscillating). Which group a row belongs to is resolved by lookup
	// (buildTaskGroupTargets) instead of being encoded in the id.
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: task.id,
		data: { taskId: task.id },
	});

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			{...attributes}
			{...listeners}
			// Faded, not hidden entirely — the actual moving element is the
			// DragOverlay clone below, decoupled from this row's DOM position so
			// it survives being moved between groups' SortableContexts mid-drag
			// (which unmounts/remounts this node — a plain opacity-0 on it would
			// flicker every time that happens).
			className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-30")}
		>
			<BoardRow task={task} />
		</div>
	);
}

/**
 * A top-level row plus its subtasks (if any), rendered right after it.
 * Subtasks are plain BoardRows, not wrapped in SortableBoardRow — they're
 * never part of the drag/drop system, since their position is tied to
 * their parent, not their own status/priority.
 */
function TaskRowWithSubtasks({ task, subtasks }: { task: schema.TaskWithLabels; subtasks: schema.TaskWithLabels[] }) {
	return (
		<>
			<SortableBoardRow task={task} />
			{subtasks.map((subtask) => (
				<BoardRow key={subtask.id} task={subtask} nested />
			))}
		</>
	);
}

interface GroupSectionProps {
	group: BoardTaskGroup;
	dropTargetId?: string;
	isSubGroup?: boolean;
	/** Lifted from BoardListView's dragOverride — @dnd-kit only reports one closest "over" target at a time (a row wins over its own section), so a per-section useDroppable().isOver can't tell "is any row within this group currently the target." This can. */
	isDropTarget?: boolean;
	/** mt-3 on every section but the first, so stacked groups read as clearly separate — passed in rather than baked in here since "first" is a fact only the list knows. */
	className?: string;
}

/**
 * Group section — sticky flat header (no card/border wrapper; two layers,
 * see below) plus its rows.
 *
 * Header background is two layers: an opaque outer (bg-background) so
 * scrolling rows never show through the sticky header, and an inner tint —
 * either a semantic theme-token class (status/priority, e.g. "bg-primary/5")
 * or a raw hex-alpha tint (category/release, which have no theme-token
 * equivalent) — sitting on top of it. Deliberately not color-mix(): mixing
 * against a fully achromatic background makes the background's hue angle
 * undefined, and browsers resolve that inconsistently (skewed everything
 * red/pink).
 */
function GroupSection({
	group,
	dropTargetId,
	isSubGroup = false,
	isDropTarget = false,
	className,
	children,
}: PropsWithChildren<GroupSectionProps>) {
	const [expanded, setExpanded] = useState(true);
	const count = group.tasks.length;
	// Still needed so @dnd-kit can resolve a drop onto truly empty space
	// within this group (no row under the pointer) — but isDropTarget (not
	// this hook's own isOver) drives the highlight.
	const { setNodeRef } = useDroppable({ id: dropTargetId ?? `no-drop:${group.id}`, disabled: !dropTargetId });
	const sortableIds = useMemo(() => group.tasks.map((task) => task.id), [group.tasks]);

	return (
		<section
			ref={setNodeRef}
			className={cn("rounded-xl transition-shadow", isDropTarget && "ring-2 ring-primary ring-inset", className)}
		>
			<button
				type="button"
				onClick={() => setExpanded((value) => !value)}
				style={{ top: isSubGroup ? "28px" : 0 }}
				className={cn("sticky w-full overflow-hidden rounded-xl bg-background", isSubGroup ? "z-9" : "z-10")}
			>
				<GroupHeaderContent
					label={group.label}
					icon={group.icon}
					count={count}
					toneClassName={group.toneClassName}
					color={group.color}
					isDropTarget={isDropTarget}
					isSubGroup={isSubGroup}
					expanded={expanded}
				/>
			</button>
			{expanded && (dropTargetId ? <SortableContext items={sortableIds}>{children}</SortableContext> : children)}
		</section>
	);
}

function resolveDropTarget(
	over: Over | null,
	dropTargets: Map<string, DropTarget>,
	taskGroupTargets: Map<string, DropTarget>
): DropTarget | undefined {
	const overId = over?.id?.toString();
	if (!overId) return undefined;
	// Empty-space drop: over.id is a group's own droppable id.
	// Row drop (the common case — groups are rarely empty): over.id is the
	// hovered task's own (now container-agnostic) id — look up which group it
	// currently belongs to.
	return dropTargets.get(overId) ?? taskGroupTargets.get(overId);
}

export function BoardListView({ tasks }: BoardListViewProps) {
	const { categories, releases } = useLanderData();
	const { grouping, subGrouping } = useBoardViewState();
	const [mutation, setMutation] = useState<BoardDragMutation | null>(null);
	const [dragOverride, setDragOverride] = useState<DragOverride | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const activeTask = useMemo(() => tasks.find((t) => t.id === activeId), [tasks, activeId]);
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
	const options = useMemo(() => ({ categories, releases }), [categories, releases]);

	// Subtasks (a task whose parent is also in this list) don't get their own
	// top-level group membership — they always render nested under their
	// parent's row instead, wherever the parent lands, regardless of the
	// subtask's own status/priority. See config/groupings.ts.
	const topLevelTasks = useMemo(() => getTopLevelTasks(tasks), [tasks]);
	const subtaskMap = useMemo(() => buildSubtaskMap(tasks), [tasks]);

	const baseGroups = useMemo(
		() => applyNestedGrouping(topLevelTasks, grouping, subGrouping, options),
		[grouping, options, subGrouping, topLevelTasks]
	);

	const groups = useMemo(() => {
		if (!dragOverride) return baseGroups;
		return applyDragOverride(
			baseGroups,
			dragOverride,
			tasks.find((t) => t.id === dragOverride.taskId)
		);
	}, [baseGroups, dragOverride, tasks]);

	// Sticky "last over" target + a one-frame freeze right after a
	// dragOverride-driven reshuffle. Without this, closestCenter alone
	// oscillates: moving a row into a new group's SortableContext changes
	// that group's layout, which changes what's geometrically closest to the
	// pointer, which can flip the resolved target back, re-triggering the
	// same reshuffle — an unbounded render loop ("Maximum update depth
	// exceeded"). This mirrors @dnd-kit's own documented workaround for
	// multi-container sortable lists (their "recentlyMovedToNewContainer"
	// pattern): freeze collision resolution to the last known target for one
	// animation frame after any state-driven layout shift.
	const lastOverIdRef = useRef<string | null>(null);
	const recentlyMovedRef = useRef(false);

	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			recentlyMovedRef.current = false;
		});
		return () => cancelAnimationFrame(frame);
	}, [groups]);

	const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
		if (recentlyMovedRef.current) {
			return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
		}
		const pointerIntersections = pointerWithin(args);
		const intersections = pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);
		const overId = getFirstCollision(intersections, "id");
		if (overId != null) {
			lastOverIdRef.current = overId.toString();
			return [{ id: overId }];
		}
		return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
	}, []);

	// Both built from baseGroups (stable, unaffected by the in-progress
	// override) so target resolution never shifts mid-drag.
	const dropTargets = useMemo(() => {
		const targets = new Map<string, DropTarget>();
		for (const group of baseGroups) {
			if (subGrouping === "none") {
				targets.set(`board-list-drop:${group.id}`, { groupId: group.id });
				continue;
			}
			for (const subGroup of group.subGroups ?? []) {
				targets.set(`board-list-drop:${group.id}:${subGroup.id}`, { groupId: group.id, subGroupId: subGroup.id });
			}
		}
		return targets;
	}, [baseGroups, subGrouping]);
	const taskGroupTargets = useMemo(() => buildTaskGroupTargets(baseGroups), [baseGroups]);

	const handleDragStart = (event: DragStartEvent) => {
		const taskId = event.active.data.current?.taskId;
		setActiveId(typeof taskId === "string" ? taskId : null);
		lastOverIdRef.current = null;
		recentlyMovedRef.current = false;
	};

	const handleDragOver = (event: DragOverEvent) => {
		const target = resolveDropTarget(event.over, dropTargets, taskGroupTargets);
		const taskId = event.active.data.current?.taskId;
		if (!target || typeof taskId !== "string") {
			setDragOverride(null);
			return;
		}
		setDragOverride((prev) => {
			if (prev?.taskId === taskId && prev.groupId === target.groupId && prev.subGroupId === target.subGroupId) {
				return prev;
			}
			// The reshuffle this triggers changes layout out from under the
			// collision-detection strategy — freeze it on the target we just
			// resolved until the next animation frame, instead of letting it
			// immediately recompute against the mid-shuffle DOM.
			recentlyMovedRef.current = true;
			return { taskId, groupId: target.groupId, subGroupId: target.subGroupId };
		});
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const target = resolveDropTarget(event.over, dropTargets, taskGroupTargets);
		const taskId = event.active.data.current?.taskId;
		const task = typeof taskId === "string" ? tasks.find((item) => item.id === taskId) : undefined;
		setDragOverride(null);
		setActiveId(null);
		if (!target || !task) return;

		setMutation({
			task,
			grouping,
			groupId: target.groupId,
			subGrouping,
			subGroupId: target.subGroupId,
		});
	};

	return (
		<>
			<DndContext
				sensors={sensors}
				collisionDetection={collisionDetectionStrategy}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
				onDragCancel={() => {
					setDragOverride(null);
					setActiveId(null);
					lastOverIdRef.current = null;
					recentlyMovedRef.current = false;
				}}
			>
				<div>
					{groups.map((group, index) => {
						const spacing = index > 0 ? "mt-3" : undefined;
						if (subGrouping === "none") {
							const dropTargetId = `board-list-drop:${group.id}`;
							return (
								<GroupSection
									key={group.id}
									group={group}
									dropTargetId={dropTargetId}
									isDropTarget={dragOverride?.groupId === group.id && !dragOverride.subGroupId}
									className={spacing}
								>
									{group.tasks.map((task) => (
										<TaskRowWithSubtasks key={task.id} task={task} subtasks={subtaskMap.get(task.id) ?? []} />
									))}
								</GroupSection>
							);
						}

						return (
							<GroupSection key={group.id} group={group} className={spacing}>
								{(group.subGroups ?? []).map((subGroup, subIndex) => {
									const dropTargetId = `board-list-drop:${group.id}:${subGroup.id}`;
									return (
										<GroupSection
											key={subGroup.id}
											group={subGroup}
											dropTargetId={dropTargetId}
											isSubGroup
											isDropTarget={
												dragOverride?.groupId === group.id && dragOverride.subGroupId === subGroup.id
											}
											className={subIndex > 0 ? "mt-3" : undefined}
										>
											{subGroup.tasks.map((task) => (
												<TaskRowWithSubtasks
													key={task.id}
													task={task}
													subtasks={subtaskMap.get(task.id) ?? []}
												/>
											))}
										</GroupSection>
									);
								})}
							</GroupSection>
						);
					})}
				</div>
				{typeof window !== "undefined" &&
					createPortal(
						<DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
							{activeTask && <BoardRow task={activeTask} />}
						</DragOverlay>,
						document.body
					)}
			</DndContext>
			{mutation && <BoardDragMutationExecutor mutation={mutation} onHandled={() => setMutation(null)} />}
		</>
	);
}
