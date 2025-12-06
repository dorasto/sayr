import { Store } from "@tanstack/react-store";

export interface NavigationState {
	lastDashboardRoute: string;
}

export const navigationStore = new Store<NavigationState>({
	lastDashboardRoute: "/admin",
});

export const navigationActions = {
	setLastDashboardRoute: (route: string) => {
		navigationStore.setState((state) => ({
			...state,
			lastDashboardRoute: route,
		}));
	},
};
