import type { schema } from "@repo/database";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
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
import { Separator } from "@repo/ui/components/separator";
import {
  IconDots,
  IconPlus,
  IconSettings,
  IconTrash,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { deleteOrganizationTeamAction } from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";

export default function SettingsOrganizationPageTeams({
  teams,
}: {
  teams: schema.OrganizationTeamWithMembersType[];
}) {
  const { ws } = useLayoutData();
  const { organization, setOrganization } = useLayoutOrganizationSettings();
  const { runWithToast, isFetching } = useToastAction();
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

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

  const handleDeleteTeam = async (
    team: schema.OrganizationTeamWithMembersType,
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingTeamId(team.id);
    const result = await runWithToast(
      `delete-team-${team.id}`,
      {
        loading: {
          title: "Deleting team...",
          description: `Removing "${team.name}" from the organization.`,
        },
        success: {
          title: "Team deleted",
          description: `"${team.name}" has been successfully deleted.`,
        },
        error: {
          title: "Failed to delete team",
          description: "An error occurred while deleting the team.",
        },
      },
      () => deleteOrganizationTeamAction(organization.id, team.id),
    );

    setDeletingTeamId(null);
    if (result?.success) {
      window.location.reload();
    }
  };

  return (
    <div className="bg-card rounded-lg flex flex-col">
      {/* Create New Team Tile */}
      <Link
        to="/settings/org/$orgId/teams/new"
        params={{ orgId: organization.id }}
      >
        <Tile
          className="md:w-full hover:bg-accent data-[state=open]:bg-accent"
          variant={"transparent"}
        >
          <TileHeader className="md:w-full">
            <TileIcon className="bg-transparent">
              <Avatar className="h-10 w-10 rounded-md">
                <AvatarFallback className="rounded-md uppercase text-xs">
                  <IconPlus className="size-6!" />
                </AvatarFallback>
              </Avatar>
            </TileIcon>
            <TileTitle>Create Team</TileTitle>
            <TileDescription>
              Add a new team to the organization
            </TileDescription>
          </TileHeader>
        </Tile>
      </Link>

      {teams.length > 0 && <Separator />}

      {/* List of Teams */}
      {teams.map((team) => (
        <div className="flex items-center w-full" key={team.id}>
          <Link
            to="/settings/org/$orgId/teams/$teamId"
            params={{ orgId: organization.id, teamId: team.name }}
            className="flex-1"
          >
            <Tile
              className="md:w-full hover:bg-accent data-[state=open]:bg-accent"
              variant={"transparent"}
            >
              <TileHeader className="md:w-full">
                <TileIcon className="bg-transparent">
                  <Avatar className="h-10 w-10 rounded-full">
                    <AvatarFallback className="rounded-md uppercase text-xs bg-primary/10">
                      <IconUsersGroup className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                </TileIcon>
                <TileTitle>{team.name}</TileTitle>
                <TileDescription>
                  {team.description || "No description"}
                </TileDescription>
              </TileHeader>
              <TileAction asChild>
                <TileDescription className="shrink-0 text-muted-foreground">
                  {team.members.length}{" "}
                  {team.members.length === 1 ? "member" : "members"}
                </TileDescription>
              </TileAction>
            </Tile>
          </Link>
        </div>
      ))}

      {/* Empty State */}
      {teams.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">
          <IconUsersGroup className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            No teams yet. Create a team to organize members and manage
            permissions.
          </p>
        </div>
      )}
    </div>
  );
}
