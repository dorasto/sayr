import type {
  OrganizationSettings,
  PublicTaskFieldSettings,
} from "@repo/database";
import { Button } from "@repo/ui/components/button";

/** Client-safe defaults (avoids importing from @repo/database which pulls in node:crypto). */
const defaultPublicTaskFieldSettings: PublicTaskFieldSettings = {
  labels: true,
  category: true,
  priority: true,
};

const defaultOrganizationSettings: OrganizationSettings = {
  allowActionsOnClosedTasks: true,
  publicActions: true,
  enablePublicPage: true,
  publicTaskAllowBlank: true,
  publicTaskFields: defaultPublicTaskFieldSettings,
};
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
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
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Input } from "@repo/ui/components/input";
import PriorityIcon from "@repo/ui/components/icons/priority";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import {
  IconAlertSquareFilled,
  IconChevronDown,
  IconLoader2,
  IconPlus,
  IconTemplate,
  IconX,
} from "@tabler/icons-react";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { authClient } from "@repo/auth/client";
import { useNavigate } from "@tanstack/react-router";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { createPublicTaskAction } from "@/lib/fetches/task";
import processUploads from "@/components/prosekit/upload";
import { cn } from "@/lib/utils";
import RenderIcon from "../generic/RenderIcon";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const priorityOptions = [
  {
    value: "none",
    label: "No Priority",
    icon: <PriorityIcon bars="none" className="size-4 text-muted-foreground" />,
  },
  {
    value: "low",
    label: "Low",
    icon: <PriorityIcon bars={1} className="size-4 text-gray-500" />,
  },
  {
    value: "medium",
    label: "Medium",
    icon: <PriorityIcon bars={2} className="size-4 text-yellow-500" />,
  },
  {
    value: "high",
    label: "High",
    icon: <PriorityIcon bars={3} className="size-4 text-red-500" />,
  },
  {
    value: "urgent",
    label: "Urgent",
    icon: <IconAlertSquareFilled className="size-4 text-destructive" />,
  },
] as const;

export function PublicTaskCreator() {
	const { data: session } = authClient.useSession();
	const navigate = useNavigate();
	const { organization, labels, categories, issueTemplates } =
    usePublicOrganizationLayout();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // Form state
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("__none__");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<NodeJSON | undefined>(
    undefined,
  );
  const [templateData, setTemplateData] = useState<NodeJSON | undefined>(
    undefined,
  );
  const [priority, setPriority] = useState<string>("none");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Resolve org settings with defaults
  const settings = useMemo<OrganizationSettings>(() => {
    const raw = organization.settings as Partial<OrganizationSettings> | null;
    return {
      ...defaultOrganizationSettings,
      ...raw,
      publicTaskFields: {
        ...defaultPublicTaskFieldSettings,
        ...(raw?.publicTaskFields ?? {}),
      },
    };
  }, [organization.settings]);

  const isOrgMember = useMemo(
    () =>
      !!session?.user?.id &&
      organization.members.some((m) => m.user.id === session.user.id),
    [session?.user?.id, organization.members],
  );

  // Signed-in users can create tasks on the public page:
  // - Org members can always create (they have full access)
  // - Non-members can create only when publicActions is enabled
  const canCreate = useMemo(() => {
    if (!session?.user) return false;
    if (isOrgMember) return true;
    if (!settings.publicActions) return false;
    return true;
  }, [session?.user, isOrgMember, settings.publicActions]);

  const allowBlank = settings.publicTaskAllowBlank;
  const fields = settings.publicTaskFields;

  // Filter labels to only public-visible ones (all labels are shared on public page)
  const availableLabels = labels;
  const availableCategories = categories;

  const hasTemplates = issueTemplates.length > 0;
  // When blank tasks are disallowed, user must pick a template
  const templateRequired = hasTemplates && !allowBlank;

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      if (templateId === "__none__") {
        setTitle("");
        setDescription(undefined);
        setTemplateData(undefined);
        setPriority("none");
        setSelectedLabels([]);
        setSelectedCategory("");
        setEditorKey((k) => k + 1);
        return;
      }
      const template = issueTemplates.find((t) => t.id === templateId);
      if (template) {
        if (template.titlePrefix) setTitle(template.titlePrefix);
        if (template.description) {
          setDescription(template.description as NodeJSON);
          setTemplateData(template.description as NodeJSON);
          setEditorKey((k) => k + 1);
        }
        if (template.priority && fields.priority)
          setPriority(template.priority);
        if (template.categoryId && fields.category)
          setSelectedCategory(template.categoryId);
        if (template.labels && template.labels.length > 0 && fields.labels) {
          setSelectedLabels(template.labels.map((l) => l.id));
        }
      }
    },
    [issueTemplates, fields],
  );

  const resetForm = useCallback(() => {
    setSelectedTemplateId("__none__");
    setTitle("");
    setDescription(undefined);
    setTemplateData(undefined);
    setPriority("none");
    setSelectedLabels([]);
    setSelectedCategory("");
    setEditorKey((k) => k + 1);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    if (!title.trim()) {
      headlessToast.error({
        title: "Title required",
        description: "Please enter a title for your task.",
        id: "public-task-create",
      });
      return;
    }
    if (templateRequired && selectedTemplateId === "__none__") {
      headlessToast.error({
        title: "Template required",
        description: "Please choose a template before submitting.",
        id: "public-task-create",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Process any inline media uploads
      let finalDescription = description;
      if (finalDescription) {
        finalDescription = await processUploads(
          finalDescription,
          "public",
          organization.id,
          "public-task-create",
        );
      }

      const result = await createPublicTaskAction(
        organization.id,
        {
          title: title.trim(),
          description: finalDescription,
          priority: fields.priority ? priority : undefined,
          labels: fields.labels ? selectedLabels : [],
          category: fields.category ? selectedCategory || null : null,
          templateId:
            selectedTemplateId !== "__none__" ? selectedTemplateId : undefined,
        },
        wsClientId,
      );

      if (result.success) {
        headlessToast.success({
          title: "Task created",
          description: "Your task has been submitted successfully.",
          id: "public-task-create",
        });
        resetForm();
        setOpen(false);
        navigate({
          to: "/orgs/$orgSlug/$shortId",
          params: {
            orgSlug: organization.slug,
            shortId: String(result.data.shortId),
          },
        });
      } else {
        headlessToast.error({
          title: "Failed to create task",
          description: result.error || "Something went wrong.",
          id: "public-task-create",
        });
      }
    } catch {
      headlessToast.error({
        title: "Failed to create task",
        description: "Could not submit your task. Please try again.",
        id: "public-task-create",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    title,
    templateRequired,
    selectedTemplateId,
    description,
    organization.id,
    organization.slug,
    fields,
    priority,
    selectedLabels,
    selectedCategory,
    wsClientId,
    resetForm,
    navigate,
  ]);

  if (!canCreate) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "w-full justify-between bg-accent p-3 rounded-lg",
        open && "",
      )}
    >
      <CollapsibleTrigger asChild>
        <Button variant="primary" className="w-full">
          <span className="flex items-center gap-2">
            <IconPlus className="size-4" />
            Submit a task
          </span>
          <IconChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="bg-accent overflow-hidden">
          {/* Header row: template picker + close */}
          <div className="flex items-center gap-2 p-3 pb-0">
            {hasTemplates && (
              <ComboBox
                value={selectedTemplateId}
                onValueChange={(val) => handleTemplateSelect(val || "__none__")}
              >
                <ComboBoxTrigger
                  className={cn(
                    "w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2 flex items-center gap-2",
                    selectedTemplateId === "__none__" &&
                      "bg-transparent hover:bg-accent hover:border-accent text-muted-foreground hover:text-foreground",
                    templateRequired &&
                      selectedTemplateId === "__none__" &&
                      "border-destructive/50 text-destructive",
                  )}
                >
                  <IconTemplate className="h-4 w-4" />
                  <ComboBoxValue placeholder="Choose a template...">
                    {selectedTemplateId === "__none__"
                      ? templateRequired
                        ? "Choose a template (required)"
                        : "Template"
                      : issueTemplates.find((t) => t.id === selectedTemplateId)
                          ?.name || "Template"}
                  </ComboBoxValue>
                </ComboBoxTrigger>
                <ComboBoxContent>
                  <ComboBoxSearch placeholder="Search templates..." />
                  <ComboBoxList>
                    <ComboBoxEmpty>No templates found.</ComboBoxEmpty>
                    <ComboBoxGroup>
                      {!templateRequired && (
                        <ComboBoxItem value="__none__">
                          No template
                        </ComboBoxItem>
                      )}
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 ml-auto"
              onClick={() => setOpen(false)}
            >
              <IconX className="size-4" />
            </Button>
          </div>

          {/* Title */}
          <div className="px-3 pt-2">
            <Input
              variant="strong"
              placeholder="Task title"
              className="px-0 p-0"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description editor */}
          <div className="px-3 min-h-24">
            <Suspense
              fallback={<div className="h-20 animate-pulse bg-muted rounded" />}
            >
              <Editor
                key={editorKey}
                firstLinePlaceholder="Describe your task..."
                className="bg-transparent"
                onChange={setDescription}
                submit={handleSubmit}
                categories={availableCategories}
                defaultContent={templateData}
                hasTemplate={!!templateData && typeof templateData === "object"}
                hideBlockHandle
              />
            </Suspense>
          </div>

          {/* Conditional field row */}
          {(fields.priority || fields.labels || fields.category) && (
            <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
              {/* Priority picker */}
              {fields.priority && (
                <ComboBox
                  value={priority}
                  onValueChange={(val) => setPriority(val || "none")}
                >
                  <ComboBoxTrigger className="w-fit text-xs h-7 border border-transparent hover:border-border bg-secondary text-accent-foreground hover:bg-secondary rounded-lg px-2 flex items-center gap-2">
                    {priorityOptions.find((p) => p.value === priority)?.icon}
                    <ComboBoxValue placeholder="Priority">
                      {priorityOptions.find((p) => p.value === priority)
                        ?.label || "Priority"}
                    </ComboBoxValue>
                  </ComboBoxTrigger>
                  <ComboBoxContent>
                    <ComboBoxList>
                      <ComboBoxGroup>
                        {priorityOptions.map((opt) => (
                          <ComboBoxItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              {opt.icon}
                              {opt.label}
                            </span>
                          </ComboBoxItem>
                        ))}
                      </ComboBoxGroup>
                    </ComboBoxList>
                  </ComboBoxContent>
                </ComboBox>
              )}

              {/* Labels picker */}
              {fields.labels && availableLabels.length > 0 && (
                <ComboBox
                  value={selectedLabels.join(",")}
                  onValueChange={(val) => {
                    if (!val) {
                      setSelectedLabels([]);
                      return;
                    }
                    const labelId = val;
                    setSelectedLabels((prev) =>
                      prev.includes(labelId)
                        ? prev.filter((id) => id !== labelId)
                        : [...prev, labelId],
                    );
                  }}
                >
                  <ComboBoxTrigger className="w-fit text-xs h-7 border border-transparent hover:border-border bg-secondary text-accent-foreground hover:bg-secondary rounded-lg px-2 flex items-center gap-2">
                    <ComboBoxValue placeholder="Labels">
                      {selectedLabels.length > 0
                        ? `${selectedLabels.length} label${selectedLabels.length > 1 ? "s" : ""}`
                        : "Labels"}
                    </ComboBoxValue>
                  </ComboBoxTrigger>
                  <ComboBoxContent>
                    <ComboBoxSearch placeholder="Search labels..." />
                    <ComboBoxList>
                      <ComboBoxEmpty>No labels found.</ComboBoxEmpty>
                      <ComboBoxGroup>
                        {availableLabels.map((label) => (
                          <ComboBoxItem key={label.id} value={label.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="size-3 rounded-full shrink-0"
                                style={{
                                  backgroundColor: label.color || "#6B7280",
                                }}
                              />
                              {label.name}
                            </span>
                          </ComboBoxItem>
                        ))}
                      </ComboBoxGroup>
                    </ComboBoxList>
                  </ComboBoxContent>
                </ComboBox>
              )}

              {/* Category picker */}
              {fields.category && availableCategories.length > 0 && (
                <ComboBox
                  value={selectedCategory}
                  onValueChange={(val) => setSelectedCategory(val || "")}
                >
                  <ComboBoxTrigger className="w-fit text-xs h-7 border border-transparent hover:border-border bg-secondary text-accent-foreground hover:bg-secondary rounded-lg px-2 flex items-center gap-2">
                    <ComboBoxValue placeholder="Category">
                      {selectedCategory
                        ? availableCategories.find(
                            (c) => c.id === selectedCategory,
                          )?.name || "Category"
                        : "Category"}
                    </ComboBoxValue>
                  </ComboBoxTrigger>
                  <ComboBoxContent>
                    <ComboBoxSearch placeholder="Search categories..." />
                    <ComboBoxList>
                      <ComboBoxEmpty>No categories found.</ComboBoxEmpty>
                      <ComboBoxGroup>
                        <ComboBoxItem value="">None</ComboBoxItem>
                        {availableCategories.map((cat) => (
                          <ComboBoxItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              <RenderIcon
                                iconName={cat.icon || "IconCategory"}
                                size={12}
                                color={cat.color || undefined}
                                raw
                              />
                              {cat.name}
                            </span>
                          </ComboBoxItem>
                        ))}
                      </ComboBoxGroup>
                    </ComboBoxList>
                  </ComboBoxContent>
                </ComboBox>
              )}
            </div>
          )}

          {/* Footer: submit button */}
          <div className="flex items-center justify-between gap-2 p-3 pt-0">
            <p className="text-xs text-muted-foreground">
              Your task will be publicly visible.
            </p>
            <Button
              variant="primary"
              className="bg-secondary"
              size="sm"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !title.trim() ||
                (templateRequired && selectedTemplateId === "__none__")
              }
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
