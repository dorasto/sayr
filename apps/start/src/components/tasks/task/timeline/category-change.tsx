import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { IconArrowRight } from "@tabler/icons-react";
import { RenderCategory } from "../../shared/category";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineCategoryChange({
	item,
	categories = [],
}: TimelineItemProps & { categories: schema.categoryType[] }) {
	const renderCategoryChange = () => {
		if (!item.fromValue && !item.toValue) {
			return (
				<>
					<AvatarWithName
						name={item.actor?.name || "Unknown"}
						image={item.actor?.image || ""}
					/>{" "}
					changed the category
				</>
			);
		}

		// Remove quotes if stored as stringified JSON
		const fromId = (item.fromValue as string)?.replaceAll('"', "") || null;
		const toId = (item.toValue as string)?.replaceAll('"', "") || null;

		const fromCategory = categories.find((c) => c.id === fromId);

		const toCategory = categories.find((c) => c.id === toId);

		return (
			<>
				<AvatarWithName
					name={item.actor?.name || "Unknown"}
					image={item.actor?.image || ""}
				/>{" "}
				changed the category{" "}
				{fromCategory ? (
					<>
						from{" "}
						<RenderCategory
							category={fromCategory}
							className="inline-flex"
						/>{" "}
					</>
				) : fromId ? (
					<>
						from{" "}
						<Badge
							variant="secondary"
							className="inline-flex items-center gap-1 justify-center h-5 border border-border"
						>
							Unknown ({fromId})
						</Badge>{" "}
					</>
				) : null}
				{toCategory ? (
					<>
						to <RenderCategory category={toCategory} className="inline-flex" />
					</>
				) : toId ? (
					<>
						to{" "}
						<Badge
							variant="secondary"
							className="inline-flex items-center gap-1 justify-center h-5 border border-border"
						>
							Unknown ({toId})
						</Badge>
					</>
				) : null}
			</>
		);
	};

	return (
		<TimelineItemWrapper
			item={item}
			icon={IconArrowRight}
			color="bg-accent text-primary-foreground"
		>
			{renderCategoryChange()}
		</TimelineItemWrapper>
	);
}
