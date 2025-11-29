import { db } from "@repo/database";
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
	return (
		<div className="p-4">
			<div className="max-w-2xl mx-auto">
				<h1 className="text-3xl font-bold mb-4">Invite Organization {org_id}</h1>
				<h1 className="text-3xl font-bold mb-4">Invite code {search.code}</h1>
				<span>{invite ? "Invite is valid" : "Invite not found or expired"}</span> <br />
				<span>{account ? `Account: ${account.email}` : "No account information available"}</span>
			</div>
		</div>
	);
}
