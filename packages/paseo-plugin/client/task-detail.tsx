import type { PluginHostProps, PluginSurfaceProps } from "@getpaseo/plugin/client";
import { usePaseo, useRpc } from "@getpaseo/plugin/client";
import { Modal, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { extractPlainText, type ProsekitNode } from "../shared/prosekit";
import { getTaskRpc, listCommentsRpc, listRepliesRpc, type Task, type TaskComment } from "../shared/task";

type Theme = PluginHostProps["theme"];
type Layout = PluginHostProps["layout"];
type Navigation = PluginSurfaceProps["navigation"];

function buildAgentPrompt(task: Task & { comments: TaskComment[] }): string {
	const key = task.shortId != null ? `#${task.shortId}` : task.id;
	const description = task.description ? extractPlainText(task.description as ProsekitNode) : "";
	const lines = [
		`Sayr task ${key}: ${task.title ?? "(untitled)"}`,
		`Status: ${task.status} | Priority: ${task.priority}`,
	];
	if (description) lines.push("", description);
	if (task.comments.length > 0) {
		lines.push("", "Recent comments:");
		for (const comment of task.comments.slice(0, 5)) {
			const author = comment.createdBy?.name ?? "someone";
			const text = comment.content ? extractPlainText(comment.content as ProsekitNode) : "";
			if (text) lines.push(`- ${author}: ${text}`);
		}
	}
	return lines.join("\n");
}

export function TaskDetailModal({
	theme,
	layout,
	navigation,
	taskId,
	onClose,
}: {
	theme: Theme;
	layout: Layout;
	navigation: Navigation;
	taskId: string;
	onClose: () => void;
}) {
	const getTask = useRpc(getTaskRpc);
	const [sendOpen, setSendOpen] = useState(false);
	const { data, isLoading, isError, error } = useQuery({
		queryKey: ["sayr", "task", taskId],
		queryFn: () => getTask({ taskId }),
	});

	const styles = useMemo(
		() => ({
			meta: { color: theme.colors.foregroundMuted, fontSize: 13 },
			section: { marginTop: 16, gap: 8 },
			sectionTitle: {
				color: theme.colors.foregroundMuted,
				fontSize: 12,
				fontWeight: "600" as const,
			},
			body: { color: theme.colors.foreground, fontSize: 14, lineHeight: 20 },
			button: {
				alignSelf: "flex-start" as const,
				backgroundColor: theme.colors.accent,
				paddingVertical: 8,
				paddingHorizontal: 14,
				borderRadius: 6,
				marginTop: 12,
			},
			buttonText: {
				color: theme.colors.accentForeground,
				fontSize: 13,
				fontWeight: "600" as const,
			},
			errorText: { color: theme.colors.statusDanger, fontSize: 13 },
		}),
		[theme]
	);

	return (
		<Modal title={data?.title ?? "Task"} open onOpenChange={(open) => !open && onClose()}>
			<Modal.Content>
				{isLoading && <Text style={styles.meta}>Loading…</Text>}
				{isError && (
					<Text style={styles.errorText}>{error instanceof Error ? error.message : "Failed to load."}</Text>
				)}
				{data && (
					<View>
						<Text style={styles.meta}>
							#{data.shortId ?? "?"} · {data.status} · {data.priority}
							{data.category ? ` · ${data.category.name}` : ""}
						</Text>
						{data.labels.length > 0 && (
							<Text style={styles.meta}>Labels: {data.labels.map((l) => l.name).join(", ")}</Text>
						)}
						{data.assignees && data.assignees.length > 0 && (
							<Text style={styles.meta}>
								Assignees: {data.assignees.map((a) => a?.name ?? a?.id).join(", ")}
							</Text>
						)}
						{data.description ? (
							<View style={styles.section}>
								<Text style={styles.body}>{extractPlainText(data.description as ProsekitNode)}</Text>
							</View>
						) : null}
						{data.aiSummary?.summary && (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>AI SUMMARY{data.aiSummary.isStale ? " (STALE)" : ""}</Text>
								<Text style={styles.body}>{data.aiSummary.summary}</Text>
							</View>
						)}
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Send this task to an agent"
							style={styles.button}
							onPress={() => setSendOpen(true)}
						>
							<Text style={styles.buttonText}>Send to agent</Text>
						</Pressable>
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>COMMENTS ({data.commentsTotal})</Text>
							<CommentsSection
								theme={theme}
								taskId={taskId}
								initialComments={data.comments}
								initialTotal={data.commentsTotal}
							/>
						</View>
					</View>
				)}
			</Modal.Content>
			{sendOpen && data && (
				<SendToAgentModal
					theme={theme}
					layout={layout}
					navigation={navigation}
					task={data}
					onClose={() => setSendOpen(false)}
				/>
			)}
		</Modal>
	);
}

function CommentsSection({
	theme,
	taskId,
	initialComments,
	initialTotal,
}: {
	theme: Theme;
	taskId: string;
	initialComments: TaskComment[];
	initialTotal: number;
}) {
	const listComments = useRpc(listCommentsRpc);
	const [comments, setComments] = useState(initialComments);
	const [page, setPage] = useState(1);
	const [loadingMore, setLoadingMore] = useState(false);
	const styles = useMemo(
		() => ({
			empty: { color: theme.colors.foregroundMuted, fontSize: 13 },
			more: { color: theme.colors.accent, fontSize: 13, marginTop: 8 },
		}),
		[theme]
	);

	async function loadMore() {
		setLoadingMore(true);
		try {
			const next = page + 1;
			const result = await listComments({ taskId, page: next });
			setComments((prev) => [...prev, ...result.comments]);
			setPage(next);
		} finally {
			setLoadingMore(false);
		}
	}

	if (comments.length === 0) return <Text style={styles.empty}>No comments yet.</Text>;

	return (
		<View>
			{comments.map((comment) => (
				<CommentRow key={comment.id} theme={theme} comment={comment} />
			))}
			{comments.length < initialTotal && (
				<Pressable accessibilityRole="button" onPress={loadMore} disabled={loadingMore}>
					<Text style={styles.more}>{loadingMore ? "Loading…" : "Load more comments"}</Text>
				</Pressable>
			)}
		</View>
	);
}

function CommentRow({ theme, comment }: { theme: Theme; comment: TaskComment }) {
	const [expanded, setExpanded] = useState(false);
	const listReplies = useRpc(listRepliesRpc);
	const replyCount = comment.replyCount ?? 0;
	const { data, isLoading } = useQuery({
		queryKey: ["sayr", "replies", comment.id],
		queryFn: () => listReplies({ commentId: comment.id }),
		enabled: expanded && replyCount > 0,
	});

	const styles = useMemo(
		() => ({
			row: { marginBottom: 10, paddingLeft: 0 },
			author: {
				color: theme.colors.foreground,
				fontSize: 13,
				fontWeight: "600" as const,
			},
			text: { color: theme.colors.foreground, fontSize: 13, marginTop: 2 },
			meta: { color: theme.colors.foregroundMuted, fontSize: 11, marginTop: 2 },
			reply: { marginTop: 6, marginLeft: 16 },
		}),
		[theme]
	);

	return (
		<View style={styles.row}>
			<Text style={styles.author}>
				{comment.createdBy?.name ?? "Someone"}
				{comment.visibility === "internal" ? " (internal)" : ""}
			</Text>
			{comment.content ? <Text style={styles.text}>{extractPlainText(comment.content as ProsekitNode)}</Text> : null}
			{replyCount > 0 && (
				<Pressable accessibilityRole="button" onPress={() => setExpanded((v) => !v)}>
					<Text style={styles.meta}>
						{expanded ? "Hide" : "Show"} {replyCount} repl
						{replyCount === 1 ? "y" : "ies"}
					</Text>
				</Pressable>
			)}
			{expanded && isLoading && <Text style={styles.meta}>Loading replies…</Text>}
			{expanded &&
				data?.replies.map((reply) => (
					<View key={reply.id} style={styles.reply}>
						<Text style={styles.author}>{reply.createdBy?.name ?? "Someone"}</Text>
						{reply.content ? (
							<Text style={styles.text}>{extractPlainText(reply.content as ProsekitNode)}</Text>
						) : null}
					</View>
				))}
		</View>
	);
}

function SendToAgentModal({
	theme,
	layout: _layout,
	navigation,
	task,
	onClose,
}: {
	theme: Theme;
	layout: Layout;
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
				source: {
					kind: "directory",
					path: project.projectRootPath,
					projectId: project.projectId,
				},
			});
			const agent = await workspace.agents.create({
				config: { provider: `${ready.provider}/${model.id}` },
				prompt,
			});

			toast.show(`Agent started in ${project.projectDisplayName}`, {
				variant: "success",
			});
			navigation?.openAgent({ agentId: agent.id });
			onClose();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to start agent.");
		} finally {
			setSending(null);
		}
	}

	return (
		<Modal title="Send to agent" open onOpenChange={(open) => !open && onClose()}>
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
