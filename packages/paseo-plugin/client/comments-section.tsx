import { useRpc } from "@getpaseo/plugin/client";
import { TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { createCommentRpc, listCommentsRpc, type TaskComment } from "../shared/task";
import { CommentRow } from "./comment-row";
import type { MentionResolvers } from "./prosekit-view";
import type { Theme } from "./types";

/**
 * The task detail sheet's comment thread — oldest at the top, newest at the
 * bottom, composer pinned below the list, matching the real web app's actual
 * timeline (`apps/start/src/components/tasks/task/timeline/root.tsx`: an
 * ascending `createdAt` sort with the composer in a `mt-auto` wrapper below
 * it). The API itself returns comments newest-first (`getTaskComments`'s own
 * `orderBy: desc(createdAt)`, shared with the CLI) — reversed here for
 * display, and "load more" (an *older* page) is prepended above what's
 * already shown rather than appended, so the whole list stays chronological.
 */
export function CommentsSection({
	theme,
	taskId,
	orgSlug,
	initialComments,
	initialTotal,
	onPosted,
	resolvers,
	onOpenTask,
}: {
	theme: Theme;
	taskId: string;
	orgSlug: string;
	initialComments: TaskComment[];
	initialTotal: number;
	onPosted: () => Promise<void>;
	resolvers?: MentionResolvers;
	onOpenTask?: (taskId: string) => void;
}) {
	const listComments = useRpc(listCommentsRpc);
	const createComment = useRpc(createCommentRpc);
	const toast = useToast();
	// Oldest-first from the start — the API/CLI hand back newest-first pages.
	const [comments, setComments] = useState(() => [...initialComments].reverse());
	const [total, setTotal] = useState(initialTotal);
	const [page, setPage] = useState(1);
	const [loadingMore, setLoadingMore] = useState(false);
	const [draft, setDraft] = useState("");
	const [posting, setPosting] = useState(false);

	const styles = useMemo(
		() => ({
			empty: { color: theme.colors.foregroundMuted, fontSize: 13 },
			more: { color: theme.colors.accent, fontSize: 13, marginBottom: 10 },
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

	async function loadOlder() {
		setLoadingMore(true);
		try {
			const next = page + 1;
			const result = await listComments({ taskId, orgSlug, page: next });
			// This page is itself newest-first; reverse it before prepending so
			// the older batch reads oldest-to-newest same as the rest.
			setComments((prev) => [...result.comments].reverse().concat(prev));
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
			setComments([...result.comments].reverse());
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
			{comments.length < total && (
				<Pressable accessibilityRole="button" onPress={loadOlder} disabled={loadingMore}>
					<Text style={styles.more}>{loadingMore ? "Loading…" : "Load earlier comments"}</Text>
				</Pressable>
			)}
			{comments.length === 0 ? (
				<Text style={styles.empty}>No comments yet.</Text>
			) : (
				comments.map((comment) => (
					<CommentRow
						key={comment.id}
						theme={theme}
						comment={comment}
						resolvers={resolvers}
						onOpenTask={onOpenTask}
					/>
				))
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
