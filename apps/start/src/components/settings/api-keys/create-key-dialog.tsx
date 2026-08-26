import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import type { ApiKeyScope } from "@repo/util";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScopePicker } from "@/components/settings/api-keys/scope-picker";
import { type ApiKeyWithSecret, createApiKey } from "@/lib/fetches/apiKeys";
import { useToastAction } from "@/lib/util";

/** Better Auth bounds key names to 1–32 characters. */
const MAX_NAME_LENGTH = 32;

const EXPIRY_OPTIONS = [
	{ value: "never", label: "Never" },
	{ value: "30", label: "30 days" },
	{ value: "90", label: "90 days" },
	{ value: "365", label: "365 days" },
];

const DEFAULT_EXPIRY = "90";

interface CreateKeyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called with the created key so the caller can reveal the plaintext secret exactly once. */
	onCreated: (apiKey: ApiKeyWithSecret) => void;
}

export function CreateKeyDialog({ open, onOpenChange, onCreated }: CreateKeyDialogProps) {
	const queryClient = useQueryClient();
	const { runWithToast } = useToastAction();

	const [name, setName] = useState("");
	const [scopes, setScopes] = useState<ApiKeyScope[]>([]);
	const [expiry, setExpiry] = useState(DEFAULT_EXPIRY);

	const trimmedName = name.trim();
	const canSubmit = trimmedName.length > 0 && scopes.length > 0;

	const resetForm = () => {
		setName("");
		setScopes([]);
		setExpiry(DEFAULT_EXPIRY);
	};

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
			onCreated(result.data);
			resetForm();
			onOpenChange(false);
		},
	});

	const handleOpenChange = (next: boolean) => {
		if (createMutation.isPending) return;
		if (!next) resetForm();
		onOpenChange(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Create API key</DialogTitle>
					<DialogDescription>
						Personal API keys act on your behalf. Give the key a name and grant it only the scopes it needs.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[60vh] pr-3">
					<div className="flex flex-col gap-4">
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
					</div>
				</ScrollArea>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)} disabled={createMutation.isPending}>
						Cancel
					</Button>
					<Button onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>
						{createMutation.isPending ? "Creating..." : "Create key"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
