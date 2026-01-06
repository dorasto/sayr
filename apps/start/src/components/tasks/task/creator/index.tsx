"use client";

import type { schema } from "@repo/database";
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Input } from "@repo/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import {
  IconCategory,
  IconLabel,
  IconPlus,
  IconProgress,
  IconSlash,
  IconTemplate,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import {
  ComboBox,
  ComboBoxContent,
  ComboBoxEmpty,
  ComboBoxGroup,
  ComboBoxItem,
  ComboBoxList,
  ComboBoxSearch,
  ComboBoxTrigger,
  ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import type { NodeJSON } from "prosekit/core";
import { useMemo, useState } from "react";
import RenderIcon from "@/components/generic/RenderIcon";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import { createTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import GlobalTaskAssignees from "../../shared/assignee";
import GlobalTaskCategory from "../../shared/category";
import { priorityConfig, statusConfig } from "../../shared/config";
import GlobalTaskLabels from "../../shared/label";
import GlobalTaskPriority from "../../shared/priority";
import GlobalTaskStatus from "../../shared/status";
import { Link, useNavigate } from "@tanstack/react-router";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { Label } from "@repo/ui/components/label";
interface Props {
  organization: schema.OrganizationWithMembers;
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  _labels: schema.labelType[];
  issueTemplates?: schema.issueTemplateWithRelations[];
  // open?: boolean;
  // setOpen?: (open: boolean) => void;
}

export default function CreateIssueDialog({
  organization,
  tasks,
  setTasks,
  _labels,
  issueTemplates = [],
  // open,
  // setOpen = () => {
  // 	false;
  // },
}: Props) {
  const navigate = useNavigate();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { value: categories } = useStateManagement<schema.categoryType[]>(
    "categories",
    [],
    1,
  );
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("__none__");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<undefined | NodeJSON>(
    undefined,
  );
  const [status, setStatus] = useState<string | undefined | null>("backlog");
  const [priority, setPriority] = useState<string | undefined | null>("none");
  const [category, setCategory] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const { runWithToast, isFetching } = useToastAction();
  const selectedLabels = useMemo(
    () => _labels.filter((label) => labels.includes(label.id)),
    [_labels, labels],
  );
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === category),
    [categories, category],
  );
  const availableUsers = useMemo(
    () => organization.members.map((m) => m.user),
    [organization.members],
  );
  const selectedAssignees = useMemo(
    () => availableUsers.filter((user) => assignees.includes(user.id)),
    [availableUsers, assignees],
  );
  const resolvedStatus = (status ?? "backlog") || "backlog";
  const resolvedPriority = (priority ?? "none") || "none";

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "__none__") {
      // Reset to defaults if no template selected
      setTitle("");
      setDescription(undefined);
      setStatus("backlog");
      setPriority("none");
      setCategory("");
      setLabels([]);
      setAssignees([]);
      return;
    }
    const template = issueTemplates.find((t) => t.id === templateId);
    if (template) {
      // Apply title prefix
      if (template.titlePrefix) {
        setTitle(template.titlePrefix);
      }
      // Apply description template
      if (template.description) {
        setDescription(template.description as NodeJSON);
      }
      // Apply status
      if (template.status) {
        setStatus(template.status);
      }
      // Apply priority
      if (template.priority) {
        setPriority(template.priority);
      }
      // Apply category
      if (template.categoryId) {
        setCategory(template.categoryId);
      }
      // Apply labels
      if (template.labels && template.labels.length > 0) {
        setLabels(template.labels.map((l) => l.id));
      }
      // Apply assignees
      if (template.assignees && template.assignees.length > 0) {
        setAssignees(template.assignees.map((a) => a.id));
      }
    }
  };

  const draftTask = useMemo<schema.TaskWithLabels>(
    () => ({
      id: "draft",
      organizationId: organization.id,
      shortId: 0,
      visible: "public",
      createdAt: new Date(),
      updatedAt: new Date(),
      title,
      description: (description ?? []) as schema.TaskWithLabels["description"],
      status: resolvedStatus as schema.TaskWithLabels["status"],
      priority: resolvedPriority as schema.TaskWithLabels["priority"],
      createdBy: null,
      labels: selectedLabels,
      assignees: selectedAssignees,
      category: category || "",
    }),
    [
      description,
      organization.id,
      resolvedPriority,
      resolvedStatus,
      selectedLabels,
      title,
      category,
      selectedAssignees,
    ],
  );
  const handleUpdate = async () => {
    if (!description || isFetching) {
      headlessToast.error({
        title: "Cannot submit empty description",
        description:
          "Please enter some text before submitting your description.",
        id: "create-task",
      });
      return;
    }
    const updatedContent = await processUploads(
      description,
      "public",
      organization.id,
      "create-task",
    );

    const data = await runWithToast(
      "create-task",
      {
        loading: {
          title: "Creating task...",
          description: "Please wait while we create the task.",
        },
        success: {
          title: "Created task",
          description: "The task has been successfully created.",
        },
        error: {
          title: "Failed to create task",
          description: "An error occurred while creating the task.",
        },
      },
      () =>
        createTaskAction(
          organization.id,
          {
            title,
            description: updatedContent,
            status: resolvedStatus,
            priority: resolvedPriority,
            labels,
            category,
            assignees,
          },
          wsClientId,
        ),
    );
    if (data?.success && data.data) {
      setOpen(false);
      setSelectedTemplateId("__none__");
      setTitle("");
      setDescription(undefined);
      setStatus("backlog");
      setPriority("none");
      setCategory("");
      setLabels([]);
      setAssignees([]);
      setTasks([...tasks, data.data]);
      navigate({
        to: "/admin/$orgId/tasks/$taskShortId",
        params: {
          orgId: organization.id,
          taskShortId: data.data.shortId?.toString() || "0",
        },
      });
    }
  };
  const statusconfig =
    statusConfig[resolvedStatus as keyof typeof statusConfig];
  const priorityconfig =
    priorityConfig[resolvedPriority as keyof typeof priorityConfig];
  const selectedLabelCount = draftTask.labels.length;
  const selectedAssigneeCount = draftTask.assignees.length;
  const isMobile = useIsMobile();
  return (
    <div className="flex items-center gap-3">
      <Button
        variant={"primary"}
        className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
        size={"sm"}
        onClick={() => setOpen(true)}
      >
        <IconPlus />
        {!isMobile && <span className="text-inherit">New task</span>}
      </Button>
      <AdaptiveDialog open={open} onOpenChange={setOpen}>
        <AdaptiveDialogContent className="z-50">
          <AdaptiveDialogHeader className="border-b">
            <AdaptiveDialogTitle asChild>
              {/*<Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"accent"}
                    className="w-fit text-xs h-7"
                    size={"sm"}
                  >
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4 rounded-md duration-200 transition-none select-none group-hover/coltrig:h-0 bg-accent">
                        <AvatarImage
                          src={organization.logo || ""}
                          alt={organization.name}
                          className=""
                        />
                        <AvatarFallback className="rounded-md uppercase text-xs">
                          <IconUsers className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      {organization.name}
                    </div>
                    <IconSlash />
                    <div className="flex items-center gap-1">
                      <IconProgress className="!h-4 !w-4" />
                      Tasks
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start">
                  <Button
                    variant={"accent"}
                    className="justify-start w-full text-xs"
                    size={"sm"}
                  >
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4 rounded-md duration-200 transition-none select-none group-hover/coltrig:h-0 bg-accent">
                        <AvatarImage
                          src={organization.logo || ""}
                          alt={organization.name}
                          className=""
                        />
                        <AvatarFallback className="rounded-md uppercase text-xs">
                          <IconUsers className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      {organization.name}
                    </div>
                    <IconSlash />
                    <div className="flex items-center gap-1">
                      <IconProgress className="!h-4 !w-4" />
                      Tasks
                    </div>
                  </Button>
                </PopoverContent>
              </Popover>*/}
              {issueTemplates.length > 0 && (
                <ComboBox
                  value={selectedTemplateId}
                  onValueChange={(val) =>
                    handleTemplateSelect(val || "__none__")
                  }
                >
                  <ComboBoxTrigger className="w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2 mb-0 flex items-center gap-2">
                    <IconTemplate className="h-4 w-4 text-muted-foreground" />
                    <ComboBoxValue placeholder="Choose a template...">
                      {selectedTemplateId === "__none__"
                        ? "No template"
                        : issueTemplates.find(
                            (t) => t.id === selectedTemplateId,
                          )?.name || "Choose a template..."}
                    </ComboBoxValue>
                  </ComboBoxTrigger>
                  <ComboBoxContent>
                    <ComboBoxSearch placeholder="Search templates..." />
                    <ComboBoxList>
                      <ComboBoxEmpty>
                        <Label>
                          No templates found. Create a new template{" "}
                          <Link
                            to="/admin/settings/org/$orgId/templates"
                            params={{ orgId: organization.id }}
                            className="text-primary"
                          >
                            here
                          </Link>
                        </Label>
                      </ComboBoxEmpty>
                      <ComboBoxGroup>
                        <ComboBoxItem value="__none__">
                          No template
                        </ComboBoxItem>
                        {issueTemplates.map((template) => (
                          <ComboBoxItem key={template.id} value={template.id}>
                            {template.name}
                          </ComboBoxItem>
                        ))}
                      </ComboBoxGroup>
                    </ComboBoxList>
                  </ComboBoxContent>
                </ComboBox>
              )}
            </AdaptiveDialogTitle>
            <AdaptiveDialogDescription className="sr-only">
              Create a new task
            </AdaptiveDialogDescription>
          </AdaptiveDialogHeader>

          <div className="flex flex-col gap-3 w-full p-3">
            <div className="flex flex-col gap-1 w-full">
              <Input
                variant={"strong"}
                placeholder="Task title"
                className="px-0 p-0"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="w-full max-h-96 overflow-scroll">
                <Editor
                  onChange={setDescription}
                  users={availableUsers}
                  categories={categories}
                  tasks={tasks}
                />
              </div>
              <div className="flex items-center flex-wrap gap-1 w-full">
                <GlobalTaskStatus
                  task={draftTask}
                  editable
                  onChange={(value) => setStatus(value)}
                  customTrigger={
                    <Button
                      variant={"primary"}
                      className="w-fit text-xs h-7"
                      size={"sm"}
                    >
                      {statusconfig?.icon(
                        `h-3.5 w-3.5 ${statusconfig?.className || ""}`,
                      )}
                      {statusconfig?.label}
                    </Button>
                  }
                />
                <GlobalTaskPriority
                  task={draftTask}
                  editable
                  onChange={(value) => setPriority(value)}
                  customTrigger={
                    <Button
                      variant={"primary"}
                      className="w-fit text-xs h-7"
                      size={"sm"}
                    >
                      {priorityconfig?.icon(
                        `h-3.5 w-3.5 ${priorityconfig?.className || ""}`,
                      )}
                      {priorityconfig?.label}
                    </Button>
                  }
                />
                <GlobalTaskLabels
                  task={draftTask}
                  editable
                  availableLabels={_labels}
                  onLabelsChange={setLabels}
                  customChildren
                  customTrigger={
                    <Button
                      variant={"primary"}
                      className="w-fit text-xs h-7 line-clamp-1"
                      size={"sm"}
                    >
                      {selectedLabelCount > 1 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {draftTask.labels.map((label) => (
                              <span
                                key={label.id}
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: label.color || "#cccccc",
                                }}
                              />
                            ))}
                          </div>
                          <span>{selectedLabelCount} labels</span>
                        </div>
                      ) : selectedLabelCount === 1 ? (
                        <div className="flex items-center">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full mr-2"
                            style={{
                              backgroundColor:
                                draftTask.labels[0]?.color || "#cccccc",
                            }}
                          />
                          <span>{draftTask.labels[0]?.name}</span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2">
                          <IconLabel className="h-3.5 w-3.5 mr-1" />
                          Labels
                        </span>
                      )}
                    </Button>
                  }
                />
                <GlobalTaskAssignees
                  task={draftTask}
                  editable
                  availableUsers={availableUsers}
                  onChange={(value) => setAssignees(value)}
                  customTrigger={
                    <Button
                      variant={"primary"}
                      className="w-fit text-xs h-7 line-clamp-1"
                      size={"sm"}
                    >
                      {selectedAssigneeCount > 1 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {draftTask.assignees.map((assignee) => (
                              <Avatar
                                key={assignee.id}
                                className="h-4 w-4 border border-background"
                              >
                                <AvatarImage
                                  src={assignee.image || undefined}
                                  alt={assignee.name}
                                />
                                <AvatarFallback className="text-[8px]">
                                  {assignee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span>{selectedAssigneeCount} assignees</span>
                        </div>
                      ) : selectedAssigneeCount === 1 ? (
                        <div className="flex items-center">
                          <Avatar className="h-4 w-4 mr-2">
                            <AvatarImage
                              src={draftTask.assignees[0]?.image || undefined}
                              alt={draftTask.assignees[0]?.name}
                            />
                            <AvatarFallback className="text-[8px]">
                              {draftTask.assignees[0]?.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{draftTask.assignees[0]?.name}</span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2">
                          <IconUserPlus className="h-3.5 w-3.5 mr-1" />
                          Assignees
                        </span>
                      )}
                    </Button>
                  }
                />
                <GlobalTaskCategory
                  task={draftTask}
                  editable
                  categories={categories}
                  onChange={(value) => setCategory(value)}
                  customTrigger={
                    <Button
                      variant={"primary"}
                      className="w-fit text-xs h-7"
                      size={"sm"}
                    >
                      {selectedCategory ? (
                        <>
                          <RenderIcon
                            iconName={
                              selectedCategory.icon || "IconCircleFilled"
                            }
                            className="size-3.5! [&_svg]:size-3.5! mr-1"
                            color={selectedCategory.color || undefined}
                            button
                          />
                          {selectedCategory.name}
                        </>
                      ) : (
                        <>
                          <IconCategory className="h-3.5 w-3.5 mr-1" />
                          Category
                        </>
                      )}
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
          <AdaptiveDialogFooter className="mt-auto bg-background flex !flex-col gap-2">
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant={"primary"}
                onClick={handleUpdate}
                disabled={isFetching || !title.trim()}
              >
                Create task
              </Button>
            </div>
          </AdaptiveDialogFooter>
        </AdaptiveDialogContent>
      </AdaptiveDialog>
    </div>
  );
}
