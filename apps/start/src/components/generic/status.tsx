"use client";

import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { parseChannel } from "@repo/util";
import { IconLoader2 } from "@tabler/icons-react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

interface StatusBarProps {
  layout?: "default" | "sidebar";
  sidebarCollapsed?: boolean;
  children?: React.ReactNode;
}

export function StatusBar({
  layout = "default",
  sidebarCollapsed = false,
  children,
}: StatusBarProps) {
  const { value: wsStatus } = useStateManagement<string>(
    "ws-status",
    "Disconnected",
  );
  const { value: wsSubscribedState } = useStateManagement<{
    orgId: string;
    channel: string;
  } | null>("ws-subscribe-state", null);

  // --- Status states ---
  const states = {
    Disconnected: {
      icon: <XCircle className="w-3.5 h-3.5" />,
      color: "bg-destructive",
      text: "text-destructive",
      label: "Disconnected",
    },
    Reconnecting: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      color: "bg-muted-foreground",
      text: "text-yellow-500",
      label: "Reconnecting…",
    },
    Connecting: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      color: "bg-muted-foreground",
      text: "text-muted-foreground",
      label: "Connecting…",
    },
    Connected: {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: "bg-success",
      text: "text-success",
      label: "",
    },
  } as const;

  const ws = states[wsStatus as keyof typeof states] ?? states.Disconnected;
  const subColor = wsSubscribedState ? "bg-emerald-500" : "bg-amber-500";

  // --- Parse channel info ---
  const parsed = wsSubscribedState?.channel
    ? parseChannel(wsSubscribedState.channel)
    : null;
  const parsedEntries =
    parsed &&
    Object.entries(parsed).map(([key, val]) => ({
      key: key.charAt(0).toUpperCase() + key.slice(1),
      val,
    }));

  // --- Collapsed (tiny indicators only) ---
  if (layout === "sidebar" && sidebarCollapsed) {
    return (
      <div className="border-t border-slate-700/70 py-2 flex flex-col items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${ws.color}`} />
        <span className={`w-1.5 h-1.5 rounded-full ${subColor}`} />
      </div>
    );
  }

  // --- Sidebar layout ---
  if (layout === "sidebar") {
    return (
      <div className="border-t border-slate-700/70 px-3 py-2 bg-slate-900/70 backdrop-blur-sm text-gray-300 flex flex-col gap-1.5 text-xs">
        {/* WebSocket */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${ws.color}`} />
            <span className="text-gray-400">WebSocket:</span>
          </div>
          <div
            className={`${ws.text} flex items-center gap-1 truncate font-medium`}
          >
            {ws.icon}
            {ws.label}
          </div>
        </div>

        {/* Subscription */}
        <div className="flex flex-col mt-0.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${subColor}`}
              />
              <span className="text-gray-400">Subscription:</span>
            </div>
            {wsSubscribedState ? (
              <code
                className="
									text-emerald-300 font-mono text-[10px]
									bg-emerald-900/30 px-1 py-[1px] rounded truncate
									border border-emerald-700/30 max-w-[110px] text-right
								"
                title={wsSubscribedState.orgId}
              >
                {wsSubscribedState.orgId}
              </code>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Pending…
              </span>
            )}
          </div>

          {/* Parsed channel list */}
          {parsedEntries && (
            <div className="pl-5 mt-0.5 flex flex-wrap gap-x-2 gap-y-[2px] text-[11px] text-slate-400">
              {parsedEntries.map(({ key, val }) => (
                <span
                  key={key}
                  className="
										flex items-center gap-1 truncate
										bg-slate-800/70 border border-slate-700/50
										px-1.5 py-[1px] rounded text-[10px] text-slate-300
									"
                  title={`${key}: ${val}`}
                >
                  <span className="opacity-70">{key}:</span>
                  <span className="font-mono text-[10px] text-emerald-400 truncate">
                    {val}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Default layout (main card) ---
  if (wsStatus === "Connected" && !children) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-0.5 h-9 shadow-xs w-fit">
      {wsStatus !== "Connected" && (
        <div className="flex items-center gap-0.5 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={"secondary"}
                className={cn(
                  "font-mono h-9 rounded gap-1",
                  ws.label === "" && "bg-transparent",
                )}
              >
                <span className={cn("", ws.text)}>{ws.icon}</span> {ws.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {wsSubscribedState ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Label variant={"subheading"} className="font-mono w-1/5">
                      Websocket:
                    </Label>
                    <Label
                      variant={"default"}
                      className={cn(
                        "font-mono w-full text-right flex items-center gap-2 justify-end",
                        ws.text,
                      )}
                    >
                      {ws.icon}
                      {ws.label}
                    </Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Label variant={"subheading"} className="font-mono w-1/5">
                      Org:
                    </Label>
                    <Label
                      variant={"default"}
                      className="font-mono w-full text-right"
                    >
                      {wsSubscribedState.orgId}
                    </Label>
                  </div>

                  {parsedEntries?.map(({ key, val }) => (
                    <div key={key} className="flex items-center gap-3">
                      <Label variant={"subheading"} className="font-mono w-1/5">
                        {key}:
                      </Label>
                      <Label
                        variant={"default"}
                        className="font-mono w-full text-right"
                      >
                        {val}
                      </Label>
                    </div>
                    // <div key={key} className="font-mono" title={`${key}: ${val}`}>
                    // 	{key}: <span className="line-clamp-1">{val}</span>
                    // </div>
                  ))}
                </div>
              ) : (
                <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      {/* <div className="flex flex-col gap-1 w-full">

				<div className="flex items-center justify-between">
					<span className="flex items-center gap-1.5">
						<span className={`inline-block w-2 h-2 rounded-full ${ws.color}`} />
						{wsSubscribedState ? <span className="text-sm text-gray-300">WebSocket:</span> : null}
					</span>
					<span className={`${ws.text} flex items-center gap-1`}>
						{ws.icon}
						{ws.label}
					</span>
				</div>


				{wsSubscribedState ? (
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
						<span className="text-xs text-gray-400">
							Org: <span className="text-gray-300 font-mono">{wsSubscribedState.orgId}</span>
						</span>
						{parsedEntries && (
							<div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
								{parsedEntries.map(({ key, val }) => (
									<span
										key={key}
										className="
											font-mono text-emerald-300 bg-emerald-900/40
											border border-emerald-700/50 px-2 py-0.5 rounded
											truncate max-w-[100px]
										"
										title={`${key}: ${val}`}
									>
										{key}: {val}
									</span>
								))}
							</div>
						)}
					</div>
				) : (
					<span className="text-amber-400 flex items-center gap-1">
						<Clock className="w-4 h-4" />
						Pending…
					</span>
				)}
			</div> */}

      {children && (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}
