import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";
import { initTheme, themeStore, updateTheme } from "../lib/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		initTheme();
	}, []);

	return <>{children}</>;
}

export const useTheme = () => {
	const { theme } = useStore(themeStore);
	return {
		theme,
		setTheme: updateTheme,
	};
};
