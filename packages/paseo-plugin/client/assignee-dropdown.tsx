import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Theme } from "./types";

export interface AssigneeCandidate {
	userId: string;
	user: { name?: string | null };
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
