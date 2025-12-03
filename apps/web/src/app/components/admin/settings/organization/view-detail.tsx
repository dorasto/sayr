"use client";

import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileHeader, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Input } from "@repo/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconCheck, IconDeviceFloppy, IconStack2, IconTrash, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import { deleteSavedViewAction, updateSavedViewAction } from "@/app/lib/fetches/organization";
import type { WSMessage } from "@/app/lib/ws";

export default function SettingsOrganizationViewDetailPage({ viewId }: { viewId: string }) {
	const { ws } = useLayoutData();
	const { organization, setOrganization, views, setViews } = useLayoutOrganizationSettings();
	const router = useRouter();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "", 1);

	const view = views.find((v) => v.id === viewId);
	const [name, setName] = useState(view?.name || "");

	useEffect(() => {
		if (view) {
			setName(view.name);
		}
	}, [view]);

	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});

	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_VIEWS: (msg) => {
			if (msg.scope === "CHANNEL") {
				setViews(msg.data);
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE SettingsOrganizationViewDetailPage]", msg),
	});

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);

	if (!organization || !view) {
		return <div>View not found</div>;
	}

	const handleSave = async () => {
		try {
			const result = await updateSavedViewAction(
				organization.id,
				{
					id: view.id,
					name,
				},
				wsClientId
			);
			if (result.success) {
				toast.success("View updated successfully");
			} else {
				toast.error(result.error || "Failed to update view");
			}
		} catch (_error) {
			toast.error("An error occurred while updating the view");
		}
	};

	const handleDelete = async () => {
		if (!confirm("Are you sure you want to delete this view?")) return;
		try {
			const result = await deleteSavedViewAction(
				organization.id,
				{
					id: view.id,
				},
				wsClientId
			);
			if (result.success) {
				toast.success("View deleted successfully");
				router.push(`/admin/settings/org/${organization.id}/views`);
			} else {
				toast.error(result.error || "Failed to delete view");
			}
		} catch (_error) {
			toast.error("An error occurred while deleting the view");
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"heading"}>General</Label>
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Logo</TileTitle>
					</TileHeader>
					<TileAction className="">
						<Button variant="accent" size={"icon"}>
							<IconStack2 />
						</Button>
					</TileAction>
				</Tile>
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Name</TileTitle>
					</TileHeader>
					<TileAction className="w-full">
						<InputGroup className="bg-accent border-0 shadow-none transition-all">
							<InputGroupInput
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter view name"
							/>

							<InputGroupAddon align="inline-end">
								<InputGroupButton variant={"ghost"} size={"icon-sm"}>
									<IconCheck />
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
					</TileAction>
				</Tile>
			</div>
			<div className="flex flex-col gap-4 max-w-2xl">
				<div className="flex flex-col gap-2">
					<Label htmlFor="view-name">View Name</Label>
					<Input
						id="view-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Enter view name"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label>Filter Configuration (Read-only)</Label>
					<div className="p-3 bg-muted rounded-md text-xs font-mono break-all">{view.filterParams}</div>
				</div>

				<div className="flex items-center gap-2 mt-4">
					<Button onClick={handleSave} disabled={name === view.name}>
						<IconDeviceFloppy className="w-4 h-4 mr-2" />
						Save Changes
					</Button>
					<Button variant="destructive" onClick={handleDelete}>
						<IconTrash className="w-4 h-4 mr-2" />
						Delete View
					</Button>
				</div>
			</div>{" "}
		</div>
	);
}
