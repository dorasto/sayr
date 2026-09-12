import { Icon } from "@getpaseo/plugin/client/react-native";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { Theme } from "./types";
import { trackPointerOnDocument } from "./web";

/**
 * Sizing mirrors the installed `github-board` plugin's real `ItemDetailPanel`
 * (under `~/.paseo/plugins/github-board`, `client/board.tsx` around line 2815)
 * rather than a guess: half the board's width by default, a drag handle
 * anchored to the panel's own edge, min widths on both sides so neither the
 * panel nor the board behind it can be dragged to nothing.
 */
const MIN_PANEL_WIDTH = 380;
const MIN_BOARD_WIDTH = 280;
const DEFAULT_FRACTION = 0.5;
const ANIMATION_MS = 220;

export function Sheet({
	open,
	onClose,
	title,
	theme,
	compact,
	bodyWidth,
	width,
	onWidthChange,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	theme: Theme;
	compact: boolean;
	/** The board's own measured width (`onLayout` in `board.tsx`), or null before first layout. Resizing is disabled on compact/mobile regardless. */
	bodyWidth: number | null;
	/** The panel's current width in px, owned by the parent so it survives closing/reopening a different task within the same session. */
	width: number | null;
	onWidthChange: (width: number) => void;
	children: ReactNode;
}) {
	const fallbackWidth = compact ? Dimensions.get("window").width : MIN_PANEL_WIDTH;
	const maxWidth = bodyWidth !== null ? Math.max(MIN_PANEL_WIDTH, bodyWidth - MIN_BOARD_WIDTH) : null;
	const defaultWidth =
		bodyWidth !== null
			? Math.min(maxWidth ?? bodyWidth, Math.max(MIN_PANEL_WIDTH, bodyWidth * DEFAULT_FRACTION))
			: fallbackWidth;
	const resolvedWidth = compact ? fallbackWidth : (width ?? defaultWidth);

	const translateProgress = useRef(new Animated.Value(open ? 0 : 1)).current;
	useEffect(() => {
		Animated.timing(translateProgress, {
			toValue: open ? 0 : 1,
			duration: ANIMATION_MS,
			useNativeDriver: true,
		}).start();
	}, [open, translateProgress]);

	// A ref, not state: the responder is created once (memoized) and must see
	// the latest width/pageX at grant time without being rebuilt every render.
	const dragStart = useRef<{ pageX: number; width: number } | null>(null);
	const maxWidthRef = useRef(maxWidth);
	maxWidthRef.current = maxWidth;
	const resolvedWidthRef = useRef(resolvedWidth);
	resolvedWidthRef.current = resolvedWidth;
	/** Detaches the document-level listeners a web drag installed; a no-op on native. */
	const stopTracking = useRef<() => void>(() => {});
	useEffect(() => () => stopTracking.current(), []);

	const [resizing, setResizing] = useState(false);
	const resizer = useMemo(() => {
		const applyDelta = (dx: number) => {
			const start = dragStart.current;
			if (!start) return;
			// The panel is anchored to the right edge, so a pointer moving left
			// (negative dx) grows it.
			const upperBound = maxWidthRef.current ?? start.width - dx;
			const next = Math.min(upperBound, Math.max(MIN_PANEL_WIDTH, start.width - dx));
			onWidthChange(next);
		};
		const finish = () => {
			stopTracking.current();
			stopTracking.current = () => {};
			dragStart.current = null;
			setResizing(false);
		};
		return PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			// Never hand the gesture over — every ScrollView the pointer crosses
			// on its way across the board would otherwise claim it, which is
			// exactly the "resize gets stuck partway" symptom.
			onPanResponderTerminationRequest: () => false,
			onShouldBlockNativeResponder: () => true,
			onPanResponderGrant: (event) => {
				const pageX = event.nativeEvent.pageX;
				dragStart.current = { pageX, width: resolvedWidthRef.current };
				setResizing(true);
				// PanResponder alone loses the drag on web once the pointer leaves
				// this 12px handle or crosses a ScrollView — document-level
				// listeners see every move regardless of what's under the pointer.
				stopTracking.current = trackPointerOnDocument((clientX) => applyDelta(clientX - pageX), finish);
			},
			onPanResponderMove: (_event, gesture) => applyDelta(gesture.dx),
			onPanResponderRelease: finish,
			onPanResponderTerminate: finish,
		});
	}, [onWidthChange]);

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
					width: resolvedWidth,
					backgroundColor: theme.colors.surface0,
					borderLeftWidth: 1,
					borderLeftColor: theme.colors.border,
					transform: [
						{
							translateX: translateProgress.interpolate({
								inputRange: [0, 1],
								outputRange: [0, resolvedWidth],
							}),
						},
					],
				}}
			>
				{!compact && (
					<View
						{...resizer.panHandlers}
						accessibilityLabel="Drag to resize panel"
						style={{
							position: "absolute",
							top: 0,
							bottom: 0,
							left: -6,
							width: 12,
							alignItems: "center",
							justifyContent: "center",
							zIndex: 1,
							...(Platform.OS === "web" ? ({ cursor: "col-resize" } as object) : {}),
						}}
					>
						<View
							style={{
								width: 2,
								height: "100%",
								backgroundColor: resizing ? theme.colors.accent : "transparent",
							}}
						/>
					</View>
				)}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
						padding: 16,
						borderBottomWidth: 1,
						borderBottomColor: theme.colors.border,
					}}
				>
					<Text
						style={{ color: theme.colors.foreground, fontSize: 16, fontWeight: "600", flexShrink: 1 }}
						numberOfLines={1}
					>
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
