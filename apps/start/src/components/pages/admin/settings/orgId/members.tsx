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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  IconLoader2,
  IconProgress,
  IconShield,
  IconShieldCheck,
  IconUser,
  IconUserCancel,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import {
  addOrganizationMemberToTeamAction,
  deleteOrganizationMemberAction,
  inviteOrganizationMembersAction,
  removeOrganizationMemberFromTeamAction,
} from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

export default function SettingsOrganizationPageMembers({
  invites,
  teams,
}: {
  invites: schema.inviteType[];
  teams: schema.OrganizationTeamType[];
}) {
  const { serverEvents, account } = useLayoutData();
  const { organization, setOrganization } = useLayoutOrganizationSettings();
  useServerEventsSubscription({
    serverEvents,
    orgId: organization.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });

  // Check if the current user can manage teams
  const canManageTeams = useMemo(() => {
    if (!account) return false;
    const currentMember = organization.members.find(
      (m) => m.userId === account.id,
    );
    if (!currentMember?.teams) return false;
    return currentMember.teams.some(
      (mt) =>
        mt.team.permissions.admin.administrator ||
        mt.team.permissions.admin.manageTeams,
    );
  }, [account, organization.members]);

  const roleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge
            variant={"outline"}
            className={cn(
              "bg-destructive/10 border border-destructive text-destructive-foreground gap-1 text-xs",
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
            className={cn(
              "bg-primary/10 border border-primary text-primary-foreground gap-1 text-xs",
            )}
          >
            <IconShield className="size-5" />
            Admin
          </Badge>
        );

      default:
        return (
          <Badge
            variant={"outline"}
            className={cn(
              "bg-accent/10 border border-accent text-accent-foreground gap-1 text-xs",
            )}
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
  const [togglingTeam, setTogglingTeam] = useState<string | null>(null);

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

  const handleToggleTeam = async (
    memberId: string,
    teamId: string,
    isCurrentlyInTeam: boolean,
  ) => {
    const key = `${memberId}-${teamId}`;
    setTogglingTeam(key);
    try {
      if (isCurrentlyInTeam) {
        const result = await runWithToast(
          `remove-team-${key}`,
          {
            loading: {
              title: "Removing from team...",
              description: "Please wait.",
            },
            success: {
              title: "Removed from team",
              description: "Member has been removed from the team.",
            },
            error: {
              title: "Failed to remove from team",
              description: "An error occurred.",
            },
          },
          () =>
            removeOrganizationMemberFromTeamAction(
              organization.id,
              teamId,
              memberId,
            ),
        );
        if (result?.success) {
          setOrganization({
            ...organization,
            members: organization.members.map((m) =>
              m.id === memberId
                ? {
                    ...m,
                    teams: (m.teams || []).filter((t) => t.teamId !== teamId),
                  }
                : m,
            ),
          });
        }
      } else {
        const result = await runWithToast(
          `add-team-${key}`,
          {
            loading: {
              title: "Adding to team...",
              description: "Please wait.",
            },
            success: {
              title: "Added to team",
              description: "Member has been added to the team.",
            },
            error: {
              title: "Failed to add to team",
              description: "An error occurred.",
            },
          },
          () =>
            addOrganizationMemberToTeamAction(
              organization.id,
              teamId,
              memberId,
            ),
        );
        if (result?.success) {
          const teamData = teams.find((t) => t.id === teamId);
          if (teamData) {
            setOrganization({
              ...organization,
              members: organization.members.map((m) =>
                m.id === memberId
                  ? {
                      ...m,
                      teams: [
                        ...(m.teams || []),
                        {
                          id: result.data?.id || `${memberId}-${teamId}`,
                          memberId,
                          teamId,
                          team: {
                            id: teamData.id,
                            name: teamData.name,
                            permissions: teamData.permissions,
                          },
                        },
                      ],
                    }
                  : m,
              ),
            });
          }
        }
      }
    } finally {
      setTogglingTeam(null);
    }
  };

  const mergeMembersAndInvites = [
    ...organization.members,
    ...invites.map((invite) => ({
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
      {/* <p>{JSON.stringify(organization.members, null, 4)}</p> */}
      {mergeMembersAndInvites?.map((member) => {
        const memberTeamIds = new Set(
          "teams" in member && member.teams
            ? member.teams.map((mt) => mt.teamId)
            : [],
        );
        const isInvite = "status" in member;
        const hasSeat = "seatAssigned" in member ? member.seatAssigned : false;

        return (
          <DropdownMenu key={member.id}>
            <DropdownMenuTrigger asChild>
              <Tile
                className="md:w-full hover:bg-accent data-[state=open]:bg-accent gap-3"
                variant={"transparent"}
                key={member.id}
              >
                <TileHeader className="min-w-1/3 shrink-0">
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
                  <TileTitle>
                    {member.user.name}{" "}
                    {!isInvite && organization.createdBy === member.userId && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge
                            variant="default"
                            className="gap-1 text-xs aspect-square! p-1 bg-transparent hover:bg-transparent"
                          >
                            <IconCrown className="size-3 shrink-0" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Owner of this organization
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!isInvite && !hasSeat && (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs py-0 px-2 h-4 bg-destructive/50 border-destructive text-destructive-foreground"
                      >
                        <IconShield className="size-3 shrink-0" />
                        No seat
                      </Badge>
                    )}
                  </TileTitle>
                  <TileDescription>{member.user.email}</TileDescription>
                </TileHeader>
                <TileAction className="flex-1 min-w-0">
                  <div className="flex gap-1 flex-1 overflow-hidden flex-wrap justify-end">
                    {isInvite && member.status && (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs py-0 h-5"
                      >
                        {member.status === "pending"
                          ? "Pending invite"
                          : member.status}
                      </Badge>
                    )}

                    {"teams" in member &&
                      member.teams &&
                      member.teams.length > 0 &&
                      member.teams.map((mt) => (
                        <Badge
                          key={mt.id}
                          variant="outline"
                          className="gap-1 text-xs py-0 h-5 bg-primary/10 border-primary/20 text-primary shrink-0"
                        >
                          <IconShieldCheck className="size-3 shrink-0" />
                          <span className="truncate max-w-24">
                            {mt.team.name}
                          </span>
                        </Badge>
                      ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant={"ghost"} size={"icon"}>
                      <IconDots />
                    </Button>
                  </div>
                </TileAction>
              </Tile>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="flex items-center gap-1">
                <Avatar className="h-4 w-4 rounded-md">
                  <AvatarImage
                    src={member.user.image || ""}
                    alt={member.user.name}
                    className="rounded-none"
                  />
                  <AvatarFallback className="rounded-md uppercase text-xs">
                    <IconUsers className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                {member.user.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {canManageTeams && !isInvite && teams.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <IconUsersGroup className="size-4" />
                    Manage teams
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuLabel>Teams</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {teams.map((team) => {
                      const isInTeam = memberTeamIds.has(team.id);
                      const isToggling =
                        togglingTeam === `${member.id}-${team.id}`;
                      return (
                        <DropdownMenuItem
                          key={team.id}
                          onSelect={(e) => {
                            e.preventDefault();
                            handleToggleTeam(member.id, team.id, isInTeam);
                          }}
                          disabled={isToggling}
                          className="gap-2 max-w-56"
                        >
                          {isToggling ? (
                            <IconLoader2 className="size-4 animate-spin" />
                          ) : (
                            <Checkbox
                              checked={isInTeam}
                              className="pointer-events-none"
                            />
                          )}
                          <span className="truncate">{team.name}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuItem
                disabled={
                  organization.createdBy === member.userId ||
                  member.userId === account?.id
                }
                onClick={async () => {
                  if (member.userId === account?.id) {
                    alert("You cannot remove yourself from the organization.");
                    return;
                  }
                  const confirmed = window.confirm(
                    "You are about to remove this member from the organization. Are you sure?",
                  );
                  if (!confirmed) return;
                  const result = await deleteOrganizationMemberAction(
                    organization.id,
                    member.user.id,
                  );
                  if (result?.success) {
                    setOrganization({
                      ...organization,
                      members: organization.members.filter(
                        (m) => m.userId !== member.user.id,
                      ),
                    });
                  }
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
        );
      })}
      <Separator />
      <AdaptiveDialog open={open} onOpenChange={setOpen}>
        {organization.members.filter((m) => m.seatAssigned).length >=
        (organization.seatCount ?? 0) ? (
          <Tile
            variant="outline"
            className="md:w-full border-destructive/30 bg-destructive/5"
          >
            <TileHeader>
              <TileIcon className="bg-destructive/15 border-none">
                <IconBadge className="size-6! text-destructive" />
              </TileIcon>
              <TileTitle>Seat limit reached</TileTitle>
              <TileDescription>
                You have reached the maximum number of members for your current
                plan. Please upgrade your plan to invite more members.
              </TileDescription>
            </TileHeader>
          </Tile>
        ) : (
          <AdaptiveDialogTrigger asChild>
            <Tile
              className="md:w-full hover:bg-accent data-[state=open]:bg-accent"
              variant={"transparent"}
            >
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
        )}
        <AdaptiveDialogContent>
          <AdaptiveDialogHeader className="bg-card">
            <AdaptiveDialogTitle asChild>
              <Label variant={"heading"}>Invite</Label>
            </AdaptiveDialogTitle>
            <AdaptiveDialogDescription>
              Bring more users to your organization
            </AdaptiveDialogDescription>
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
                placeholder={
                  emails.length === 0 ? "Type email and press Enter..." : ""
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Label variant={"description"} className="leading-tight text-sm">
              Enter multiple email addresses. All invited users will receive an
              invitation email to join the organization, and granted the user
              role which can be changed later.
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
                        description:
                          "The members have been successfully invited.",
                      },
                      error: {
                        title: "Failed to invite members",
                        description:
                          "An error occurred while inviting the members.",
                      },
                    },
                    () =>
                      inviteOrganizationMembersAction(organization.id, emails),
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
