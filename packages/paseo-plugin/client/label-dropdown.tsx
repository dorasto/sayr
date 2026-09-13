import { Icon, TextInput } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { LabelInfo } from "../shared/task";
import type { Theme } from "./types";

/**
 * A multi-select dropdown for a task's labels, sourced from the org's real
 * label list (`listLabelsRpc`) — plus an inline "add a label" row at the
 * bottom for when the one you want doesn't exist yet. Creating one is
 * gated server-side by the `content.manageLabels` scope
 * (`apps/backend/routes/api/public/v1/me/labels.ts`); a caller without it
 * just gets an error here, same as any other write in this plugin — this
 * component doesn't pre-check permissions, it only reacts to whether the
 * attempt succeeded.
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
				onChange([...selected, created.id]);
				setNewLabelName("");
				setNewLabelVisible("public");
			}
		} finally {
			setCreating(false);
		}
	}

	const label = selectedLabels.length === 0 ? "No labels" : selectedLabels.map((l) => l.name).join(", ");

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
								<View style={[styles.dot, { backgroundColor: item.color ?? theme.colors.foregroundMuted }]} />
								<Text style={styles.rowLabel}>{item.name}</Text>
								{item.visible === "private" && <Text style={styles.privateHint}>Private</Text>}
							</Pressable>
						);
					})}
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
