import type { PluginClientContext } from "@getpaseo/plugin/client";
import { SayrBoard } from "./client/board";
import { SayrSettingsScreen } from "./client/settings-screen";

export default function contribute(client: PluginClientContext) {
	client.addSurface("board", SayrBoard);
	client.addSidebarItem({
		id: "board",
		title: "Sayr",
		icon: "SquareKanban",
		surface: "board",
	});
	client.addSettingsScreen({
		id: "settings",
		title: "Sayr",
		icon: "SquareKanban",
		Component: SayrSettingsScreen,
	});
	client.addCommandCenterItem({
		id: "open-board",
		title: "Open Sayr tasks",
		icon: "SquareKanban",
		keywords: ["sayr", "tasks", "board", "issues"],
		context: "global",
		onSelect({ openSurface }) {
			openSurface("board");
		},
	});
	client.addCommandCenterItem({
		id: "sayr-settings",
		title: "Sayr plugin settings",
		icon: "Settings",
		keywords: ["sayr", "cli", "local", "profile"],
		context: "global",
		onSelect({ openSettings }) {
			openSettings("settings");
		},
	});
	return () => {};
}
