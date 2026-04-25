import type { NodeJSON } from "prosekit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import { Button } from "@repo/ui/components/button";
import { extractTextContent, useToastAction } from "@/lib/util";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { updateReleaseAction } from "@/lib/fetches/release";

interface ReleaseDescriptionEditorProps {
  release: schema.ReleaseWithTasks;
  organizationId: string;
  categories: schema.categoryType[];
  tasks: schema.TaskWithLabels[];
}

export function ReleaseDescriptionEditor({
  release,
  organizationId,
  categories,
  tasks,
}: ReleaseDescriptionEditorProps) {
  const [description, setDescription] = useState<NodeJSON | undefined>(
    release?.description || undefined,
  );
  const [savedDescription, setSavedDescription] = useState<
    NodeJSON | undefined
  >(undefined);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const { runWithToast } = useToastAction();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

  // Sync with release changes
  useEffect(() => {
    const desc = release?.description as NodeJSON | undefined;
    setDescription(desc);
    setSavedDescription(desc);
  }, [release?.description]);

  const handleSave = useCallback(
    async (content: NodeJSON | undefined) => {
      if (!release || !content) return;

      try {
        setIsSavingDescription(true);
        const processedContent = await processUploads(
          content,
          "public",
          organizationId,
          "update-release-description",
        );

        const result = await runWithToast(
          "update-release-description",
          {
            loading: {
              title: "Saving...",
              description: "Updating release description.",
            },
            success: {
              title: "Saved",
              description: "Description updated successfully.",
            },
            error: {
              title: "Failed",
              description: "Could not save description.",
            },
          },
          () =>
            updateReleaseAction(
              organizationId,
              release.id,
              { description: processedContent },
              sseClientId,
            ),
        );

        if (result?.success) {
          setDescription(processedContent);
          setSavedDescription(processedContent);
        }
      } finally {
        setIsSavingDescription(false);
      }
    },
    [release, organizationId, sseClientId, runWithToast],
  );

  const hasUnsavedChanges = useMemo(() => {
    const currentText = extractTextContent(description);
    const savedText = extractTextContent(savedDescription);
    return currentText !== savedText;
  }, [description, savedDescription]);

  return (
    <div className="w-full min-w-full">
      <Editor
        defaultContent={release?.description || undefined}
        onChange={setDescription}
        placeholder="Add a description for this release..."
        categories={categories}
        tasks={tasks}
        hideBlockHandle={true}
      />
      <div className="flex w-full">
        {hasUnsavedChanges && (
          <Button
            variant="primary"
            size="sm"
            className="text-xs py-1 h-auto ml-auto"
            onClick={() => handleSave(description)}
            disabled={isSavingDescription}
          >
            {isSavingDescription ? "Saving..." : "Update"}
          </Button>
        )}
      </div>
    </div>
  );
}
