"use client";

import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { MonitorIcon, Moon, MoonIcon, Sun, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

interface ThemeToggleProps {
	full?: boolean;
}
export function ThemeToggle({ full }: ThemeToggleProps) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button variant="ghost" size="sm" className="w-9 h-9 cursor-pointer">
				<span className="sr-only">Toggle theme</span>
			</Button>
		);
	}

	if (full) {
		return (
			<div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="accent" aria-label="Select theme">
							{theme === "light" && (
								<>
									<SunIcon size={14} aria-hidden="true" />
									<span>Light</span>
								</>
							)}
							{theme === "dark" && (
								<>
									<MoonIcon size={14} aria-hidden="true" />
									<span>Dark</span>
								</>
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="min-w-32">
						<DropdownMenuItem onClick={() => setTheme("light")}>
							<SunIcon size={16} className="opacity-60" aria-hidden="true" />
							<span>Light</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("dark")}>
							<MoonIcon size={16} className="opacity-60" aria-hidden="true" />
							<span>Dark</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("dark")}>
							<MonitorIcon size={16} className="opacity-60" aria-hidden="true" />
							<span>System</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => setTheme(theme === "light" ? "dark" : "light")}
			className="cursor-pointer h-9 w-9"
		>
			{theme === "light" ? <Moon /> : <Sun />}
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
