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
	AdaptiveDialogTrigger,
} from "@repo/ui/components/adaptive-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { cn } from "@repo/ui/lib/utils";
import {
	IconBadge,
	IconCrown,
	IconDots,
	IconProgress,
	IconShield,
	IconUser,
	IconUserCancel,
	IconUserPlus,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { deleteOrganizationMemberAction, inviteOrganizationMembersAction } from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";

export default function SettingsOrganizationPageTeams({ teams }: { teams: schema.OrganizationTeamWithMembersType[] }) {
	console.log("🚀 ~ SettingsOrganizationPageTeams ~ teams:", teams);
	const { ws, account } = useLayoutData();
	const { organization, setOrganization } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});
	const roleBadge = (role: string) => {
		switch (role) {
			case "owner":
				return (
					<Badge
						variant={"outline"}
						className={cn(
							"bg-destructive/10 border border-destructive text-destructive-foreground gap-1 text-xs"
						)}
					>
						<IconCrown className="size-5" />
						Owner
					</Badge>
				);
			case "admin":
				return (
					<Badge
						variant={"outline"}
						className={cn("bg-primary/10 border border-primary text-primary-foreground gap-1 text-xs")}
					>
						<IconShield className="size-5" />
						Admin
					</Badge>
				);

			default:
				return (
					<Badge
						variant={"outline"}
						className={cn("bg-accent/10 border border-accent text-accent-foreground gap-1 text-xs")}
					>
						<IconUser className="size-5" />
						User
					</Badge>
				);
		}
	};

	const [open, setOpen] = useState(false);
	const [emails, setEmails] = useState<string[]>([]);
	const [inputValue, setInputValue] = useState("");

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && inputValue.trim()) {
			e.preventDefault();
			if (!emails.includes(inputValue.trim())) {
				setEmails([...emails, inputValue.trim()]);
			}
			setInputValue("");
		} else if (e.key === "Backspace" && !inputValue && emails.length > 0) {
			setEmails(emails.slice(0, -1));
		}
	};

	const removeEmail = (email: string) => {
		setEmails(emails.filter((e) => e !== email));
	};
	const { runWithToast, isFetching } = useToastAction();
	if (!organization) {
		return null;
	}
	const mergeMembersAndInvites = [
		...organization.members,
		...[].map((invite) => ({
			id: invite.id,
			userId: invite.userId,
			//@ts-expect-error invite.user can be null
			user: invite.user || {
				id: "",
				name: invite.email,
				email: invite.email,
				image: "",
			},
			role: invite.role,
			status: invite.status,
		})),
	];
	return (
		<div className="bg-card rounded-lg flex flex-col">
			<Link
				to="/admin/settings/org/$orgId/teams/owner" //eventually map
				params={{ orgId: organization.id }}
			>
				<Tile className="md:w-full hover:bg-accent data-[state=open]:bg-accent" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileIcon className="bg-transparent">
							<Avatar className="h-10 w-10 rounded-full">
								{/* <AvatarImage
											src={member.user.image || ""}
											alt={member.user.name}
											className="rounded-none"
                                            /> */}
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconUsers className="h-6 w-6" />
								</AvatarFallback>
							</Avatar>
						</TileIcon>
						<TileTitle>Owner</TileTitle>
						<TileDescription>Creator of the organization</TileDescription>
					</TileHeader>
					<TileAction className="">
						<TileDescription className="shrink-0">1 user</TileDescription>

						<Button variant={"ghost"} size={"icon"}>
							<IconDots />
						</Button>
					</TileAction>
				</Tile>
			</Link>
			{/* <p>{JSON.stringify(organization.members, null, 4)}</p> */}
			{mergeMembersAndInvites?.map((member) => (
				<DropdownMenu key={member.id}>
					<DropdownMenuTrigger asChild>
						<Tile
							className="md:w-full hover:bg-accent data-[state=open]:bg-accent"
							variant={"transparent"}
							key={member.id}
						>
							<TileHeader className="md:w-full">
								<TileIcon className="bg-transparent">
									<Avatar className="h-10 w-10 rounded-full">
										<AvatarImage
											src={member.user.image || ""}
											alt={member.user.name}
											className="rounded-none"
										/>
										<AvatarFallback className="rounded-md uppercase text-xs">
											<IconUsers className="h-6 w-6" />
										</AvatarFallback>
									</Avatar>
								</TileIcon>
								<TileTitle>{member.user.name}</TileTitle>
								<TileDescription>{member.user.email}</TileDescription>
							</TileHeader>
							<TileAction className="">
								<TileDescription asChild>{roleBadge(member.role)}</TileDescription>
								{/* @ts-expect-error status can be string */}
								{member.status && (
									<span className="mx-2 text-muted-foreground">
										{/* @ts-expect-error status can be string */}
										{member.status}
									</span>
								)}
								<Button variant={"ghost"} size={"icon"}>
									<IconDots />
								</Button>
							</TileAction>
						</Tile>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel className="flex items-center gap-1">
							<Avatar className="h-4 w-4 rounded-md">
								<AvatarImage src={member.user.image || ""} alt={member.user.name} className="rounded-none" />
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconUsers className="h-6 w-6" />
								</AvatarFallback>
							</Avatar>
							{member.user.name}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<IconBadge /> Update role
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={async () => {
								if (member.userId === account?.id) {
									alert("You cannot remove yourself from the organization.");
									return;
								}
								const confirmed = window.confirm(
									"You are about to remove this member from the organization. Are you sure?"
								);
								if (!confirmed) return;
								await deleteOrganizationMemberAction(organization.id, member.user.id);
								window.location.reload();
							}}
						>
							<IconUserCancel />
							Remove from organization
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<IconProgress />
							View active tasks
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			))}
			<Separator />
			<AdaptiveDialog open={open} onOpenChange={setOpen}>
				<AdaptiveDialogTrigger asChild>
					<Tile className="md:w-full hover:bg-accent data-[state=open]:bg-accent" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<TileIcon className="bg-transparent">
								<Avatar className="h-10 w-10 rounded-md">
									{/* <AvatarImage src={member.user.image || ""} alt={member.user.name} className="rounded-none" /> */}
									<AvatarFallback className="rounded-md uppercase text-xs">
										<IconUserPlus className="size-6!" />
									</AvatarFallback>
								</Avatar>
							</TileIcon>
							<TileTitle>Invite</TileTitle>
							<TileDescription>Invite a new member</TileDescription>
						</TileHeader>
					</Tile>
				</AdaptiveDialogTrigger>
				<AdaptiveDialogContent>
					<AdaptiveDialogHeader className="bg-card">
						<AdaptiveDialogTitle asChild>
							<Label variant={"heading"}>Invite</Label>
						</AdaptiveDialogTitle>
						<AdaptiveDialogDescription>Bring more users to your organization</AdaptiveDialogDescription>
					</AdaptiveDialogHeader>
					<AdaptiveDialogBody>
						<div className="flex flex-wrap gap-2 p-2 rounded-lg bg-accent">
							{emails.map((email) => (
								<Badge key={email} variant="secondary" className="gap-1 h-6">
									{email}
									<IconX
										className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
										onClick={() => removeEmail(email)}
									/>
								</Badge>
							))}
							<Input
								variant={"ghost"}
								className="flex-1 bg-transparent focus-visible:bg-transparent outline-none min-w-[120px] text-sm h-6"
								placeholder={emails.length === 0 ? "Type email and press Enter..." : ""}
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								onKeyDown={handleKeyDown}
							/>
						</div>
						<Label variant={"description"} className="leading-tight text-sm">
							Enter multiple email addresses. All invited users will receive an invitation email to join the
							organization, and granted the user role which can be changed later.
						</Label>
					</AdaptiveDialogBody>
					<AdaptiveDialogFooter>
						<AdaptiveDialogClose asChild>
							<Button
								onClick={async () => {
									const data = await runWithToast(
										"invite-organization-members",
										{
											loading: {
												title: "Inviting members...",
												description: "Please wait while we invite the members.",
											},
											success: {
												title: "Members invited",
												description: "The members have been successfully invited.",
											},
											error: {
												title: "Failed to invite members",
												description: "An error occurred while inviting the members.",
											},
										},
										() => inviteOrganizationMembersAction(organization.id, emails)
									);
									if (data?.success) {
										setEmails([]);
										setOpen(false);
									}
								}}
								disabled={emails.length === 0 || isFetching}
							>
								Send Invites
							</Button>
						</AdaptiveDialogClose>
					</AdaptiveDialogFooter>
				</AdaptiveDialogContent>
			</AdaptiveDialog>
		</div>
	);
}
