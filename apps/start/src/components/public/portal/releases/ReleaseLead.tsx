import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, getDisplayName, getInitials } from "@repo/util";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { findTeamMemberUser } from "@/lib/portal/team";

interface ReleaseLeadProps {
	leadId: string | null;
	/** Upcoming-card variant: primary ring around the avatar and a "Lead:" prefix. */
	ring?: boolean;
	className?: string;
}

/** The release lead, resolved against the org's team. Renders nothing when the lead is not on the team (or unset). */
export function ReleaseLead({ leadId, ring, className }: ReleaseLeadProps) {
	const { organization } = usePublicOrganizationLayout();
	const lead = findTeamMemberUser(leadId, organization);
	if (!lead) return null;
	const name = getDisplayName(lead);

	return (
		<span className={cn("inline-flex items-center gap-2 text-[13.5px] text-muted-foreground", className)}>
			<Avatar
				className={cn("size-[22px]", ring && "shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--primary)]")}
			>
				<AvatarImage src={lead.image ? ensureCdnUrl(lead.image) : undefined} alt={name} />
				<AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
			</Avatar>
			{ring ? "Lead: " : null}
			<b className={ring ? "font-semibold text-foreground" : "font-normal"}>{name}</b>
		</span>
	);
}
