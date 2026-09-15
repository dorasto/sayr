import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { getInitials } from "@repo/util";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { HoverCardBase, type HoverCardBaseProps } from "../hover-card-base";

export interface OrgHoverCardOrganization {
	id: string;
	name: string;
	slug: string;
	shortId: string;
	logo: string | null;
}

export interface OrgHoverCardProps
	extends Pick<
		HoverCardBaseProps,
		"side" | "align" | "sideOffset" | "openDelay" | "closeDelay" | "disabled" | "forceClose"
	> {
	organization: OrgHoverCardOrganization | undefined;
	/** The element that triggers the hover card on mouse enter */
	children: React.ReactNode;
}

/**
 * Hover card that previews an organization — logo, name, slug, short id.
 * Wrap any trigger element with this; clicking still works normally.
 * Follows the same shape as ReleaseHoverCard, but doesn't reuse it directly
 * since that one pulls in @/components/tasks's InlineLabel.
 */
export function OrgHoverCard({
	organization,
	children,
	disabled,
	forceClose,
	side = "bottom",
	align = "start",
	sideOffset,
	openDelay,
	closeDelay,
}: OrgHoverCardProps) {
	if (!organization) {
		return <>{children}</>;
	}

	return (
		<HoverCardBase
			trigger={children}
			disabled={disabled}
			forceClose={forceClose}
			side={side}
			align={align}
			sideOffset={sideOffset}
			openDelay={openDelay}
			closeDelay={closeDelay}
		>
			<Link
				to="/$orgId"
				params={{ orgId: organization.id }}
				className="flex items-center gap-2.5 p-3 hover:bg-accent transition-colors"
			>
				<Avatar className="size-9 rounded-lg shrink-0">
					<AvatarImage src={organization.logo ?? undefined} alt={organization.name} />
					<AvatarFallback className="rounded-lg">{getInitials(organization.name)}</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="truncate text-sm font-medium">{organization.name}</div>
					<div className="truncate text-xs text-muted-foreground">
						/{organization.slug} · {organization.shortId}
					</div>
				</div>
			</Link>
		</HoverCardBase>
	);
}
