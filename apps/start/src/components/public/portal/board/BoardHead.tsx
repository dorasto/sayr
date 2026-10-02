import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { ensureCdnUrl, getInitials } from "@repo/util";

interface BoardHeadProps {
	organization: { name: string; logo: string | null };
}

/** Page head: 56px org mark (logo or initials tile), the "Feedback" title and a one-line lede. */
export function BoardHead({ organization }: BoardHeadProps) {
	return (
		<div className="flex items-center gap-5">
			<Avatar className="hidden size-14 shrink-0 rounded-2xl md:flex">
				{organization.logo ? <AvatarImage src={ensureCdnUrl(organization.logo)} alt={organization.name} /> : null}
				<AvatarFallback className="rounded-2xl bg-portal-accent font-semibold text-portal-on-accent text-xl">
					{getInitials(organization.name)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0">
				<h1 className="font-bold text-[28px] leading-[34px] tracking-[-0.028em] md:text-[32px] md:leading-[38px]">
					Feedback
				</h1>
				<p className="mt-1 text-[15px] text-portal-fg-2 leading-[22px] md:leading-6">
					<span className="md:hidden">Vote on what you need, or tell the team what is missing.</span>
					<span className="max-md:hidden">
						Vote on what you need, follow what is being built, or tell the {organization.name} team what is
						missing.
					</span>
				</p>
			</div>
		</div>
	);
}
