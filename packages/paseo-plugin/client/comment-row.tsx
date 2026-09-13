import { useRpc } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ProsekitNode } from "../shared/prosekit";
import { listRepliesRpc, type TaskComment } from "../shared/task";
import { Avatar } from "./avatar";
import { type MentionResolvers, ProsekitView } from "./prosekit-view";
import type { Theme } from "./types";

function AuthorLine({
	theme,
	name,
	imageUrl,
	suffix,
}: {
	theme: Theme;
	name: string | null | undefined;
	imageUrl?: string | null;
	suffix?: string;
}) {
	return (
		<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
			<Avatar theme={theme} name={name} imageUrl={imageUrl} size={20} />
			<Text style={{ color: theme.colors.foreground, fontSize: 13, fontWeight: "600" }}>
				{name ?? "Someone"}
				{suffix ?? ""}
			</Text>
		</View>
	);
}

/** One comment, with its reply thread lazily loaded on expand (not fetched until asked). */
export function CommentRow({
	theme,
	orgSlug,
	comment,
	resolvers,
	onOpenTask,
}: {
	theme: Theme;
	orgSlug: string;
	comment: TaskComment;
	resolvers?: MentionResolvers;
	onOpenTask?: (taskId: string) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const [page, setPage] = useState(1);
	const [extraReplies, setExtraReplies] = useState<TaskComment[]>([]);
	const [loadingMoreReplies, setLoadingMoreReplies] = useState(false);
	const listReplies = useRpc(listRepliesRpc);
	const replyCount = comment.replyCount ?? 0;
	const { data, isLoading } = useQuery({
		queryKey: ["sayr", "replies", comment.id],
		queryFn: () => listReplies({ commentId: comment.id }),
		enabled: expanded && replyCount > 0,
	});
	// Replies come back oldest-first (unlike top-level comments' newest-first
	// pages), so later pages are appended below rather than prepended above.
	const replies = [...(data?.replies ?? []), ...extraReplies];

	const styles = useMemo(
		() => ({
			row: { marginBottom: 10, paddingLeft: 0 },
			body: { marginTop: 2, marginLeft: 26 },
			meta: { color: theme.colors.foregroundMuted, fontSize: 11, marginTop: 2, marginLeft: 26 },
			reply: { marginTop: 6, marginLeft: 16 },
			loadMore: { color: theme.colors.accent, fontSize: 12, marginTop: 4, marginLeft: 16 },
		}),
		[theme]
	);

	async function loadMoreReplies() {
		setLoadingMoreReplies(true);
		try {
			const next = page + 1;
			const result = await listReplies({ commentId: comment.id, page: next });
			setExtraReplies((prev) => [...prev, ...result.replies]);
			setPage(next);
		} finally {
			setLoadingMoreReplies(false);
		}
	}

	return (
		<View style={styles.row}>
			<AuthorLine
				theme={theme}
				name={comment.createdBy?.name}
				imageUrl={comment.createdBy?.image}
				suffix={comment.visibility === "internal" ? " (internal)" : ""}
			/>
			{comment.content ? (
				<View style={styles.body}>
					<ProsekitView
						theme={theme}
						orgSlug={orgSlug}
						doc={comment.content as ProsekitNode}
						resolvers={resolvers}
						onOpenTask={onOpenTask}
					/>
				</View>
			) : null}
			{replyCount > 0 && (
				<Pressable accessibilityRole="button" onPress={() => setExpanded((v) => !v)}>
					<Text style={styles.meta}>
						{expanded ? "Hide" : "Show"} {replyCount} repl{replyCount === 1 ? "y" : "ies"}
					</Text>
				</Pressable>
			)}
			{expanded && isLoading && <Text style={styles.meta}>Loading replies…</Text>}
			{expanded &&
				replies.map((reply) => (
					<View key={reply.id} style={styles.reply}>
						<AuthorLine theme={theme} name={reply.createdBy?.name} imageUrl={reply.createdBy?.image} />
						{reply.content ? (
							<View style={styles.body}>
								<ProsekitView
									theme={theme}
									orgSlug={orgSlug}
									doc={reply.content as ProsekitNode}
									resolvers={resolvers}
									onOpenTask={onOpenTask}
								/>
							</View>
						) : null}
					</View>
				))}
			{expanded && replies.length < replyCount && (
				<Pressable accessibilityRole="button" onPress={loadMoreReplies} disabled={loadingMoreReplies}>
					<Text style={styles.loadMore}>{loadingMoreReplies ? "Loading…" : "Load more replies"}</Text>
				</Pressable>
			)}
		</View>
	);
}
