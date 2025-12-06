import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";
import { initTheme, themeStore, updateTheme } from "../lib/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
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
