import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getSettingsRpc, setAgentInstructionsRpc, setCliBinRpc } from "../shared/settings";

const QUICK_PICKS = ["sayr", "sayr-local"];

export function SayrSettingsScreen({ theme, layout }: PluginSurfaceProps) {
	const getSettings = useRpc(getSettingsRpc);
	const setCliBin = useRpc(setCliBinRpc);
	const setAgentInstructions = useRpc(setAgentInstructionsRpc);
	const toast = useToast();
	const { data, refetch } = useQuery({
		queryKey: ["sayr", "settings"],
		queryFn: () => getSettings({}),
	});
	const [cliBin, setCliBinValue] = useState("");
	const [instructions, setInstructions] = useState("");
	const [savingCliBin, setSavingCliBin] = useState(false);
	const [savingInstructions, setSavingInstructions] = useState(false);

	useEffect(() => {
		if (!data) return;
		setCliBinValue(data.cliBin);
		setInstructions(data.defaultAgentInstructions);
	}, [data]);

	const styles = useMemo(
		() => ({
			screen: {
				flex: 1,
				padding: layout.compact ? 16 : 24,
				gap: 12,
				backgroundColor: theme.colors.surface0,
			},
			section: { gap: 12, marginTop: 24 },
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
			textarea: {
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				padding: 10,
				color: theme.colors.foreground,
				backgroundColor: theme.colors.surface1,
				minHeight: 100,
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

	async function saveCliBin() {
		setSavingCliBin(true);
		try {
			await setCliBin({ cliBin: cliBin.trim() || "sayr" });
			await refetch();
			toast.show("Saved.", { variant: "success" });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save.");
		} finally {
			setSavingCliBin(false);
		}
	}

	async function saveInstructions() {
		setSavingInstructions(true);
		try {
			await setAgentInstructions({ defaultAgentInstructions: instructions });
			await refetch();
			toast.show("Saved.", { variant: "success" });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save.");
		} finally {
			setSavingInstructions(false);
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
				value={cliBin}
				onChangeText={setCliBinValue}
				style={styles.input}
				placeholder="sayr"
				autoCapitalize="none"
				autoCorrect={false}
			/>
			<View style={styles.row}>
				{QUICK_PICKS.map((pick) => (
					<Pressable
						key={pick}
						accessibilityRole="button"
						style={styles.pick}
						onPress={() => setCliBinValue(pick)}
					>
						<Text style={styles.pickText}>{pick}</Text>
					</Pressable>
				))}
			</View>
			<Pressable accessibilityRole="button" style={styles.button} onPress={saveCliBin} disabled={savingCliBin}>
				<Text style={styles.buttonText}>{savingCliBin ? "Saving…" : "Save"}</Text>
			</Pressable>

			<View style={styles.section}>
				<Text style={styles.label}>Default agent instructions</Text>
				<Text style={styles.help}>
					Prefilled every time you "Send to agent" from a task — still editable there before actually starting the
					agent, this is just the starting point (e.g. "always write tests" or "use TypeScript strict mode").
				</Text>
				<TextInput
					value={instructions}
					onChangeText={setInstructions}
					style={styles.textarea}
					placeholder="e.g. Always write tests for new code."
					multiline
				/>
				<Pressable
					accessibilityRole="button"
					style={styles.button}
					onPress={saveInstructions}
					disabled={savingInstructions}
				>
					<Text style={styles.buttonText}>{savingInstructions ? "Saving…" : "Save"}</Text>
				</Pressable>
			</View>
		</View>
	);
}
