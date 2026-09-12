import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getSettingsRpc, setCliBinRpc } from "../shared/settings";

const QUICK_PICKS = ["sayr", "sayr-local"];

export function SayrSettingsScreen({ theme, layout }: PluginSurfaceProps) {
	const getSettings = useRpc(getSettingsRpc);
	const setCliBin = useRpc(setCliBinRpc);
	const toast = useToast();
	const { data, refetch } = useQuery({
		queryKey: ["sayr", "settings"],
		queryFn: () => getSettings({}),
	});
	const [value, setValue] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (data) setValue(data.cliBin);
	}, [data]);

	const styles = useMemo(
		() => ({
			screen: {
				flex: 1,
				padding: layout.compact ? 16 : 24,
				gap: 12,
				backgroundColor: theme.colors.surface0,
			},
			label: {
				color: theme.colors.foreground,
				fontSize: 14,
				fontWeight: "600" as const,
			},
			help: { color: theme.colors.foregroundMuted, fontSize: 13 },
			input: {
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				padding: 10,
				color: theme.colors.foreground,
				backgroundColor: theme.colors.surface1,
			},
			row: { flexDirection: "row" as const, gap: 8 },
			pick: {
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingVertical: 6,
				paddingHorizontal: 10,
			},
			pickText: { color: theme.colors.foreground, fontSize: 12 },
			button: {
				alignSelf: "flex-start" as const,
				backgroundColor: theme.colors.accent,
				paddingVertical: 8,
				paddingHorizontal: 14,
				borderRadius: 6,
			},
			buttonText: {
				color: theme.colors.accentForeground,
				fontSize: 13,
				fontWeight: "600" as const,
			},
		}),
		[theme, layout.compact]
	);

	async function save() {
		setSaving(true);
		try {
			await setCliBin({ cliBin: value.trim() || "sayr" });
			await refetch();
			toast.show("Saved.", { variant: "success" });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<View style={styles.screen}>
			<Text style={styles.label}>CLI binary</Text>
			<Text style={styles.help}>
				Which installed `sayr`-compatible binary this plugin shells out to. Use `sayr-local` (or any
				`SAYR_PROFILE`-based binary — see packages/cli/README.md) to point this plugin at a local dev backend
				instead of production, without touching your normal `sayr` login.
			</Text>
			<TextInput
				value={value}
				onChangeText={setValue}
				style={styles.input}
				placeholder="sayr"
				autoCapitalize="none"
				autoCorrect={false}
			/>
			<View style={styles.row}>
				{QUICK_PICKS.map((pick) => (
					<Pressable key={pick} accessibilityRole="button" style={styles.pick} onPress={() => setValue(pick)}>
						<Text style={styles.pickText}>{pick}</Text>
					</Pressable>
				))}
			</View>
			<Pressable accessibilityRole="button" style={styles.button} onPress={save} disabled={saving}>
				<Text style={styles.buttonText}>{saving ? "Saving…" : "Save"}</Text>
			</Pressable>
		</View>
	);
}
