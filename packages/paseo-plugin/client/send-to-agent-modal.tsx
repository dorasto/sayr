import { usePaseo, useRpc } from "@getpaseo/plugin/client";
import { Modal, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { getSettingsRpc } from "../shared/settings";
import type { CategoryInfo, TaskDetail } from "../shared/task";
import { buildAgentPrompt } from "./agent-prompt";
import type { Navigation, Theme } from "./types";

/**
 * Picks a Paseo project, then creates a workspace + agent there seeded with
 * the task's full content (see `agent-prompt.ts`) plus whatever's typed into
 * "Additional instructions" — prefilled from the plugin's settings
 * (`sayr.settings.set-agent-instructions`) but freely editable here before
 * anything is actually sent, per-send rather than only ever the fixed default.
 */
export function SendToAgentModal({
	theme,
	navigation,
	task,
	categories,
	onClose,
}: {
	theme: Theme;
	navigation: Navigation;
	task: TaskDetail;
	categories: CategoryInfo[] | undefined;
	onClose: () => void;
}) {
	const paseo = usePaseo();
	const toast = useToast();
	const getSettings = useRpc(getSettingsRpc);
	const [sending, setSending] = useState<string | null>(null);
	const [instructions, setInstructions] = useState("");
	const { data: projects, isLoading } = useQuery({
		queryKey: ["sayr", "projects"],
		queryFn: () => paseo.projects.list(),
	});
	const { data: settings } = useQuery({
		queryKey: ["sayr", "settings"],
		queryFn: () => getSettings({}),
	});

	// Seeded once, from whatever the settings say at the time this modal
	// opens — not kept in sync afterward, so typing here never gets clobbered
	// by an unrelated settings refetch.
	useEffect(() => {
		if (settings) setInstructions(settings.defaultAgentInstructions);
	}, [settings]);

	const styles = useMemo(
		() => ({
			row: {
				paddingVertical: 10,
				paddingHorizontal: 4,
				borderBottomWidth: 1,
				borderBottomColor: theme.colors.border,
			},
			rowText: { color: theme.colors.foreground, fontSize: 14 },
			rowSub: { color: theme.colors.foregroundMuted, fontSize: 12 },
			empty: { color: theme.colors.foregroundMuted, fontSize: 13, padding: 8 },
			label: { color: theme.colors.foregroundMuted, fontSize: 12, fontWeight: "600" as const, marginBottom: 6 },
			textarea: {
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				padding: 10,
				color: theme.colors.foreground,
				backgroundColor: theme.colors.surface1,
				minHeight: 80,
				marginBottom: 16,
			},
			projectsLabel: {
				color: theme.colors.foregroundMuted,
				fontSize: 12,
				fontWeight: "600" as const,
				marginBottom: 6,
			},
		}),
		[theme]
	);

	async function sendTo(project: { projectId: string; projectDisplayName: string; projectRootPath: string }) {
		setSending(project.projectId);
		try {
			const snapshot = await paseo.providers.snapshot();
			const ready = snapshot.entries.find(
				(entry) => entry.status === "ready" && entry.enabled !== false && (entry.models?.length ?? 0) > 0
			);
			if (!ready || !ready.models || ready.models.length === 0) {
				toast.error("No ready AI provider is configured in Paseo — set one up under Settings → Providers.");
				return;
			}
			const model = ready.models.find((m) => m.isDefault) ?? ready.models[0];
			const prompt = buildAgentPrompt(task, { categories, additionalInstructions: instructions });
			const title = `Sayr #${task.shortId ?? task.id}: ${(task.title ?? "").slice(0, 60)}`;

			const workspace = await paseo.workspaces.create({
				title,
				firstAgentContext: { prompt, attachments: [] },
				source: { kind: "directory", path: project.projectRootPath, projectId: project.projectId },
			});
			const agent = await workspace.agents.create({
				config: { provider: `${ready.provider}/${model.id}` },
				prompt,
			});

			toast.show(`Agent started in ${project.projectDisplayName}`, { variant: "success" });
			navigation?.openAgent({ agentId: agent.id });
			onClose();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to start agent.");
		} finally {
			setSending(null);
		}
	}

	return (
		<Modal title="Send to agent" open onOpenChange={(open: boolean) => !open && onClose()}>
			<Modal.Content>
				<Text style={styles.label}>Additional instructions</Text>
				<TextInput
					value={instructions}
					onChangeText={setInstructions}
					style={styles.textarea}
					placeholder="Anything extra the agent should know, beyond the task itself…"
					multiline
				/>

				<Text style={styles.projectsLabel}>Project</Text>
				{isLoading && <Text style={styles.empty}>Loading projects…</Text>}
				{!isLoading && (projects?.projects.length ?? 0) === 0 && (
					<Text style={styles.empty}>No projects registered in Paseo yet.</Text>
				)}
				<ScrollView>
					{projects?.projects.map((project) => (
						<Pressable
							key={project.projectId}
							accessibilityRole="button"
							accessibilityLabel={`Send to ${project.projectDisplayName}`}
							style={styles.row}
							disabled={sending !== null}
							onPress={() => sendTo(project)}
						>
							<Text style={styles.rowText}>
								{sending === project.projectId ? "Starting…" : project.projectDisplayName}
							</Text>
							<Text style={styles.rowSub}>{project.projectRootPath}</Text>
						</Pressable>
					))}
				</ScrollView>
			</Modal.Content>
		</Modal>
	);
}
