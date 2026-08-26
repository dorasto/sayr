import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import type { ApiKeyScope } from "@repo/util";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApiKeys } from "@/components/settings/api-keys/context";
import { ScopePicker } from "@/components/settings/api-keys/scope-picker";
import { DEFAULT_EXPIRY, EXPIRY_OPTIONS, MAX_NAME_LENGTH } from "@/components/settings/api-keys/shared";
import { createApiKey } from "@/lib/fetches/apiKeys";
import { useToastAction } from "@/lib/util";

export function CreateKeyForm() {
	const queryClient = useQueryClient();
	const { runWithToast } = useToastAction();
	const { reveal, closePanel } = useApiKeys();

	const [name, setName] = useState("");
	const [scopes, setScopes] = useState<ApiKeyScope[]>([]);
	const [expiry, setExpiry] = useState(DEFAULT_EXPIRY);

	const trimmedName = name.trim();
	const canSubmit = trimmedName.length > 0 && scopes.length > 0;

	const createMutation = useMutation({
		mutationFn: async () =>
			runWithToast(
				"create-api-key",
				{
					loading: { title: "Creating API key...", description: `Creating "${trimmedName}"` },
					success: { title: "API key created", description: "Copy your key now — it won't be shown again." },
					error: { title: "Failed to create API key", description: "An error occurred." },
				},
				() =>
					createApiKey({
						name: trimmedName,
						scopes,
						expiresInDays: expiry === "never" ? null : Number(expiry),
					})
			),
		onSuccess: async (result) => {
			if (!result?.success || !result.data) return;
			await queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
			reveal(result.data, "created");
			setName("");
			setScopes([]);
			setExpiry(DEFAULT_EXPIRY);
			closePanel();
		},
	});

	return (
		<div className="flex flex-col gap-4">
			<p className="text-xs text-muted-foreground">
				Personal API keys act on your behalf. Give the key a name and grant it only the scopes it needs.
			</p>

			<div className="flex flex-col gap-2">
				<Label htmlFor="api-key-name" variant={"subheading"}>
					Name
				</Label>
				<Input
					id="api-key-name"
					placeholder="e.g. Local CLI"
					value={name}
					maxLength={MAX_NAME_LENGTH}
					disabled={createMutation.isPending}
					onChange={(e) => setName(e.target.value)}
				/>
				<span className="text-xs text-muted-foreground">
					{name.length}/{MAX_NAME_LENGTH} characters
				</span>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="api-key-expiry" variant={"subheading"}>
					Expires
				</Label>
				<Select value={expiry} onValueChange={setExpiry} disabled={createMutation.isPending}>
					<SelectTrigger id="api-key-expiry" className="w-full">
						<SelectValue placeholder="Select an expiry" />
					</SelectTrigger>
					<SelectContent>
						{EXPIRY_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<span className="text-xs text-muted-foreground">
					{expiry === "never"
						? "This key will work until you revoke it."
						: "Short-lived keys limit the damage if one leaks."}
				</span>
			</div>

			<div className="flex flex-col gap-2">
				<Label variant={"subheading"}>Scopes</Label>
				<ScopePicker value={scopes} onChange={setScopes} disabled={createMutation.isPending} />
			</div>

			<div className="flex items-center gap-2 pt-1">
				<Button
					className="flex-1"
					onClick={() => createMutation.mutate()}
					disabled={!canSubmit || createMutation.isPending}
				>
					{createMutation.isPending ? "Creating..." : "Create key"}
				</Button>
				<Button variant="outline" onClick={closePanel} disabled={createMutation.isPending}>
					Cancel
				</Button>
			</div>
		</div>
	);
}
