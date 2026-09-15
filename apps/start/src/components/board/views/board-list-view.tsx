"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import { type PropsWithChildren, useMemo, useState } from "react";
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

function SortableBoardRow({ task, containerId }: { task: schema.TaskWithLabels; containerId: string }) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
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
			className="cursor-grab active:cursor-grabbing"
		>
			<BoardRow task={task} />
		</div>
	);
}

interface GroupSectionProps {
	group: BoardTaskGroup;
	dropTargetId?: string;
	isSubGroup?: boolean;
}

/**
 * Group section — sticky flat header (no card/border wrapper; two layers,
 * see below) plus its rows. The droppable region spans the *whole* section,
 * header included, not just the row area: within a group, @dnd-kit's
 * sortable animation naturally shows other rows making room as you drag, but
 * there's no equivalent live feedback when hovering a *different* group —
 * without this, there was no indication at all that dropping there would do
 * anything. isOver highlighting the whole group (header ring included) is a
 * deliberately louder signal for that case, not just a subtle tint.
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
function GroupSection({ group, dropTargetId, isSubGroup = false, children }: PropsWithChildren<GroupSectionProps>) {
	const [expanded, setExpanded] = useState(true);
	const count = group.tasks.length;
	const { isOver, setNodeRef } = useDroppable({ id: dropTargetId ?? `no-drop:${group.id}`, disabled: !dropTargetId });
	const sortableIds = useMemo(
		() => group.tasks.map((task) => `${dropTargetId}:${task.id}`),
		[group.tasks, dropTargetId]
	);

	return (
		<section
			ref={setNodeRef}
			className={cn("rounded-xl transition-shadow", isOver && "ring-2 ring-primary ring-inset")}
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
						isOver ? "bg-primary/15" : "hover:brightness-110",
						!isOver && group.toneClassName,
						!isOver && !group.toneClassName && !group.color && (isSubGroup ? "bg-accent" : undefined)
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

export function BoardListView({ tasks }: BoardListViewProps) {
	const { categories, releases } = useLanderData();
	const { grouping, subGrouping } = useBoardViewState();
	const [mutation, setMutation] = useState<BoardDragMutation | null>(null);
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
	const options = useMemo(() => ({ categories, releases }), [categories, releases]);
	const groups = useMemo(
		() => applyNestedGrouping(tasks, grouping, subGrouping, options),
		[grouping, options, subGrouping, tasks]
	);
	const dropTargets = useMemo(() => {
		const targets = new Map<string, DropTarget>();
		for (const group of groups) {
			if (subGrouping === "none") {
				targets.set(`board-list-drop:${group.id}`, { groupId: group.id });
				continue;
			}
			for (const subGroup of group.subGroups ?? []) {
				targets.set(`board-list-drop:${group.id}:${subGroup.id}`, { groupId: group.id, subGroupId: subGroup.id });
			}
		}
		return targets;
	}, [groups, subGrouping]);

	const handleDragEnd = (event: DragEndEvent) => {
		// Dropping directly on a group's empty space resolves `over.id` to the
		// container's own droppable id. Dropping on an existing row (the common
		// case) resolves it to that row's sortable id instead — its `data`
		// carries the containerId it belongs to, so check that first.
		const overContainerId = event.over?.data.current?.containerId;
		const overId = event.over?.id?.toString();
		const target =
			(typeof overContainerId === "string" ? dropTargets.get(overContainerId) : undefined) ??
			(overId ? dropTargets.get(overId) : undefined);
		const taskId = event.active.data.current?.taskId;
		const task = typeof taskId === "string" ? tasks.find((item) => item.id === taskId) : undefined;
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
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<div>
					{groups.map((group) => {
						if (subGrouping === "none") {
							const dropTargetId = `board-list-drop:${group.id}`;
							return (
								<GroupSection key={group.id} group={group} dropTargetId={dropTargetId}>
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
										<GroupSection key={subGroup.id} group={subGroup} dropTargetId={dropTargetId} isSubGroup>
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
			</DndContext>
			{mutation && <BoardDragMutationExecutor mutation={mutation} onHandled={() => setMutation(null)} />}
		</>
	);
}
