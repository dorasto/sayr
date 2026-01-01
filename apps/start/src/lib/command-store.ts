import { Store } from "@tanstack/react-store";

export interface CommandStoreState {
	open: boolean;
}

export const commandStore = new Store<CommandStoreState>({
	open: false,
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
};
