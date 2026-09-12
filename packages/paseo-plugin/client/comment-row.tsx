import { useRpc } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { extractPlainText, type ProsekitNode } from "../shared/prosekit";
import { listRepliesRpc, type TaskComment } from "../shared/task";
import type { Theme } from "./types";

/** One comment, with its reply thread lazily loaded on expand (not fetched until asked). */
export function CommentRow({ theme, comment }: { theme: Theme; comment: TaskComment }) {
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
