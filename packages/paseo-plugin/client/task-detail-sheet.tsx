import { useRpc } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { Linking, Pressable } from "react-native";
import { getSettingsRpc } from "../shared/settings";
import { getCliConfigRpc, getTaskRpc, listCategoriesRpc } from "../shared/task";
import { deriveTaskWebUrl } from "../shared/web-url";
import { SendToAgentModal } from "./send-to-agent-modal";
import { Sheet } from "./sheet";
import { TaskDetailBody } from "./task-detail-body";
import type { Layout, Navigation, Theme } from "./types";

/**
 * Fetches the selected task and renders it in the sliding `Sheet` — the
 * sheet's own title comes from the fetch, so it shows the real task title
 * rather than a static placeholder. Also owns two header actions (not
 * buried in scrollable content, see `sheet.tsx`'s `headerActions`):
 * "Send to agent" and "Open on Sayr" (`shared/web-url.ts`'s
 * `deriveTaskWebUrl`, opened via `Linking.openURL` — the standard
 * cross-platform way to hand a URL to the OS/browser, not a raw
 * `window.open`, so this doesn't need `client/web.ts`'s DOM gate).
 * Categories/settings/CLI config it needs for either action are fetched
 * here with the SAME query keys other files already use for their own
 * purposes, so this is cache-shared, not a duplicate fetch.
 */
export function TaskDetailSheet({
	theme,
	layout,
	navigation,
	selected,
	bodyWidth,
	panelWidth,
	onPanelWidthChange,
	onClose,
	onOpenTask,
}: {
	theme: Theme;
	layout: Layout;
	navigation: Navigation;
	selected: { taskId: string; orgSlug: string } | null;
	bodyWidth: number | null;
	panelWidth: number | null;
	onPanelWidthChange: (width: number) => void;
	onClose: () => void;
	onOpenTask: (taskId: string, orgSlug: string) => void;
}) {
	const getTask = useRpc(getTaskRpc);
	const listCategoriesFn = useRpc(listCategoriesRpc);
	const getCliConfig = useRpc(getCliConfigRpc);
	const getSettings = useRpc(getSettingsRpc);
	const [sendOpen, setSendOpen] = useState(false);
	const taskQuery = useQuery({
		queryKey: ["sayr", "task", selected?.orgSlug, selected?.taskId],
		queryFn: () =>
			getTask({
				taskId: selected?.taskId ?? "",
				orgSlug: selected?.orgSlug ?? "",
			}),
		enabled: selected !== null,
	});
	const categoriesQuery = useQuery({
		queryKey: ["sayr", "categories", selected?.orgSlug],
		queryFn: () => listCategoriesFn({ orgSlug: selected?.orgSlug ?? "" }),
		enabled: selected !== null && sendOpen,
	});
	const cliConfigQuery = useQuery({ queryKey: ["sayr", "cli-config"], queryFn: () => getCliConfig({}) });
	const settingsQuery = useQuery({ queryKey: ["sayr", "settings"], queryFn: () => getSettings({}) });

	const data = taskQuery.data;
	const webUrl =
		data && data.shortId !== null && cliConfigQuery.data
			? deriveTaskWebUrl({
					baseApiUrl: cliConfigQuery.data.baseUrl,
					orgSlug: data.orgSlug,
					shortId: data.shortId,
					template: settingsQuery.data?.webUrlTemplate,
				})
			: undefined;

	return (
		<Sheet
			open={selected !== null}
			onClose={onClose}
			title={taskQuery.data?.title ?? "Loading..."}
			headerActions={
				taskQuery.data ? (
					<Fragment>
						{webUrl && (
							<Pressable
								accessibilityRole="link"
								accessibilityLabel="Open this task on Sayr"
								onPress={() => Linking.openURL(webUrl)}
							>
								<Icon name="ExternalLink" size={18} color={theme.colors.foregroundMuted} />
							</Pressable>
						)}
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Send this task to an agent"
							onPress={() => setSendOpen(true)}
						>
							<Icon name="Bot" size={18} color={theme.colors.foregroundMuted} />
						</Pressable>
					</Fragment>
				) : undefined
			}
			theme={theme}
			compact={layout.compact}
			bodyWidth={bodyWidth}
			width={panelWidth}
			onWidthChange={onPanelWidthChange}
		>
			{selected && (
				<TaskDetailBody
					theme={theme}
					taskId={selected.taskId}
					orgSlug={selected.orgSlug}
					query={taskQuery}
					onOpenTask={onOpenTask}
				/>
			)}
			{sendOpen && taskQuery.data && (
				<SendToAgentModal
					theme={theme}
					navigation={navigation}
					task={taskQuery.data}
					categories={categoriesQuery.data?.categories}
					onClose={() => setSendOpen(false)}
				/>
			)}
		</Sheet>
	);
}
