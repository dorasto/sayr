import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Avatar } from "./avatar";
import type { Theme } from "./types";

export interface AssigneeCandidate {
	userId: string;
	user: { name?: string | null; image?: string | null };
}

/** A multi-select dropdown for a task's assignees, sourced from the org's real member list. */
export function AssigneeDropdown({
	theme,
	disabled,
	members,
	selectedIds,
	onChange,
}: {
	theme: Theme;
	disabled: boolean;
	members: AssigneeCandidate[];
	selectedIds: string[];
	onChange: (userIds: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const selected = new Set(selectedIds);
	const selectedMembers = members.filter((m) => selected.has(m.userId));

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
			avatarStack: { flexDirection: "row" as const },
			stackedAvatar: { marginLeft: -6, borderWidth: 2, borderRadius: 999 },
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

	if (members.length === 0) {
		return <Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>No other members in this org.</Text>;
	}

	const label =
		selectedMembers.length === 0
			? "Unassigned"
			: selectedMembers.map((m) => m.user.name ?? m.userId).join(", ") || `${selectedIds.length} assigned`;

	return (
		<View>
			<Pressable
				accessibilityRole="button"
				disabled={disabled}
				style={[styles.trigger, disabled ? { opacity: 0.6 } : null]}
				onPress={() => setOpen((v) => !v)}
			>
				{selectedMembers.length > 0 && (
					<View style={styles.avatarStack}>
						{selectedMembers.map((member, index) => (
							<View
								key={member.userId}
								style={[
									styles.stackedAvatar,
									{ borderColor: theme.colors.surface0, marginLeft: index === 0 ? 0 : -6 },
								]}
							>
								<Avatar theme={theme} name={member.user.name} imageUrl={member.user.image} size={18} />
							</View>
						))}
					</View>
				)}
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
								<Avatar theme={theme} name={member.user.name} imageUrl={member.user.image} size={20} />
								<Text style={styles.rowLabel}>{member.user.name ?? member.userId}</Text>
							</Pressable>
						);
					})}
				</View>
			)}
		</View>
	);
}
