import { defineReactNodeView, useExtension } from "prosekit/react";
import { useMemo } from "react";
import type { ReactNodeViewProps } from "prosekit/react";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";

function MentionViewInner(props: ReactNodeViewProps, users: schema.userType[], currentUserId?: string) {
	const { id, value, kind } = props.node.attrs;

	if (kind === "user") {
		const user = users.find((u) => u.id.toString() === id);
		const username = user ? user.name : value.replace(/^@/, "");
		const image = user?.image;
		const isCurrentUser = currentUserId && user?.id?.toString() === currentUserId;

		return (
			<InlineLabel
				className={[
					"text-sm ps-6 align-bottom shrink-0 pr-1 rounded-lg",
					isCurrentUser ? "bg-primary text-primary-foreground font-semibold" : "bg-accent text-accent-foreground",
				].join(" ")}
				avatarClassName="size-4"
				text={`@${username}`}
				image={image}
			/>
		);
	}

	// Fallback for other mentions (like tags)
	if (kind === "tag") {
		return <span className="text-primary">{value}</span>;
	}

	return <span>{value}</span>;
}

export default function MentionView({ users }: { users: schema.userType[] }) {
	const { value: Newaccount } = useStateManagement<schema.userType>("account", null);

	const extension = useMemo(
		() =>
			defineReactNodeView({
				name: "mention",
				component: (props: ReactNodeViewProps) => MentionViewInner(props, users, Newaccount?.id),
			}),
		[users, Newaccount?.id]
	);

	useExtension(extension);
	return null;
}
