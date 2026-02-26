import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { IconCircleFilled, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { connections } from "./connections-data";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { Label } from "@repo/ui/components/label";

interface ConnectionsPageProps {
  connectionStatus?: Record<string, { connected: boolean; detail?: string }>;
}

export default function SettingsOrganizationConnectionsPage({
  connectionStatus,
}: ConnectionsPageProps) {
  const { ws } = useLayoutData();
  const { organization, setOrganization } = useLayoutOrganizationSettings();
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {connections.map((connection) => {
        const status = connectionStatus?.[connection.id];
        return (
          <Link
            to={`/settings/org/${organization.id}/connections/${connection.id}`}
            key={connection.id}
            className="h-full w-full"
          >
            <Tile className="md:w-full h-full flex-col gap-1 relative items-start justify-start p-3 hover:bg-accent">
              <TileHeader className="md:w-full flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <TileIcon>
                    <connection.icon />
                  </TileIcon>
                  <TileTitle asChild>
                    <Label variant={"subheading"} className="text-sm">
                      {connection.name}
                    </Label>
                  </TileTitle>
                  {status && (
                    <TileAction className="absolute top-2 right-2">
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="flex items-center gap-1.5 text-xs">
                            <IconCircleFilled
                              className={
                                status.connected ? "text-success" : "hidden"
                              }
                              size={10}
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Enabled</TooltipContent>
                      </Tooltip>
                    </TileAction>
                  )}
                </div>
              </TileHeader>

              <TileDescription className="line-clamp-3 leading-normal! text-xs">
                {connection.description}
              </TileDescription>
            </Tile>
          </Link>
        );
      })}
      <Tile
        className="md:w-full h-full flex-col gap-1 relative items-start justify-start"
        variant={"default"}
      >
        <TileHeader className="md:w-full flex items-center gap-3">
          <div className="flex items-center gap-3">
            <TileIcon className="">
              <IconPlus />
            </TileIcon>
            <TileTitle asChild>
              <Label variant={"subheading"} className="text-sm">
                More coming
              </Label>
            </TileTitle>
          </div>
        </TileHeader>

        <TileDescription className="line-clamp-3 leading-normal! text-xs">
          Help build integrations with other tools and services directly from
          the API.
        </TileDescription>
      </Tile>
    </div>
  );
}
