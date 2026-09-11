import { IconMoon, IconSun } from "@tabler/icons-react";
import { useTheme } from "@/components/theme-provider";
import { Toggle } from "@/components/ui/toggle";

export function ModeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<Toggle
			aria-label="Change theme"
			variant="outline"
			className="h-6! w-6! border-0 p-0 min-w-0 bg-transparent! hover:bg-accent! transition-all text-muted-foreground! shadow-none!"
			pressed={theme === "dark"}
			onPressedChange={(checked) => setTheme(checked ? "dark" : "light")}
		>
			{theme === "dark" ? <IconMoon /> : <IconSun />}
		</Toggle>
	);
}
