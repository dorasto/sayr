import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Theme } from "./types";

export interface SelectOption {
	value: string;
	label: string;
	color: string;
	/** Lucide icon name (e.g. from `STATUS_ICONS`/`PRIORITY_ICONS`) — shown colored by `color` instead of the plain dot when given. */
	icon?: string;
}

/**
 * A single-select "current value, tap to expand a list below it" control —
 * this repo's own version of `github-board`'s floating `ChoicePopover`. The
 * menu is a `position: "absolute"` overlay anchored to the trigger (like
 * `board-header.tsx`'s `FilterDropdown` already does), not an inline
 * accordion — opening it doesn't push the rest of the task detail sheet's
 * content down. Lighter than `ChoicePopover`'s own `measureInWindow`-based
 * positioning (which escapes any scrolling ancestor entirely): this trades
 * away correctness in the rare case a trigger sits close enough to the
 * bottom of the sheet's `ScrollView` that the open menu gets clipped, for
 * not needing a root-level portal just for a status/priority picker whose
 * triggers all live near the top of the sheet in practice. Used by the task
 * detail sheet's status and priority fields.
 */
export function SelectDropdown({
	theme,
	disabled,
	currentLabel,
	currentColor,
	currentIcon,
	options,
	selectedValue,
	onSelect,
}: {
	theme: Theme;
	disabled: boolean;
	currentLabel: string;
	currentColor: string;
	/** Lucide icon name — shown colored by `currentColor` instead of the plain dot when given. */
	currentIcon?: string;
	options: SelectOption[];
	selectedValue: string;
	onSelect: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
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
			dot: { width: 8, height: 8, borderRadius: 4 },
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
			row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, padding: 10 },
			rowLabel: { color: theme.colors.foreground, fontSize: 13, flex: 1 },
		}),
		[theme]
	);

	return (
		<View style={styles.anchor}>
			<Pressable
				accessibilityRole="button"
				disabled={disabled}
				style={[styles.trigger, disabled ? { opacity: 0.6 } : null]}
				onPress={() => setOpen((v) => !v)}
			>
				{currentIcon ? (
					<Icon name={currentIcon} size={14} color={currentColor} />
				) : (
					<View style={[styles.dot, { backgroundColor: currentColor }]} />
				)}
				<Text style={styles.label}>{currentLabel}</Text>
				<Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} color={theme.colors.foregroundMuted} />
			</Pressable>
			{open && (
				<View style={styles.menu}>
					{options.map((option) => (
						<Pressable
							key={option.value}
							accessibilityRole="button"
							style={styles.row}
							onPress={() => {
								setOpen(false);
								if (option.value !== selectedValue) onSelect(option.value);
							}}
						>
							{option.icon ? (
								<Icon name={option.icon} size={14} color={option.color} />
							) : (
								<View style={[styles.dot, { backgroundColor: option.color }]} />
							)}
							<Text style={styles.rowLabel}>{option.label}</Text>
							{option.value === selectedValue && (
								<Icon name="Check" size={14} color={theme.colors.foregroundMuted} />
							)}
						</Pressable>
					))}
				</View>
			)}
		</View>
	);
}
