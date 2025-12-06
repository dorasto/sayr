import { Store } from "@tanstack/store";

export type Theme = "dark" | "light" | "system";

const storageKey = "site-theme";
const defaultTheme: Theme = "dark";

export const themeStore = new Store<{ theme: Theme }>({
	theme: defaultTheme,
});

export const updateTheme = (theme: Theme) => {
	themeStore.setState((state) => {
		return {
			...state,
			theme,
		};
	});
	if (typeof window !== "undefined" && window.localStorage) {
		localStorage.setItem(storageKey, theme);
		const root = window.document.documentElement;
		root.classList.remove("light", "dark");

		if (theme === "system") {
			const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
			root.classList.add(systemTheme);
		} else {
			root.classList.add(theme);
		}
	}
};

export const initTheme = () => {
	if (typeof window !== "undefined" && window.localStorage) {
		const theme = (localStorage.getItem(storageKey) as Theme) || defaultTheme;
		updateTheme(theme);
	}
};
