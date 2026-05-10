import { Skeleton } from "@repo/ui/components/skeleton";
import { getDisplayName } from "@repo/util";
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
import type { schema } from "@repo/database";

// Match inputs like "@", "@foo", "@foo bar" etc. Do not match "@ foo".
const regex = canUseRegexLookbehind() ? /(?<!\S)@(\S.*)?$/u : /@(\S.*)?$/u;

export default function UserMenu(props: {
  users: schema.UserSummary[];
  loading?: boolean;
  onQueryChange?: (query: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const editor = useEditor<Union<[MentionExtension, BasicExtension]>>();

  const handleUserInsert = (id: string, username: string) => {
    editor.commands.insertMention({
      id: id,
      value: `@${username}`,
      kind: "user",
    });
    editor.commands.insertText({ text: " " });
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
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        )}

        {!props.loading && props.users.length === 0 && (
          <AutocompleteEmpty className="relative flex items-center min-w-32 scroll-my-1 rounded-sm box-border cursor-default select-none whitespace-nowrap outline-hidden text-sm px-3 py-1.5">
            No results
          </AutocompleteEmpty>
        )}

        {!props.loading &&
          props.users.map((user) => {
            const displayName = getDisplayName(user);

            return (
              <AutocompleteItem
                key={user.id}
                className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-lg px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
                onSelect={() => handleUserInsert(user.id, user.name)}
              >
                <div className="flex items-center gap-2">
                  <InlineLabel
                    className="text-sm ps-6"
                    avatarClassName="size-4"
                    text={displayName}
                    image={user.image}
                  />
                  <span className="text-xs text-muted-foreground">
                    {user.name}
                  </span>
                </div>
              </AutocompleteItem>
            );
          })}
      </AutocompleteList>
    </AutocompletePopover>
  );
}
