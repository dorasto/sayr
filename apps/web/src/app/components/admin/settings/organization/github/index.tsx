"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	IconBadge,
	IconCircle,
	IconCircleFilled,
	IconDots,
	IconExternalLink,
	IconProgress,
	IconSettings,
	IconUserCancel,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";

export default function SettingsOrganizationConnectionsGitHubPage() {
	const { ws } = useLayoutData();
	const { organization } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
	});

	return (
		<div className="bg-card rounded-lg flex flex-col">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Tile className="md:w-full hover:bg-accent data-[state=open]:bg-accent" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<TileIcon className="bg-transparent">
								<Avatar className="h-10 w-10 rounded-md">
									<AvatarImage
										// github organization image
										// src={member.user.image || ""}
										// alt={member.user.name}
										className="rounded-none"
									/>
									<AvatarFallback className="rounded-md uppercase text-xs">
										<IconUsers className="h-6 w-6" />
									</AvatarFallback>
								</Avatar>
							</TileIcon>
							<TileTitle>Org name</TileTitle>
							<TileDescription>Connected by user - date</TileDescription>
						</TileHeader>
						<TileAction className="">
							<Button variant={"ghost"} size={"icon"}>
								<IconDots />
							</Button>
						</TileAction>
					</Tile>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem>
						<IconExternalLink /> Configure
					</DropdownMenuItem>
					<DropdownMenuItem>
						<IconX />
						Remove
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

export function SettingsOrganizationConnectionsGitHubSync() {
	const { ws } = useLayoutData();
	const { organization } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
	});

	return (
		<div className="bg-card rounded-lg flex flex-col">
			{/* This is the default - will always be present. Basically if it doesn't match any category defined below, fall into here. Can be disabled. Enabled by default */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild className="group">
					<Tile className="md:w-full hover:bg-accent data-[state=open]:bg-accent" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<TileIcon className="bg-transparent">
								<Avatar className="h-10 w-10 rounded-md">
									<AvatarImage
										// github organization image
										// src={member.user.image || ""}
										// alt={member.user.name}
										className="rounded-none"
									/>
									<AvatarFallback className="rounded-md uppercase text-xs">
										<IconUsers className="h-6 w-6" />
									</AvatarFallback>
								</Avatar>
							</TileIcon>
							<TileTitle>All tasks</TileTitle>
							<TileDescription>organization/repo</TileDescription>
						</TileHeader>
						<TileAction className="">
							<Button variant={"accent"} size={"sm"} className="bg-transparent rounded-lg">
								<IconCircleFilled className="text-success" /> Enabled
							</Button>
						</TileAction>
					</Tile>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem>
						{/* click to disable. when disabled the circle filled changes from text-success to text-accent and text changes to Disabled */}
						<IconCircleFilled className="text-success" /> Enabled
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						<IconSettings /> Edit
					</DropdownMenuItem>
					<DropdownMenuItem>
						<IconX />
						Remove
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Tile className="md:w-full hover:bg-accent data-[state=open]:bg-accent" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<TileIcon className="bg-transparent">
								<Avatar className="h-10 w-10 rounded-md">
									<AvatarImage
										// github organization image
										// src={member.user.image || ""}
										// alt={member.user.name}
										className="rounded-none"
									/>
									<AvatarFallback className="rounded-md uppercase text-xs">
										<IconUsers className="h-6 w-6" />
									</AvatarFallback>
								</Avatar>
							</TileIcon>
							<TileTitle>Category name</TileTitle>
							<TileDescription>organization/repo</TileDescription>
						</TileHeader>
						<TileAction className="">
							<Button variant={"accent"} size={"sm"} className="bg-transparent rounded-lg">
								<IconCircleFilled className="text-success" /> Enabled
							</Button>
						</TileAction>
					</Tile>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem>
						{/* click to disable. when disabled the circle filled changes from text-success to text-accent and text changes to Disabled */}
						<IconCircleFilled className="text-success" /> Enabled
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						<IconSettings /> Edit
					</DropdownMenuItem>
					<DropdownMenuItem>
						<IconX />
						Remove
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
