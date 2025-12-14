import { defineReactNodeView, useExtension } from "prosekit/react";
import { useMemo } from "react";
import type { ReactNodeViewProps } from "prosekit/react";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import type { schema } from "@repo/database";

function MentionViewInner(props: ReactNodeViewProps, users: schema.userType[]) {
	const { id, value, kind } = props.node.attrs;

	if (kind === "user") {
		const user = users.find((u) => u.id.toString() === id);
		const username = user ? user.name : value.replace(/^@/, "");
		const image = user?.image;

		return (
			<InlineLabel
				className="text-sm ps-6 align-bottom shrink-0 bg-accent pr-1 rounded-lg"
				avatarClassName="size-4"
				text={username}
				image={image}
			/>
		);
	}

	// Fallback for other mentions (like tags)
	// Replicating the style from editor.tsx: [&_span[data-mention="tag"]]:text-violet-500
	if (kind === "tag") {
		return <span className="text-primary">{value}</span>;
	}

	return <span>{value}</span>;
}

export default function MentionView({ users }: { users: schema.userType[] }) {
	const extension = useMemo(
		() =>
			defineReactNodeView({
				name: "mention",
				component: (props: ReactNodeViewProps) => MentionViewInner(props, users),
			}),
		[users]
	);

	useExtension(extension);
	return null;
}
