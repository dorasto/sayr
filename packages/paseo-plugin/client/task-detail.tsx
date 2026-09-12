import type { PluginHostProps, PluginSurfaceProps } from "@getpaseo/plugin/client";
import { usePaseo, useRpc } from "@getpaseo/plugin/client";
import { Icon, Modal, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { type UseQueryResult, useQuery, useQueryClient } from "@tanstack/react-query";
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
	PRIORITY_COLORS,
	PRIORITY_LABELS,
	STATUS_COLORS,
	STATUS_LABELS,
	setAssigneesRpc,
	TASK_PRIORITIES,
	TASK_STATUSES,
	type Task,
	type TaskComment,
	type TaskDetail,
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
		`Status: ${STATUS_LABELS[task.status]} | Priority: ${PRIORITY_LABELS[task.priority]}`,
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
	bodyWidth,
	panelWidth,
	onPanelWidthChange,
	onClose,
}: {
	theme: Theme;
	layout: Layout;
	navigation: Navigation;
	selected: { taskId: string; orgSlug: string } | null;
	bodyWidth: number | null;
	panelWidth: number | null;
	onPanelWidthChange: (width: number) => void;
	onClose: () => void;
}) {
	const getTask = useRpc(getTaskRpc);
	const taskQuery = useQuery({
		queryKey: ["sayr", "task", selected?.orgSlug, selected?.taskId],
		queryFn: () => getTask({ taskId: selected?.taskId ?? "", orgSlug: selected?.orgSlug ?? "" }),
		enabled: selected !== null,
	});

	return (
		<Sheet
			open={selected !== null}
			onClose={onClose}
			title={taskQuery.data?.title ?? "Task"}
			theme={theme}
			compact={layout.compact}
			bodyWidth={bodyWidth}
			width={panelWidth}
			onWidthChange={onPanelWidthChange}
		>
			{selected && (
				<TaskDetailBody
					theme={theme}
					navigation={navigation}
					taskId={selected.taskId}
					orgSlug={selected.orgSlug}
					query={taskQuery}
				/>
			)}
		</Sheet>
	);
}

function TaskDetailBody({
	theme,
	navigation,
	taskId,
	orgSlug,
	query,
}: {
	theme: Theme;
	navigation: Navigation;
	taskId: string;
	orgSlug: string;
	query: UseQueryResult<TaskDetail>;
}) {
	const updateStatus = useRpc(updateTaskStatusRpc);
	const updatePriority = useRpc(updateTaskPriorityRpc);
	const setAssignees = useRpc(setAssigneesRpc);
	const listOrgsFn = useRpc(listOrgsRpc);
	const queryClient = useQueryClient();
	const toast = useToast();
	const [sendOpen, setSendOpen] = useState(false);
	const [savingField, setSavingField] = useState<"status" | "priority" | "assignees" | null>(null);

	const orgsQuery = useQuery({ queryKey: ["sayr", "orgs"], queryFn: () => listOrgsFn({}) });
	const data = query.data;

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

	async function onSetAssignees(userIds: string[]) {
		setSavingField("assignees");
		try {
			await setAssignees({ taskId, orgSlug, userIds });
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
			section: { marginTop: 16, gap: 6 },
			sectionTitle: { color: theme.colors.foregroundMuted, fontSize: 12, fontWeight: "600" as const },
			body: { color: theme.colors.foreground, fontSize: 14, lineHeight: 20 },
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

	return (
		<ScrollView>
			{query.isLoading && <Text style={styles.meta}>Loading…</Text>}
			{query.isError && (
				<Text style={styles.errorText}>
					{query.error instanceof Error ? query.error.message : "Failed to load."}
				</Text>
			)}
			{data && (
				<View>
					<Text style={styles.meta}>
						#{data.shortId ?? "?"}
						{categoryName(data.category) ? ` · ${categoryName(data.category)}` : ""}
					</Text>

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>STATUS</Text>
						<Dropdown
							theme={theme}
							disabled={savingField === "status"}
							currentLabel={STATUS_LABELS[data.status]}
							currentColor={STATUS_COLORS[data.status]}
							options={TASK_STATUSES.map((status) => ({
								value: status,
								label: STATUS_LABELS[status],
								color: STATUS_COLORS[status],
							}))}
							selectedValue={data.status}
							onSelect={(value) => onSetStatus(value as (typeof TASK_STATUSES)[number])}
						/>
					</View>

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>PRIORITY</Text>
						<Dropdown
							theme={theme}
							disabled={savingField === "priority"}
							currentLabel={PRIORITY_LABELS[data.priority]}
							currentColor={PRIORITY_COLORS[data.priority]}
							options={TASK_PRIORITIES.map((priority) => ({
								value: priority,
								label: PRIORITY_LABELS[priority],
								color: PRIORITY_COLORS[priority],
							}))}
							selectedValue={data.priority}
							onSelect={(value) => onSetPriority(value as (typeof TASK_PRIORITIES)[number])}
						/>
					</View>

					{data.labels.length > 0 && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>LABELS</Text>
							<Text style={styles.body}>{data.labels.map((l) => l.name).join(", ")}</Text>
						</View>
					)}

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>ASSIGNEES</Text>
						<AssigneeDropdown
							theme={theme}
							disabled={savingField === "assignees"}
							members={orgMembers}
							selectedIds={(data.assignees ?? []).map((a) => a?.id).filter((id): id is string => Boolean(id))}
							onChange={onSetAssignees}
						/>
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
				<SendToAgentModal theme={theme} navigation={navigation} task={data} onClose={() => setSendOpen(false)} />
			)}
		</ScrollView>
	);
}

/** A single-select "current value, tap to expand a list below it" control — this repo's own version of `github-board`'s floating `ChoicePopover`, simplified to an inline accordion instead of a `measureInWindow`-positioned overlay. */
function Dropdown({
	theme,
	disabled,
	currentLabel,
	currentColor,
	options,
	selectedValue,
	onSelect,
}: {
	theme: Theme;
	disabled: boolean;
	currentLabel: string;
	currentColor: string;
	options: { value: string; label: string; color: string }[];
	selectedValue: string;
	onSelect: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const styles = useMemo(
		() => ({
			trigger: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: 8,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingVertical: 8,
				paddingHorizontal: 10,
				alignSelf: "flex-start" as const,
				minWidth: 160,
			},
			dot: { width: 8, height: 8, borderRadius: 4 },
			label: { color: theme.colors.foreground, fontSize: 13, flex: 1 },
			menu: {
				marginTop: 4,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				backgroundColor: theme.colors.surface1,
				overflow: "hidden" as const,
			},
			row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, padding: 10 },
			rowLabel: { color: theme.colors.foreground, fontSize: 13, flex: 1 },
		}),
		[theme]
	);

	return (
		<View>
			<Pressable
				accessibilityRole="button"
				disabled={disabled}
				style={[styles.trigger, disabled ? { opacity: 0.6 } : null]}
				onPress={() => setOpen((v) => !v)}
			>
				<View style={[styles.dot, { backgroundColor: currentColor }]} />
				<Text style={styles.label}>{currentLabel}</Text>
				<Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} color={theme.colors.foregroundMuted} />
			</Pressable>
			{open && (
				<View style={styles.menu}>
					{options.map((option) => (
						<Pressable
							key={option.value}
							accessibilityRole="button"
							style={styles.row}
							onPress={() => {
								setOpen(false);
								if (option.value !== selectedValue) onSelect(option.value);
							}}
						>
							<View style={[styles.dot, { backgroundColor: option.color }]} />
							<Text style={styles.rowLabel}>{option.label}</Text>
							{option.value === selectedValue && (
								<Icon name="Check" size={14} color={theme.colors.foregroundMuted} />
							)}
						</Pressable>
					))}
				</View>
			)}
		</View>
	);
}

function AssigneeDropdown({
	theme,
	disabled,
	members,
	selectedIds,
	onChange,
}: {
	theme: Theme;
	disabled: boolean;
	members: { userId: string; user: { name?: string | null } }[];
	selectedIds: string[];
	onChange: (userIds: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const selected = new Set(selectedIds);
	const label =
		selectedIds.length === 0
			? "Unassigned"
			: members
					.filter((m) => selected.has(m.userId))
					.map((m) => m.user.name ?? m.userId)
					.join(", ") || `${selectedIds.length} assigned`;

	const styles = useMemo(
		() => ({
			trigger: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: 8,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingVertical: 8,
				paddingHorizontal: 10,
				alignSelf: "flex-start" as const,
				minWidth: 160,
			},
			label: { color: theme.colors.foreground, fontSize: 13, flex: 1 },
			menu: {
				marginTop: 4,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				backgroundColor: theme.colors.surface1,
				overflow: "hidden" as const,
			},
			row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, padding: 10 },
			rowLabel: { color: theme.colors.foreground, fontSize: 13, flex: 1 },
			empty: { color: theme.colors.foregroundMuted, fontSize: 13, padding: 10 },
		}),
		[theme]
	);

	if (members.length === 0) {
		return <Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>No other members in this org.</Text>;
	}

	return (
		<View>
			<Pressable
				accessibilityRole="button"
				disabled={disabled}
				style={[styles.trigger, disabled ? { opacity: 0.6 } : null]}
				onPress={() => setOpen((v) => !v)}
			>
				<Text style={styles.label} numberOfLines={1}>
					{label}
				</Text>
				<Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} color={theme.colors.foregroundMuted} />
			</Pressable>
			{open && (
				<View style={styles.menu}>
					{members.map((member) => {
						const active = selected.has(member.userId);
						return (
							<Pressable
								key={member.userId}
								accessibilityRole="button"
								style={styles.row}
								onPress={() => {
									const next = new Set(selected);
									if (active) next.delete(member.userId);
									else next.add(member.userId);
									onChange([...next]);
								}}
							>
								<Icon
									name={active ? "SquareCheck" : "Square"}
									size={16}
									color={active ? theme.colors.accent : theme.colors.foregroundMuted}
								/>
								<Text style={styles.rowLabel}>{member.user.name ?? member.userId}</Text>
							</Pressable>
						);
					})}
				</View>
			)}
		</View>
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
