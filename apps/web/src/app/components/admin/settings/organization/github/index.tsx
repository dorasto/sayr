"use client";

import {
	AdaptiveDialog,
	AdaptiveDialogBody,
	AdaptiveDialogClose,
	AdaptiveDialogContent,
	AdaptiveDialogDescription,
	AdaptiveDialogFooter,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
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
import { Label } from "@repo/ui/components/label";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxIcon,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import {
	IconBadge,
	IconBrandGithub,
	IconCircle,
	IconCircleFilled,
	IconDots,
	IconExternalLink,
	IconPlus,
	IconProgress,
	IconSettings,
	IconUserCancel,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import RenderIcon from "@/app/components/RenderIcon";
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
	const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

	return (
		<>
			<div className="flex items-start justify-between">
				<div className="flex flex-col">
					<Label variant={"heading"}>Task syncing</Label>
					<Label variant={"description"}>Link categories to specific repositories for syncing</Label>
				</div>
				<Button variant={"ghost"} size={"icon"} onClick={() => setIsSyncDialogOpen(true)}>
					<IconPlus />
				</Button>
			</div>
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
			<SettingsOrganizationConnectionsGitHubSyncDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen} />
		</>
	);
}

interface SettingsOrganizationConnectionsGitHubSyncDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}
export function SettingsOrganizationConnectionsGitHubSyncDialog({
	open,
	onOpenChange,
}: SettingsOrganizationConnectionsGitHubSyncDialogProps) {
	const { categories } = useLayoutOrganizationSettings();
	const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	const repos = [
		{ id: "repo-1", name: "dorasto/project-management-tool" },
		{ id: "repo-2", name: "dorasto/ui" },
	];

	const selectedRepoName = repos.find((r) => r.id === selectedRepo)?.name;
	const selectedCategoryData = categories.find((c) => c.id === selectedCategory);

	return (
		<AdaptiveDialog open={open} onOpenChange={onOpenChange}>
			<AdaptiveDialogContent>
				<AdaptiveDialogHeader className="bg-card">
					<AdaptiveDialogTitle asChild>
						<Label variant={"heading"}>Task syncing</Label>
					</AdaptiveDialogTitle>
					<AdaptiveDialogDescription>
						Link categories to repositories for syncing tasks within this category to a repository.
					</AdaptiveDialogDescription>
				</AdaptiveDialogHeader>
				<AdaptiveDialogBody className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label>GitHub repository</Label>
						<ComboBox value={selectedRepo || undefined} onValueChange={setSelectedRepo}>
							<ComboBoxTrigger>
								<ComboBoxValue placeholder="Select repository...">{selectedRepoName}</ComboBoxValue>
								<ComboBoxIcon />
							</ComboBoxTrigger>
							<ComboBoxContent>
								<ComboBoxSearch placeholder="Search repositories..." />
								<ComboBoxList>
									<ComboBoxEmpty>No repository found.</ComboBoxEmpty>
									<ComboBoxGroup>
										{repos.map((repo) => (
											<ComboBoxItem key={repo.id} value={repo.id} searchValue={repo.name}>
												<div className="flex items-center gap-2">
													<IconBrandGithub className="size-4!" />
													<span>{repo.name}</span>
												</div>
											</ComboBoxItem>
										))}
									</ComboBoxGroup>
								</ComboBoxList>
							</ComboBoxContent>
						</ComboBox>
					</div>
					<div className="flex flex-col gap-2">
						<Label>Category</Label>
						<ComboBox value={selectedCategory || undefined} onValueChange={setSelectedCategory}>
							<ComboBoxTrigger>
								<ComboBoxValue placeholder="Select category...">
									{selectedCategoryData && (
										<div className="flex items-center gap-2">
											<RenderIcon
												iconName={selectedCategoryData.icon || "IconCircleFilled"}
												size={12}
												color={selectedCategoryData.color || undefined}
												raw
											/>
											<span>{selectedCategoryData.name}</span>
										</div>
									)}
								</ComboBoxValue>
								<ComboBoxIcon />
							</ComboBoxTrigger>
							<ComboBoxContent>
								<ComboBoxSearch placeholder="Search categories..." />
								<ComboBoxList>
									<ComboBoxEmpty>No category found.</ComboBoxEmpty>
									<ComboBoxGroup>
										{categories.map((category) => (
											<ComboBoxItem key={category.id} value={category.id} searchValue={category.name}>
												<div className="flex items-center gap-2">
													<RenderIcon
														iconName={category.icon || "IconCircleFilled"}
														size={12}
														color={category.color || undefined}
														raw
													/>
													<span>{category.name}</span>
												</div>
											</ComboBoxItem>
										))}
									</ComboBoxGroup>
								</ComboBoxList>
							</ComboBoxContent>
						</ComboBox>
					</div>
				</AdaptiveDialogBody>
				<AdaptiveDialogFooter>
					<AdaptiveDialogClose asChild>
						<Button variant={"accent"}>Save</Button>
					</AdaptiveDialogClose>
				</AdaptiveDialogFooter>
			</AdaptiveDialogContent>
		</AdaptiveDialog>
	);
}
