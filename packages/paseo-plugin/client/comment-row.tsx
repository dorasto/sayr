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
	comment,
	resolvers,
}: {
	theme: Theme;
	comment: TaskComment;
	resolvers?: MentionResolvers;
}) {
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
			body: { marginTop: 2, marginLeft: 26 },
			meta: { color: theme.colors.foregroundMuted, fontSize: 11, marginTop: 2, marginLeft: 26 },
			reply: { marginTop: 6, marginLeft: 16 },
		}),
		[theme]
	);

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
					<ProsekitView theme={theme} doc={comment.content as ProsekitNode} resolvers={resolvers} />
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
				data?.replies.map((reply) => (
					<View key={reply.id} style={styles.reply}>
						<AuthorLine theme={theme} name={reply.createdBy?.name} imageUrl={reply.createdBy?.image} />
						{reply.content ? (
							<View style={styles.body}>
								<ProsekitView theme={theme} doc={reply.content as ProsekitNode} resolvers={resolvers} />
							</View>
						) : null}
					</View>
				))}
		</View>
	);
}
