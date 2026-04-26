"use client";

import {
	IconArrowRight,
	IconCheckbox,
	IconPlus,
	IconRocket,
	IconSettings,
	IconStack2,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import RenderIcon from "@/components/generic/RenderIcon";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { commandActions } from "@/lib/command-store";
import type { CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

/**
 * Registers org-specific commands when inside an organization route:
 * - Create task in [org name]
 * - Go to tasks, releases, views (sub-view with saved views list)
 * - Organization settings
 */
export function useOrgCommands() {
  const navigate = useNavigate();
  const { organization, views } = useLayoutOrganization();

  const commands: CommandMap = useMemo(() => {
    const orgId = organization.id;
    const orgName = organization.name;
    const viewsSubViewId = `views-${orgId}`;

    const viewItems = views.map((view) => ({
      id: `org-view-${view.id}`,
      label: view.name,
      icon: view.viewConfig?.icon ? (
        <RenderIcon
          iconName={view.viewConfig.icon}
          color={view.viewConfig?.color || undefined}
          size={16}
          raw
        />
      ) : (
        <IconStack2 size={16} className="opacity-60" aria-hidden="true" />
      ),
      action: () =>
        navigate({
          to: "/$orgId/tasks",
          params: { orgId },
          search: { view: view.slug || view.id },
        }),
      keywords: view.slug || "",
    }));

		return {
			root: [
				{
					heading: orgName,
					priority: 5,
					items: [
						{
							id: `org-create-task-${orgId}`,
							label: "Create task",
							icon: (
								<IconPlus size={16} className="opacity-60" aria-hidden="true" />
							),
							action: () => commandActions.openCreateTaskDialog(orgId),
							keywords: "new issue add",
							shortcut: "C",
						},
						{
							id: `org-go-views-${orgId}`,
							label: "Go to view",
							icon: (
								<IconStack2
									size={16}
									className="opacity-60"
									aria-hidden="true"
								/>
							),
							subId: viewsSubViewId,
							keywords: "saved filters custom views",
							metadata:
								views.length > 0 ? (
									<IconArrowRight
										size={14}
										className="opacity-40"
										aria-hidden="true"
									/>
								) : undefined,
							action:
								views.length === 0
									? () => navigate({ to: "/$orgId/views", params: { orgId } })
									: undefined,
						},
						{
							id: `org-go-releases-${orgId}`,
							label: "Go to releases",
							icon: (
								<IconRocket
									size={16}
									className="opacity-60"
									aria-hidden="true"
								/>
							),
							action: () =>
								navigate({ to: "/$orgId/releases", params: { orgId }, search: { status: undefined, targetDateFrom: undefined, targetDateTo: undefined, releasedFrom: undefined, releasedTo: undefined } }),
							keywords: "versions milestones",
						},
						{
							id: `org-settings-${orgId}`,
							label: "Organization settings",
							icon: (
								<IconSettings
									size={16}
									className="opacity-60"
									aria-hidden="true"
								/>
							),
							action: () =>
								navigate({ to: "/settings/org/$orgId", params: { orgId } }),
							keywords: "preferences configuration",
						},
					],
				},
				{
					heading: "Navigation",
					priority: 20,
					items: [
						{
							id: `org-go-tasks-${orgId}`,
							label: "Go to tasks",
							icon: (
								<IconCheckbox
									size={16}
									className="opacity-60"
									aria-hidden="true"
								/>
							),
							action: () =>
								navigate({ to: "/$orgId/tasks", params: { orgId } }),
							keywords: "issues list board",
						},
					],
				},
			],
      [viewsSubViewId]: [
        {
          heading: "Views",
          priority: 10,
          items: viewItems,
        },
        {
          heading: "Manage",
          priority: 50,
          items: [
            {
              id: `org-manage-views-${orgId}`,
              label: "Manage views",
              icon: (
                <IconSettings
                  size={16}
                  className="opacity-60"
                  aria-hidden="true"
                />
              ),
              action: () =>
                navigate({
                  to: "/settings/org/$orgId/views",
                  params: { orgId },
                }),
              keywords: "settings configure edit",
            },
          ],
        },
      ],
    };
  }, [navigate, organization, views]);

  useRegisterCommands("org-commands", commands);
}
