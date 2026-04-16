import { Store } from "@tanstack/react-store";
import type { OrgTaskSearchResult } from "@/lib/fetches/searchTasks";
import type { CommandMap } from "@/types/command";

export interface TaskAssignmentContext {
	/** The sub-view ID that triggers assignment mode */
	viewId: string;
	/** Org to search tasks within */
	orgId: string;
	/** IDs of tasks currently assigned to the release */
	assignedTaskIds: string[];
	onAssign: (task: OrgTaskSearchResult) => Promise<void>;
	onRemove: (taskId: string) => Promise<void>;
}

export interface CommandStoreState {
	open: boolean;
	registrations: Record<string, CommandMap>;
	createTaskDialog: {
		open: boolean;
		orgId?: string;
	};
	/** When set, the command palette opens pre-drilled into this view */
	initialView: {
		viewId: string;
		label: string;
	} | null;
	/** When set, the active sub-view operates in task-assignment mode */
	taskAssignmentContext: TaskAssignmentContext | null;
}

export const commandStore = new Store<CommandStoreState>({
	open: false,
	registrations: {},
	createTaskDialog: {
		open: false,
	},
	initialView: null,
	taskAssignmentContext: null,
});

export const commandActions = {
	open: () => {
		commandStore.setState((state) => ({ ...state, open: true }));
	},

	close: () => {
		commandStore.setState((state) => ({ ...state, open: false }));
	},

	toggle: () => {
		commandStore.setState((state) => ({ ...state, open: !state.open }));
	},

	setOpen: (open: boolean) => {
		commandStore.setState((state) => ({ ...state, open }));
	},

	registerCommands: (sourceId: string, commands: CommandMap) => {
		commandStore.setState((state) => ({
			...state,
			registrations: {
				...state.registrations,
				[sourceId]: commands,
			},
		}));
	},

	unregisterCommands: (sourceId: string) => {
		commandStore.setState((state) => {
			const { [sourceId]: _, ...rest } = state.registrations;
			return { ...state, registrations: rest };
		});
	},

	openCreateTaskDialog: (orgId?: string) => {
		commandStore.setState((state) => ({
			...state,
			createTaskDialog: { open: true, orgId },
		}));
	},

	closeCreateTaskDialog: () => {
		commandStore.setState((state) => ({
			...state,
			createTaskDialog: { open: false, orgId: undefined },
		}));
	},

	setInitialView: (viewId: string, label: string) => {
		commandStore.setState((state) => ({
			...state,
			initialView: { viewId, label },
		}));
	},

	clearInitialView: () => {
		commandStore.setState((state) => ({
			...state,
			initialView: null,
		}));
	},

	setTaskAssignmentContext: (ctx: TaskAssignmentContext) => {
		commandStore.setState((state) => ({
			...state,
			taskAssignmentContext: ctx,
		}));
	},

	clearTaskAssignmentContext: () => {
		commandStore.setState((state) => ({
			...state,
			taskAssignmentContext: null,
		}));
	},
};
