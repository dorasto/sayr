"use client";

import { IconArrowUpRight, IconMoon, IconPlug, IconSettings, IconSun } from "@tabler/icons-react";
import {
	ArrowUpRightIcon,
	CircleFadingPlusIcon,
	FileInputIcon,
	FolderPlusIcon,
	MoonIcon,
	SettingsIcon,
	SunIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMemo } from "react";
// import { useAdminRoute } from "@/app/components/layout/admin/admin-navigation/useAdminRoute";
import type { CommandMap } from "@/app/types/command";

export function useCommandRegistry() {
	const router = useRouter();
	const { setTheme } = useTheme();
	// const { isOrgPage, isTaskPage } = useAdminRoute();

	const commands: CommandMap = useMemo(() => {
		return {
			root: [
				// {
				// 	heading: "Quick start",
				// 	items: [
				// 		{
				// 			id: "new-folder",
				// 			label: "New folder",
				// 			icon: <FolderPlusIcon size={16} className="opacity-60" aria-hidden="true" />,
				// 			shortcut: "⌘N",
				// 			action: () => console.log("New folder"),
				// 		},
				// 		{
				// 			id: "import-document",
				// 			label: "Import document",
				// 			icon: <FileInputIcon size={16} className="opacity-60" aria-hidden="true" />,
				// 			shortcut: "⌘I",
				// 			action: () => console.log("Import document"),
				// 		},
				// 		{
				// 			id: "add-block",
				// 			label: "Add block",
				// 			icon: <CircleFadingPlusIcon size={16} className="opacity-60" aria-hidden="true" />,
				// 			shortcut: "⌘B",
				// 			action: () => console.log("Add block"),
				// 		},
				// 	],
				// },
				{
					heading: "Navigation",
					items: [
						{
							id: "go-dashboard",
							label: "Dashboard",
							icon: <IconArrowUpRight size={16} className="opacity-60" aria-hidden="true" />,
							action: () => router.push("/admin"),
						},
						// {
						// 	id: "go-apps",
						// 	label: "Go to apps",
						// 	icon: <IconArrowUpRight size={16} className="opacity-60" aria-hidden="true" />,
						// 	action: () => router.push("/admin/apps"),
						// },
						// {
						// 	id: "go-connections",
						// 	label: "Go to connections",
						// 	icon: <IconArrowUpRight size={16} className="opacity-60" aria-hidden="true" />,
						// 	action: () => router.push("/admin/connections"),
						// },
					],
				},
				{
					heading: "Your account",
					items: [
						{
							id: "account-general",
							label: "General settings",
							icon: <IconSettings size={16} className="opacity-60" aria-hidden="true" />,
							action: () => router.push("/admin/settings"),
						},
						{
							id: "account-connections",
							label: "Connections",
							icon: <IconPlug size={16} className="opacity-60" aria-hidden="true" />,
							action: () => router.push("/admin/settings/connections"),
						},
						{
							id: "settings-theme",
							label: "Theme",
							icon: <IconSun size={16} className="opacity-60" aria-hidden="true" />,
							subId: "theme",
						},
					],
				},
			],
			theme: [
				{
					heading: "Theme",
					items: [
						{
							id: "theme-light",
							label: "Light",
							icon: <IconSun size={16} className="opacity-60" aria-hidden="true" />,
							action: () => setTheme("light"),
							closeOnSelect: false,
						},
						{
							id: "theme-dark",
							label: "Dark",
							icon: <IconMoon size={16} className="opacity-60" aria-hidden="true" />,
							action: () => setTheme("dark"),
							closeOnSelect: false,
						},
						{
							id: "theme-system",
							label: "System",
							icon: <SettingsIcon size={16} className="opacity-60" aria-hidden="true" />,
							action: () => setTheme("system"),
							closeOnSelect: false,
						},
					],
				},
			],
		};
	}, [router, setTheme]);

	return commands;
}
