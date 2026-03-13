import { authClient } from "@repo/auth/client";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Tile,
	TileAction,
	TileDescription,
	TileHeader,
	TileIcon,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { IconFingerprint, IconKey, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

type Passkey = {
	id: string;
	name: string | null;
	createdAt: Date | null;
};

export function PasskeySection() {
	const [passkeys, setPasskeys] = useState<Passkey[]>([]);
	const [loading, setLoading] = useState(true);

	const [showAddDialog, setShowAddDialog] = useState(false);
	const [newName, setNewName] = useState("");
	const [adding, setAdding] = useState(false);
	const [addError, setAddError] = useState("");

	const loadPasskeys = useCallback(async () => {
		try {
			const result = await authClient.passkey.listUserPasskeys();
			if (result.data) {
				setPasskeys(
					result.data.map((p) => ({
						...p,
						name: p.name ?? null,
						createdAt: p.createdAt ?? null,
					})),
				);
			}
		} catch (error) {
			console.error("Failed to load passkeys:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPasskeys();
	}, [loadPasskeys]);

	async function handleAdd() {
		if (!newName.trim()) {
			setAddError("Please enter a name for this passkey");
			return;
		}
		setAdding(true);
		setAddError("");
		try {
			const result = await authClient.passkey.addPasskey({
				name: newName.trim(),
			});
			if (result.error) {
				setAddError(result.error.message || "Failed to add passkey");
				return;
			}
			await loadPasskeys();
			setShowAddDialog(false);
			setNewName("");
		} catch (error) {
			console.error("Failed to add passkey:", error);
			setAddError("An unexpected error occurred");
		} finally {
			setAdding(false);
		}
	}

	async function handleRemove(id: string) {
		try {
			await authClient.passkey.deletePasskey({ id });
			setPasskeys((prev) => prev.filter((p) => p.id !== id));
		} catch (error) {
			console.error("Failed to remove passkey:", error);
		}
	}

	function formatDate(date: Date) {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	return (
		<>
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full">
					<TileHeader>
						<TileIcon className="size-10 bg-transparent">
							<div className="flex size-10 items-center justify-center rounded-md bg-accent">
								<IconKey className="size-5" />
							</div>
						</TileIcon>
						<TileTitle>Passkeys</TileTitle>
						<TileDescription className="text-xs">
							Use passkeys for passwordless, secure sign-in
						</TileDescription>
					</TileHeader>
					<TileAction>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setNewName("");
								setAddError("");
								setShowAddDialog(true);
							}}
						>
							<IconFingerprint className="size-4 mr-1" />
							Add Passkey
						</Button>
					</TileAction>
				</Tile>

				<div className="px-4 pb-4 pt-2 flex flex-col gap-2">
					{loading ? (
						<div className="text-sm text-muted-foreground">
							Loading passkeys...
						</div>
					) : passkeys.length === 0 ? (
						<div className="text-sm text-muted-foreground">
							No passkeys registered yet.
						</div>
					) : (
						passkeys.map((pk) => (
							<div
								key={pk.id}
								className="flex items-center justify-between p-3 rounded-md bg-accent/50"
							>
								<div className="flex items-center gap-3">
									<Avatar className="size-8">
										<AvatarFallback className="text-xs">
											<IconKey className="size-4" />
										</AvatarFallback>
									</Avatar>
									<div className="flex flex-col">
										<span className="text-sm font-medium">
											{pk.name ?? "Unnamed passkey"}
										</span>
										{pk.createdAt && (
											<span className="text-xs text-muted-foreground">
												Added {formatDate(pk.createdAt)}
											</span>
										)}
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleRemove(pk.id)}
								>
									<IconTrash className="size-4" />
								</Button>
							</div>
						))
					)}
				</div>
			</div>

			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add a Passkey</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-3 py-2">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="passkey-name">Passkey name</Label>
							<Input
								id="passkey-name"
								placeholder="e.g. Work Laptop, iPhone"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleAdd();
								}}
								disabled={adding}
							/>
						</div>
						{addError && (
							<p className="text-sm text-destructive">{addError}</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowAddDialog(false)}
							disabled={adding}
						>
							Cancel
						</Button>
						<Button onClick={handleAdd} disabled={adding}>
							{adding ? "Registering..." : "Register Passkey"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
