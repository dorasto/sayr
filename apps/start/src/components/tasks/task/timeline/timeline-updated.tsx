import { getDisplayName } from "@repo/util";
import { IconEdit, IconFileDescription, IconLock, IconLockOpen2, IconPencil } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import { parseUpdatedField } from "./parse-updated-field";
import type { TimelineItemProps } from "./types";

export function TimelineUpdated({ item, showSeparator = true }: TimelineItemProps & { showSeparator?: boolean }) {
	const renderUpdateMessage = () => {
		const fromData = parseUpdatedField(item.fromValue);
		const toData = parseUpdatedField(item.toValue);

		// Handle structured title change
		if (fromData?.field === "title" && toData?.field === "title") {
			const fromTitle = String(fromData.value || "Untitled");
			const toTitle = String(toData.value || "Untitled");

			return (
				<>
					<InlineLabel
						className="text-muted-foreground hover:text-foreground"
						text={item.actor ? getDisplayName(item.actor) : "Unknown"}
						image={item.actor?.image || ""}
					/>{" "}
					changed the title from{" "}
					<span className="font-medium text-muted-foreground line-through">{fromTitle}</span> to{" "}
					<span className="font-medium">{toTitle}</span>
				</>
			);
		}

		// Handle structured description change
		if (fromData?.field === "description" || toData?.field === "description") {
			return (
				<>
					<InlineLabel
						className="text-muted-foreground hover:text-foreground"
						text={item.actor ? getDisplayName(item.actor) : "Unknown"}
						image={item.actor?.image || ""}
					/>{" "}
					updated the description
				</>
			);
		}

		// Handle structured visibility change
		if (fromData?.field === "visible" && toData?.field === "visible") {
			const toVisible = String(toData.value || "public");
			const isNowPrivate = toVisible === "private";

			return (
				<>
					<InlineLabel
						className="text-muted-foreground hover:text-foreground"
						text={item.actor ? getDisplayName(item.actor) : "Unknown"}
						image={item.actor?.image || ""}
					/>{" "}
					made this task{" "}
					<span className="font-medium inline-flex items-center gap-1">
						{isNowPrivate ? (
							<InlineLabel
								className="text-muted-foreground hover:text-foreground"
								text="private"
								icon={<IconLock className="size-3" />}
							/>
						) : (
							<InlineLabel
								className="text-muted-foreground hover:text-foreground"
								text="public"
								icon={<IconLockOpen2 className="size-3" />}
							/>
						)}
					</span>
				</>
			);
		}

		// Legacy format: just show generic message
		return (
			<>
				<InlineLabel
					className="text-muted-foreground hover:text-foreground"
					text={item.actor ? getDisplayName(item.actor) : "Unknown"}
					image={item.actor?.image || ""}
				/>{" "}
				updated the task
			</>
		);
	};

	// Determine icon based on field type
	const getIcon = () => {
		const toData = parseUpdatedField(item.toValue);
		if (toData?.field === "title") return IconPencil;
		if (toData?.field === "description") return IconFileDescription;
		if (toData?.field === "visible") {
			return toData.value === "private" ? IconLock : IconLockOpen2;
		}
		return IconEdit;
	};

	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={getIcon()}
			color="bg-accent text-primary-foreground"
		>
			{renderUpdateMessage()}
		</TimelineItemWrapper>
	);
}
