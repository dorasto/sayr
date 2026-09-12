import { useRpc } from "@getpaseo/plugin/client";
import { TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { createCommentRpc, listCommentsRpc, type TaskComment } from "../shared/task";
import { CommentRow } from "./comment-row";
import type { Theme } from "./types";

/** The task detail sheet's comment thread: the list (paginated, "load more"), plus a composer to post a new one. */
export function CommentsSection({
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
