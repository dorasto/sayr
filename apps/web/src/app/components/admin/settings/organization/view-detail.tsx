"use client";

import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileHeader, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Input } from "@repo/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Separator } from "@repo/ui/components/separator";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconDeviceFloppy, IconLayoutKanban, IconList, IconStack2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import { deleteSavedViewAction, updateSavedViewAction } from "@/app/lib/fetches/organization";
import type { WSMessage } from "@/app/lib/ws";
import { ViewFilterEditor } from "./view-filter-editor";

export default function SettingsOrganizationViewDetailPage({ viewId }: { viewId: string }) {
	const { ws } = useLayoutData();
	const { organization, setOrganization, views, setViews, labels, categories, tasks } =
		useLayoutOrganizationSettings();
	const router = useRouter();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "", 1);

	const view = views.find((v) => v.id === viewId);
	const [name, setName] = useState(view?.name || "");
	const [filterParams, setFilterParams] = useState(view?.filterParams || "");

	useEffect(() => {
		if (view) {
			setName(view.name);
			setFilterParams(view.filterParams);
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
					value: filterParams,
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

	const availableUsers = organization.members.map((m) => m.user);

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
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Slug</TileTitle>
					</TileHeader>
					<TileAction className="w-full">
						<InputGroup className="bg-accent border-0 shadow-none transition-all">
							<InputGroupInput placeholder="my-org" value={organization.slug} />
							<InputGroupAddon align="inline-start">
								<InputGroupText>view-</InputGroupText>
							</InputGroupAddon>
							<InputGroupAddon align="inline-end">
								<InputGroupButton variant={"ghost"} size={"icon-sm"}>
									<IconCheck />
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
					</TileAction>
				</Tile>
				{/* All custom view urls will begin with view-... Although called a slug, it'll be a param if possible */}
			</div>
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full flex-col gap-3" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Filter</TileTitle>
					</TileHeader>
					<ViewFilterEditor
						initialFilterParams={filterParams}
						onChange={setFilterParams}
						labels={labels}
						availableUsers={availableUsers}
						categories={categories}
						tasks={tasks}
					/>
				</Tile>
			</div>
			<Label variant={"heading"}>View settings</Label>
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Display</TileTitle>
					</TileHeader>
					<TileAction className="">
						<RadioGroup
							// defaultValue={activeViewMode}
							className="flex items-center gap-2"
							// onValueChange={(v) => setViewMode(v as ViewMode)}
						>
							<Label
								className={cn(
									"flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
									// activeViewMode === option.id && "border-primary/50 bg-accent"
								)}
							>
								<RadioGroupItem
									value={"list"}
									// checked={option.id === activeViewMode}
									className="sr-only"
								/>
								<div className="flex items-center gap-1">
									<IconList className="size-4" />
									<span className="cursor-pointer text-sm font-semibold">List</span>
								</div>
							</Label>
							<Label
								className={cn(
									"flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
									// activeViewMode === option.id && "border-primary/50 bg-accent"
								)}
							>
								<RadioGroupItem
									value={"kanban"}
									// checked={option.id === activeViewMode}
									className="sr-only"
								/>
								<div className="flex items-center gap-1">
									<IconLayoutKanban className="size-4" />
									<span className="cursor-pointer text-sm font-semibold">Kanban</span>
								</div>
							</Label>
							{/* refer to task-view-dropdown.tsx*/}
						</RadioGroup>
					</TileAction>
				</Tile>
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Group by</TileTitle>
					</TileHeader>
					{/* take dropdown from task-view-dropdown.tsx */}
				</Tile>
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Show completed tasks</TileTitle>
					</TileHeader>
					{/* take from task-view-dropdown.tsx */}
				</Tile>
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Show empty groups</TileTitle>
					</TileHeader>
					{/* take from task-view-dropdown.tsx */}
				</Tile>
			</div>
			<div className="flex flex-col gap-4 max-w-2xl">
				<div className="flex items-center gap-2 mt-4">
					<Button
						onClick={handleSave}
						variant={"primary"}
						// disabled={name === view.name && filterParams === view.filterParams}
					>
						<IconDeviceFloppy className="" />
						Save Changes
					</Button>
					<Button variant="ghost" className="text-muted-foreground" onClick={handleDelete}>
						<IconTrash className="" />
						Delete View
					</Button>
				</div>
			</div>{" "}
		</div>
	);
}
