import type { OrganizationSettings } from "@repo/database";

/** Inline defaults to avoid importing the schema barrel which pulls in node:crypto. */
const defaultOrganizationSettings: OrganizationSettings = {
	allowActionsOnClosedTasks: true,
	publicActions: true,
	enablePublicPage: true,
};
import {
	Tile,
	TileHeader,
	TileTitle,
	TileAction,
	TileDescription,
} from "@repo/ui/components/doras-ui/tile";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconBan } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { updateOrganizationAction } from "@/lib/fetches/organization";
import { BlockedUsersSheet } from "./blocked-users";

export default function Preferences() {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { organization, setOrganization } = useLayoutOrganizationSettings();

	/** Merged settings — existing orgs without a `settings` column get safe defaults. */
	const settings: OrganizationSettings = useMemo(
		() => ({
			...defaultOrganizationSettings,
			...(organization.settings as OrganizationSettings | null),
		}),
		[organization.settings],
	);

	const handleToggle = useCallback(
		async (key: keyof OrganizationSettings, checked: boolean) => {
			const updatedSettings: OrganizationSettings = {
				...settings,
				[key]: checked,
			};

			// Optimistic update
			setOrganization({
				...organization,
				settings: updatedSettings,
			});

			try {
				const result = await updateOrganizationAction(
					organization.id,
					{
						name: organization.name,
						slug: organization.slug,
						logo: organization.logo || undefined,
						bannerImg: organization.bannerImg || undefined,
						description: organization.description || undefined,
						settings: updatedSettings,
					},
					wsClientId,
				);

				if (result.success) {
					setOrganization({
						...result.data,
						members: organization.members,
					});
					headlessToast.success({ title: "Preference updated" });
				} else {
					// Revert on failure
					setOrganization({
						...organization,
						settings,
					});
					headlessToast.error({ title: result.error || "Failed to update preference" });
				}
			} catch (error) {
				console.error("Error updating preference:", error);
				// Revert on error
				setOrganization({
					...organization,
					settings,
				});
				headlessToast.error({ title: "Failed to update preference" });
			}
		},
		[organization, settings, wsClientId, setOrganization],
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-3" title="Public Pages">
				<Label variant={"subheading"}>General configuration</Label>
				<div className="bg-card rounded-lg flex flex-col">
					<Tile className="md:w-full" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<TileTitle className="text-sm">
								Allow actions on closed tasks
							</TileTitle>
							<TileDescription className="text-xs leading-normal!">
								When disabled, users without privileges will not be able to
								comment on or modify closed tasks.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Switch
								checked={settings.allowActionsOnClosedTasks}
								onCheckedChange={(checked) => handleToggle("allowActionsOnClosedTasks", checked)}
							/>
						</TileAction>
					</Tile>
				</div>
			</div>
			<div className="flex flex-col gap-3" title="Public Pages">
				<Label variant={"subheading"}>Public page settings</Label>
				<div className="bg-card rounded-lg flex flex-col">
					<Tile className="md:w-full" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<TileTitle className="text-sm">Enable public page</TileTitle>
							<TileDescription className="text-xs leading-normal!">
								Toggles your organizations public page. No external users will
								be able to find your tasks or contribute.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Switch
								checked={settings.enablePublicPage}
								onCheckedChange={(checked) => handleToggle("enablePublicPage", checked)}
							/>
						</TileAction>
					</Tile>
					<Tile className="md:w-full" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<TileTitle className="text-sm">Public actions</TileTitle>
							<TileDescription className="text-xs leading-normal!">
								Allow external users to comment on & create tasks. Enables users
								to create feature requests, bug reports, etc. Voting remains
								open.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Switch
								checked={settings.publicActions}
								onCheckedChange={(checked) => handleToggle("publicActions", checked)}
							/>
						</TileAction>
					</Tile>
					<Tile className="md:w-full" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<TileTitle className="text-sm">Blocked users</TileTitle>
							<TileDescription className="text-xs leading-normal!">
								Block users from interacting with your organization or its
								tasks.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<BlockedUsersSheet>
								<Button variant="primary" size={"sm"}>
									<IconBan />
									Manage
								</Button>
							</BlockedUsersSheet>
						</TileAction>
					</Tile>
				</div>
			</div>
		</div>
	);
}
