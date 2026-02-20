import { Store } from "@tanstack/react-store";
import type { PanelRegistration } from "@/types/panel";

export interface PanelStoreState {
	registrations: Record<string, PanelRegistration>;
}

export const panelStore = new Store<PanelStoreState>({
	registrations: {},
});

export const panelActions = {
	registerPanel: (sourceId: string, registration: PanelRegistration) => {
		panelStore.setState((state) => ({
			...state,
			registrations: {
				...state.registrations,
				[sourceId]: registration,
			},
		}));
	},

	unregisterPanel: (sourceId: string) => {
		panelStore.setState((state) => {
			const { [sourceId]: _, ...rest } = state.registrations;
			return { ...state, registrations: rest };
		});
	},
};
