import { Icon, TextInput } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { LabelInfo } from "../shared/task";
import type { Theme } from "./types";

/**
 * A multi-select dropdown for a task's labels, sourced from the org's real
 * label list (`listLabelsRpc`) — plus an inline "add a label" row pinned
 * below the (scrollable) list for when the one you want doesn't exist yet.
 * Creating one is gated server-side by the `content.manageLabels` scope
 * (`apps/backend/routes/api/public/v1/me/labels.ts`); a caller without it
 * just gets an error here, same as any other write in this plugin — this
 * component doesn't pre-check permissions, it only reacts to whether the
 * attempt succeeded. The menu is a `position: "absolute"` overlay anchored
 * to the trigger (see `select-dropdown.tsx`'s header comment for the
 * reasoning) — opening it doesn't push the rest of the sheet's content down.
 */
export function LabelDropdown({
	theme,
	disabled,
	labels,
	selectedIds,
	onChange,
	onCreateLabel,
}: {
	theme: Theme;
	disabled: boolean;
	labels: LabelInfo[];
	selectedIds: string[];
	onChange: (labelIds: string[]) => void;
	/** Returns the created (or matching existing) label on success, `null` on failure — the caller already surfaced the error (e.g. a toast). */
	onCreateLabel: (name: string, visible: "public" | "private") => Promise<LabelInfo | null>;
}) {
	const [open, setOpen] = useState(false);
	const [newLabelName, setNewLabelName] = useState("");
	const [newLabelVisible, setNewLabelVisible] = useState<"public" | "private">("public");
	const [creating, setCreating] = useState(false);
	const selected = new Set(selectedIds);
	const selectedLabels = labels.filter((l) => selected.has(l.id));

	const styles = useMemo(
		() => ({
			anchor: { position: "relative" as const, alignSelf: "flex-start" as const },
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
				position: "absolute" as const,
				top: "100%" as const,
				left: 0,
				marginTop: 4,
				minWidth: 220,
				zIndex: 30,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				backgroundColor: theme.colors.surface1,
				overflow: "hidden" as const,
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.15,
				shadowRadius: 8,
				elevation: 6,
			},
			list: { maxHeight: 220 },
			row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, padding: 10 },
			dot: { width: 8, height: 8, borderRadius: 4 },
			rowLabel: { color: theme.colors.foreground, fontSize: 13, flex: 1 },
			privateHint: { color: theme.colors.foregroundMuted, fontSize: 11 },
			createRow: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: 6,
				padding: 8,
				borderTopWidth: 1,
				borderTopColor: theme.colors.border,
			},
			createInput: {
				flex: 1,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingVertical: 6,
				paddingHorizontal: 8,
				color: theme.colors.foreground,
				backgroundColor: theme.colors.surface0,
				fontSize: 13,
			},
			visibilityToggle: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: 4,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingVertical: 6,
				paddingHorizontal: 8,
			},
			visibilityToggleText: { color: theme.colors.foregroundMuted, fontSize: 11 },
		}),
		[theme]
	);

	async function submitNewLabel() {
		const name = newLabelName.trim();
		if (!name) return;
		setCreating(true);
		try {
			const created = await onCreateLabel(name, newLabelVisible);
			if (created) {
				onChange([...new Set([...selected, created.id])]);
				setNewLabelName("");
				setNewLabelVisible("public");
			}
		} finally {
			setCreating(false);
		}
	}

	const label = selectedLabels.length === 0 ? "No labels" : selectedLabels.map((l) => l.name).join(", ");

	return (
		<View style={styles.anchor}>
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
					<ScrollView style={styles.list}>
						{labels.map((item) => {
							const active = selected.has(item.id);
							return (
								<Pressable
									key={item.id}
									accessibilityRole="button"
									style={styles.row}
									onPress={() => {
										const next = new Set(selected);
										if (active) next.delete(item.id);
										else next.add(item.id);
										onChange([...next]);
									}}
								>
									<Icon
										name={active ? "SquareCheck" : "Square"}
										size={16}
										color={active ? theme.colors.accent : theme.colors.foregroundMuted}
									/>
									<View
										style={[styles.dot, { backgroundColor: item.color ?? theme.colors.foregroundMuted }]}
									/>
									<Text style={styles.rowLabel}>{item.name}</Text>
									{item.visible === "private" && <Text style={styles.privateHint}>Private</Text>}
								</Pressable>
							);
						})}
					</ScrollView>
					<View style={styles.createRow}>
						<TextInput
							value={newLabelName}
							onChangeText={setNewLabelName}
							placeholder="New label name…"
							style={styles.createInput}
							autoCapitalize="none"
							autoCorrect={false}
							editable={!creating}
						/>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								newLabelVisible === "private"
									? "New label will be private — tap to make it public"
									: "New label will be public — tap to make it private"
							}
							onPress={() => setNewLabelVisible((v) => (v === "private" ? "public" : "private"))}
							disabled={creating}
							style={styles.visibilityToggle}
						>
							<Icon
								name={newLabelVisible === "private" ? "Lock" : "Globe"}
								size={14}
								color={theme.colors.foregroundMuted}
							/>
							<Text style={styles.visibilityToggleText}>
								{newLabelVisible === "private" ? "Private" : "Public"}
							</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Create label"
							onPress={submitNewLabel}
							disabled={creating || !newLabelName.trim()}
						>
							<Icon
								name="Plus"
								size={16}
								color={newLabelName.trim() ? theme.colors.accent : theme.colors.foregroundMuted}
							/>
						</Pressable>
					</View>
				</View>
			)}
		</View>
	);
}
