import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db, getOrganizationPublicById, type schema } from "@repo/database";
import { getAccess } from "@/getAccess";
import { InvitationActions } from "@/components/invitation";
import { SubWrapper } from "@/components/generic/wrapper";

const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { account } = await getAccess();
	return {
		account,
	};
});

const fetchInvite = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType; orgId: string; code: string }) => data)
	.handler(async ({ data }) => {
		const invite = await db.query.invite.findFirst({
			where: (invites, { eq, and }) =>
				and(
					eq(invites.organizationId, data.orgId),
					eq(invites.inviteCode, data.code),
					eq(invites.status, "pending"),
					eq(invites.userId, data.account.id)
				),
		});
		const organization = await getOrganizationPublicById(data.orgId);
		return { invite, organization };
	});

export const Route = createFileRoute("/invite/$orgId/")({
	beforeLoad: async () => {
		const { account } = await fetchAuth();
		return {
			account,
		};
	},
	loader: async ({ context, params, location }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		if (((location.search as { code?: string })?.code as string) === undefined) {
			throw redirect({ to: `/` });
		}
		return await fetchInvite({
			data: {
				account: context.account,
				orgId: params.orgId,
				code: (location.search as { code?: string })?.code as string,
			},
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { account } = Route.useRouteContext();
	const { invite, organization } = Route.useLoaderData();
	if (!account) {
		return <div>Please log in or sign up then open this invite.</div>;
	}
	return (
		<div className="flex items-center justify-center h-full">
			<SubWrapper
				title={`Join ${organization?.name}`}
				description={`You have been invited to join ${organization?.slug}.${import.meta.env.VITE_ROOT_DOMAIN}. `}
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
