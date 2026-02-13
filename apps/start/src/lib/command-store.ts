import { Store } from "@tanstack/react-store";
import type { CommandMap } from "@/types/command";

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
}

export const commandStore = new Store<CommandStoreState>({
	open: false,
	registrations: {},
	createTaskDialog: {
		open: false,
	},
	initialView: null,
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
};
