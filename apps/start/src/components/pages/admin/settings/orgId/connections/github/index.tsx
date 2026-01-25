import type { schema } from "@repo/database";
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
import { formatDateTime } from "@repo/util";
import {
	IconBrandGithub,
	IconCircleFilled,
	IconDots,
	IconExternalLink,
	IconPlus,
	IconSettings,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import RenderIcon from "@/components/generic/RenderIcon";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { createGithubSyncConnectionAction } from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";

export type githubInstallationDetailsType = {
	installationId: number;
	installDate: string;
	joinUserName: string | null;
	account: {
		login: string;
		id: number;
		type: string;
		avatar_url: string;
		html_url: string;
	};
	target_type: string;
	app_id: number;
	permissions: Record<string, "read" | "write" | undefined>;
	repositories: Array<{
		id: number;
		name: string;
		full_name: string;
		owner: string;
		private: boolean;
	}>;
	createdAt: Date;
	updatedAt: Date;
};

interface Props {
	githubInfo: githubInstallationDetailsType | null;
}

export default function SettingsOrganizationConnectionsGitHubPage({ githubInfo }: Props) {
	const { ws } = useLayoutData();
	useWebSocketSubscription({
		ws,
	});

	return (
		<div className="bg-card rounded-lg flex flex-col">
			{githubInfo && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Tile className="md:w-full hover:bg-accent data-[state=open]:bg-accent" variant={"transparent"}>
							<TileHeader className="md:w-full">
								<TileIcon className="bg-transparent">
									<Avatar className="h-10 w-10 rounded-md">
										<AvatarImage
											// github organization image
											src={githubInfo.account.avatar_url || ""}
											alt={githubInfo.account.login}
											className="rounded-none"
										/>
										<AvatarFallback className="rounded-md uppercase text-xs">
											<IconUsers className="h-6 w-6" />
										</AvatarFallback>
									</Avatar>
								</TileIcon>
								<TileTitle>{githubInfo.account.login}</TileTitle>
								<TileDescription>
									Connected by {githubInfo.joinUserName} - {formatDateTime(githubInfo.createdAt as Date)}
								</TileDescription>
							</TileHeader>
							<TileAction className="">
								<Button variant={"ghost"} size={"icon"}>
									<IconDots />
								</Button>
							</TileAction>
						</Tile>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<a
								href={
									githubInfo.target_type === "Organization"
										? `https://github.com/organizations/${githubInfo.account.login}/settings/installations/${githubInfo.installationId}`
										: `https://github.com/settings/installations/${githubInfo.installationId}`
								}
								target="_blank"
								rel="noopener noreferrer"
							>
								<IconExternalLink /> Configure
							</a>
						</DropdownMenuItem>
						<DropdownMenuItem>
							<IconX />
							Remove
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}

export type githubRepositoryWithRepoName = schema.githubRepositoryType & {
	repoName: string;
	avatarUrl: string | null;
};

interface PropsSync {
	githubInfo: githubInstallationDetailsType | null;
	githubConnections: githubRepositoryWithRepoName[];
}
export function SettingsOrganizationConnectionsGitHubSync({ githubInfo, githubConnections }: PropsSync) {
	const { ws } = useLayoutData();
	const { categories } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
	});
	const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
	if (githubInfo) {
		githubInfo.repositories = githubInfo.repositories.filter(
			(repo) => !githubConnections.find((conn) => conn.repoId === repo.id)
		);
	}
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
				{githubConnections.map((connection) => {
					return (
						<DropdownMenu key={connection.id}>
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
										<TileTitle>{connection.repoName}</TileTitle>
										<TileDescription>
											{categories.find((c) => c.id === connection.categoryId)?.name}
											{" - "}
											{formatDateTime(connection.createdAt as Date)}
										</TileDescription>
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
					);
				})}
			</div>
			<SettingsOrganizationConnectionsGitHubSyncDialog
				open={isSyncDialogOpen}
				onOpenChange={setIsSyncDialogOpen}
				githubInfo={githubInfo}
			/>
		</>
	);
}

interface SettingsOrganizationConnectionsGitHubSyncDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	githubInfo: githubInstallationDetailsType | null;
}
export function SettingsOrganizationConnectionsGitHubSyncDialog({
	open,
	onOpenChange,
	githubInfo,
}: SettingsOrganizationConnectionsGitHubSyncDialogProps) {
	const { categories, organization } = useLayoutOrganizationSettings();
	const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const selectedRepoName = githubInfo?.repositories.find((r) => r.full_name === selectedRepo)?.name;
	const selectedCategoryData = categories.find((c) => c.id === selectedCategory);
	const { runWithToast, isFetching } = useToastAction();

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
										{githubInfo?.repositories.map((repo) => (
											<ComboBoxItem key={repo.id} value={repo.full_name} searchValue={repo.name}>
												<div className="flex items-center gap-2">
													<IconBrandGithub className="size-4!" />
													<span>{repo.full_name}</span>
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
						<Button
							variant={"accent"}
							onClick={async () => {
								const repoId = githubInfo?.repositories.find((r) => r.full_name === selectedRepo)?.id;
								const repoName = githubInfo?.repositories.find((r) => r.full_name === selectedRepo)?.name;
								if (!githubInfo || !selectedRepo || !selectedCategory || !repoId || !repoName) return;
								const data = await runWithToast(
									"create-github-sync-connection",
									{
										loading: {
											title: "Creating sync connection...",
											description: "Please wait while we create the sync connection.",
										},
										success: {
											title: "Sync connection created",
											description: "The sync connection has been successfully created.",
										},
										error: {
											title: "Failed to create sync connection",
											description: "An error occurred while creating the sync connection.",
										},
									},
									() =>
										createGithubSyncConnectionAction(organization.id, {
											installationId: githubInfo?.installationId,
											repoId: repoId,
											repoName: repoName,
											categoryId: selectedCategory,
										})
								);
								if (data?.success && data.data) {
									onOpenChange(false);
									// window.location.reload(); // TODO: Invalidate query
								}
							}}
							disabled={isFetching || !selectedRepo || !selectedCategory}
						>
							Save
						</Button>
					</AdaptiveDialogClose>
				</AdaptiveDialogFooter>
			</AdaptiveDialogContent>
		</AdaptiveDialog>
	);
}
