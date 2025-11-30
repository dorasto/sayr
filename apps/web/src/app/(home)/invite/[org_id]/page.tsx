import { db, getOrganizationPublicById } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { SubWrapper } from "@/app/components/layout/wrapper";
import { InvitationActions } from "@/app/components/org/invitation";
import { getAccess } from "@/app/lib/serverFunctions";

interface InviteServerPageProps {
	params: Promise<{ org_id: string }>;
	searchParams: Promise<{ code: string }>;
}

export default async function InviteServerPage({ params, searchParams }: InviteServerPageProps) {
	const { account } = await getAccess();
	if (!account) {
		return <div>Please log in or sign up then open this invite.</div>;
	}
	const { org_id } = await params;
	const search = await searchParams;
	const invite = await db.query.invite.findFirst({
		where: (invites, { eq, and }) =>
			and(
				eq(invites.organizationId, org_id),
				eq(invites.inviteCode, search.code),
				eq(invites.status, "pending"),
				eq(invites.userId, account?.id)
			),
	});
	const organization = await getOrganizationPublicById(org_id);
	return (
		<div className="flex items-center justify-center h-full">
			<SubWrapper
				title={`Join ${organization?.name}`}
				description={`You have been invited to join ${organization?.slug}.sayr.io. `}
				className="bg-card p-3 md:p-3 rounded-lg"
				icon={
					<Avatar>
						<AvatarImage src={organization?.logo || ""} alt={organization?.name} />
						<AvatarFallback>{organization?.name.charAt(0)}</AvatarFallback>
					</Avatar>
				}
				style="compact"
			>
				{invite ? (
					<InvitationActions invite={invite} organizationName={organization?.name || ""} />
				) : (
					<p className="text-sm text-muted-foreground">This invite is no longer valid or has expired.</p>
				)}
				{/* <div className="max-w-2xl mx-auto">
					<h1 className="text-3xl font-bold mb-4">Invite Organization {org_id}</h1>
					<h1 className="text-3xl font-bold mb-4">Invite code {search.code}</h1>
					<span>{invite ? "Invite is valid" : "Invite not found or expired"}</span> <br />
					<span>{account ? `Account: ${account.email}` : "No account information available"}</span>
				</div> */}
			</SubWrapper>
		</div>
	);
}
