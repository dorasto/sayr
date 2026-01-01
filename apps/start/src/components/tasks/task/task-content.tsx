"use client";

import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Tile,
  TileAction,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { JsonViewer } from "@repo/ui/components/tomui/json-viewer";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import {
  SplitDialog,
  SplitDialogContent,
  SplitDialogSide,
} from "@repo/ui/components/tomui/split-dialog";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  IconArrowsDiagonal2,
  IconArrowsDiagonalMinimize2,
  IconBrandGithub,
  IconCode,
  IconExternalLink,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
  IconLink,
  IconX,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { SubWrapper } from "@/components/generic/wrapper";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import { updateLabelToTaskAction, updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import GlobalTaskAssignees from "../shared/assignee";
import GlobalTaskCategory from "../shared/category";
import { statusConfig } from "../shared/config";
import GlobalTaskLabels from "../shared/label";
import GlobalTaskPriority from "../shared/priority";
import GlobalTaskStatus from "../shared/status";
import GlobalTimeline from "./timeline/root";
import { Separator } from "@repo/ui/components/separator";
import { InlineLabel } from "../shared/inlinelabel";

interface TaskContentProps {
  isDialog?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: schema.TaskWithLabels;
  labels: schema.labelType[];
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
  availableUsers?: schema.userType[];
  organization: schema.OrganizationWithMembers;
  ws: WebSocket | null;
  personal?: boolean;
  categories: schema.categoryType[];
}

interface TaskContentSideContentProps {
  task: schema.TaskWithLabels;
  labels: schema.labelType[];
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
  availableUsers?: schema.userType[];
  wsClientId: string;
  runWithToast: typeof useToastAction extends () => { runWithToast: infer T }
    ? T
    : never;
  categories: schema.categoryType[];
  panelControls?: {
    isPanelOpen: boolean;
    onToggle: () => void;
  };
}

export function TaskContentSideContent({
  task,
  labels,
  tasks,
  setTasks,
  setSelectedTask,
  availableUsers = [],
  wsClientId,
  runWithToast,
  categories,
  panelControls,
}: TaskContentSideContentProps) {
  const debouncedUpdateLabels = useDebounceAsync(
    async (values: string[], wsClientId: string) => {
      const data = await runWithToast(
        "update-task-labels",
        {
          loading: {
            title: "Updating task...",
            description: "Updating your task... changes are already visible.",
          },
          success: {
            title: "Task saved",
            description: "Your changes have been saved successfully.",
          },
          error: {
            title: "Save failed",
            description:
              "Your changes are showing, but we couldn't save them to the server. Please try again.",
          },
        },
        () =>
          updateLabelToTaskAction(
            task.organizationId,
            task.id,
            values,
            wsClientId,
          ),
      );
      return data;
    },
    1500, // debounce delay
  );
  const urlParts = task.githubIssue?.issueUrl?.split("/");
  const [GitHubIssueOrg, GitHubIssueRepo] = [urlParts?.[3], urlParts?.[4]];
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="border-b">
        <div className="flex items-center gap-2 px-2 pt-2 pb-3 w-full justify-end">
          <SimpleClipboard
            textToCopy={`https://${task.organization?.slug}.sayr.io/${task.shortId}`}
            variant={"primary"}
            className="h-6 p-1 w-fit bg-transparent"
            copyIcon={<IconLink />}
            tooltipText="Copy task URL"
            tooltipSide="bottom"
          />
          {task.githubIssue?.id && (
            <Link to={task.githubIssue?.issueUrl} target="_blank">
              <Button
                variant="primary"
                className={cn("gap-2 h-6 w-fit bg-transparent p-1")}
                tooltipText="View linked GitHub issue"
                tooltipSide="bottom"
              >
                <IconBrandGithub />
              </Button>
            </Link>
          )}
          {panelControls && (
            <Button
              variant="primary"
              className={cn("gap-2 h-6 w-fit bg-accent border-transparent p-1")}
              onClick={panelControls.onToggle}
            >
              {panelControls.isPanelOpen ? (
                <IconLayoutSidebarRightFilled />
              ) : (
                <IconLayoutSidebarRight />
              )}
            </Button>
          )}
        </div>
      </div>
      {/* <GlobalTaskCreatedAt task={task} />
					<Separator /> */}

      <Tile className="md:w-full py-0" variant={"transparent"}>
        <TileHeader>
          <TileTitle asChild>
            <Label variant={"description"} className="text-xs">
              Status
            </Label>
          </TileTitle>
        </TileHeader>
        <TileAction>
          <GlobalTaskStatus
            task={task}
            editable={true}
            useInternalLogic={true}
            tasks={tasks}
            setTasks={setTasks}
            setSelectedTask={setSelectedTask}
            showLabel={false}
            showChevron={false}
            className="bg-transparent p-1 h-auto"
          />
        </TileAction>
      </Tile>
      <Tile className="md:w-full py-0" variant={"transparent"}>
        <TileHeader>
          <TileTitle asChild>
            <Label variant={"description"} className="text-xs">
              Priority
            </Label>
          </TileTitle>
        </TileHeader>
        <TileAction>
          <GlobalTaskPriority
            className="bg-transparent p-1 h-auto"
            showLabel={false}
            task={task}
            editable={true}
            showChevron={false}
            onPriorityChange={async (value) => {
              const updatedTasks = tasks.map((t) =>
                t.id === task.id
                  ? {
                      ...task,
                      priority: value as schema.TaskWithLabels["priority"],
                    }
                  : t,
              );
              setTasks(updatedTasks);
              if (task) {
                setSelectedTask({
                  ...task,
                  priority: value as schema.TaskWithLabels["priority"],
                });
              }
              const data = await runWithToast(
                "update-task-priority",
                {
                  loading: {
                    title: "Updating task...",
                    description:
                      "Updating your task... changes are already visible.",
                  },
                  success: {
                    title: "Task saved",
                    description: "Your changes have been saved successfully.",
                  },
                  error: {
                    title: "Save failed",
                    description:
                      "Your changes are showing, but we couldn't save them to the server. Please try again.",
                  },
                },
                () =>
                  updateTaskAction(
                    task.organizationId,
                    task.id,
                    {
                      priority: value,
                    },
                    wsClientId,
                  ),
              );
              if (data?.success && data.data) {
                const finalTasks = tasks.map((t) =>
                  t.id === task.id && data.data ? data.data : t,
                );
                setTasks(finalTasks);
                if (task && task.id === data.data.id) {
                  setSelectedTask(data.data);
                  sendWindowMessage(
                    window,
                    {
                      type: "timeline-update",
                      payload: data.data.id,
                    },
                    "*",
                  );
                }
              }
            }}
          />
        </TileAction>
      </Tile>
      <Tile className="md:w-full items-start py-0" variant={"transparent"}>
        <TileHeader>
          <TileTitle asChild>
            <Label variant={"description"} className="text-xs">
              Assignee
            </Label>
          </TileTitle>
        </TileHeader>
        <TileAction>
          <GlobalTaskAssignees
            className="bg-transparent p-1 h-auto"
            task={task}
            showChevron={false}
            editable={true}
            availableUsers={availableUsers}
            useInternalLogic={true}
            tasks={tasks}
            setTasks={setTasks}
            setSelectedTask={setSelectedTask}
            showLabel={false}
          />
        </TileAction>
      </Tile>
      <Tile className="md:w-full py-0" variant={"transparent"}>
        <TileHeader>
          <TileTitle asChild>
            <Label variant={"description"} className="text-xs">
              Category
            </Label>
          </TileTitle>
        </TileHeader>
        <TileAction className="">
          <GlobalTaskCategory
            className="bg-transparent p-1 h-auto"
            showLabel={false}
            task={task}
            showChevron={false}
            editable={true}
            useInternalLogic={true}
            tasks={tasks}
            setTasks={setTasks}
            setSelectedTask={setSelectedTask}
            categories={categories}
          />
        </TileAction>
      </Tile>
      <Tile className="md:w-full items-start py-0" variant={"transparent"}>
        <TileHeader>
          <TileTitle asChild>
            <Label variant={"description"} className="text-xs">
              Labels
            </Label>
          </TileTitle>
        </TileHeader>
        <TileAction>
          <GlobalTaskLabels
            showLabel={false}
            task={task}
            editable={true}
            availableLabels={labels}
            onLabelsChange={async (values) => {
              const updatedTasks = tasks.map((t) =>
                t.id === task.id
                  ? {
                      ...task,
                      labels: labels.filter((label) =>
                        values.includes(label.id),
                      ),
                    }
                  : t,
              );
              setTasks(updatedTasks);
              if (task) {
                setSelectedTask({
                  ...task,
                  labels: labels.filter((label) => values.includes(label.id)),
                });
              }
              const data = await debouncedUpdateLabels(values, wsClientId);
              if (data?.success && data.data && !data.skipped) {
                const finalTasks = tasks.map((t) =>
                  t.id === task.id && data.data ? data.data : t,
                );
                setTasks(finalTasks);
                if (task && task.id === data.data.id) {
                  setSelectedTask(data.data);
                  sendWindowMessage(
                    window,
                    {
                      type: "timeline-update",
                      payload: data.data.id,
                    },
                    "*",
                  );
                }
              }
            }}
          />
        </TileAction>
      </Tile>
      <Separator />
      {task.githubIssue?.issueUrl && (
        <Tile className="md:w-full py-0" variant={"transparent"}>
          <TileHeader>
            <TileTitle asChild>
              <Label variant={"description"} className="text-xs">
                Linked
              </Label>
            </TileTitle>
          </TileHeader>
          <TileAction>
            <Link to={task.githubIssue?.issueUrl} target="_blank">
              <Badge
                variant="secondary"
                className={cn(
                  "flex items-center justify-center gap-1 ps-0 text-xs border rounded-lg border-transparent truncate group/link cursor-pointer w-fit relative bg-transparent p-1 h-auto",
                )}
              >
                {/*{GitHubIssueOrg}/{GitHubIssueRepo}/
                {task.githubIssue?.issueNumber}*/}
                <InlineLabel
                  text={`${GitHubIssueOrg}/${GitHubIssueRepo}/${task.githubIssue?.issueNumber}`}
                  icon={<IconBrandGithub className="size-3" />}
                  className="cursor-pointer"
                  textNode={
                    <div className="flex items-center gap-2">
                      <span className="truncate">{`${GitHubIssueOrg}/${GitHubIssueRepo}/${task.githubIssue?.issueNumber}`}</span>
                      <IconExternalLink className="size-3 opacity-0 group-hover/link:opacity-100 transition-all" />
                    </div>
                  }
                />
              </Badge>
            </Link>
          </TileAction>
        </Tile>
      )}
    </div>
  );
}

interface TaskContentMainProps {
  task: schema.TaskWithLabels;
  tasks: schema.TaskWithLabels[];
  labels: schema.labelType[];
  availableUsers?: schema.userType[];
  organization: schema.OrganizationWithMembers;
  categories: schema.categoryType[];
}

export function TaskContentMain({
  task,
  tasks,
  labels,
  availableUsers = [],
  organization,
  categories,
}: TaskContentMainProps) {
  const [openData, onOpenDataChange] = useState(false);

  return (
    <div className="">
      <SubWrapper
        style="compact"
        className="max-w-6xl"
        title={task.title || "No title"}
        // description={`#${task.shortId}`}
      >
        {/*<JsonViewer
          data={task}
          name="task"
          open={openData}
          onOpenChange={onOpenDataChange}
        />*/}
        <GlobalTimeline
          task={task}
          labels={labels}
          availableUsers={availableUsers}
          categories={categories}
          tasks={tasks}
        />
      </SubWrapper>
    </div>
  );
}

export function TaskContent({
  open,
  onOpenChange,
  task,
  labels,
  tasks,
  setTasks,
  setSelectedTask,
  availableUsers = [],
  isDialog = true,
  organization,
  personal = false,
  categories,
}: TaskContentProps) {
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const status = statusConfig[task.status as keyof typeof statusConfig];
  const { runWithToast } = useToastAction();
  const [openData, onOpenDataChange] = useState(false);
  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const pathname =
    rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
  return (
    // FULL PAGE EXPERIENCE
    <div className="flex flex-col h-full max-h-full min-h-full relative">
      {/* Body of content */}
      <div className="flex gap-0 min-h-full overflow-scroll">
        <div className="flex flex-col gap-3 w-full overflow-scroll overflow-x-visible p-4 pt-0">
          <SubWrapper
            style="compact"
            className="max-w-6xl"
            title={task.title || "No title"}
            backButton=".."
            icon={
              <Avatar>
                <AvatarImage
                  src={organization.logo || ""}
                  alt={organization.name}
                />
                <AvatarFallback>{organization.name.charAt(0)}</AvatarFallback>
              </Avatar>
            }
            descriptionRender={
              <div className="flex gap-1">
                <Label
                  variant={"description"}
                  className="text-muted-foreground"
                >
                  #{task.shortId}
                </Label>
              </div>
            }
          >
            <JsonViewer
              data={task}
              name="task"
              open={openData}
              onOpenChange={onOpenDataChange}
            />
            <GlobalTimeline
              task={task}
              labels={labels}
              availableUsers={availableUsers}
              categories={categories}
              tasks={tasks}
            />
          </SubWrapper>
        </div>
        <div className="w-[18rem] shrink-0 overflow-y-auto p-3 ml-0 rounded-r-2xl rounded bg-card">
          <div className="flex items-center gap-2 shrink-0 w-full">
            <SimpleClipboard
              textToCopy={pathname}
              variant={"ghost"}
              className="size-5 ml-auto"
              copyIcon={<IconLink />}
              showTooltip={false}
            />
            <Link
              to={`/admin/$orgId/tasks/$taskId`}
              params={{ orgId: organization.id, taskId: task.id }}
              className=""
            >
              <Button size="icon" className="size-5" variant="ghost">
                <IconArrowsDiagonalMinimize2 />
              </Button>
            </Link>
          </div>
          <TaskContentSideContent
            task={task}
            labels={labels}
            tasks={tasks}
            setTasks={setTasks}
            setSelectedTask={setSelectedTask}
            availableUsers={availableUsers}
            wsClientId={wsClientId}
            runWithToast={runWithToast}
            categories={categories}
          />
        </div>
      </div>
    </div>

    // DIALOG /DEFAULT EXPERIENCE
    // <SplitDialog
    //   isOpen={open}
    //   onOpenChange={onOpenChange}
    //   title={
    //     <div className="flex items-center w-full gap-4">
    //       <div className="flex items-center gap-4 truncate">
    //         <Label
    //           variant={"heading"}
    //           className={cn("text-left text-lg truncate")}
    //         >
    //           {task.title}
    //         </Label>
    //         <Label
    //           variant={"heading"}
    //           className={cn("text-left text-sm text-muted-foreground shrink-0")}
    //         >
    //           #{task.shortId}
    //         </Label>
    //         {task.githubIssue?.issueUrl}
    //         {personal && (
    //           <a
    //             href={`/admin/${task.organizationId}/tasks`}
    //             onClick={(e) => e.stopPropagation()}
    //           >
    //             <Badge
    //               variant={"outline"}
    //               className="flex items-center gap-1 w-full justify-start shrink-0"
    //             >
    //               <span className="text-xs truncate max-w-[150px]">
    //                 {task.organization?.name}
    //               </span>
    //               <span className="text-xs">/</span>
    //               <span className="text-xs truncate max-w-[150px]">tasks</span>
    //             </Badge>
    //           </a>
    //         )}
    //       </div>
    //       <div className="ml-auto flex items-center gap-2 shrink-0">
    //         <Badge
    //           variant={"outline"}
    //           className="flex items-center flex-shrink-0 [&_svg]:size-5 gap-1 justify-start pl-1"
    //         >
    //           {status?.icon(`${status?.className || ""}`)}
    //           {status.label}
    //         </Badge>
    //         <Link
    //           to={`/admin/$orgId/tasks/$taskId`}
    //           params={{ orgId: task.organizationId, taskId: task.id }}
    //         >
    //           <Button size={"icon"} className="size-5" variant={"ghost"}>
    //             <IconArrowsDiagonal2 />
    //           </Button>
    //         </Link>
    //         <Button
    //           size={"icon"}
    //           className="size-5"
    //           variant={openData ? "accent" : "ghost"}
    //           onClick={() => onOpenDataChange(!openData)}
    //         >
    //           <IconCode />
    //         </Button>
    //         <Button
    //           size={"icon"}
    //           className="size-5"
    //           variant={"ghost"}
    //           onClick={() => onOpenChange(false)}
    //         >
    //           <IconX />
    //         </Button>
    //       </div>
    //     </div>
    //   }
    //   sidebarPosition="right"
    // >
    //   <SplitDialogContent className="relative h-full">
    //     <JsonViewer
    //       data={task}
    //       name="task"
    //       open={openData}
    //       onOpenChange={onOpenDataChange}
    //     />
    //     <GlobalTimeline
    //       task={task}
    //       labels={labels}
    //       availableUsers={availableUsers}
    //       categories={categories}
    //       tasks={tasks}
    //     />
    //   </SplitDialogContent>
    //   <SplitDialogSide className="p-2">
    //     <TaskContentSideContent
    //       task={task}
    //       labels={labels}
    //       tasks={tasks}
    //       setTasks={setTasks}
    //       setSelectedTask={setSelectedTask}
    //       availableUsers={availableUsers}
    //       wsClientId={wsClientId}
    //       runWithToast={runWithToast}
    //       categories={categories}
    //     />
    //   </SplitDialogSide>
    // </SplitDialog>
  );
}
