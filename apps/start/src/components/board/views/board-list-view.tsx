"use client";

import type { DragEndEvent, DragOverEvent, DragStartEvent, Over } from "@dnd-kit/core";
import {
	closestCenter,
	DndContext,
	DragOverlay,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import { type PropsWithChildren, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLanderData } from "@/contexts/ContextLander";
import { applyNestedGrouping, type BoardTaskGroup } from "../config/groupings";
import { useBoardViewState } from "../filter/use-board-view-state";
import { type BoardDragMutation, BoardDragMutationExecutor } from "./board-drag-actions";
import { BoardRow } from "./board-row";

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

function SortableBoardRow({ task, containerId }: { task: schema.TaskWithLabels; containerId: string }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `${containerId}:${task.id}`,
		// containerId is needed on drop: dropping onto an existing row (the
		// common case — groups are rarely empty) resolves `over` to that row's
		// own sortable id, not the group's droppable container id, so
		// handleDragEnd can't otherwise tell which group it landed in.
		data: { taskId: task.id, containerId },
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

interface GroupSectionProps {
	group: BoardTaskGroup;
	dropTargetId?: string;
	isSubGroup?: boolean;
	/** Lifted from BoardListView's dragOverride — @dnd-kit only reports one closest "over" target at a time (a row wins over its own section), so a per-section useDroppable().isOver can't tell "is any row within this group currently the target." This can. */
	isDropTarget?: boolean;
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
	children,
}: PropsWithChildren<GroupSectionProps>) {
	const [expanded, setExpanded] = useState(true);
	const count = group.tasks.length;
	// Still needed so @dnd-kit can resolve a drop onto truly empty space
	// within this group (no row under the pointer to carry a containerId) —
	// but isDropTarget (not this hook's own isOver) drives the highlight.
	const { setNodeRef } = useDroppable({ id: dropTargetId ?? `no-drop:${group.id}`, disabled: !dropTargetId });
	const sortableIds = useMemo(
		() => group.tasks.map((task) => `${dropTargetId}:${task.id}`),
		[group.tasks, dropTargetId]
	);

	return (
		<section
			ref={setNodeRef}
			className={cn("rounded-xl transition-shadow", isDropTarget && "ring-2 ring-primary ring-inset")}
		>
			<button
				type="button"
				onClick={() => setExpanded((value) => !value)}
				style={{ top: isSubGroup ? "28px" : 0 }}
				className={cn("sticky w-full overflow-hidden rounded-xl bg-background", isSubGroup ? "z-9" : "z-10")}
			>
				<div
					style={group.color ? { backgroundColor: `${group.color}26` } : undefined}
					className={cn(
						"flex items-center gap-1.5 px-2 py-1.5 text-left transition-[filter,background-color]",
						isDropTarget ? "bg-primary/15" : "hover:brightness-110",
						!isDropTarget && group.toneClassName,
						!isDropTarget && !group.toneClassName && !group.color && (isSubGroup ? "bg-accent" : undefined)
					)}
				>
					<IconChevronDown
						className={cn("size-3.5 text-muted-foreground transition-transform", !expanded && "-rotate-90")}
					/>
					{group.icon}
					<span className="text-xs font-medium">{group.label}</span>
					<Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
						{count}
					</Badge>
				</div>
			</button>
			{expanded && (dropTargetId ? <SortableContext items={sortableIds}>{children}</SortableContext> : children)}
		</section>
	);
}

function resolveDropTarget(over: Over | null, dropTargets: Map<string, DropTarget>): DropTarget | undefined {
	// Dropping directly on a group's empty space resolves `over.id` to the
	// container's own droppable id. Dropping on an existing row (the common
	// case) resolves it to that row's sortable id instead — its `data`
	// carries the containerId it belongs to, so check that first.
	const overContainerId = over?.data.current?.containerId;
	const overId = over?.id?.toString();
	return (
		(typeof overContainerId === "string" ? dropTargets.get(overContainerId) : undefined) ??
		(overId ? dropTargets.get(overId) : undefined)
	);
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

	const baseGroups = useMemo(
		() => applyNestedGrouping(tasks, grouping, subGrouping, options),
		[grouping, options, subGrouping, tasks]
	);

	const groups = useMemo(() => {
		if (!dragOverride) return baseGroups;
		return applyDragOverride(
			baseGroups,
			dragOverride,
			tasks.find((t) => t.id === dragOverride.taskId)
		);
	}, [baseGroups, dragOverride, tasks]);

	// Built from baseGroups (stable, unaffected by the in-progress override)
	// so drop-target ids never shift mid-drag.
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

	const handleDragStart = (event: DragStartEvent) => {
		const taskId = event.active.data.current?.taskId;
		setActiveId(typeof taskId === "string" ? taskId : null);
	};

	const handleDragOver = (event: DragOverEvent) => {
		const target = resolveDropTarget(event.over, dropTargets);
		const taskId = event.active.data.current?.taskId;
		if (!target || typeof taskId !== "string") {
			setDragOverride(null);
			return;
		}
		setDragOverride((prev) =>
			prev?.taskId === taskId && prev.groupId === target.groupId && prev.subGroupId === target.subGroupId
				? prev
				: { taskId, groupId: target.groupId, subGroupId: target.subGroupId }
		);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const target = resolveDropTarget(event.over, dropTargets);
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
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
				onDragCancel={() => {
					setDragOverride(null);
					setActiveId(null);
				}}
			>
				<div>
					{groups.map((group) => {
						if (subGrouping === "none") {
							const dropTargetId = `board-list-drop:${group.id}`;
							return (
								<GroupSection
									key={group.id}
									group={group}
									dropTargetId={dropTargetId}
									isDropTarget={dragOverride?.groupId === group.id && !dragOverride.subGroupId}
								>
									{group.tasks.map((task) => (
										<SortableBoardRow key={task.id} task={task} containerId={dropTargetId} />
									))}
								</GroupSection>
							);
						}

						return (
							<GroupSection key={group.id} group={group}>
								{(group.subGroups ?? []).map((subGroup) => {
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
										>
											{subGroup.tasks.map((task) => (
												<SortableBoardRow key={task.id} task={task} containerId={dropTargetId} />
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
