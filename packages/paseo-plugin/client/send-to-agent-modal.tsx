import { usePaseo } from "@getpaseo/plugin/client";
import { Modal, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import type { Task, TaskComment } from "../shared/task";
import { buildAgentPrompt } from "./agent-prompt";
import type { Navigation, Theme } from "./types";

/** Picks a Paseo project, then creates a workspace + agent there seeded with the task's content (see `agent-prompt.ts`). */
export function SendToAgentModal({
	theme,
	navigation,
	task,
	onClose,
}: {
	theme: Theme;
	navigation: Navigation;
	task: Task & { comments: TaskComment[] };
	onClose: () => void;
}) {
	const paseo = usePaseo();
	const toast = useToast();
	const [sending, setSending] = useState<string | null>(null);
	const { data: projects, isLoading } = useQuery({
		queryKey: ["sayr", "projects"],
		queryFn: () => paseo.projects.list(),
	});

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
			const prompt = buildAgentPrompt(task);
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
