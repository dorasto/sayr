import { Skeleton } from "@repo/ui/components/skeleton";
import type { BasicExtension } from "prosekit/basic";
import { canUseRegexLookbehind, type Union } from "prosekit/core";
import type { MentionExtension } from "prosekit/extensions/mention";
import { useEditor } from "prosekit/react";
import {
  AutocompleteEmpty,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopover,
} from "prosekit/react/autocomplete";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { statusConfig } from "@/components/tasks";
import { cn } from "@/lib/utils";
import type { OrgTaskSearchResult } from "@/lib/fetches/searchTasks";

// Match inputs like "#1", "#fix-bug", "#login", etc. — requires at least one non-whitespace char after #
const regex = canUseRegexLookbehind() ? /(?<!\S)#(\S+)$/u : /#(\S+)$/u;

export default function TaskMenu(props: {
  tasks: OrgTaskSearchResult[];
  loading?: boolean;
  onQueryChange?: (query: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const editor = useEditor<Union<[MentionExtension, BasicExtension]>>();

  const handleTagInsert = (id: string, taskShortId: number) => {
    editor.commands.insertMention({
      id: id.toString(),
      value: `#${taskShortId}`,
      kind: "task",
    });
  };

  return (
    <AutocompletePopover
      regex={regex}
      className="relative block max-h-100 min-w-60 select-none overflow-auto whitespace-nowrap p-1 z-50 box-border rounded-xl border bg-popover text-foreground shadow-lg [&:not([data-state])]:hidden"
      placement="top"
      onQueryChange={props.onQueryChange}
      onOpenChange={props.onOpenChange}
    >
      <AutocompleteList filter={null}>
        {props.loading && (
          <div className="py-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                <Skeleton className="size-5 rounded-sm" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        )}

        {!props.loading && props.tasks.length === 0 && (
          <AutocompleteEmpty className="relative flex items-center min-w-32 scroll-my-1 rounded-sm box-border cursor-default select-none whitespace-nowrap outline-hidden text-sm px-3 py-1.5">
            No results
          </AutocompleteEmpty>
        )}

        {!props.loading &&
          props.tasks.map((task) => {
            const status = task.status.replace(/"/g, "");
            const statusCfg = statusConfig[status as keyof typeof statusConfig];
            const statusIcon = statusCfg?.icon(
              cn(statusCfg?.className, "h-3.5 w-3.5"),
            );
            const shortId = String(task.shortId);

            return (
              <AutocompleteItem
                key={task.id}
                className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-lg px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
                onSelect={() =>
                  handleTagInsert(task.id, task.shortId as number)
                }
              >
                <InlineLabel
                  className="text-sm ps-5 align-bottom shrink-0 pr-1.5 rounded-lg bg-accent text-accent-foreground"
                  text={`#${shortId} ${task.title ?? ""}`}
                  textNode={
                    <>
                      <span className="text-muted-foreground! text-xs!">
                        #{shortId}
                      </span>
                      <span className="text-sm!">
                        {task.title ? ` ${task.title}` : ""}
                      </span>
                    </>
                  }
                  icon={statusIcon}
                />
              </AutocompleteItem>
            );
          })}
      </AutocompleteList>
    </AutocompletePopover>
  );
}
