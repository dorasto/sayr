import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import type { ReactNodeViewProps } from "prosekit/react";
import { defineReactNodeView, useExtension } from "prosekit/react";
import { useMemo } from "react";
import { RenderCategory, statusConfig } from "@/components/tasks";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { cn } from "@/lib/utils";
import { TaskMention } from "./TaskMention";

function MentionViewInner(
	props: ReactNodeViewProps,
	users: schema.userType[],
	categories: schema.categoryType[],
	tasks: schema.TaskWithLabels[],
	currentUserId?: string,
) {
	const { id, value, kind } = props.node.attrs;

	if (kind === "user") {
		const user = users.find((u) => u.id.toString() === id);
		const username = user ? user.name : value.replace(/^@/, "");
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
				avatarClassName="size-4"
				text={`@${username}`}
				image={image}
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
		return <span className="text-primary">{value}</span>;
	}

	return <span>{value}</span>;
}

export default function MentionView({
	users,
	categories,
	tasks,
}: {
	users: schema.userType[];
	categories: schema.categoryType[];
	tasks: schema.TaskWithLabels[];
}) {
	const { value: Newaccount } = useStateManagement<schema.userType>(
		"account",
		null,
	);

	const extension = useMemo(
		() =>
			defineReactNodeView({
				name: "mention",
				component: (props: ReactNodeViewProps) =>
					MentionViewInner(props, users, categories, tasks, Newaccount?.id),
			}),
		[users, Newaccount?.id, categories, tasks],
	);

	useExtension(extension);
	return null;
}
