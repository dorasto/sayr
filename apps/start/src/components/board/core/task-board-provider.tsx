// The ONLY file under components/board that imports the older org-scoped task system
// (`components/tasks/actions/use-task-field-action`, the shared optimistic-update + API-call
// hook). That import is a deliberate exception to the board's "no components/tasks/**"
// boundary (see .agents/skills/board/SKILL.md): re-forking the update hook would duplicate
// the single place task field-update side effects live. Every signed-in page that shows
// tasks on the board (/home through core/admin-board-provider.tsx, and later the org tasks
// and release pages) mounts this provider with its own task store, so the exception stays
// confined to one file.
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";
import { replaceTask } from "@/lib/board/apply-lander-event";
import { useTaskFieldAction } from "../../tasks/actions/use-task-field-action";
import type { BoardGroupingDefinition } from "../config/grouping-registry";
import type { SavedViewsSource } from "../saved-views/saved-views-source";
import type { BoardViewDefinition } from "../views/view-registry-model";
import { type BoardDataSource, type BoardOrganizationScope, BoardProvider } from "./board-data";
import type { BoardItemActions } from "./board-item-actions";
import type { BoardCapabilities } from "./capabilities";
import type { BoardRenderers } from "./renderers";
import type { BoardScope } from "./scope-config";

type Task = schema.TaskWithLabels;

/**
 * Race-free write to the host's task list: the updater receives the LATEST list (never one captured
 * from a render); return `prev` unchanged to skip the write.
 */
export type TaskListUpdater = (updater: (prev: Task[]) => Task[]) => void;

interface TaskBoardStore {
	tasks: Task[];
	updateTasks: TaskListUpdater;
}

// Private to this file: what the module-level item-actions hook below reads, so it can stay one
// stable function for every provider instance.
const TaskBoardStoreContext = createContext<TaskBoardStore | undefined>(undefined);

/**
 * Field-edit actions for one board item, backed by the host's task store. Module-level on
 * purpose: `BoardDataSource.useItemActions` must have a stable identity, because the board
 * calls it as a hook.
 */
function useTaskItemActions(task: Task): BoardItemActions {
	const store = useContext(TaskBoardStoreContext);
	if (store === undefined) {
		throw new Error("useTaskItemActions must be used within a TaskBoardProvider");
	}
	const { tasks, updateTasks } = store;
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const taskId = task.id;

	// useTaskFieldAction reports every edit as "the whole list, with this one task
	// swapped", built from the list this row last rendered. Writing that list back
	// would undo anything an SSE event changed since that render — so pick out the
	// one task this hook owns and apply just that, as an update of the LATEST store
	// value. replaceTask also reattaches the row's `.organization` badge, which the
	// generic update endpoint's response doesn't carry (the loaders and SSE hooks
	// attach it themselves); a task's org never changes from a field edit.
	const applyUpdatedTask = useCallback(
		(updated: Task[]) => {
			const next = updated.find((candidate) => candidate.id === taskId);
			if (next) updateTasks((prev) => replaceTask(prev, next));
		},
		[updateTasks, taskId]
	);

	return useTaskFieldAction(task, tasks, () => undefined, applyUpdatedTask, sseClientId);
}

export interface TaskBoardProviderProps {
	/** The host's live task list. */
	tasks: Task[];
	/** Writes to the host's task list (see TaskListUpdater) — the board's local edits go through it. */
	updateTasks: TaskListUpdater;
	labels: readonly schema.labelType[];
	categories: readonly schema.categoryType[];
	releases: readonly schema.releaseType[];
	/** Every person the pickers/filters may offer; absent = derived from `tasks`. */
	users?: readonly schema.UserSummary[];
	/** The viewer's permissions per org id, for per-field gating; absent = no gating (see BoardDataSource). */
	permissions?: Readonly<Record<string, schema.TeamPermissions>>;
	/** The signed-in user's id (creators/assignees may always edit their own tasks). */
	viewerId?: string;
	/** Set on a single-org board (see BoardDataSource.organizationScope). */
	organizationScope?: BoardOrganizationScope;
	capabilities: BoardCapabilities;
	/** View-state scope; absent = the legacy /home scope. Keep it stable. */
	scope?: BoardScope;
	views?: readonly BoardViewDefinition[];
	groupings?: readonly BoardGroupingDefinition[];
	renderers?: BoardRenderers;
	/** Saved views offered; absent = personal views. Memoise it. */
	savedViews?: SavedViewsSource;
	children: ReactNode;
}

/**
 * Mounts a board over a signed-in page's own task store: builds the `BoardDataSource`
 * (items, catalog, `updateItems`, per-item field actions through `useTaskFieldAction`)
 * and passes the rest straight to `BoardProvider`. Pass stable arrays/objects — every prop
 * feeds a memoised context value.
 */
export function TaskBoardProvider({
	tasks,
	updateTasks,
	labels,
	categories,
	releases,
	users,
	permissions,
	viewerId,
	organizationScope,
	capabilities,
	scope,
	views,
	groupings,
	renderers,
	savedViews,
	children,
}: TaskBoardProviderProps) {
	// The host's updater skips the write when it gets back the SAME array it gave out,
	// so only copy (readonly -> mutable) when the board's updater produced something new.
	const updateItems = useCallback<NonNullable<BoardDataSource["updateItems"]>>(
		(updater) =>
			updateTasks((prev) => {
				const next = updater(prev);
				return next === prev ? prev : [...next];
			}),
		[updateTasks]
	);

	const store = useMemo<TaskBoardStore>(() => ({ tasks, updateTasks }), [tasks, updateTasks]);

	const data = useMemo<BoardDataSource>(
		() => ({
			items: tasks,
			labels,
			categories,
			releases,
			users,
			updateItems,
			useItemActions: useTaskItemActions,
			organizationScope,
			permissions,
			viewerId,
		}),
		[tasks, labels, categories, releases, users, updateItems, organizationScope, permissions, viewerId]
	);

	return (
		<TaskBoardStoreContext.Provider value={store}>
			<BoardProvider
				data={data}
				capabilities={capabilities}
				scope={scope}
				views={views}
				groupings={groupings}
				renderers={renderers}
				savedViews={savedViews}
			>
				{children}
			</BoardProvider>
		</TaskBoardStoreContext.Provider>
	);
}
