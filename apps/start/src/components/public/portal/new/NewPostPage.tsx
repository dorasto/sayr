import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { NodeJSON } from "prosekit/core";
import { useEffect, useMemo, useState } from "react";
import processUploads from "@/components/prosekit/upload";
import { NewPostFooter } from "@/components/public/portal/new/NewPostFooter";
import { PostDetailsEditor } from "@/components/public/portal/new/PostDetailsEditor";
import { PostingDisabledCard } from "@/components/public/portal/new/PostingDisabledCard";
import { PostTitleField } from "@/components/public/portal/new/PostTitleField";
import { TemplateChooser } from "@/components/public/portal/new/TemplateChooser";
import { TemplatePicker } from "@/components/public/portal/new/TemplatePicker";
import { usePublicPostAbility } from "@/components/public/public-task-creator";
import { TaskFieldToolbar } from "@/components/tasks/shared";
import type { FieldKey } from "@/components/tasks/shared/task-field-toolbar-types";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { boardListKey } from "@/hooks/portal/useBoardList";
import { useSimilarPosts } from "@/hooks/portal/useSimilarPosts";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { createPublicTaskAction } from "@/lib/fetches/task";
import {
  DEFAULT_POST_PRIORITY,
  docHasContent,
  isPostPriority,
  newPostDraftKey,
  type PostPriority,
  parseDraft,
  resolveInitialDraft,
  serialiseDraft,
} from "@/lib/portal/new-post";
import { useToastAction } from "@/lib/util";

const NO_TEMPLATE = "__none__";

interface NewPostPageProps {
  /** `?title=` from the search box or the board composer. */
  initialTitle?: string;
}

/**
 * The public new post form (`/orgs/$orgSlug/new`), built like the admin task creator. When the org requires a template,
 * only the template list shows until one is picked. The draft is kept in `sessionStorage` so a login round trip does
 * not lose it.
 */
export function NewPostPage({ initialTitle }: NewPostPageProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { organization, categories, labels, issueTemplates } =
    usePublicOrganizationLayout();
  const {
    settings,
    loggedIn,
    canPost,
    needsFullForm: templateRequired,
  } = usePublicPostAbility();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const { setValue: setMentionContext } =
    useStateManagement<MentionContext | null>("mentionContext", null);
  const { runWithToast, isFetching } = useToastAction();

  const [title, setTitle] = useState(initialTitle?.trim() ?? "");
  const [description, setDescription] = useState<NodeJSON | undefined>(
    undefined,
  );
  /** Content the editor opens with; changing it (with `editorKey`) rebuilds the editor. */
  const [initialDoc, setInitialDoc] = useState<NodeJSON | undefined>(undefined);
  const [editorKey, setEditorKey] = useState(0);
  const [restored, setRestored] = useState(false);
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<PostPriority>(DEFAULT_POST_PRIORITY);
  const [labelIds, setLabelIds] = useState<string[]>([]);

  const fields = settings.publicTaskFields;
  const draftKey = newPostDraftKey(organization.id);
  const similar = useSimilarPosts(organization.id, title);

  const toolbarFields: FieldKey[] = [];
  if (fields.category && categories.length > 0) toolbarFields.push("category");
  if (fields.priority) toolbarFields.push("priority");
  if (fields.labels && labels.length > 0) toolbarFields.push("labels");

  // The admin field chips read a task; the "draft" id keeps them from calling the API.
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
      status: "backlog",
      priority,
      createdBy: null,
      labels: labels.filter((label) => labelIds.includes(label.id)),
      assignees: [],
      category: categoryId ?? "",
      releaseId: null,
      voteCount: 0,
      parentId: null,
      aiSummaryHash: null,
      aiSummaryGeneratedAt: null,
      embedding: null,
    }),
    [
      organization.id,
      title,
      description,
      priority,
      labels,
      labelIds,
      categoryId,
    ],
  );

  // The editor's mention menu reads this to find the org's members.
  useEffect(() => {
    setMentionContext({
      orgId: organization.id,
      orgShortId: organization.shortId,
    });
  }, [organization.id, organization.shortId, setMentionContext]);

  // Restore the stored draft after mount (there is no `sessionStorage` during SSR).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per org
  useEffect(() => {
    const draft = resolveInitialDraft(
      initialTitle,
      parseDraft(sessionStorage.getItem(draftKey)),
    );
    if (draft) {
      setTitle(draft.title);
      setDescription(draft.description);
      setInitialDoc(draft.description);
      setCategoryId(draft.categoryId);
      setPriority(draft.priority);
      setLabelIds(draft.labelIds);
      if (issueTemplates.some((template) => template.id === draft.templateId)) {
        setTemplateId(draft.templateId ?? NO_TEMPLATE);
      }
    }
    setRestored(true);
  }, [draftKey]);

  // Save the draft as it changes.
  useEffect(() => {
    if (!restored) return;
    const raw = serialiseDraft({
      title,
      description,
      categoryId,
      priority,
      labelIds,
      templateId: templateId === NO_TEMPLATE ? null : templateId,
    });
    if (raw) sessionStorage.setItem(draftKey, raw);
    else sessionStorage.removeItem(draftKey);
  }, [
    restored,
    draftKey,
    title,
    description,
    categoryId,
    priority,
    labelIds,
    templateId,
  ]);

  const clearDraft = () => sessionStorage.removeItem(draftKey);

  const handleTemplateSelect = (nextId: string) => {
    setTemplateId(nextId);
    const template = issueTemplates.find((entry) => entry.id === nextId);
    const doc = (template?.description as NodeJSON | null) ?? undefined;
    setInitialDoc(doc);
    setDescription(doc);
    setEditorKey((key) => key + 1);
    setCategoryId(template?.categoryId ?? null);
    const templatePriority = template?.priority;
    setPriority(
      isPostPriority(templatePriority)
        ? templatePriority
        : DEFAULT_POST_PRIORITY,
    );
    setLabelIds(template?.labels.map((label) => label.id) ?? []);
    const prefix = template?.titlePrefix;
    if (prefix)
      setTitle((current) =>
        current.startsWith(prefix) ? current : `${prefix}${current}`,
      );
  };

  const handleSubmit = async () => {
    if (isFetching || !loggedIn || !title.trim()) return;
    const finalDescription =
      description && docHasContent(description)
        ? await processUploads(
            description,
            "public",
            organization.id,
            "public-task-create",
          )
        : undefined;
    const result = await runWithToast(
      "public-task-create",
      {
        loading: { title: "Posting..." },
        success: { title: "Posted to the board" },
        error: { title: "Could not post" },
      },
      () =>
        createPublicTaskAction(
          organization.id,
          {
            title: title.trim(),
            description: finalDescription,
            priority: fields.priority ? priority : undefined,
            labels: fields.labels ? labelIds : [],
            category: fields.category ? categoryId : null,
            templateId: templateId === NO_TEMPLATE ? undefined : templateId,
          },
          sseClientId,
        ),
    );
    if (result?.success) {
      clearDraft();
      void queryClient.invalidateQueries({
        queryKey: boardListKey(organization.id),
      });
      navigate({
        to: "/orgs/$orgSlug/$shortId",
        params: {
          orgSlug: organization.slug,
          shortId: String(result.data.shortId),
        },
      });
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-prose px-4 pb-8">
        {!canPost ? (
          <PostingDisabledCard orgSlug={organization.slug} />
        ) : templateRequired && templateId === NO_TEMPLATE ? (
          <TemplateChooser
            templates={issueTemplates}
            onSelect={handleTemplateSelect}
          />
        ) : (
          <>
            <div className="flex flex-col bg-background gap-3 pb-4">
              <div className="sticky top-0 pt-4 z-50 bg-background">
                {issueTemplates.length > 0 && (
                  <TemplatePicker
                    templates={issueTemplates}
                    value={templateId}
                    noTemplateValue={NO_TEMPLATE}
                    required={templateRequired}
                    onSelect={handleTemplateSelect}
                  />
                )}
                <PostTitleField
                  value={title}
                  onChange={setTitle}
                  similar={similar}
                />
              </div>
              <PostDetailsEditor
                ready={restored}
                editorKey={editorKey}
                initialDoc={initialDoc}
                hasTemplate={templateId !== NO_TEMPLATE && !!initialDoc}
                categories={categories}
                onChange={setDescription}
                onSubmit={() => void handleSubmit()}
              />
              {toolbarFields.length > 0 && (
                <TaskFieldToolbar
                  task={draftTask}
                  variant="creator"
                  fields={toolbarFields}
                  availableLabels={labels}
                  categories={categories}
                  onChange={{
                    category: (id) => setCategoryId(id || null),
                    priority: (value) =>
                      setPriority(
                        isPostPriority(value) ? value : DEFAULT_POST_PRIORITY,
                      ),
                    labels: setLabelIds,
                  }}
                />
              )}
            </div>
            <NewPostFooter
              orgSlug={organization.slug}
              loggedIn={loggedIn}
              isSubmitting={isFetching}
              disabled={!title.trim()}
              onSubmit={() => void handleSubmit()}
              onCancel={clearDraft}
            />
          </>
        )}
      </div>
    </div>
  );
}
