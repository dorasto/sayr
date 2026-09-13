import { useRpc } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { type UseQueryResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ProsekitNode } from "../shared/prosekit";
import {
	createLabelRpc,
	listCategoriesRpc,
	listLabelsRpc,
	listOrgsRpc,
	PRIORITY_COLORS,
	PRIORITY_ICONS,
	PRIORITY_LABELS,
	resolveCategoryName,
	STATUS_COLORS,
	STATUS_ICONS,
	STATUS_LABELS,
	setAssigneesRpc,
	setLabelsRpc,
	TASK_PRIORITIES,
	TASK_STATUSES,
	type TaskDetail,
	updateTaskPriorityRpc,
	updateTaskStatusRpc,
} from "../shared/task";
import { AssigneeDropdown } from "./assignee-dropdown";
import { CommentsSection } from "./comments-section";
import { LabelDropdown } from "./label-dropdown";
import { ProsekitView } from "./prosekit-view";
import { SelectDropdown } from "./select-dropdown";
import type { Theme } from "./types";

/**
 * Gives a section its own stacking context, elevated above the sections
 * below it — needed because `styles.section` views are plain, unpositioned
 * siblings in the ScrollView's content column. A floating dropdown menu
 * (`select-dropdown.tsx`/`assignee-dropdown.tsx`/`label-dropdown.tsx`, all
 * `position: "absolute"`) only escapes ITS OWN section's stacking context if
 * that section itself is positioned with a z-index higher than every section
 * after it — otherwise a later, perfectly ordinary unpositioned sibling
 * still paints over it (the exact same "zIndex only competes within its own
 * parent's stacking context" issue `board-header.tsx` hit against `body`
 * earlier, just one level per section here instead of header-vs-body).
 * Descending values top-to-bottom: STATUS's open menu must clear PRIORITY/
 * LABELS/ASSIGNEES below it, PRIORITY's must clear LABELS/ASSIGNEES, etc.
 * Sections with no dropdown (description, AI summary, comments) need no
 * entry — plain unpositioned views already paint below anything positioned,
 * regardless of DOM order.
 */
function stackedSection(zIndex: number) {
	return { position: "relative" as const, zIndex };
}

/** The task detail sheet's main content: status/priority/assignees, description, AI summary, and comments. "Send to agent" lives in the sheet's own header now (`task-detail-sheet.tsx`), not buried down here. */
export function TaskDetailBody({
	theme,
	taskId,
	orgSlug,
	query,
	onOpenTask,
}: {
	theme: Theme;
	taskId: string;
	orgSlug: string;
	query: UseQueryResult<TaskDetail>;
	/** Opens another task (by id) in the same sheet — see `client/prosekit-view.tsx`'s `#task` mention pill. Always the current `orgSlug`: a task mention is only ever searched within the org it's written in. */
	onOpenTask: (taskId: string, orgSlug: string) => void;
}) {
	const updateStatus = useRpc(updateTaskStatusRpc);
	const updatePriority = useRpc(updateTaskPriorityRpc);
	const setAssignees = useRpc(setAssigneesRpc);
	const setLabels = useRpc(setLabelsRpc);
	const createLabel = useRpc(createLabelRpc);
	const listOrgsFn = useRpc(listOrgsRpc);
	const listCategoriesFn = useRpc(listCategoriesRpc);
	const listLabelsFn = useRpc(listLabelsRpc);
	const queryClient = useQueryClient();
	const toast = useToast();
	const [savingField, setSavingField] = useState<"status" | "priority" | "assignees" | "labels" | null>(null);

	const orgsQuery = useQuery({
		queryKey: ["sayr", "orgs"],
		queryFn: () => listOrgsFn({}),
	});
	const categoriesQuery = useQuery({
		queryKey: ["sayr", "categories", orgSlug],
		queryFn: () => listCategoriesFn({ orgSlug }),
	});
	const labelsQuery = useQuery({
		queryKey: ["sayr", "labels", orgSlug],
		queryFn: () => listLabelsFn({ orgSlug }),
	});
	const data = query.data;

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: ["sayr", "task", orgSlug, taskId],
			}),
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

	async function onSetLabels(labelIds: string[]) {
		setSavingField("labels");
		try {
			await setLabels({ taskId, orgSlug, labelIds });
			await refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update labels.");
		} finally {
			setSavingField(null);
		}
	}

	/** Surfaces a permission error (or any other failure) as a toast and returns `null` — `LabelDropdown` only reacts to whether this succeeded, it doesn't pre-check access itself. */
	async function onCreateLabel(name: string, visible: "public" | "private") {
		try {
			const created = await createLabel({ orgSlug, name, visible });
			await queryClient.invalidateQueries({ queryKey: ["sayr", "labels", orgSlug] });
			return created;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create label.");
			return null;
		}
	}

	const styles = useMemo(
		() => ({
			meta: { color: theme.colors.foregroundMuted, fontSize: 13 },
			section: { marginTop: 16, gap: 6 },
			sectionTitle: {
				color: theme.colors.foregroundMuted,
				fontSize: 12,
				fontWeight: "600" as const,
			},
			body: { color: theme.colors.foreground, fontSize: 14, lineHeight: 20 },
			errorText: { color: theme.colors.statusDanger, fontSize: 13 },
		}),
		[theme]
	);

	const orgMembers = orgsQuery.data?.orgs.find((org) => org.slug === orgSlug)?.members ?? [];
	const openMentionedTask = (mentionedTaskId: string) => onOpenTask(mentionedTaskId, orgSlug);

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
						{resolveCategoryName(data.category, categoriesQuery.data?.categories)
							? ` · ${resolveCategoryName(data.category, categoriesQuery.data?.categories)}`
							: ""}
					</Text>

					<View style={[styles.section, stackedSection(40)]}>
						<Text style={styles.sectionTitle}>STATUS</Text>
						<SelectDropdown
							theme={theme}
							disabled={savingField === "status"}
							currentLabel={STATUS_LABELS[data.status]}
							currentColor={STATUS_COLORS[data.status]}
							currentIcon={STATUS_ICONS[data.status]}
							options={TASK_STATUSES.map((status) => ({
								value: status,
								label: STATUS_LABELS[status],
								color: STATUS_COLORS[status],
								icon: STATUS_ICONS[status],
							}))}
							selectedValue={data.status}
							onSelect={(value) => onSetStatus(value as (typeof TASK_STATUSES)[number])}
						/>
					</View>

					<View style={[styles.section, stackedSection(30)]}>
						<Text style={styles.sectionTitle}>PRIORITY</Text>
						<SelectDropdown
							theme={theme}
							disabled={savingField === "priority"}
							currentLabel={PRIORITY_LABELS[data.priority]}
							currentColor={PRIORITY_COLORS[data.priority]}
							currentIcon={PRIORITY_ICONS[data.priority]}
							options={TASK_PRIORITIES.map((priority) => ({
								value: priority,
								label: PRIORITY_LABELS[priority],
								color: PRIORITY_COLORS[priority],
								icon: PRIORITY_ICONS[priority],
							}))}
							selectedValue={data.priority}
							onSelect={(value) => onSetPriority(value as (typeof TASK_PRIORITIES)[number])}
						/>
					</View>

					<View style={[styles.section, stackedSection(20)]}>
						<Text style={styles.sectionTitle}>LABELS</Text>
						<LabelDropdown
							theme={theme}
							disabled={savingField === "labels"}
							labels={labelsQuery.data?.labels ?? []}
							selectedIds={data.labels.map((l) => l.id)}
							onChange={onSetLabels}
							onCreateLabel={onCreateLabel}
						/>
					</View>

					<View style={[styles.section, stackedSection(10)]}>
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
							<ProsekitView
								theme={theme}
								orgSlug={orgSlug}
								doc={data.description as ProsekitNode}
								resolvers={{
									members: orgMembers,
									categories: categoriesQuery.data?.categories,
								}}
								onOpenTask={openMentionedTask}
							/>
						</View>
					) : null}

					{data.aiSummary?.summary && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>AI SUMMARY{data.aiSummary.isStale ? " (STALE)" : ""}</Text>
							<Text style={styles.body}>{data.aiSummary.summary}</Text>
						</View>
					)}

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>COMMENTS ({data.commentsTotal})</Text>
						<CommentsSection
							key={`${orgSlug}:${taskId}`}
							theme={theme}
							taskId={taskId}
							orgSlug={orgSlug}
							initialComments={data.comments}
							initialTotal={data.commentsTotal}
							onPosted={refresh}
							resolvers={{
								members: orgMembers,
								categories: categoriesQuery.data?.categories,
							}}
							onOpenTask={openMentionedTask}
						/>
					</View>
				</View>
			)}
		</ScrollView>
	);
}
