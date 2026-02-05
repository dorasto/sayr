import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileHeader, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Input } from "@repo/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconUser } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { updateUserAction } from "@/lib/fetches/user";
import { clearAuthCache } from "@/routes/(admin)/route";

export default function UserSettings() {
	const { ws, account, setAccount } = useLayoutData();
	const router = useRouter();

	// Display name state - default to displayName if set, otherwise use name
	const [displayName, setDisplayName] = useState(account.displayName || account.name);
	const [isDisplayNameSaving, setIsDisplayNameSaving] = useState(false);

	// Track if display name has changed
	const displayNameChanged = displayName !== (account.displayName || account.name);

	useWebSocketSubscription({
		ws,
	});

	const handleDisplayNameSave = useCallback(async () => {
		if (!displayNameChanged) return;

		setIsDisplayNameSaving(true);
		try {
			const result = await updateUserAction({ displayName });

			if (result.success && result.data) {
				setAccount(result.data);
				// Clear the auth cache so the next navigation/refresh gets fresh data
				clearAuthCache();
				// Invalidate router to refetch loader data
				router.invalidate();
				headlessToast.success({ title: "Display name updated successfully" });
			} else {
				headlessToast.error({ title: result.error || "Failed to update display name" });
			}
		} catch (error) {
			console.error("Error updating display name:", error);
			headlessToast.error({ title: "Failed to update display name" });
		} finally {
			setIsDisplayNameSaving(false);
		}
	}, [displayName, displayNameChanged, setAccount, router]);

	return (
		<div className="bg-card rounded-lg flex flex-col">
			<Tile className="md:w-full">
				<TileHeader>
					<TileTitle>Display name</TileTitle>
				</TileHeader>
				<TileAction>
					<InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all">
						<InputGroupInput
							placeholder="Your display name"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								variant="ghost"
								size="icon-sm"
								onClick={handleDisplayNameSave}
								disabled={!displayNameChanged || isDisplayNameSaving}
								className={cn(!displayNameChanged && "opacity-50")}
							>
								<IconCheck />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</TileAction>
			</Tile>
			<Tile className="md:w-full">
				<TileHeader>
					<TileTitle>Profile picture</TileTitle>
				</TileHeader>
				<TileAction>
					<Button variant="accent" size={"icon"} disabled>
						<IconUser />
					</Button>
				</TileAction>
			</Tile>
			<Tile className="md:w-full">
				<TileHeader>
					<TileTitle>Username</TileTitle>
				</TileHeader>
				<TileAction>
					<InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all">
						<InputGroupInput placeholder="Username" value={account.name} disabled />
						<InputGroupAddon align="inline-end">
							<IconCheck className="opacity-50" />
						</InputGroupAddon>
					</InputGroup>
				</TileAction>
			</Tile>
			<Tile className="md:w-full">
				<TileHeader>
					<TileTitle>Email address</TileTitle>
				</TileHeader>
				<TileAction>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all cursor-pointer">
								<InputGroupInput placeholder="Email" value={account.email} readOnly className="cursor-pointer" />
								<InputGroupAddon align="inline-end">
									<IconCheck className="opacity-50" />
								</InputGroupAddon>
							</InputGroup>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Change your email address</AlertDialogTitle>
								<AlertDialogDescription>
									In order to change your email, we'll send a confirmation link to your new email address.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<div className="bg-card p-2 rounded-lg">
								<Label className="pl-3">New email address</Label>
								<Input variant={"ghost"} type="email" placeholder="youremail@domain.com" />
							</div>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction disabled>Send</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</TileAction>
			</Tile>
		</div>
	);
}

export function UserPreferences() {
	return (
		<div className="bg-card rounded-lg flex flex-col">
			<Tile className="md:w-full">
				<TileHeader>
					<TileTitle>Theme</TileTitle>
				</TileHeader>
				<TileAction>{/* <ThemeToggle full /> */}</TileAction>
			</Tile>
		</div>
	);
}
