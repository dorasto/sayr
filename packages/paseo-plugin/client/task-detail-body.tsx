import { useRpc } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { type UseQueryResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { extractPlainText, type ProsekitNode } from "../shared/prosekit";
import {
	categoryName,
	listOrgsRpc,
	PRIORITY_COLORS,
	PRIORITY_LABELS,
	STATUS_COLORS,
	STATUS_LABELS,
	setAssigneesRpc,
	TASK_PRIORITIES,
	TASK_STATUSES,
	type TaskDetail,
	updateTaskPriorityRpc,
	updateTaskStatusRpc,
} from "../shared/task";
import { AssigneeDropdown } from "./assignee-dropdown";
import { CommentsSection } from "./comments-section";
import { SelectDropdown } from "./select-dropdown";
import { SendToAgentModal } from "./send-to-agent-modal";
import type { Navigation, Theme } from "./types";

/** The task detail sheet's main content: status/priority/assignees, description, AI summary, "send to agent", and comments. */
export function TaskDetailBody({
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
						<SelectDropdown
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
						<SelectDropdown
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
