"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import { type PropsWithChildren, type ReactNode, useMemo, useState } from "react";
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

interface BoardListDropZoneProps {
	id: string;
	tasks: schema.TaskWithLabels[];
	children: ReactNode;
}

function BoardListDropZone({ id, tasks, children }: BoardListDropZoneProps) {
	const { isOver, setNodeRef } = useDroppable({ id });

	return (
		<div
			ref={setNodeRef}
			className={cn("min-h-10 transition-colors", isOver && "bg-primary/5 ring-1 ring-primary/20 ring-inset")}
		>
			<SortableContext items={tasks.map((task) => `${id}:${task.id}`)}>{children}</SortableContext>
		</div>
	);
}

function SortableBoardRow({ task, containerId }: { task: schema.TaskWithLabels; containerId: string }) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
		id: `${containerId}:${task.id}`,
		data: { taskId: task.id },
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

/** Group section header — sticky, flat (no card/border wrapper), matching the group-header treatment used elsewhere in the app. */
function GroupSection({ group, dropTargetId, isSubGroup = false, children }: PropsWithChildren<GroupSectionProps>) {
	const [expanded, setExpanded] = useState(true);
	const count = group.tasks.length;

	return (
		<section>
			<button
				type="button"
				onClick={() => setExpanded((value) => !value)}
				style={{ top: isSubGroup ? "28px" : 0 }}
				className={cn(
					"sticky z-10 flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-accent/50 transition-colors",
					isSubGroup ? "bg-accent z-9" : "bg-background z-10"
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
			</button>
			{expanded &&
				(dropTargetId ? (
					<BoardListDropZone id={dropTargetId} tasks={group.tasks}>
						{children}
					</BoardListDropZone>
				) : (
					children
				))}
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
		const target = event.over ? dropTargets.get(event.over.id.toString()) : undefined;
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
