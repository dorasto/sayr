"use client";

import { Button } from "@repo/ui/components/button";
import {
	Tile,
	TileAction,
	TileHeader,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@repo/ui/components/input-group";
import { Separator } from "@repo/ui/components/separator";
import { IconCheck, IconUser } from "@tabler/icons-react";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";

export default function SettingsOrganizationPage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization } = useLayoutOrganization();
	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});
	if (!organization) {
		return null;
	}
	return (
		<div className="bg-card rounded-lg flex flex-col">
			<Tile className="md:w-full" variant={"transparent"}>
				<TileHeader className="md:w-full">
					<TileTitle>Image</TileTitle>
				</TileHeader>
				<TileAction className="">
					<Button variant="accent" size={"icon"}>
						<IconUser />
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
							placeholder="My Organization"
							value={organization.name}
						/>

						<InputGroupAddon align="inline-end">
							<InputGroupButton variant={"ghost"} size={"icon-sm"}>
								<IconCheck />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</TileAction>
			</Tile>
			<Tile className="md:w-full w-full" variant={"transparent"}>
				<TileHeader className="w-full">
					<TileTitle className="w-full">Slug</TileTitle>
				</TileHeader>
				<TileAction className="w-full">
					<InputGroup className="bg-accent border-0 shadow-none transition-all">
						<InputGroupInput placeholder="my-org" value={organization.slug} />
						<InputGroupAddon align="inline-end">
							<InputGroupText>.sayr.io</InputGroupText>
							<Separator orientation="vertical" className="h-3" />
							<InputGroupButton variant={"ghost"} size={"icon-sm"}>
								<IconCheck />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</TileAction>
			</Tile>
			<Tile className="md:w-full" variant={"transparent"}>
				<TileHeader className="md:w-full">
					<TileTitle>Description</TileTitle>
				</TileHeader>
				<TileAction className="w-full">
					<InputGroup className="bg-accent border-0 shadow-none transition-all">
						<InputGroupInput
							placeholder="Description"
							value={organization.description || ""}
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
	);
}
