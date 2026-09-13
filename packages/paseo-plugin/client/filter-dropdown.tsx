import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Avatar } from "./avatar";
import type { Theme } from "./types";

export interface FilterOption<T extends string> {
	value: T;
	label: string;
	/** Optional swatch color, e.g. a priority's hex — mutually exclusive with `imageUrl`. */
	color?: string;
	/** Optional avatar, e.g. an org's logo — mutually exclusive with `color`/`icon`. */
	imageUrl?: string | null;
	/** Optional Lucide icon name, e.g. from `STATUS_ICONS`/`PRIORITY_ICONS` — colored by `color`, mutually exclusive with `imageUrl`. */
	icon?: string;
}

/**
 * A "N/M things ▾" trigger that expands an inline checkbox list, with
 * All/None shortcuts — modeled on the installed `github-board` plugin's own
 * `RepoFilter` (its repository picker). Used by `board-header.tsx` for both
 * the org and priority filters, so the two don't duplicate this markup.
 */
export function FilterDropdown<T extends string>({
	theme,
	noun,
	open,
	onToggleOpen,
	options,
	hidden,
	onToggle,
	onShowAll,
	onHideAll,
}: {
	theme: Theme;
	/** Plural noun shown in the trigger, e.g. "orgs" or "priorities". */
	noun: string;
	open: boolean;
	onToggleOpen: () => void;
	options: FilterOption<T>[];
	hidden: Set<T>;
	onToggle: (value: T) => void;
	onShowAll: () => void;
	onHideAll: () => void;
}) {
	const hiddenCount = options.filter((option) => hidden.has(option.value)).length;
	const shown = options.length - hiddenCount;
	const allShown = shown === options.length;

	const styles = useMemo(
		() => ({
			anchor: { position: "relative" as const },
			trigger: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: 4,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingHorizontal: 10,
				paddingVertical: 6,
			},
			triggerText: { color: theme.colors.foreground, fontSize: 12 },
			menu: {
				position: "absolute" as const,
				top: "100%" as const,
				left: 0,
				marginTop: 4,
				minWidth: 200,
				maxHeight: 320,
				zIndex: 10,
				backgroundColor: theme.colors.surface1,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 8,
				overflow: "hidden" as const,
			},
			actions: {
				flexDirection: "row" as const,
				gap: 6,
				paddingHorizontal: 8,
				paddingVertical: 6,
				borderBottomWidth: 1,
				borderBottomColor: theme.colors.border,
			},
			chip: {
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingHorizontal: 10,
				paddingVertical: 3,
			},
			chipText: { color: theme.colors.foreground, fontSize: 12 },
			row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, padding: 8 },
			checkbox: {
				width: 14,
				height: 14,
				borderRadius: 3,
				borderWidth: 1,
				borderColor: theme.colors.border,
				alignItems: "center" as const,
				justifyContent: "center" as const,
			},
			checkboxChecked: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
			rowLabel: { color: theme.colors.foreground, fontSize: 13, flex: 1 },
		}),
		[theme]
	);

	return (
		<View style={styles.anchor}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`Filter ${noun}: ${shown} of ${options.length} shown`}
				style={styles.trigger}
				onPress={onToggleOpen}
			>
				<Text style={styles.triggerText}>{allShown ? `All ${noun}` : `${shown}/${options.length} ${noun}`} ▾</Text>
			</Pressable>
			{open && (
				<View style={styles.menu}>
					<View style={styles.actions}>
						<Pressable style={styles.chip} onPress={onShowAll}>
							<Text style={styles.chipText}>All</Text>
						</Pressable>
						<Pressable style={styles.chip} onPress={onHideAll}>
							<Text style={styles.chipText}>None</Text>
						</Pressable>
					</View>
					<ScrollView>
						{options.map((option) => {
							const checked = !hidden.has(option.value);
							return (
								<Pressable
									key={option.value}
									accessibilityRole="checkbox"
									accessibilityState={{ checked }}
									style={styles.row}
									onPress={() => onToggle(option.value)}
								>
									<View style={[styles.checkbox, checked && styles.checkboxChecked]}>
										{checked && <Icon name="Check" size={10} color={theme.colors.accentForeground} />}
									</View>
									{option.imageUrl !== undefined && (
										<Avatar
											theme={theme}
											name={option.label}
											imageUrl={option.imageUrl}
											size={16}
											square
											fallbackIcon="Building2"
										/>
									)}
									{option.icon && (
										<Icon name={option.icon} size={14} color={option.color ?? theme.colors.foreground} />
									)}
									<Text
										style={[styles.rowLabel, option.color ? { color: option.color } : null]}
										numberOfLines={1}
									>
										{option.label}
									</Text>
								</Pressable>
							);
						})}
					</ScrollView>
				</View>
			)}
		</View>
	);
}
