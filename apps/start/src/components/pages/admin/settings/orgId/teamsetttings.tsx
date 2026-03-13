"use client";

import type { schema, TeamPermissions } from "@repo/database";

/** Default permissions for new teams - defined client-side to avoid importing server code */
const defaultTeamPermissions: TeamPermissions = {
  admin: {
    administrator: false,
    manageMembers: false,
    manageTeams: false,
    billing: false,
  },
  content: {
    manageCategories: false,
    manageLabels: false,
    manageViews: false,
    manageReleases: false,
  },
  tasks: {
    create: true,
    editAny: false,
    deleteAny: false,
    assign: false,
    changeStatus: true,
    changePriority: true,
  },
  moderation: {
    manageComments: false,
    approveSubmissions: false,
    manageVotes: false,
  },
};
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@repo/ui/components/cossui/tabs";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { Separator } from "@repo/ui/components/separator";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import {
  IconChevronDown,
  IconDeviceFloppy,
  IconDots,
  IconMessageCircle,
  IconPlus,
  IconSettings,
  IconShield,
  IconSubtask,
  IconTrash,
  IconUser,
  IconUserMinus,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import {
  addOrganizationMemberToTeamAction,
  createOrganizationTeamAction,
  deleteOrganizationTeamAction,
  editOrganizationTeamAction,
  removeOrganizationMemberFromTeamAction,
} from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";

export default function SettingsOrganizationPageTeamSettings({
  team,
  isNew = false,
}: {
  team?: schema.OrganizationTeamWithMembersType;
  isNew?: boolean;
}) {
  const { ws } = useLayoutData();
  const { organization, setOrganization } = useLayoutOrganizationSettings();
  const navigate = useNavigate();
  const { runWithToast, isFetching } = useToastAction();

  // Form state
  const [name, setName] = useState(team?.name || "");
  const [description, setDescription] = useState(team?.description || "");
  const [permissions, setPermissions] = useState<TeamPermissions>(
    team?.permissions || defaultTeamPermissions,
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  // Collapsible state
  const [adminOpen, setAdminOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(true);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [moderationOpen, setModerationOpen] = useState(true);

  useWebSocketSubscription({
    ws,
    orgId: organization.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });

  // Track changes
  const hasChanges = isNew
    ? name.length > 0
    : name !== team?.name ||
      description !== (team?.description || "") ||
      JSON.stringify(permissions) !== JSON.stringify(team?.permissions);

  // Reset form when team changes
  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || "");
      setPermissions(team.permissions || defaultTeamPermissions);
    }
  }, [team]);

  const handleSave = async () => {
    if (isNew) {
      const result = await runWithToast(
        "create-team",
        {
          loading: { title: "Creating team...", description: "Please wait." },
          success: {
            title: "Team created",
            description: `"${name}" has been created.`,
          },
          error: {
            title: "Failed to create team",
            description: "An error occurred.",
          },
        },
        () =>
          createOrganizationTeamAction(organization.id, {
            name,
            description,
            permissions,
          }),
      );

      if (result?.success) {
        navigate({
          to: "/settings/org/$orgId/teams/$teamId",
          params: { orgId: organization.id, teamId: name },
        });
      }
    } else if (team) {
      const result = await runWithToast(
        "edit-team",
        {
          loading: { title: "Updating team...", description: "Please wait." },
          success: {
            title: "Team updated",
            description: `"${name}" has been updated.`,
          },
          error: {
            title: "Failed to update team",
            description: "An error occurred.",
          },
        },
        () =>
          editOrganizationTeamAction(organization.id, team.id, {
            name,
            description,
            permissions,
          }),
      );

      if (result?.success) {
        if (name !== team.name) {
          navigate({
            to: "/settings/org/$orgId/teams/$teamId",
            params: { orgId: organization.id, teamId: name },
          });
        } else {
          window.location.reload();
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!team) return;

    const result = await runWithToast(
      "delete-team",
      {
        loading: { title: "Deleting team...", description: "Please wait." },
        success: {
          title: "Team deleted",
          description: `"${team.name}" has been deleted.`,
        },
        error: {
          title: "Failed to delete team",
          description: "An error occurred.",
        },
      },
      () => deleteOrganizationTeamAction(organization.id, team.id),
    );

    if (result?.success) {
      navigate({
        to: "/settings/org/$orgId/teams",
        params: { orgId: organization.id },
      });
    }
  };

  const handleAddMember = async (memberId: string) => {
    if (!team) return;

    const result = await runWithToast(
      `add-member-${memberId}`,
      {
        loading: { title: "Adding member...", description: "Please wait." },
        success: {
          title: "Member added",
          description: "Member has been added to the team.",
        },
        error: {
          title: "Failed to add member",
          description: "An error occurred.",
        },
      },
      () =>
        addOrganizationMemberToTeamAction(organization.id, team.id, memberId),
    );

    if (result?.success) {
      setAddMemberOpen(false);
      window.location.reload();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;

    const confirmed = window.confirm("Remove this member from the team?");
    if (!confirmed) return;

    const result = await runWithToast(
      `remove-member-${memberId}`,
      {
        loading: { title: "Removing member...", description: "Please wait." },
        success: {
          title: "Member removed",
          description: "Member has been removed from the team.",
        },
        error: {
          title: "Failed to remove member",
          description: "An error occurred.",
        },
      },
      () =>
        removeOrganizationMemberFromTeamAction(
          organization.id,
          team.id,
          memberId,
        ),
    );

    if (result?.success) {
      window.location.reload();
    }
  };

  // Get organization members not in this team
  const teamMemberIds = new Set(team?.members.map((m) => m.memberId) || []);
  const availableMembers = organization.members.filter(
    (m) => !teamMemberIds.has(m.id),
  );

  // Permission update helpers
  const updateAdminPermission = (
    key: keyof TeamPermissions["admin"],
    value: boolean,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      admin: { ...prev.admin, [key]: value },
    }));
  };

  const updateContentPermission = (
    key: keyof TeamPermissions["content"],
    value: boolean,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      content: { ...prev.content, [key]: value },
    }));
  };

  const updateTasksPermission = (
    key: keyof TeamPermissions["tasks"],
    value: boolean,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      tasks: { ...prev.tasks, [key]: value },
    }));
  };

  const updateModerationPermission = (
    key: keyof TeamPermissions["moderation"],
    value: boolean,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      moderation: { ...prev.moderation, [key]: value },
    }));
  };

  const isAdmin = permissions.admin.administrator;

  return (
    <Tabs defaultValue="settings" className={"w-full min-w-full"}>
      <div className="w-full min-w-full border-b flex items-center justify-between sticky top-0 bg-background z-50">
        <TabsList variant="underline">
          <TabsTab value="settings">General</TabsTab>
          <TabsTab value="permissions">Permissions</TabsTab>
          {!isNew && <TabsTab value="members">Members</TabsTab>}
        </TabsList>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isFetching || name.length === 0}
            size="sm"
            variant={"primary"}
            className="h-fit p-1"
          >
            <IconDeviceFloppy className="size-4" />
            {isNew ? "Create" : "Save"}
          </Button>
        )}
      </div>

      {/* General Settings Tab */}
      <TabsPanel value="settings" className="w-full">
        <div className="bg-card rounded-lg flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              placeholder="Enter team name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              placeholder="What is this team responsible for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {!isNew && team && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label variant="description" className="text-destructive">
                  Danger Zone
                </Label>
                <Popover
                  open={confirmDeleteOpen}
                  onOpenChange={setConfirmDeleteOpen}
                >
                  <PopoverTrigger asChild>
                    <Button variant="destructive" className="w-fit">
                      <IconTrash className="size-4" />
                      Delete Team
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 flex flex-col gap-3">
                    {team.isSystem ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        This is a system team and cannot be deleted.
                      </div>
                    ) : (
                      <>
                        <Tile className="md:w-full p-3 bg-accent">
                          <TileHeader>
                            <TileIcon>
                              <IconUsersGroup className="size-5" />
                            </TileIcon>
                            <TileTitle>{team.name}</TileTitle>
                          </TileHeader>
                          <TileAction>
                            {team.members.length}{" "}
                            {team.members.length === 1 ? "member" : "members"}
                          </TileAction>
                        </Tile>

                        <div className="flex flex-col gap-3 p-3">
                          <Label>
                            Are you sure you want to delete this team? This
                            action cannot be undone.
                          </Label>

                          <div className="flex justify-end gap-2">
                            <ButtonGroup>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmDeleteOpen(false)}
                              >
                                Cancel
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                disabled={isFetching}
                              >
                                <IconTrash className="size-4" />
                                Delete
                              </Button>
                            </ButtonGroup>
                          </div>
                        </div>
                      </>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
      </TabsPanel>

      {/* Permissions Tab */}
      <TabsPanel value="permissions" className="w-full">
        <div className="flex flex-col gap-2">
          {/* Administrator Override - Always visible */}
          <Label className="py-3">
            Learn more about how permissions work{" "}
            <a
              href="https://sayr.io/docs/organizations/members-and-teams/#permissions"
              className="text-primary hover:underline"
            >
              here
            </a>
            .
          </Label>
          <div
            className={cn(
              "rounded-lg p-4 transition-colors",
              isAdmin ? "bg-destructive/10" : "bg-card",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    isAdmin ? "bg-destructive/20" : "bg-muted",
                  )}
                >
                  <IconShield
                    className={cn("size-5", isAdmin && "text-destructive")}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="font-medium">Administrator</Label>
                  <Label variant="description" className="text-sm">
                    Full access to all organization settings and content.
                    Overrides all other permissions.
                  </Label>
                </div>
              </div>
              <Switch
                checked={isAdmin}
                onCheckedChange={(checked) =>
                  updateAdminPermission("administrator", checked)
                }
                disabled={team?.isSystem}
              />
            </div>
          </div>

          {/* Admin disabled overlay message */}
          {isAdmin && (
            <div className="rounded-lg bg-muted/50 border border-dashed p-3 text-center">
              <Label variant="description" className="text-sm">
                Administrator permission grants full access. Other permissions
                are ignored.
              </Label>
            </div>
          )}

          {/* Organization Administration */}
          <Collapsible
            open={!isAdmin && adminOpen}
            onOpenChange={setAdminOpen}
            className={cn(
              "bg-card rounded-lg",
              isAdmin && "pointer-events-none opacity-50",
            )}
            disabled={isAdmin}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors",
                  !adminOpen && "bg-card",
                )}
              >
                <div className="flex items-center gap-2">
                  <IconSettings className="size-4 text-muted-foreground" />
                  <Label className="font-medium cursor-pointer">
                    Organization
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {
                      [
                        permissions.admin.manageMembers,
                        permissions.admin.manageTeams,
                        permissions.admin.billing,
                      ].filter(Boolean).length
                    }
                    /3
                  </Badge>
                </div>
                <IconChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    adminOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 pr-2 pb-2 flex flex-col gap-2">
                <PermissionRow
                  label="Manage members"
                  description="Invite, remove, and manage organization members"
                  checked={permissions.admin.manageMembers}
                  onCheckedChange={(checked) =>
                    updateAdminPermission("manageMembers", checked)
                  }
                  disabled={isAdmin}
                />
                <PermissionRow
                  label="Manage teams"
                  description="Create, edit, and delete teams"
                  checked={permissions.admin.manageTeams}
                  onCheckedChange={(checked) =>
                    updateAdminPermission("manageTeams", checked)
                  }
                  disabled={isAdmin}
                />
                <PermissionRow
                  label="Manage billing"
                  description="Access billing information and manage subscription (if applicable)"
                  checked={permissions.admin.billing}
                  onCheckedChange={(checked) =>
                    updateAdminPermission("billing", checked)
                  }
                  disabled={isAdmin}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Content Settings */}
          <Collapsible
            open={!isAdmin && contentOpen}
            onOpenChange={setContentOpen}
            className={cn(
              "bg-card rounded-lg",
              isAdmin && "pointer-events-none opacity-50",
            )}
            disabled={isAdmin}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors",
                  !contentOpen && "bg-card",
                )}
              >
                <div className="flex items-center gap-2">
                  <IconSettings className="size-4 text-muted-foreground" />
                  <Label className="font-medium cursor-pointer">
                    Content Settings
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {Object.values(permissions.content).filter(Boolean).length}
                    /4
                  </Badge>
                </div>
                <IconChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    contentOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 pr-2 pb-2 flex flex-col gap-2">
                <PermissionRow
                  label="Manage categories"
                  description="Create, edit, and delete project categories"
                  checked={permissions.content.manageCategories}
                  onCheckedChange={(checked) =>
                    updateContentPermission("manageCategories", checked)
                  }
                  disabled={isAdmin}
                />
                <PermissionRow
                  label="Manage labels"
                  description="Create, edit, and delete task labels"
                  checked={permissions.content.manageLabels}
                  onCheckedChange={(checked) =>
                    updateContentPermission("manageLabels", checked)
                  }
                  disabled={isAdmin}
                />
                <PermissionRow
                  label="Manage views"
                  description="Create, edit, and delete saved views"
                  checked={permissions.content.manageViews}
                  onCheckedChange={(checked) =>
                    updateContentPermission("manageViews", checked)
                  }
                  disabled={isAdmin}
                />
                <PermissionRow
                  label="Manage releases"
                  description="Create, edit, and delete releases"
                  checked={permissions.content.manageReleases}
                  onCheckedChange={(checked) =>
                    updateContentPermission("manageReleases", checked)
                  }
                  disabled={isAdmin}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Task Permissions */}
          <Collapsible
            open={!isAdmin && tasksOpen}
            onOpenChange={setTasksOpen}
            className={cn(
              "bg-card rounded-lg",
              isAdmin && "pointer-events-none opacity-50",
            )}
            disabled={isAdmin}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors",
                  !tasksOpen && "bg-card",
                )}
              >
                <div className="flex items-center gap-2">
                  <IconSubtask className="size-4 text-muted-foreground" />
                  <Label className="font-medium cursor-pointer">Tasks</Label>
                  <Badge variant="secondary" className="text-xs">
                    {
                      [
                        permissions.tasks.create,
                        permissions.tasks.editAny,
                        permissions.tasks.assign,
                        permissions.tasks.changeStatus,
                        permissions.tasks.changePriority,
                      ].filter(Boolean).length
                    }
                    /5
                  </Badge>
                </div>
                <IconChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    tasksOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 pr-2 pb-2 flex flex-col gap-3">
                {/* Task Actions - Checkbox Row */}
                <div className="flex flex-col gap-2">
                  <Label
                    variant="description"
                    className="text-xs uppercase tracking-wide"
                  >
                    Task Actions
                  </Label>
                  <div className="flex flex-wrap gap-4">
                    <CheckboxItem
                      label="Create"
                      checked={permissions.tasks.create}
                      onCheckedChange={(checked) =>
                        updateTasksPermission("create", checked)
                      }
                      disabled={isAdmin}
                    />
                    <CheckboxItem
                      label="Edit any"
                      checked={permissions.tasks.editAny}
                      onCheckedChange={(checked) =>
                        updateTasksPermission("editAny", checked)
                      }
                      disabled={isAdmin}
                    />
                    <CheckboxItem
                      label="Delete any (coming soon)"
                      checked={false}
                      onCheckedChange={() => {}}
                      disabled={true}
                    />
                    <CheckboxItem
                      label="Assign"
                      checked={permissions.tasks.assign}
                      onCheckedChange={(checked) =>
                        updateTasksPermission("assign", checked)
                      }
                      disabled={isAdmin}
                    />
                  </div>
                </div>

                {/* Task Properties - Checkbox Row */}
                <div className="flex flex-col gap-2">
                  <Label
                    variant="description"
                    className="text-xs uppercase tracking-wide"
                  >
                    Task Properties
                  </Label>
                  <div className="flex flex-wrap gap-4">
                    <CheckboxItem
                      label="Change status"
                      checked={permissions.tasks.changeStatus}
                      onCheckedChange={(checked) =>
                        updateTasksPermission("changeStatus", checked)
                      }
                      disabled={isAdmin}
                    />
                    <CheckboxItem
                      label="Change priority"
                      checked={permissions.tasks.changePriority}
                      onCheckedChange={(checked) =>
                        updateTasksPermission("changePriority", checked)
                      }
                      disabled={isAdmin}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Moderation */}
          <Collapsible
            open={!isAdmin && moderationOpen}
            onOpenChange={setModerationOpen}
            className={cn(
              "bg-card rounded-lg",
              isAdmin && "pointer-events-none opacity-50",
            )}
            disabled={isAdmin}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors",
                  !moderationOpen && "bg-card",
                )}
              >
                <div className="flex items-center gap-2">
                  <IconMessageCircle className="size-4 text-muted-foreground" />
                  <Label className="font-medium cursor-pointer">
                    Moderation
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {
                      [permissions.moderation.manageComments].filter(Boolean)
                        .length
                    }
                    /1
                  </Badge>
                </div>
                <IconChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    moderationOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 pr-2 pb-2 flex flex-col gap-2">
                <PermissionRow
                  label="Manage comments"
                  description="Edit or delete any comment"
                  checked={permissions.moderation.manageComments}
                  onCheckedChange={(checked) =>
                    updateModerationPermission("manageComments", checked)
                  }
                  disabled={isAdmin}
                />
                <PermissionRow
                  label="Approve submissions (coming soon)"
                  description="Approve or reject public bug reports and feedback"
                  checked={false}
                  onCheckedChange={() => {}}
                  disabled={true}
                />
                <PermissionRow
                  label="Manage votes (coming soon)"
                  description="Reset votes, handle vote fraud"
                  checked={false}
                  onCheckedChange={() => {}}
                  disabled={true}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </TabsPanel>

      {/* Members Tab */}
      {!isNew && team && (
        <TabsPanel value="members" className="w-full">
          <div className="bg-card rounded-lg flex flex-col">
            {/* Add Member */}
            <Popover open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <PopoverTrigger asChild>
                <Tile
                  className="md:w-full hover:bg-accent cursor-pointer"
                  variant="transparent"
                >
                  <TileHeader className="md:w-full">
                    <TileIcon className="bg-transparent">
                      <Avatar className="h-10 w-10 rounded-md">
                        <AvatarFallback className="rounded-md uppercase text-xs">
                          <IconPlus className="size-6" />
                        </AvatarFallback>
                      </Avatar>
                    </TileIcon>
                    <TileTitle>Add Member</TileTitle>
                    <TileDescription>
                      Add an organization member to this team
                    </TileDescription>
                  </TileHeader>
                </Tile>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-80">
                <div className="p-3 border-b">
                  <Label variant="heading">Add Member</Label>
                  <Label variant="description">
                    Select an organization member to add
                  </Label>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {availableMembers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      All organization members are already in this team.
                    </div>
                  ) : (
                    availableMembers.map((member) => (
                      <Tile
                        key={member.id}
                        className="md:w-full hover:bg-accent cursor-pointer"
                        variant="transparent"
                        onClick={() => handleAddMember(member.id)}
                      >
                        <TileHeader className="md:w-full">
                          <TileIcon className="bg-transparent">
                            <Avatar className="h-8 w-8 rounded-full">
                              <AvatarImage src={member.user.image || ""} />
                              <AvatarFallback className="rounded-full text-xs">
                                <IconUser className="size-4" />
                              </AvatarFallback>
                            </Avatar>
                          </TileIcon>
                          <TileTitle className="text-sm">
                            {member.user.name}
                          </TileTitle>
                          <TileDescription className="text-xs">
                            {member.user.email}
                          </TileDescription>
                        </TileHeader>
                      </Tile>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {team.members.length > 0 && <Separator />}

            {/* Team Members List */}
            {team.members.map((teamMember) => {
              const orgMember = organization.members.find(
                (m) => m.id === teamMember.memberId,
              );
              if (!orgMember) return null;

              return (
                <DropdownMenu key={teamMember.id}>
                  <DropdownMenuTrigger asChild>
                    <Tile
                      className="md:w-full hover:bg-accent cursor-pointer"
                      variant="transparent"
                    >
                      <TileHeader className="md:w-full">
                        <TileIcon className="bg-transparent">
                          <Avatar className="h-10 w-10 rounded-full">
                            <AvatarImage src={orgMember.user.image || ""} />
                            <AvatarFallback className="rounded-full text-xs">
                              <IconUser className="size-5" />
                            </AvatarFallback>
                          </Avatar>
                        </TileIcon>
                        <TileTitle>{orgMember.user.name}</TileTitle>
                        <TileDescription>
                          {orgMember.user.email}
                        </TileDescription>
                      </TileHeader>
                      <TileAction>
                        <Button variant="ghost" size="icon">
                          <IconDots />
                        </Button>
                      </TileAction>
                    </Tile>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Avatar className="h-4 w-4 rounded-md">
                        <AvatarImage src={orgMember.user.image || ""} />
                        <AvatarFallback className="rounded-md text-xs">
                          <IconUser className="size-3" />
                        </AvatarFallback>
                      </Avatar>
                      {orgMember.user.name}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleRemoveMember(teamMember.memberId)}
                    >
                      <IconUserMinus /> Remove from team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}

            {/* Empty State */}
            {team.members.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                <IconUsers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  No members in this team yet. Add members to grant them team
                  permissions.
                </p>
              </div>
            )}
          </div>
        </TabsPanel>
      )}
    </Tabs>
  );
}

/** Permission row with switch */
function PermissionRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-lg transition-colors",
        checked && !disabled && "bg-primary/5",
        disabled && "opacity-50",
      )}
    >
      <div className="flex flex-col gap-0.5">
        <Label className="text-sm">{label}</Label>
        <Label variant="description" className="text-xs">
          {description}
        </Label>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

/** Compact checkbox item for inline rows */
function CheckboxItem({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
