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
 * this repo's own version of `github-board`'s floating `ChoicePopover`,
 * simplified to an inline accordion instead of a `measureInWindow`-positioned
 * overlay. Used by the task detail sheet's status and priority fields.
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

	return (
		<View>
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
