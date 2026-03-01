"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import { IconUsers } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { TaskDetailOrganization } from "../types";

interface GlobalTaskIdentifierProps {
	task: schema.TaskWithLabels;
	organization: TaskDetailOrganization;
	/** Compact mode shows only #shortId (no org slug). */
	compact?: boolean;
	/** Show only the org avatar, hide all text. */
	iconOnly?: boolean;
	/** Extra className merged onto the button. */
	className?: string;
}

export default function GlobalTaskIdentifier({
	task,
	organization,
	compact = false,
	iconOnly = false,
	className,
}: GlobalTaskIdentifierProps) {
	return (
		<Link to={`/${task.organizationId}/tasks/${task.shortId}`} className="">
			<Button
				variant="primary"
				className={cn("h-[26px] p-1 w-fit bg-accent text-xs", className)}
				size="sm"
				tooltipText="Open task"
				tooltipSide="bottom"
			>
				<Avatar className="h-4 w-4 shrink-0">
					<AvatarImage
						src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
						alt={organization.name}
					/>
					<AvatarFallback className="rounded-md uppercase text-[10px]">
						<IconUsers className="h-3 w-3" />
					</AvatarFallback>
				</Avatar>
				{!iconOnly &&
					(compact ? (
						<>#{task.shortId}</>
					) : (
						<>
							{organization.slug}/#{task.shortId}
						</>
					))}
			</Button>
		</Link>
	);
}
