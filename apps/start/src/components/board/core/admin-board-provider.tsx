// The ONLY file under components/board that touches the signed-in /home page's
// data (`useLanderData`) or the older org-scoped task system
// (`components/tasks/actions/use-task-field-action`, the shared optimistic-update +
// API-call hook). Both are page-specific, so they are confined to this one adapter
// and the rest of the board reads `useBoardData()` / `useBoardItemActions()` instead.
// That import is a deliberate exception to the board's "no components/tasks/**"
// boundary (see .agents/skills/board/SKILL.md): re-forking the update hook would
// duplicate the single place task field-update side effects live.
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { type ReactNode, useCallback, useMemo } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import { replaceTask } from "@/lib/board/apply-lander-event";
import { useTaskFieldAction } from "../../tasks/actions/use-task-field-action";
import { type BoardDataSource, BoardProvider } from "./board-data";
import type { BoardItemActions } from "./board-item-actions";
import { ADMIN_CAPABILITIES } from "./capabilities";

/**
 * Field-edit actions for one board item, backed by the lander store. Module-level on
 * purpose: `BoardDataSource.useItemActions` must have a stable identity, because the
 * board calls it as a hook.
 */
function useAdminItemActions(task: schema.TaskWithLabels): BoardItemActions {
	const { tasks, updateTasks } = useLanderData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const taskId = task.id;

	// useTaskFieldAction reports every edit as "the whole list, with this one task
	// swapped", built from the list this row last rendered. Writing that list back
	// would undo anything an SSE event changed since that render — so pick out the
	// one task this hook owns and apply just that, as an update of the LATEST store
	// value. replaceTask also reattaches the row's cross-org `.organization`,
	// which the generic update endpoint's response doesn't carry (getLanderData
	// and the SSE hook attach it themselves); a task's org never changes from a
	// field edit.
	const applyUpdatedTask = useCallback(
		(updated: schema.TaskWithLabels[]) => {
			const next = updated.find((candidate) => candidate.id === taskId);
			if (next) updateTasks((prev) => replaceTask(prev, next));
		},
		[updateTasks, taskId]
	);

	return useTaskFieldAction(task, tasks, () => undefined, applyUpdatedTask, sseClientId);
}

/** Mounts the board's data source from the /home lander context, with every capability on. */
export function AdminBoardProvider({ children }: { children: ReactNode }) {
	const { tasks, labels, categories, releases, updateTasks } = useLanderData();

	// `updateTasks` skips the write when the updater returns the SAME array it was given,
	// so only copy (readonly -> mutable) when the updater actually produced something new.
	const updateItems = useCallback<NonNullable<BoardDataSource["updateItems"]>>(
		(updater) =>
			updateTasks((prev) => {
				const next = updater(prev);
				return next === prev ? prev : [...next];
			}),
		[updateTasks]
	);

	const data = useMemo<BoardDataSource>(
		() => ({
			items: tasks,
			labels,
			categories,
			releases,
			updateItems,
			useItemActions: useAdminItemActions,
		}),
		[tasks, labels, categories, releases, updateItems]
	);

	return (
		<BoardProvider data={data} capabilities={ADMIN_CAPABILITIES}>
			{children}
		</BoardProvider>
	);
}
