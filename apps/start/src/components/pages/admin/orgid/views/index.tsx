"use client";
import { useLayoutData } from "@/components/generic/Context";
import RenderIcon from "@/components/generic/RenderIcon";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { Button } from "@repo/ui/components/button";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues } from "@repo/util";
import { IconPlus, IconSettings, IconStack2 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

export default function OrganizationViewsPage() {
  const { ws } = useLayoutData();
  const { organization, setOrganization, views, setViews } =
    useLayoutOrganization();

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
    onUnhandled: (msg) =>
      console.warn("⚠️ [UNHANDLED MESSAGE OrganizationViewsPage]", msg),
  });

  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);

  if (!organization) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Saved Views</h2>
          <p className="text-sm text-muted-foreground">
            Custom filtered views of your tasks
          </p>
        </div>
        <Link
          to="/settings/org/$orgId/views"
          params={{ orgId: organization.id }}
        >
          <Button variant="default" size="sm" className="gap-2">
            <IconPlus className="size-4" />
            Manage Views
          </Button>
        </Link>
      </div>

      {/* Views Grid */}
      <div className="flex flex-col gap-3">
        {views.map((view) => (
          <Tile
            className={cn(
              "bg-card hover:bg-accent md:w-full transition-colors cursor-pointer h-full p-0 gap-0",
            )}
            key={view.id}
            // style={{
            //   background: view.viewConfig?.color
            //     ? `hsla(${extractHslValues(view.viewConfig.color)}, 0.05) 0%`
            //     : undefined,
            // }}
          >
            <Link
              to="/$orgId/tasks"
              params={{ orgId: organization.id }}
              search={{ view: view.slug || view.id }}
              className="w-full h-full p-6"
            >
              <TileHeader className="flex items-center gap-3 w-full">
                <TileIcon className={cn("shrink-0 p-0")}>
                  <RenderIcon
                    iconName={view.viewConfig?.icon || "IconStack2"}
                    color={view.viewConfig?.color || "#ffffff"}
                    button
                    className={cn("size-5! [&_svg]:size-4! border-0")}
                  />
                </TileIcon>
                <TileTitle className="text-base font-semibold">
                  {view.name}
                </TileTitle>

                <div className="flex flex-col gap-1 w-full"></div>
              </TileHeader>
            </Link>
            <TileAction className="p-3">
              <Link
                to="/settings/org/$orgId/views/$viewId"
                params={{ orgId: organization.id, viewId: view.id }}
                onClick={(e) => e.stopPropagation()}
                className=""
              >
                <Button variant="primary" size="icon" className="">
                  <IconSettings />
                </Button>
              </Link>
            </TileAction>
          </Tile>
        ))}
      </div>

      {/* Empty State */}
      {views.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/20">
          <IconStack2 className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No saved views yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Create custom filtered views to quickly access specific sets of
            tasks. Views can be created from the tasks page or in settings.
          </p>
          <div className="flex gap-2">
            <Link to="/$orgId/tasks" params={{ orgId: organization.id }}>
              <Button variant="outline" size="sm">
                Go to Tasks
              </Button>
            </Link>
            <Link
              to="/settings/org/$orgId/views"
              params={{ orgId: organization.id }}
            >
              <Button variant="default" size="sm">
                Manage Views
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
