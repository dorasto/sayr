"use client";

import { useLayoutData } from "@/components/generic/Context";
import IconPicker from "@/components/generic/icon-picker";
import RenderIcon from "@/components/generic/RenderIcon";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import {
  useWSMessageHandler,
  WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import {
  deleteSavedViewAction,
  updateSavedViewAction,
} from "@/lib/fetches/organization";
import type { ServerEventMessage } from "@/lib/serverEvents";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import {
  Tile,
  TileAction,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { headlessToast } from "@repo/ui/components/headless-toast";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Switch } from "@repo/ui/components/switch";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  IconCheck,
  IconDeviceFloppy,
  IconEyeOff,
  IconLayoutKanban,
  IconLayoutRows,
  IconList,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ViewFilterEditor } from "./view-filter-editor";
import {
  TASK_GROUPING_OPTIONS,
  TASK_GROUPINGS,
  TaskGroupingId,
} from "@/components/tasks";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { usePlanLimits } from "@/hooks/usePlanLimits";

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-"); // Replace multiple - with single -
};

export default function SettingsOrganizationViewDetailPage({
  viewId,
  initialView,
}: {
  viewId: string;
  initialView?: schema.savedViewType;
}) {
  const { serverEvents } = useLayoutData();
  const { organization, setOrganization, views, setViews, labels, categories, releases } = useLayoutOrganization();
  useServerEventsSubscription({
    serverEvents,
    orgId: organization?.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });
  const { tasks } = useLayoutTasks();
  const router = useRouter();
  const { isOverLimit: checkOverLimit, getLimitMessage } = usePlanLimits();
  const viewsOverLimit = checkOverLimit("savedViews");
  const { value: sseClientId } = useStateManagement<string>(
    "ws-clientId",
    "",
    1,
  );

  const contextView = views.find((v) => v.id === viewId);
  // Prefer initialView (fresh from server) over contextView (potentially stale cache)
  // Fall back to contextView only if initialView is not available
  const view = initialView ?? contextView;

  // Sync fresh initialView into the views cache so SSE updates have correct baseline
  const syncedViewIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialView && syncedViewIdRef.current !== initialView.id) {
      syncedViewIdRef.current = initialView.id;
      const idx = views.findIndex((v) => v.id === initialView.id);
      if (idx >= 0) {
        const updated = [...views];
        updated[idx] = initialView;
        setViews(updated);
      } else {
        setViews([...views, initialView]);
      }
    }
  }, [initialView, views, setViews]);

  const [name, setName] = useState(view?.name || "");
  const [filterParams, setFilterParams] = useState(view?.filterParams || "");
  const [slug, setSlug] = useState(view?.slug || "");
  const defaultConfig: NonNullable<schema.savedViewType["viewConfig"]> = {
    mode: "list",
    groupBy: "status",
    showCompletedTasks: true,
    color: "#ffffff",
    icon: "IconStack2",
  };

  const [viewConfig, setViewConfig] = useState<
    NonNullable<schema.savedViewType["viewConfig"]>
  >(view?.viewConfig || defaultConfig);

  useEffect(() => {
    if (view) {
      setName(view.name);
      setFilterParams(view.filterParams);
      setSlug(view.slug || "");
      setViewConfig(view.viewConfig || defaultConfig);
    }
  }, [view]);

  const handlers: WSMessageHandler<ServerEventMessage> = {
    UPDATE_VIEWS: (msg) => {
      if (msg.scope === "CHANNEL") {
        setViews(msg.data);
      }
    },
  };

  const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers, {
    onUnhandled: (msg) =>
      console.warn(
        "⚠️ [UNHANDLED MESSAGE SettingsOrganizationViewDetailPage]",
        msg,
      ),
  });

  useEffect(() => {
    if (!serverEvents.event) return;
    serverEvents.event.addEventListener("message", handleMessage);
    return () => {
      serverEvents.event?.removeEventListener("message", handleMessage);
    };
  }, [serverEvents.event, handleMessage]);

  if (!organization || !view) {
    return <div>View not found</div>;
  }

  const handleSave = async () => {
    try {
      const result = await updateSavedViewAction(
        organization.id,
        {
          id: view.id,
          name,
          value: filterParams,
          slug,
          viewConfig,
        },
        sseClientId,
      );
      if (result.success) {
        headlessToast.success({ title: "View updated successfully" });
      } else {
        headlessToast.error({ title: result.error || "Failed to update view" });
      }
    } catch (_error) {
      headlessToast.error({
        title: "An error occurred while updating the view",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this view?")) return;
    try {
      const result = await deleteSavedViewAction(
        organization.id,
        {
          id: view.id,
        },
        sseClientId,
      );
      if (result.success) {
        headlessToast.success({ title: "View deleted successfully" });
        window.location.href = `/settings/org/${organization.id}/views`;
      } else {
        headlessToast.error({ title: result.error || "Failed to delete view" });
      }
    } catch (_error) {
      headlessToast.error({
        title: "An error occurred while deleting the view",
      });
    }
  };

  const availableUsers = organization.members.map((m) => m.user);
  console.log("VIEW CONFIG", view);
  return (
    <div className="flex flex-col gap-3">
      <Label variant={"heading"}>General</Label>
      <div className="bg-card rounded-lg flex flex-col">
        <Tile className="md:w-full" variant={"transparent"}>
          <TileHeader className="md:w-full">
            <TileTitle>Name</TileTitle>
          </TileHeader>
          <TileAction className="w-full">
            <InputGroup className="bg-accent border-0 shadow-none transition-all">
              <InputGroupAddon align="inline-start">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="accent"
                      className="h-auto w-auto p-0 border-transparent rounded-lg overflow-hidden"
                    >
                      <RenderIcon
                        iconName={viewConfig?.icon || "IconStack2"}
                        color={viewConfig?.color || "#ffffff"}
                        button
                        className="size-8 [&_svg]:size-5"
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-64 md:w-96">
                    <div className="flex flex-col gap-3">
                      <div className="p-3">
                        <ColorPickerCustom
                          onChange={(c) =>
                            setViewConfig((prev) => ({
                              ...(prev ?? defaultConfig),
                              color: c.hsla,
                            }))
                          }
                          defaultValue={viewConfig?.color || "#fffff"}
                          height={100}
                        />
                      </div>
                      <div className="px-3">
                        <IconPicker
                          value={viewConfig?.icon || "IconStack2"}
                          update={(value) =>
                            setViewConfig((prev) => ({
                              ...(prev ?? defaultConfig),
                              icon: value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </InputGroupAddon>
              <InputGroupInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter view name"
              />
            </InputGroup>
          </TileAction>
        </Tile>
        <Tile className="md:w-full" variant={"transparent"}>
          <TileHeader className="md:w-full">
            <TileTitle>Slug</TileTitle>
          </TileHeader>
          <TileAction className="w-full">
            <InputGroup className="bg-accent border-0 shadow-none transition-all">
              <InputGroupAddon align="inline-start">
                <InputGroupText className="font-mono">view-</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                placeholder="my-view"
                className="font-mono pl-0!"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton variant={"ghost"} size={"icon-sm"}>
                  <IconCheck />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </TileAction>
        </Tile>
        {/* All custom view urls will begin with view-... Although called a slug, it'll be a param if possible */}
      </div>
      <div className="bg-card rounded-lg flex flex-col">
        <Tile className="md:w-full flex-col gap-3" variant={"transparent"}>
          <TileHeader className="md:w-full">
            <TileTitle>Filter</TileTitle>
          </TileHeader>
          <ViewFilterEditor
            initialFilterParams={filterParams}
            onChange={setFilterParams}
            labels={labels}
            availableUsers={availableUsers}
            categories={categories}
            tasks={tasks}
            releases={releases}
          />
        </Tile>
      </div>
      <Label variant={"heading"}>View settings</Label>
      <div className="bg-card rounded-lg flex flex-col">
        <Tile className="md:w-full" variant={"transparent"}>
          <TileHeader className="md:w-full">
            <TileTitle>Display</TileTitle>
          </TileHeader>
          <TileAction className="">
            <RadioGroup
              value={viewConfig?.mode}
              className="flex items-center gap-2"
              onValueChange={(v) =>
                setViewConfig((prev) => ({
                  ...(prev ?? defaultConfig),
                  mode: v as "list" | "kanban",
                }))
              }
            >
              <Label
                className={cn(
                  "flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                  viewConfig?.mode === "list" && "border-primary/50 bg-accent",
                )}
              >
                <RadioGroupItem value={"list"} className="sr-only" />
                <div className="flex items-center gap-1">
                  <IconList className="size-4" />
                  <span className="cursor-pointer text-sm font-semibold">
                    List
                  </span>
                </div>
              </Label>
              <Label
                className={cn(
                  "flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                  viewConfig?.mode === "kanban" &&
                  "border-primary/50 bg-accent",
                )}
              >
                <RadioGroupItem value={"kanban"} className="sr-only" />
                <div className="flex items-center gap-1">
                  <IconLayoutKanban className="size-4" />
                  <span className="cursor-pointer text-sm font-semibold">
                    Kanban
                  </span>
                </div>
              </Label>
            </RadioGroup>
          </TileAction>
        </Tile>
        <Tile className="md:w-full" variant={"transparent"}>
          <TileHeader className="md:w-full">
            <TileTitle>Group by</TileTitle>
          </TileHeader>
          <TileAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <IconLayoutRows className="h-4 w-4" />
                  <span>
                    {TASK_GROUPINGS[
                      (viewConfig?.groupBy as TaskGroupingId) || "status"
                    ]?.label || "Status"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={viewConfig?.groupBy}
                  onValueChange={(v) =>
                    setViewConfig((prev) => ({
                      ...(prev ?? defaultConfig),
                      groupBy: v as TaskGroupingId,
                    }))
                  }
                >
                  {TASK_GROUPING_OPTIONS.map((grouping) => (
                    <DropdownMenuRadioItem
                      key={grouping.id}
                      value={grouping.id}
                    >
                      {grouping.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </TileAction>
        </Tile>
        <Tile className="md:w-full" variant={"transparent"}>
          <TileHeader className="md:w-full">
            <TileTitle>Sub-group by</TileTitle>
          </TileHeader>
          <TileAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {viewConfig?.subGroupBy ? (
                    <>
                      <IconLayoutRows className="h-4 w-4" />
                      <span>
                        {TASK_GROUPINGS[viewConfig.subGroupBy as TaskGroupingId]
                          ?.label || "None"}
                      </span>
                    </>
                  ) : (
                    <>
                      <IconEyeOff className="h-4 w-4" />
                      <span>None</span>
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={viewConfig?.subGroupBy || "none"}
                  onValueChange={(v) =>
                    setViewConfig((prev) => ({
                      ...(prev ?? defaultConfig),
                      subGroupBy:
                        v === "none" ? undefined : (v as TaskGroupingId),
                    }))
                  }
                >
                  <DropdownMenuRadioItem value="none">
                    None
                  </DropdownMenuRadioItem>
                  {TASK_GROUPING_OPTIONS.filter(
                    (opt) => opt.id !== viewConfig?.groupBy,
                  ).map((grouping) => (
                    <DropdownMenuRadioItem
                      key={grouping.id}
                      value={grouping.id}
                    >
                      {grouping.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </TileAction>
        </Tile>
        <Tile className="md:w-full" variant={"transparent"}>
          <TileHeader className="md:w-full">
            <TileTitle>Show completed tasks</TileTitle>
          </TileHeader>
          <TileAction>
            <Switch
              checked={viewConfig?.showCompletedTasks}
              onCheckedChange={(c) =>
                setViewConfig((prev) => ({
                  ...(prev ?? defaultConfig),
                  showCompletedTasks: c,
                }))
              }
            />
          </TileAction>
        </Tile>
      </div>
      <div className="flex flex-col gap-4 max-w-2xl">
        {viewsOverLimit && (
          <p className="text-sm text-destructive">
            {getLimitMessage("savedViews")} Editing is disabled until you remove views to get back under the limit.
          </p>
        )}
        <div className="flex items-center gap-2 mt-4">
          <Button
            onClick={handleSave}
            variant={"primary"}
            disabled={viewsOverLimit}
          >
            <IconDeviceFloppy className="" />
            Save Changes
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={handleDelete}
          >
            <IconTrash className="" />
            Delete View
          </Button>
        </div>
      </div>
    </div>
  );
}
