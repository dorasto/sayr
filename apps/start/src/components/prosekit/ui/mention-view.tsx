import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { getDisplayName } from "@repo/util";
import type { ReactNodeViewProps } from "prosekit/react";
import { defineReactNodeView, useExtension } from "prosekit/react";
import { useMemo } from "react";
import { RenderCategory } from "@/components/tasks";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { TaskMention } from "./TaskMention";
import { IconUser } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useMentionTasks } from "@/hooks/useMentionTasks";

function MentionViewInner(
  props: ReactNodeViewProps,
  users: schema.UserSummary[],
  categories: schema.categoryType[],
  tasks: schema.TaskWithLabels[],
  currentUserId?: string,
) {
  const { id, value, kind } = props.node.attrs;

  if (kind === "user") {
    const user = users.find((u) => u.id.toString() === id);
    // Use displayName if available, fall back to username from stored value
    const displayText = user ? getDisplayName(user) : value.replace(/^@/, "");
    const image = user?.image;
    const isCurrentUser =
      currentUserId && user?.id?.toString() === currentUserId;

    return (
      <InlineLabel
        className={[
          "text-sm ps-6 align-bottom shrink-0 pr-1.5 rounded-lg",
          isCurrentUser
            ? "bg-primary text-primary-foreground font-semibold"
            : "bg-accent text-accent-foreground",
        ].join(" ")}
        avatarClassName={cn("size-4")}
        text={`${displayText}`}
        image={image ? image : null}
        icon={
          !image && <IconUser className="size-3.5 bg-secondary rounded-full" />
        }
      />
    );
  }

  if (kind === "category") {
    const category = categories.find((c) => c.id.toString() === id);
    if (category) {
      return <RenderCategory category={category} className="inline-flex" />;
    }
    return <span className="text-primary">{value}</span>;
  }

  if (kind === "task") {
    const task = tasks.find((c) => c.id.toString() === id);
    if (task) {
      return <TaskMention task={task} categories={categories} />;
    }
    return <span className="text-muted-foreground italic">Private task</span>;
  }

  return <span>{value}</span>;
}

export default function MentionView({
  users,
  categories,
  tasks,
}: {
  users: schema.UserSummary[];
  categories: schema.categoryType[];
  tasks: schema.TaskWithLabels[];
}) {
  const { value: Newaccount } = useStateManagement<schema.userType>(
    "account",
    null,
  );

  const mentionTasks = useMentionTasks();

  const resolvedTasks = useMemo(() => {
    if (tasks.length > 0) return tasks;
    return mentionTasks.allSeenTasks as schema.TaskWithLabels[];
  }, [tasks, mentionTasks.allSeenTasks]);

  const extension = useMemo(
    () =>
      defineReactNodeView({
        name: "mention",
        component: (props: ReactNodeViewProps) =>
          MentionViewInner(props, users, categories, resolvedTasks, Newaccount?.id),
      }),
    [users, Newaccount?.id, categories, resolvedTasks],
  );

  useExtension(extension);
  return null;
}
