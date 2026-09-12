import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";

const DESKTOP_WIDTH = 440;
const ANIMATION_MS = 220;

/**
 * A non-modal sliding side panel, in the spirit of `github-board`'s own
 * detail panel (an animated slide-in with a draggable resize handle) — this
 * is the "somewhat replicate" version: animated slide-in from the right,
 * fixed width rather than draggable. `Modal` (the host-provided component)
 * stays centered/dialog-shaped regardless of content, which read as a poor
 * fit for "look at this task while glancing at the board behind it."
 */
export function Sheet({
	open,
	onClose,
	title,
	theme,
	compact,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	theme: PluginTheme;
	compact: boolean;
	children: ReactNode;
}) {
	const width = compact ? Dimensions.get("window").width : DESKTOP_WIDTH;
	const translateX = useRef(new Animated.Value(width)).current;

	useEffect(() => {
		Animated.timing(translateX, {
			toValue: open ? 0 : width,
			duration: ANIMATION_MS,
			useNativeDriver: true,
		}).start();
	}, [open, width, translateX]);

	if (!open) return null;

	return (
		<View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Close panel"
				style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.35)" }]}
				onPress={onClose}
			/>
			<Animated.View
				style={{
					position: "absolute",
					top: 0,
					bottom: 0,
					right: 0,
					width,
					backgroundColor: theme.colors.surface0,
					borderLeftWidth: 1,
					borderLeftColor: theme.colors.border,
					transform: [{ translateX }],
				}}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						padding: 16,
						borderBottomWidth: 1,
						borderBottomColor: theme.colors.border,
					}}
				>
					<Text style={{ color: theme.colors.foreground, fontSize: 16, fontWeight: "600", flexShrink: 1 }}>
						{title}
					</Text>
					<Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
						<Icon name="X" size={18} color={theme.colors.foregroundMuted} />
					</Pressable>
				</View>
				<View style={{ flex: 1, padding: 16 }}>{children}</View>
			</Animated.View>
		</View>
	);
}
