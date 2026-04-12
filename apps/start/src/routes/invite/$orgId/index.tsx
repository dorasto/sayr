import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db, getOrganizationPublicById, type schema } from "@repo/database";
import { getAccess } from "@/getAccess";
import { InvitationActions } from "@/components/invitation";
import { SubWrapper } from "@/components/generic/wrapper";
import { and, gt, or } from "drizzle-orm";
import { seo, getOgImageUrl } from "@/seo";

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
			where: (invites, { eq }) =>
				and(
					eq(invites.organizationId, data.orgId),
					eq(invites.inviteCode, data.code),
					eq(invites.status, "pending"),
					gt(invites.expiresAt, new Date()),
					or(eq(invites.userId, data.account.id), eq(invites.email, data.account.email))
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
		const code = (location.search as { code?: string })?.code as string | undefined;

		if (!context.account) {
			const redirectPath = `/invite/${params.orgId}${code ? `?code=${code}` : ""}`;
			throw redirect({
				to: "/auth/login",
				headers: {
					"Set-Cookie": `post_login_redirect=${encodeURIComponent(redirectPath)}; Path=/; HttpOnly; SameSite=Lax`,
				},
			});
		}
		if (code === undefined) {
			throw redirect({ to: `/` });
		}
		return await fetchInvite({
			data: {
				account: context.account,
				orgId: params.orgId,
				code,
			},
		});
	},
	head: ({ loaderData }) => ({
		meta: seo({
			title: loaderData?.organization ? `You've been invited · ${loaderData.organization.name}` : "You've been invited",
			image: getOgImageUrl({
				type: "simple",
				title: "You've been invited",
				subtitle: loaderData?.organization?.name || undefined,
				logo: loaderData?.organization?.logo || undefined,
			}),
		}),
	}),
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
			</SubWrapper>
		</div>
	);
}
