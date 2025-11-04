import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { IconArrowRight } from "@tabler/icons-react";
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
					<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> changed the
					category
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
				<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> changed the category{" "}
				{fromCategory ? (
					<>
						from{" "}
						<Badge
							variant="outline"
							className="inline-flex items-center gap-1 justify-start"
							style={{
								borderColor: fromCategory.color || "#ccc",
								color: fromCategory.color || "inherit",
							}}
						>
							<span
								className="inline-block h-2.5 w-2.5 rounded-full"
								style={{ backgroundColor: fromCategory.color || "#ccc" }}
							/>
							<span>{fromCategory.name}</span>
						</Badge>{" "}
					</>
				) : fromId ? (
					<>
						from <Badge variant="outline">Unknown ({fromId})</Badge>{" "}
					</>
				) : null}
				{toCategory ? (
					<>
						to{" "}
						<Badge
							variant="outline"
							className="inline-flex items-center gap-1 justify-start"
							style={{
								borderColor: toCategory.color || "#ccc",
								color: toCategory.color || "inherit",
							}}
						>
							<span
								className="inline-block h-2.5 w-2.5 rounded-full"
								style={{ backgroundColor: toCategory.color || "#ccc" }}
							/>
							<span>{toCategory.name}</span>
						</Badge>
					</>
				) : toId ? (
					<>
						to <Badge variant="outline">Unknown ({toId})</Badge>
					</>
				) : null}
			</>
		);
	};

	return (
		<TimelineItemWrapper item={item} icon={IconArrowRight} color="bg-accent text-primary-foreground">
			{renderCategoryChange()}
		</TimelineItemWrapper>
	);
}
