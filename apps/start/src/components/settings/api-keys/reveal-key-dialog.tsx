import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ApiKeyWithSecret } from "@/lib/fetches/apiKeys";

interface RevealKeyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	apiKey: ApiKeyWithSecret | null;
	/** Drives the copy — the same dialog is used after creating and after regenerating a key. */
	mode: "created" | "regenerated";
}

export function RevealKeyDialog({ open, onOpenChange, apiKey, mode }: RevealKeyDialogProps) {
	if (!apiKey) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-lg"
				showClose={false}
				onEscapeKeyDown={(event) => event.preventDefault()}
				onPointerDownOutside={(event) => event.preventDefault()}
				onInteractOutside={(event) => event.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle>{mode === "created" ? "API key created" : "API key regenerated"}</DialogTitle>
					<DialogDescription>
						{mode === "created"
							? "Copy your key now — this is the only time it will ever be shown."
							: "Your key has been rotated. The previous key no longer works. Copy the new key now — this is the only time it will ever be shown."}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3">
					<Alert>
						<IconAlertTriangle className="size-4" />
						<AlertTitle>Save it somewhere safe</AlertTitle>
						<AlertDescription className="text-xs text-muted-foreground">
							We store only a hash of this key. Once you close this dialog it cannot be retrieved again — you
							would have to regenerate the key.
						</AlertDescription>
					</Alert>

					<div className="flex items-center gap-2 rounded-lg border bg-muted p-2">
						<code className="flex-1 font-mono text-sm text-foreground break-all">{apiKey.key}</code>
						<SimpleClipboard textToCopy={apiKey.key} tooltipText="Copy API key" className="shrink-0" />
					</div>

					{apiKey.name && <p className="text-xs text-muted-foreground">Key name: {apiKey.name}</p>}
				</div>

				<DialogFooter>
					<Button onClick={() => onOpenChange(false)}>I've saved it</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
