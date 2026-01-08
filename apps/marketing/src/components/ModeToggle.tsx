import * as React from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const [theme, setThemeState] = React.useState<
    "theme-light" | "dark" | "system"
  >("theme-light");

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setThemeState(isDarkMode ? "dark" : "theme-light");
  }, []);

  React.useEffect(() => {
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList[isDark ? "add" : "remove"]("dark");
  }, [theme]);

  return (
    // <DropdownMenu>
    //   <DropdownMenuTrigger asChild>
    //     <Button variant="ghost" size="icon" className="h-6 w-6">
    //       <IconSun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
    //       <IconMoon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    //       <span className="sr-only">Toggle theme</span>
    //     </Button>
    //   </DropdownMenuTrigger>
    //   <DropdownMenuContent align="end">
    //     <DropdownMenuItem onClick={() => setThemeState("theme-light")}>
    //       Light
    //     </DropdownMenuItem>
    //     <DropdownMenuItem onClick={() => setThemeState("dark")}>
    //       Dark
    //     </DropdownMenuItem>
    //     <DropdownMenuItem onClick={() => setThemeState("system")}>
    //       System
    //     </DropdownMenuItem>
    //   </DropdownMenuContent>
    // </DropdownMenu>
    <Toggle
      aria-label="Change theme"
      variant="outline"
      // className="data-[state=on]:bg-transparent data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
      className="h-6! w-6! border-0 p-0 min-w-0 bg-transparent! hover:bg-accent! transition-all text-muted-foreground! shadow-none!"
      pressed={theme === "dark"}
      onPressedChange={(checked) =>
        setThemeState(checked ? "dark" : "theme-light")
      }
    >
      {theme === "dark" ? <IconMoon /> : <IconSun />}
    </Toggle>
  );
}
