import { MouseSensor, TouchSensor, type UniqueIdentifier, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type React from "react";
import { useRef } from "react";

// Drag-to-reorder for the primary sidebar's lists (Favourites, Organizations). The whole row is the drag
// target, with no handle: a distance-based MouseSensor only starts a drag past 8px of movement, so a plain
// click still navigates. TouchSensor uses a press-and-hold instead, since touch scrolling already uses
// movement (the same two-sensor split grid-board.tsx uses).

const DRAG_DISTANCE = 8;

export function useSidebarSortSensors() {
	return useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: DRAG_DISTANCE } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
	);
}

/**
 * Swallows the click a drag leaves behind on a row's link. dnd-kit's own click suppression after a real drag
 * didn't reliably reach a TanStack Router `<Link>` nested this deep, so the row tracks the same distance itself:
 * pointerdown records where the gesture started (capture phase, before dnd-kit's listeners), and click (also
 * capture phase, so it never reaches the Link's onClick) is cancelled if the pointer moved past the drag
 * distance. Plain refs, not state: both fire within the same native gesture.
 */
export function useDragClickSuppression() {
	const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
	return {
		onPointerDownCapture: (event: React.PointerEvent) => {
			pointerDownPos.current = { x: event.clientX, y: event.clientY };
		},
		onClickCapture: (event: React.MouseEvent) => {
			const start = pointerDownPos.current;
			pointerDownPos.current = null;
			if (!start) return;
			const moved =
				Math.abs(event.clientX - start.x) > DRAG_DISTANCE || Math.abs(event.clientY - start.y) > DRAG_DISTANCE;
			if (moved) {
				event.preventDefault();
				event.stopPropagation();
			}
		},
	};
}

/** The ids reordered by a drop of `activeId` onto `overId`, or null when the drop changes nothing. */
export function reorderIds(
	ids: readonly string[],
	activeId: UniqueIdentifier,
	overId: UniqueIdentifier | undefined
): string[] | null {
	if (overId === undefined || activeId === overId) return null;
	const oldIndex = ids.indexOf(String(activeId));
	const newIndex = ids.indexOf(String(overId));
	if (oldIndex === -1 || newIndex === -1) return null;
	return arrayMove([...ids], oldIndex, newIndex);
}
