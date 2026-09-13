import { useMemo } from "react";
import { Text, View } from "react-native";
import { Avatar } from "./avatar";
import type { Theme } from "./types";

/**
 * A `@user` mention pill (`client/prosekit-view.tsx`'s "user" mention kind) —
 * same muted button styling as `TaskMentionPill`, with the member's real
 * avatar when resolvable. `member` is `undefined` when the mentioned user
 * isn't in the caller's already-fetched org member list (no separate fetch —
 * unlike a task mention's status icon, a user's avatar is already sitting in
 * data callers have loaded for other reasons, e.g. the assignee picker), in
 * which case the mention's own stored `@username` text is shown with a
 * generic person icon instead of a broken lookup.
 */
export function UserMentionPill({
	theme,
	member,
	label,
}: {
	theme: Theme;
	member: { name?: string | null; image?: string | null } | undefined;
	label: string;
}) {
	const styles = useMemo(
		() => ({
			pill: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: 4,
				backgroundColor: theme.colors.surface2,
				borderRadius: 5,
				paddingHorizontal: 6,
				paddingVertical: 2,
			},
			label: { color: theme.colors.foreground, fontSize: 13, fontWeight: "600" as const },
		}),
		[theme]
	);

	return (
		<View style={styles.pill}>
			<Avatar
				theme={theme}
				name={member?.name}
				imageUrl={member?.image}
				size={14}
				fallbackIcon={member ? undefined : "User"}
			/>
			<Text style={styles.label}>{label}</Text>
		</View>
	);
}
