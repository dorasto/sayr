"use client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import { Outlet } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { TaskContentMobileContent } from "@/components/tasks/task/task-content";
import { PageHeader } from "@/components/generic/PageHeader";
import { PanelWrapper } from "@/components/generic/wrapper";
import {
  TaskPanelHeader,
  TaskPanelContent,
} from "@/components/admin/panels/task";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { Button } from "@repo/ui/components/button";
import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
  IconLink,
  IconUsers,
} from "@tabler/icons-react";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";

export default function OrganizationTaskIdPage() {
  const useMobile = useIsMobile();
  const { task, setTask } = useLayoutTask();
  const {
    organization,
    labels,
    categories,
    releases,
    isProjectPanelOpen,
    setProjectPanelOpen,
  } = useLayoutOrganization();
  const { tasks, setTasks } = useLayoutTasks();
  const { setValue: setMentionContext } =
    useStateManagement<MentionContext | null>("mentionContext", null);

  // Set mentionContext so the Editor's useMentionUsers hook can fetch org members
  useEffect(() => {
    if (organization?.id) {
      setMentionContext({ orgId: organization.id });
    }
  }, [organization?.id, setMentionContext]);

  return (
    <PanelWrapper
      isOpen={isProjectPanelOpen}
      setOpen={setProjectPanelOpen}
      panelHeader={<TaskPanelHeader />}
      panelBody={<TaskPanelContent />}
    >
      <div className="relative flex flex-col h-full max-h-full">
        <PageHeader>
          <PageHeader.Identity>
            <Link to="/$orgId/tasks" params={{ orgId: organization.id }}>
              <Button
                variant={"primary"}
                className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
                size={"sm"}
              >
                <Avatar className="h-4 w-4">
                  <AvatarImage
                    src={
                      organization.logo ? ensureCdnUrl(organization.logo) : ""
                    }
                    alt={organization.name}
                  />
                  <AvatarFallback className="rounded-md uppercase text-xs">
                    <IconUsers className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span>{organization.name}</span>
              </Button>
            </Link>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs">#{task.shortId}</span>
            <div className="ml-auto flex items-center gap-2">
              {!isProjectPanelOpen && (
                <SimpleClipboard
                  textToCopy={`https://${organization?.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/${task.shortId}`}
                  variant={"primary"}
                  className="h-6 p-1 w-fit bg-transparent"
                  copyIcon={<IconLink />}
                  tooltipText="Copy task URL"
                  tooltipSide="bottom"
                />
              )}
              <Button
                variant="primary"
                className={cn(
                  "gap-2 h-6 w-fit bg-accent border-transparent p-1",
                  !isProjectPanelOpen && "bg-transparent",
                )}
                onClick={() => setProjectPanelOpen(!isProjectPanelOpen)}
              >
                {isProjectPanelOpen ? (
                  <IconLayoutSidebarRightFilled />
                ) : (
                  <IconLayoutSidebarRight />
                )}
              </Button>
            </div>
          </PageHeader.Identity>
        </PageHeader>
        {useMobile ? (
          <div>
            <div className="p-1 bg-sidebar border-b z-0">
              {organization && (
                <TaskContentMobileContent
                  task={task}
                  labels={labels}
                  tasks={tasks}
                  setTasks={setTasks}
                  setSelectedTask={(t) => t && setTask(t)}
                  availableUsers={
                    organization.members.map((member) => member.user) || []
                  }
                  categories={categories}
                  releases={releases}
                  organization={organization}
                />
              )}
            </div>
            <Outlet />
          </div>
        ) : (
          <div
            className={cn(
              "flex-1 overflow-y-auto h-full flex flex-col relative",
            )}
          >
            <Outlet />
          </div>
        )}
      </div>
    </PanelWrapper>
  );
}
