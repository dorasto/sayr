import type { PluginHostProps, PluginSurfaceProps } from "@getpaseo/plugin/client";
import { usePaseo, useRpc } from "@getpaseo/plugin/client";
import { Modal, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { extractPlainText, type ProsekitNode } from "../shared/prosekit";
import {
	categoryName,
	createCommentRpc,
	getTaskRpc,
	listCommentsRpc,
	listOrgsRpc,
	listRepliesRpc,
	setAssigneesRpc,
	TASK_PRIORITIES,
	TASK_STATUSES,
	type Task,
	type TaskComment,
	updateTaskPriorityRpc,
	updateTaskStatusRpc,
} from "../shared/task";
import { Sheet } from "./sheet";

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

export function TaskDetailSheet({
	theme,
	layout,
	navigation,
	selected,
	onClose,
}: {
	theme: Theme;
	layout: Layout;
	navigation: Navigation;
	selected: { taskId: string; orgSlug: string } | null;
	onClose: () => void;
}) {
	return (
		<Sheet open={selected !== null} onClose={onClose} title="Task" theme={theme} compact={layout.compact}>
			{selected && (
				<TaskDetailBody
					theme={theme}
					layout={layout}
					navigation={navigation}
					taskId={selected.taskId}
					orgSlug={selected.orgSlug}
					onClose={onClose}
				/>
			)}
		</Sheet>
	);
}

function TaskDetailBody({
	theme,
	layout,
	navigation,
	taskId,
	orgSlug,
	onClose: _onClose,
}: {
	theme: Theme;
	layout: Layout;
	navigation: Navigation;
	taskId: string;
	orgSlug: string;
	onClose: () => void;
}) {
	const getTask = useRpc(getTaskRpc);
	const updateStatus = useRpc(updateTaskStatusRpc);
	const updatePriority = useRpc(updateTaskPriorityRpc);
	const setAssignees = useRpc(setAssigneesRpc);
	const listOrgsFn = useRpc(listOrgsRpc);
	const queryClient = useQueryClient();
	const toast = useToast();
	const [sendOpen, setSendOpen] = useState(false);
	const [savingField, setSavingField] = useState<"status" | "priority" | "assignees" | null>(null);

	const taskQuery = useQuery({
		queryKey: ["sayr", "task", orgSlug, taskId],
		queryFn: () => getTask({ taskId, orgSlug }),
	});
	const orgsQuery = useQuery({ queryKey: ["sayr", "orgs"], queryFn: () => listOrgsFn({}) });
	const data = taskQuery.data;

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["sayr", "task", orgSlug, taskId] }),
			queryClient.invalidateQueries({ queryKey: ["sayr", "tasks"] }),
		]);
	}

	async function onSetStatus(status: (typeof TASK_STATUSES)[number]) {
		setSavingField("status");
		try {
			await updateStatus({ taskId, orgSlug, status });
			await refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update status.");
		} finally {
			setSavingField(null);
		}
	}

	async function onSetPriority(priority: (typeof TASK_PRIORITIES)[number]) {
		setSavingField("priority");
		try {
			await updatePriority({ taskId, orgSlug, priority });
			await refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update priority.");
		} finally {
			setSavingField(null);
		}
	}

	async function onToggleAssignee(userId: string) {
		if (!data) return;
		const current = new Set((data.assignees ?? []).map((a) => a?.id).filter((id): id is string => Boolean(id)));
		if (current.has(userId)) current.delete(userId);
		else current.add(userId);
		setSavingField("assignees");
		try {
			await setAssignees({ taskId, orgSlug, userIds: [...current] });
			await refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update assignees.");
		} finally {
			setSavingField(null);
		}
	}

	const styles = useMemo(
		() => ({
			meta: { color: theme.colors.foregroundMuted, fontSize: 13 },
			taskTitle: { color: theme.colors.foreground, fontSize: 17, fontWeight: "600" as const },
			section: { marginTop: 16, gap: 8 },
			sectionTitle: { color: theme.colors.foregroundMuted, fontSize: 12, fontWeight: "600" as const },
			body: { color: theme.colors.foreground, fontSize: 14, lineHeight: 20 },
			pillRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6 },
			pill: {
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 999,
				paddingVertical: 4,
				paddingHorizontal: 10,
			},
			pillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
			pillText: { color: theme.colors.foreground, fontSize: 12 },
			pillTextActive: { color: theme.colors.accentForeground, fontSize: 12, fontWeight: "600" as const },
			button: {
				alignSelf: "flex-start" as const,
				backgroundColor: theme.colors.accent,
				paddingVertical: 8,
				paddingHorizontal: 14,
				borderRadius: 6,
				marginTop: 12,
			},
			buttonText: { color: theme.colors.accentForeground, fontSize: 13, fontWeight: "600" as const },
			errorText: { color: theme.colors.statusDanger, fontSize: 13 },
		}),
		[theme]
	);

	const orgMembers = orgsQuery.data?.orgs.find((org) => org.slug === orgSlug)?.members ?? [];
	const assigneeIds = new Set((data?.assignees ?? []).map((a) => a?.id).filter(Boolean));

	return (
		<ScrollView>
			{taskQuery.isLoading && <Text style={styles.meta}>Loading…</Text>}
			{taskQuery.isError && (
				<Text style={styles.errorText}>
					{taskQuery.error instanceof Error ? taskQuery.error.message : "Failed to load."}
				</Text>
			)}
			{data && (
				<View>
					<Text style={styles.taskTitle}>{data.title ?? "(untitled)"}</Text>
					<Text style={[styles.meta, { marginTop: 4 }]}>
						#{data.shortId ?? "?"}
						{categoryName(data.category) ? ` · ${categoryName(data.category)}` : ""}
					</Text>

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>STATUS</Text>
						<View style={styles.pillRow}>
							{TASK_STATUSES.map((status) => (
								<Pressable
									key={status}
									accessibilityRole="button"
									disabled={savingField === "status"}
									style={[styles.pill, status === data.status && styles.pillActive]}
									onPress={() => onSetStatus(status)}
								>
									<Text style={status === data.status ? styles.pillTextActive : styles.pillText}>
										{status}
									</Text>
								</Pressable>
							))}
						</View>
					</View>

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>PRIORITY</Text>
						<View style={styles.pillRow}>
							{TASK_PRIORITIES.map((priority) => (
								<Pressable
									key={priority}
									accessibilityRole="button"
									disabled={savingField === "priority"}
									style={[styles.pill, priority === data.priority && styles.pillActive]}
									onPress={() => onSetPriority(priority)}
								>
									<Text style={priority === data.priority ? styles.pillTextActive : styles.pillText}>
										{priority}
									</Text>
								</Pressable>
							))}
						</View>
					</View>

					{data.labels.length > 0 && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>LABELS</Text>
							<Text style={styles.body}>{data.labels.map((l) => l.name).join(", ")}</Text>
						</View>
					)}

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>ASSIGNEES</Text>
						{orgMembers.length === 0 ? (
							<Text style={styles.meta}>No other members in this org.</Text>
						) : (
							<View style={styles.pillRow}>
								{orgMembers.map((member) => {
									const active = assigneeIds.has(member.userId);
									return (
										<Pressable
											key={member.userId}
											accessibilityRole="button"
											disabled={savingField === "assignees"}
											style={[styles.pill, active && styles.pillActive]}
											onPress={() => onToggleAssignee(member.userId)}
										>
											<Text style={active ? styles.pillTextActive : styles.pillText}>
												{member.user.name ?? member.userId}
											</Text>
										</Pressable>
									);
								})}
							</View>
						)}
					</View>

					{data.description ? (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>DESCRIPTION</Text>
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
							orgSlug={orgSlug}
							initialComments={data.comments}
							initialTotal={data.commentsTotal}
							onPosted={refresh}
						/>
					</View>
				</View>
			)}
			{sendOpen && data && (
				<SendToAgentModal
					theme={theme}
					layout={layout}
					navigation={navigation}
					task={data}
					onClose={() => setSendOpen(false)}
				/>
			)}
		</ScrollView>
	);
}

function CommentsSection({
	theme,
	taskId,
	orgSlug,
	initialComments,
	initialTotal,
	onPosted,
}: {
	theme: Theme;
	taskId: string;
	orgSlug: string;
	initialComments: TaskComment[];
	initialTotal: number;
	onPosted: () => Promise<void>;
}) {
	const listComments = useRpc(listCommentsRpc);
	const createComment = useRpc(createCommentRpc);
	const toast = useToast();
	const [comments, setComments] = useState(initialComments);
	const [total, setTotal] = useState(initialTotal);
	const [page, setPage] = useState(1);
	const [loadingMore, setLoadingMore] = useState(false);
	const [draft, setDraft] = useState("");
	const [posting, setPosting] = useState(false);

	const styles = useMemo(
		() => ({
			empty: { color: theme.colors.foregroundMuted, fontSize: 13 },
			more: { color: theme.colors.accent, fontSize: 13, marginTop: 8 },
			composerRow: { flexDirection: "row" as const, gap: 8, marginTop: 12, alignItems: "flex-end" as const },
			input: {
				flex: 1,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				padding: 8,
				color: theme.colors.foreground,
				backgroundColor: theme.colors.surface1,
				minHeight: 36,
			},
			postButton: {
				backgroundColor: theme.colors.accent,
				borderRadius: 6,
				paddingVertical: 8,
				paddingHorizontal: 12,
			},
			postButtonText: { color: theme.colors.accentForeground, fontSize: 12, fontWeight: "600" as const },
		}),
		[theme]
	);

	async function loadMore() {
		setLoadingMore(true);
		try {
			const next = page + 1;
			const result = await listComments({ taskId, orgSlug, page: next });
			setComments((prev) => [...prev, ...result.comments]);
			setPage(next);
		} finally {
			setLoadingMore(false);
		}
	}

	async function post() {
		const content = draft.trim();
		if (!content) return;
		setPosting(true);
		try {
			await createComment({ taskId, orgSlug, content });
			setDraft("");
			const result = await listComments({ taskId, orgSlug, page: 1 });
			setComments(result.comments);
			setTotal(result.pagination.totalItems);
			setPage(1);
			await onPosted();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to post comment.");
		} finally {
			setPosting(false);
		}
	}

	return (
		<View>
			{comments.length === 0 ? (
				<Text style={styles.empty}>No comments yet.</Text>
			) : (
				comments.map((comment) => <CommentRow key={comment.id} theme={theme} comment={comment} />)
			)}
			{comments.length < total && (
				<Pressable accessibilityRole="button" onPress={loadMore} disabled={loadingMore}>
					<Text style={styles.more}>{loadingMore ? "Loading…" : "Load more comments"}</Text>
				</Pressable>
			)}
			<View style={styles.composerRow}>
				<TextInput
					value={draft}
					onChangeText={setDraft}
					placeholder="Write a comment…"
					multiline
					style={styles.input}
				/>
				<Pressable
					accessibilityRole="button"
					style={styles.postButton}
					onPress={post}
					disabled={posting || !draft.trim()}
				>
					<Text style={styles.postButtonText}>{posting ? "Posting…" : "Post"}</Text>
				</Pressable>
			</View>
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
			author: { color: theme.colors.foreground, fontSize: 13, fontWeight: "600" as const },
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
						{expanded ? "Hide" : "Show"} {replyCount} repl{replyCount === 1 ? "y" : "ies"}
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
