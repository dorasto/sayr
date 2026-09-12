import { Icon } from "@getpaseo/plugin/client/react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/**
 * A continuously-rotating icon while `spinning`, still otherwise. `Icon`
 * itself has no animation of its own, so this is a plain `Animated.View`
 * wrapper driven by a looped `Animated.timing`. Used by the board's refresh
 * button.
 */
export function SpinningIcon({
	name,
	size,
	color,
	spinning,
}: {
	name: string;
	size: number;
	color: string;
	spinning: boolean;
}) {
	const spin = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!spinning) return;
		spin.setValue(0);
		const loop = Animated.loop(
			Animated.timing(spin, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true })
		);
		loop.start();
		return () => loop.stop();
	}, [spinning, spin]);

	const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
	return (
		<Animated.View style={{ transform: [{ rotate: spinning ? rotate : "0deg" }] }}>
			<Icon name={name} size={size} color={color} />
		</Animated.View>
	);
}
